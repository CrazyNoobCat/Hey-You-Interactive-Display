
const fs      = require('fs');
const express = require('express');
const http    = require('http');

// The following is a customized version of 'qr-image' which has the property we desire,
//   which is 'size' specifies image size (width and height), not a single pixel size
//   (which is what the original version of the nodejs package does)

const qr      = require('node-qr-image'); 

const { Server }  = require("socket.io");
const { Console } = require('console');

const Connection = require('./Connection');
const RoomNames = require('./RoomNames')


const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

const httpPort = process.env.PORT || 3000;
const publicDirectory = "/public";

const roomNames = new RoomNames('joinRoomNames.txt');

// The general setup of Hey You is as follows:
//  
//   1. A 'display' starts by showing the home page to the activity-launcher
//
//   2. When a 'controller-client' (phone-based user) connects via the QR code
//      (or else by entering the URL the activity-launcher displays) they
//      are shown (on their phone) a list of apps that can be launched
//
//   3. Upon selecting an app (activity) from the list, the display is 
//      send the relevent activities/<activity>/display.html and the
//      phone changed to display the controller for the activity
//      activities/<activity>/controller-client.html
//
//   4. If another controller-client joins a display while it us running an app,
//      then the controller-client is directly provided the controller for
//      that app


var displays = []; // An array containing all displays
var clients  = []; // An array containing all the clients


const defaultActivity         = ''; // if ever make none empty, then needs to be of the form '/foo'
const defaultActivityLabel    = 'Activity-Launcher (Default)';

const defaultActivityLocation = __dirname + defaultActivity;
const activityLocation        = __dirname + '/activities';

const clientTimeoutMins          = 1;       // Number of mins a client controller will be displayed for, with no interactivity
const defaultCookieTimeoutMins   = 5;       // Number of mins a client cookie will last for
const staticCookieValidMins      = 2 * 60;  // Valid for 2 hours by default

const clientTimeoutMSecs         = clientTimeoutMins * 60 * 1000;
const defaultCookieTimeoutMSecs  = defaultCookieTimeoutMins * 60 * 1000;

const ServerEpochStartTime     = new Date();    // This is the time which the server started. Use to reload connections after a restart
const onStartReloadWindowMSecs = 2 * 60 * 1000  // i.e. 2 mins

console.log("Server Epoch Start Time: " + ServerEpochStartTime);

const checkClientTimeoutMSecs  =  5 * 1000; // i.e.  5 seconds
const checkDisplayTimeoutMSecs = 30 * 1000; // i.e. 30 seconds

function getCookie(req,cookieName)
{
    let cookies = req.headers.cookie; 
    if (cookies == undefined)
        return undefined;

    let splitCookie = cookies.split('; ');
    for (let index = 0; index < splitCookie.length; index++) {
        const current = splitCookie[index];
        const content = current.split('=');
        if (content[0] == cookieName) {
            return content[1];
        }
        
    }
    return undefined;
}

function findHostDisplayByRoomID(roomID)
{
    for (let index = 0; index < displays.length; index++) {
        const display = displays[index];
        if (display.getRoomID() == roomID && display.isRoomHost()) {
            return display;
        }
    }
}

function findHostDisplayByName(name)
{
    for (let index = 0; index < displays.length; index++) {
        const display = displays[index];
        if (display.getRoomName() == name) {
            return display;
        }                    
    }
}

function findDisplayBySocketID(socketID)
{
    for (let index = 0; index < displays.length; index++) {
        const display = displays[index];
        if (display.getSocketID() == socketID) {
            return display;
        }                    
    }
}

function findAllClientsByRoomID(roomID)
{
    let foundClients = [];
    for (let index = 0; index < clients.length; index++) {
        const client = clients[index];
        if (client.getRoomID() == roomID) {
            foundClients.push(client);
        }                    
    }
    return foundClients;
}

function findAllClientsByRoomName(roomName)
{
    let roomID = findHostDisplayByName(roomName).getRoomID();
    return findAllClientsByRoomID(roomID);
}

function findClientBySocketID(socketID)
{
    for (let index = 0; index < clients.length; index++) {
        const client = clients[index];
        if (client.getSocketID() == socketID) {
            return client;
        }                    
    }
}

function getStaticActivity(req)
{
    let activity = getCookie(req,"staticActivity");
    console.log("Static Activity: " + activity);
    if (fs.existsSync(__dirname + activity))
        return activity;    

    return undefined;
}

function getActivity(req)
{
    let display = findHostDisplayByRoomID(getCookie(req,"roomID"));
    if (display != undefined) {
	let activity = display.getCurrentActivity();
        return activity;
    }
    
    return undefined;
}

function getActivityLabel(activity)
{
    return (activity == defaultActivity) ? defaultActivityLabel : activity;
}

function sendActivityFile(res, path, fileName, activityLabel)
{
    if (fs.existsSync(path)) {
        res.sendFile(path);
        console.log("sendActivityFile() Activity: '" + activityLabel +"' File sent: " + fileName);
    } 
    else {
        res.sendStatus(404);
        console.error("sendActivityFile() Activity: '" + activityLabel +"' Failed file retrival: " + fileName + "(File not found)");
    }
    
}


function consoleInput() { // Console Commands
    const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    var exitCode = 0;
    return new Promise(function(resolve, reject) {
        rl.setPrompt('');
        rl.prompt();
        rl.on('line', function(line) {
            if (line === "exit") {
                exitCode = 1; // User initiated
                rl.close();
                return; // bail here, so rl.prompt() isn't called again
            } 
            else if (line === "help" || line === '?') {
                console.log(`Commands:\n\tclients {roomName/ID}/all\n\texit\n\tclear\n\tchangeActivity {roomName} {optUrlParams}\n\tdisplays\n`);
            } 
            else if (line.startsWith("clients",0)) {
                console.log("Clients: ")
                let identifier = line.split(" ")[1]; // Get the 2nd parsed value
                if (identifier != undefined) {
                    if (identifier === "all") {
                        clients.forEach(client => {
                            console.log("DeviceID: " + client.getDeviceID() +"\tRoom: " + client.getRoomID());
                        });
                    }
                    else if (identifier.length > 15) { // For roomIDs
                        findAllClientsByRoomID(identifier).forEach(client => {
                            console.log(client.getDeviceID());
                        });
                    } 
                    else { // For roomNames
                        findAllClientsByRoomName(identifier).forEach(client => {
                            console.log(client.getDeviceID());
                        });
                    }  
                }
		else {
                    console.log("Missing command arguments. Use help for more information");
                }                
            } 
            else if (line === "clear") {
                console.clear();              
            } 
            else if (line.startsWith("changeActivity",0)) {
		let lineTokens = line.split(" ");
		
                let roomName     = lineTokens[1];
                let optUrlParams = (lineTokens.length>=3) ? lineTokens[2] : null;

                let display = findHostDisplayByName(roomName);		
                display.activityChange(display, optUrlParams);
            }
            else if (line === "displays") {                
                displays.forEach(display => {
                    console.log("DeviceID: " + display.getDeviceID() +"\tRoomName: " + display.getRoomName());
                });
            }
            else {
                console.log(`unknown command: "${line}"`);
            }
            rl.prompt();
        }).on('close',function() {
            resolve(exitCode) // this is the final result of the function
        });
    });
}
  
async function enableConsole() {
    try {
        let result = await consoleInput()
        console.log('Exit Code: ', result)
        process.exit(result);

    }
    catch(e) {
        console.log('failed:', e)
    }
}


/* Main program */

const cmdline_args = process.argv.slice(2);

if (cmdline_args[0] == "-console") {
    enableConsole()
}

//
// Based on discussion at:
//   https://stackoverflow.com/questions/10849687/express-js-how-to-get-remote-client-address
//
// Make it easy to look up a client's IP, even when we are routing the request to HeyYou
// through a front-end web server (Apache2 in our case)
//
app.set('trust proxy', true)

//
// To support a dedicated list of Chromecast around the devices being served fix IPs
// we need to register the MAC addresses of the Chromecast's with the DHCP server
//
// For detecting a Chromecast's MAC address see:
//   https://support.google.com/chromecast/answer/6292171?hl=en


/* Restful HTTP responses triggered by incoming GET requests */

app.get('/join/:roomIdOrName', (req, res) => {
    console.log("Room join request: " + req.params.roomIdOrName);
    if (findHostDisplayByRoomID(req.params.roomIdOrName) != undefined) {
	let roomID = req.params.roomIdOrName;

	// Create a cookie which only works on this site and lasts for the default timeout
        res.cookie('roomID', roomID, {sameSite: true, expires: new Date(Date.now() + (defaultCookieTimeoutMSecs))}); 
        res.redirect('/'); // Prevents making a second cookie for a js file
        console.log("New device joined with roomID: " + roomID);
    }
    else if ((display = findHostDisplayByName(req.params.roomIdOrName)) != undefined) {	
	let roomName = req.params.roomIdOrName;
	let roomID   = display.getDeviceID();

        // Create a cookie which only works on this site and lasts for the default timeout
	res.cookie('roomID', roomID, {sameSite: true, expires: new Date(Date.now() + (defaultCookieTimeoutMSecs))}); 
        res.redirect('/'); // Prevents making a second cookie for a js file
        console.log("New device joined with roomName: " + roomName);
    }  
    else {
	// If room doesn't exit
        res.redirect("/error/Unable to find that Display-id or Display-name");
    }    
});



app.get('/', (req, res) => {
    // Currently checking if the cookie is undefined in getCookie. If undefined then returns undefined
    let activity = getActivity(req);

    if (activity != undefined) {
	let activityLabel = getActivityLabel(activity);
        // Check if there is a unique client file in activity otherwise provide default
        if (fs.existsSync(activityLocation + activity + '/controller-client.html')) {
            sendActivityFile(res, activityLocation + activity + '/controller-client.html','/controller-client.html',activityLabel);
	}
        else  {
            sendActivityFile(res, __dirname + defaultActivity + '/controller-client.html','/controller-client.html',defaultActivityLabel);
	}
    } 
    else {
        // Check that there is no static Cookie
        activity = getStaticActivity(req);
        if (activity != undefined) {
	    let activityLabel = activity;
            if (fs.existsSync(activityLocation + activity + '/static.html')) {
                sendActivityFile(res, activityLocation + activity + '/static.html', "/static.html", activityLabel);
	    }
            else {
                sendActivityFile(res, __dirname + defaultActivity + '/static.html', "/static.html", defaultActivityLabel);
	    }
        }
	else {
	    let roomID = getCookie(req,"roomID");
	    let staticActivity = getCookie(req,"staticActivity");

	    if ((roomID == undefined) && (staticActivity == undefined)) {
		res.redirect("/disconnected/No active display connection found.  This can be caused by controller-client inactivity. Scan the QR Code again to rejoin");
	    }
	    else {
		res.redirect("/error/No valid Display-id or Standalone App-id found. Try scanning an new QR Code.");
	    }
        }
    }    
});

// Shortcut for the accessing the top-level display
app.get('/display-home', (req, res) => {

    // Start a display (forced refresh if necessary) with the default (i.e. top-level) activity

    let roomID = getCookie(req,"roomID");
    let display = findHostDisplayByRoomID(roomID);
    
    if (display != undefined) {
	// Forced refresh => disconnect any any clients currently connected
	
	findAllClientsByRoomID(roomID).forEach(client => {
	    display.message('clientDisconnect', client.getDeviceID());
	});
	
	display.activityChange(defaultActivity,null);
    }

    
    console.log("/display-home serving up fresh default activity display.html to controller-client IP: " + req.ip);
    sendActivityFile(res, __dirname + defaultActivity +'/display.html', '/display.html', defaultActivityLabel); // This is for new displays
});

	
app.get('/activity', (req, res) => {
    // If there is a valid activity then direct display to that activity else go to default activity
    let activity = getActivity(req);
    
    if (activity != undefined) {
	// This is for reconecting displays
	
	let activityLabel = getActivityLabel(activity);

	if (activity == defaultActivity) {
	    sendActivityFile(res,__dirname + defaultActivity +'/display.html','/display.html',defaultActivityLabel); 
	}	
        else if (fs.existsSync(activityLocation + activity +'/display.html')) {
            sendActivityFile(res, activityLocation + activity +'/display.html','/display.html',activityLabel); 
	}
	else {
	    let roomID = getCookie(req,"roomID");
	    console.error("404 Error: Failed file retrival '" + req.path + "' (File not found) \tActivity: " + activity + "roomID:" + roomID);
            res.sendStatus(404);
	    //sendActivityFile(res,__dirname + defaultActivity +'/display.html','/display.html',defaultActivityLabel); 
	    //console.error("File Error: Activity (" + activity +") didn't exist so default was sent to device: " + roomID);
        }
    }
    else {
	console.log("/activity serving up default activity display.html to display IP: " + req.ip);
	//console.log("[For the curious, the request header IPs field is set to: " + req.ips +"]");
        sendActivityFile(res, __dirname + defaultActivity +'/display.html', '/display.html', defaultActivityLabel); // This is for new displays
    }   
});


app.get('/scripts/:fileName', (req, res) => {
    // Allow only files from verifiable activities
    let activity = getActivity(req)

    let fileName = "/scripts/"+req.params.fileName;
    
    if (activity != undefined) {
	let activityLabel = getActivityLabel(activity);	
	let fullActivityFileName = activityLocation + activity + fileName;
	
	if (fs.existsSync(fullActivityFileName)) {
	    sendActivityFile(res, fullActivityFileName, fileName, activityLabel);
	}
	else {
	    let fullDefaultFileName = __dirname + defaultActivity + fileName;
	    sendActivityFile(res, fullDefaultFileName, fileName, defaultActivityLabel);
	}	    
    }
    else {
	let fullDefaultActivityFileName = __dirname + defaultActivity + fileName;
	sendActivityFile(res, fullDefaultActivityFileName, fileName, defaultActivityLabel);
    }       
});

// '/disconnected' is really an alias to /error, but is a preferred URL to show to the use
// in certain situations
app.get('*/disconnected/:error', (req, res) => {
    res.cookie('error', req.params.error, {sameSite: true, expires: new Date(Date.now() + (defaultCookieTimeoutMSecs))});
    res.redirect('/disconnected');
});

app.get('/disconnected', (req, res) => {
    res.sendFile(__dirname + '/error.html');
});

app.get('*/error/:error', (req, res) => {
    res.cookie('error', req.params.error, {sameSite: true, expires: new Date(Date.now() + (defaultCookieTimeoutMSecs))});
    res.redirect('/error');
});

app.get('/error', (req, res) => {
    res.sendFile(__dirname + '/error.html');
});

app.get('/socketCreation.js', (req,res) => {
    res.sendFile(__dirname + '/socketCreation.js');
});


app.get('/qrcode', (req, res) => {
    let data = req.query.data || "https://interactwith.us/about";
    let size = parseInt(req.query.size) || 250;

    var qrcode = qr.image(data, { type: 'png', ec_level: 'M', size: size, margin: 0 });
    res.setHeader('Content-type', 'image/png');
    qrcode.pipe(res);
});


app.get('*', (req, res) => {
    // Send a file if it can be found inside either the public folder for the activity for the controller-client or generic public folder
    // Requests from nonclients will be redirected to an error page
    let activity = getActivity(req);

    // ****
    // Not clear why req.params.roomName was being check for in the following if-statement,
    // as it is then never used.  As written it could allow an undefined activity through
    // lead to mal-funtioning code
    //if (activity != undefined || req.params.roomName != undefined) {
    if (activity != undefined) {
	let activityLabel = getActivityLabel(activity);
	
	let activityPublicPath = activityLocation + activity + publicDirectory + req.path;
	let defaultPublicPath  = __dirname + publicDirectory + req.path;
	
        if (fs.existsSync(activityPublicPath)) {
            sendActivityFile(res, activityPublicPath, req.path, activityLabel);
	}
        else if (fs.existsSync(defaultPublicPath)) {
            sendActivityFile(res, defaultPublicPath, req.path, defaultActivityLabel);
	}
        else {
            console.error("404 Error: Failed file retrival '" + req.path + "' (File not found) \tActivity: " + activity);
            res.sendStatus(404);
        }
    }
    else {
	let defaultActivityPublicPath  = __dirname + publicDirectory + req.path;
	
	if (fs.existsSync(defaultActivityPublicPath)) {
            sendActivityFile(res,defaultActivityPublicPath, req.path, defaultActivityLabel);
	}
	else {
            console.error("403 Error: Failed file retrival '" + req.path + "' (Not associated with an activity) \treq roomID: " + req.params.roomID);
            res.sendStatus(403);
	}
    }
    
});

io.on('connection', (socket, host) => {
    // Check if this new socket is already a recorded connection

    var newConnection = true;

    if (socket.handshake.query.data == "client") {
	console.log("io.on('connection'): Handling controller-client connection");
	
        for (let index=0; index<clients.length; index++) {
            const client = clients[index];
            if (client.getDeviceID() == socket.handshake.query.clientID) {
                // Handle updating socket information for this reconnecting device

                if (client.getRoomID() != socket.handshake.query.roomID) {
                    let display = findHostDisplayByRoomID(client.getRoomID());

                    if (display != undefined) {
                        display.message('clientDisconnect', client.getDeviceID());
                        //io.to(display.getRoomID()).emit('clientDisconnect', client.getDeviceID());
                        display.numOfClients--; // Reduce client count by one for old room.
                    }
		    else {
                        // Error
			console.error("io.on('connection'): When disconnecting an old connection, did not find a display for roomID '" + client.getRoomID());
                    }

                    display = findHostDisplayByRoomID(client.getRoomID());

                    if (display != undefined) {
                        client.setRoomID(socket.handshake.query.roomID);
                        display.numOfClients++; // Increase client count for new room by one.
                    }
		    else {
                        // Error
			console.error("io.on('connection'): When setting up new conection, did not find a display for roomID '" + client.getRoomID());
                    }                    
                }

                client.setNewSocket(socket);

                socket.join(client.getRoomID());
                socket.join(client.getDeviceID());

                console.log("Client rejoined: \t" + client.connectionInformation());
                newConnection = false ;
            }
        }

        if (newConnection) {
            // Handle creating a new Connection instance for this device

            var client = new Connection(io,socket,defaultActivity,clientTimeoutMSecs);
	    
            // Add the new client to the list of clients

            let display = findHostDisplayByRoomID(client.getRoomID());

            if (display != undefined) {
                console.log("New Client: \t" + client.connectionInformation());

                clients.push(client);

                //Join client to room
                socket.join(client.getRoomID());
                socket.join(client.getDeviceID())

                display = findHostDisplayByRoomID(client.getRoomID());
                display.numOfClients++; // Increase client count for new room by one.

		/*
                var currentTime = new Date();
                if (currentTime - ServerEpochStartTime < onStartReloadWindowMSecs) {
                    client.message('reload');
                }
		*/

            }
	    else {
                // Could send error since there is no valid display for the client //////////////////////////
		console.error("io.on('connection'): Unable to form client-display socket connection, as no display found for for roomID '" + client.getRoomID());
            }            
        }
    } 
    else if (socket.handshake.query.data == "display") {
        console.log("io.on('connection'): Handling display connection");
	
        for (let index=0; index<displays.length; index++) {
            const display = displays[index];
            if (display.getDeviceID() == socket.handshake.query.clientID) {
                // Handle updating socket information for this reconnecting device
                console.log("Socket update for display (device id): " + display.getDeviceID());

                display.setNewSocket(socket);

		display.ready = true;		
		display.updateLastInteractionTime();
		
		//console.log("*** display = " + JSON.stringify(display));
		let roomID   = display.getRoomID();
                socket.join(roomID);

		/*
                if (Date.now() - display.getLastInteraction() > 10000) { // ****
                    io.to(socket.id).emit("reload");
                    display.updateLastInteractionTime();
                } // 10 seconds // ****
		*/
		
                newConnection = false;
                break;
            }
        }

        if (newConnection) {
            // Handle creating a new Connection instance for this device
            let display = new Connection(io,socket,defaultActivity,clientTimeoutMSecs);

            console.log("New Display: \t" + display.connectionInformation());
	    
            // Add the new display to the list of displays
            displays.push(display);

            // Assign the roomName to the display
	    let roomName = roomNames.nextFree();
            display.setAndSendRoomName(roomName);

            // Using deviceID as the room identifier
	    let roomID = display.getDeviceID();
            socket.join(roomID);

            display.setAsRoomHost();
            display.setRoomID(roomID);
            display.setCookieMins('roomID',roomID,defaultCookieTimeoutMins)

            //io.to(socket.id).emit("reload"); // This is instead done once the name is set
            display.updateLastInteractionTime();
            
/*
            var currentTime = new Date();
            if (currentTime - ServerEpochStartTime < onStartReloadWindowMSecs) {
                display.message('reload');
            }
*/
	    
        }
    }
    else {
        console.log("Invalid connection request\t Type: " + socket.handshake.query.data + "\tReferer: " + socket.handshake.headers.referer);
    }

    socket.on('connection callback', (response) =>{
        if (response.orientation !== null) {
            console.log("Emiting Orientation: " + response.orientation);
            io.to(response.socket).emit('orientation', response.orientation);
        }
    })

    socket.on('disconnect', () => {
        console.log('Device disconnect: ' + socket.handshake.query.clientID);

        if (socket.handshake.query.data == "client") {
            for (let index = 0; index < clients.length; index++) {
                const client = clients[index];
                if (client.getSocketID() == socket.id) {
                    client.updateLastInteractionTime();                    
                    
                    // Removes itself from room after disconnect is complete
    
                    return;
                }            
            }
        }
	else if (socket.handshake.query.data == "display") {
            for (let index=0; index<displays.length; index++) {
                const display = displays[index];
                if (display.getSocketID() == socket.id) {
		    // Found that display that this 'disconnect' refers to
                    display.updateLastInteractionTime();
    
                    // Check if there is another display that can be made the host
                    var foundNewHost = false;

                    for (let y=0; y<displays.length; y++) {
                        const displayNew = displays[y];
                        if (displayNew.getRoomID() == display.getRoomID() && displayNew.getSocketID() != socket.id) {
                            displayNew.setAsRoomHost();
                            
                            displayNew.message("host",true);
                            //io.to(displayNew.getSocketID()).emit("host",true) ////////////////// This emit hasn't been added to anything
                            foundNewHost = true;
                            break;
                        }                    
                    }

		    if (foundNewHost) {
			console.log("socket.on('disconnect'): Found alternative display, and made it the host");
		    }
		    else {
                        //disconnect all controller-clients from the display and send them back to another room (if sub room) ////////////////////
                        // Otherwise drop connections and wait for clientTimeoutCheck() to remove from connections
			
			console.log("socket.on('disconnect'): No alternative display found to transfer to => Display is disconnected. ");
                    }
		    
                    return;
                }    
            }
        }         
    });

    socket.onAny((event, ...args) => {

        // Check if socket is active (authorised)
        let active = true;
        let display = undefined;
        let client  = undefined;
	
        if (active) {
            var roomID = args[0];
	    
            switch (event) {   
                case "heartbeat":
                    display = findDisplayBySocketID(socket.id)
                    display.updateLastInteractionTime();
                    display.failedConsecutiveHeartbeat = 0;
                    break;

                case "selectActivity":
                    // Client has indicated an activity change
                    var newActivity  = args[1];
		    var optUrlParams = args[2];
                    var callback     = args[3];

                    client = findClientBySocketID(socket.id);
                    if (client != undefined) {
                        client.updateLastInteractionTime();
                        if (client.getRoomID() == roomID) {
                            if (newActivity == "/") {
				newActivity = defaultActivity;                    
			    }

			    var newActivityLabel = getActivityLabel(newActivity)
                            console.log("New activity: '" + newActivityLabel + "' for RoomID: " + roomID);
    
                            display = findHostDisplayByRoomID(roomID);
                            if (display != undefined) {
                                display.activityChange(newActivity,optUrlParams);
    
                                // Nothing is done for any subdisplays who are apart of this roomID. Should this be assumed as part of the reload?
    
                            }
			    else {
                                console.log("Display was undefined based on roomID for activity change. No change occured");
                            }        
                        }  
                    }

		    if (typeof callback === "function") {
			callback();
		    }
                    break;

                case "assignRoomName":
                    // Only displays will call this as per socketCreation.js
                    display = findDisplayBySocketID(socket.id);

                    // If no name could be found then assign new room name, else send current room name
                    if (display.getRoomName() == undefined) {
			let roomName = roomNames.nextFree();
                        display.setAndSendRoomName(roomName);
		    }
                    else {
			display.resendRoomName();
		    }
                    break;
		
                case "displayLoaded":
                    display = findDisplayBySocketID(socket.id);

                    // Check display exists
                    if (display != undefined) {

                        // Turn off saving of messages
                        display.ready = true;
                        let messages = display.getMessages();

                        // Send saved messages to display if there are any
                        if (messages != null) {
                            console.log("Forwarding saved messages for display host to roomID: " + display.getRoomID());
                            messages.forEach(message => {
                                display.message(...message);
                                //io.to(display.getSocketID()).emit(event, clientDeviceID);
                            });
                            display.clearMessages();
                        }
                        
                    }
                    break;
    
                case "displayEmit":    
                    // Indicate an event that the display wants to send to a client or the whole room

                    // Format ('displayEmit',roomID/socket to send to,event,args for event...)
                    //              event          0                 1       2
                    eventToSend = args[1];
                    eventArgs   = args.slice(2);

                    // Hasn't been used with other displays yet, may run into issues
                    display = findDisplayBySocketID(socket.id); // using socket.id as no gaurantee room will be display
		
                    if (display != undefined && display.isRoomHost()) {
                        console.log("Re-emitted display event: " + eventToSend + "\t Args: "+ eventArgs + "\t\tRoomID/Socket: " + roomID);
                        
                        socket.to(roomID).emit(eventToSend,...eventArgs);
                    } else {

                        // New logic has to be written to retrieve who the request was suppoesdly made
                        //console.lost("Non host display attempted to send displayEmit event: " + event + "\tRoomID: " + roomID + "\tDevice ID: " + findClientBySocketID);
                    }    
                    break;

                case "displaySelectActivity":
                    // Display has indicated an activity change
                    var newActivity  = args[1];
		    var optUrlParams = args[2];
                    var callback     = args[3];

                    if (newActivity == "/") {
			newActivity = defaultActivity;                    
		    }

		    var newActivityLabel = getActivityLabel(newActivity)
                    console.log("Display initiated new activity: '" + newActivityLabel + "' for RoomID: " + roomID);
    
                    display = findHostDisplayByRoomID(roomID);
                    if (display != undefined) {
			display.activityChange(newActivity,optUrlParams);
			// Nothing is done for any subdisplays who are apart of this roomID. Should this be assumed as part of the reload?
                    }
		    else {
			console.log("Display was undefined based on roomID for activity change. No change occured");
                    }

		    if (typeof callback === "function") {
			callback();
		    }
                    break;

		
                case "displayReset":
                    // Reset the display back to the default activity and get clients to reload
                    display = findDisplayBySocketID(socket.id);
                    if (display != undefined) {
                        display.activityChange(defaultActivity,null); // Set to default, no optUrlParam to top-level default display
                        display.messageRoom('reload');
                        //io.to(display.getRoomID()).emit('reload'); // Tell all devices to reload
                    }
                    break;

                case 'vote':
                    // Increase vote counter

                    // Someone starts a vote
                    // Server needs to register this against the activity/hostDisplay
                    // Display needs a voteRunning boolean
                    // Display needs 



                    break;

                case 'static':
                    // Set staticActivity cookie
                    client = findClientBySocketID(socket.id);
                    display = findHostDisplayByRoomID(client.getRoomID());
                    client.setCookieMins('staticActivity',display.getCurrentActivity(),staticCookieValidMins);
                    client.setCookieMins("roomID",'',0); // Invalidate old cookie

                    // Remove client
                    clients.forEach(function(clientTemp, index, object) {
                        if (clientTemp == client) {
                            object.splice(index,1);
                        }
                    });

                    // Reload
                    io.to(socket.id).emit("reload");
                    break;

                default:

                    // Allow cotroller-clients only sending to room displays which are the room host    
                    
                    client = findClientBySocketID(socket.id);

                    if (client != undefined) {
                        display = findHostDisplayByRoomID(client.getRoomID());
                        if (display != undefined) {
                            display.message(event, client.getDeviceID(), ...args);
                            client.updateLastInteractionTime();                                
                        }
			else {
                            console.log("Undefined display for RoomID: " + client.getRoomID() + '\tEvent: ' + event);
                        }
                    }
		    else {
                        console.log("Couldn't find controller-client for SocketID: " + socket.id + "\tEvent: " + event);
                    }
    
                    break;
            }
        }        
    })
});

server.listen(httpPort, () => {
    console.log('listening on *:' + httpPort);
});


// Checks every 5 mins to see if client is active
async function clientTimeoutCheck()
{
    setTimeout(() => {
        clients.forEach(function(client, index, object) {
            if (client.timedOut()) {
                object.splice(index, 1);

                client.message('disconnected', 'Your device timed out, likely due to inactivity, and you have been removed from the display session. Scan the QR code again to rejoin.');
                //io.to(client.getSocketID()).emit('error', 'Your device timed out & you have been removed from the session. Scan another QR code to rejoin.');

                let display = findHostDisplayByRoomID(client.getRoomID());
                if (display != undefined) {
                    display.message('clientDisconnect', client.getDeviceID());
                    //io.to(display.getSocketID()).emit('clientDisconnect', client.getDeviceID()); // Inform the display to remove client
                    display.numOfClients--; // Reduce client count for room by one
                }

                console.log("Removed connection: " + client.getDeviceID());

            }
          });
        clientTimeoutCheck();
    }, checkClientTimeoutMSecs);
}


function displayHeartbeat()
{
    setTimeout(() => {
        displays.forEach(function(display, index, object) {
            if (display.timedOut()) {
		display.failedConsecutiveHeartBeat++;
                if (display.failedConsecutiveHeartBeat >= 10) { // (@30 secs => 5 mins) Note: used to be 2
                    // Forget the display, forcing it to reconnect
                    roomNames.release(display.getRoomName());
                    object.splice(index, 1);
                }
		else {
                    display.message('reload'); // Cause the display to catchup and keep ChromeCasts alive
                }
            }
	    else {
                display.message('heartbeat');
            }
        });
        displayHeartbeat();
    }, checkDisplayTimeoutMSecs);
}

// Endless looping calls using setTimeout() to check controller-clients
clientTimeoutCheck(); 

// Endless looping calls using setTime() to check displays
displayHeartbeat();

