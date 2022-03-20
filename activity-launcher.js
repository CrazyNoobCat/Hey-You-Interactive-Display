
const fs          = require('fs');
const express     = require('express');
const http        = require('http');

const { Server }  = require("socket.io");
const { Console } = require('console');

const Connection    = require('./connection');
const ShortNames    = require('./shortNames')
const shortNames    = new ShortNames('shortURLnames.txt');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

const publicDirectory = "/public";
const httpPort = process.env.PORT || 3000;

// The general setup of Hey You is as follows:
//  
//   1. A 'display' starts by showing the home page to the activity-launcher
//
//   2. When a 'client' (phone-based user) connects via the QR code
//      (or else by entering the URL the activity-launcher displays) they
//      are shown (on their phone) a list of apps that can be launched
//
//   3. Upon selecting an app (activity) from the list, the display is 
//      send the relevent activities/<activity>/index.html and the
//      phone changed to display the controller for the activity
//      activities/<activity>client.html
//
//   4. If another client joins a display while it us running an app,
//      then then client is directly provided the controller for
//      that app


var displays = []; // An array containing all displays
var clients  = []; // An array containing all the clients

const defaultActivity      = '';
const defaultActivityLabel = 'Activity-Launcher (Default)';
const defaultCookieTimeout = 1 * 60 * 1000; // Number of milliseconds a cookie will last for
const staticCookieValidMins = 120; // Valid for 2 hours by default
const activityLocation = __dirname + '/activities';

const start = new Date(); // This is the time which the server started. Use to reload connections after a restart
const onStartReloadWindow = 2 * 60 * 1000

console.log("Start time: " + start);

function getCookie(req,cookieName){
    let cookies = req.headers.cookie; 
    if (cookies == undefined)
        return undefined;

    let splitCookie = cookies.split('; ');
    for (let index = 0; index < splitCookie.length; index++) {
        const current = splitCookie[index];
        const content = current.split('=');
        if (content[0] == cookieName){
            return content[1];
        }
        
    }
    return undefined;
}

function findHostDisplayByRoomID(roomID){
    for (let index = 0; index < displays.length; index++) {
        const display = displays[index];
        if (display.getRoom() == roomID && display.isRoomHost()){
            return display;
        }
    }
}

function findHostDisplayByName(name){
    for (let index = 0; index < displays.length; index++) {
        const display = displays[index];
        if (display.getShortName() == name){
            return display;
        }                    
    }
}

function findDisplayBySocketID(socketID){
    for (let index = 0; index < displays.length; index++) {
        const display = displays[index];
        if (display.getSocketID() == socketID){
            return display;
        }                    
    }
}

function findAllClientsByRoomID(roomID){
    let foundClients = [];
    for (let index = 0; index < clients.length; index++) {
        const client = clients[index];
        if (client.getRoom() == roomID){
            foundClients.push(client);
        }                    
    }
    return foundClients;
}

function findAllClientsByRoomName(roomName){
    let roomID = findHostDisplayByName(roomName).getRoom();
    return findAllClientsByRoomID(roomID);
}

function findClientBySocketID(socketID){
    for (let index = 0; index < clients.length; index++) {
        const client = clients[index];
        if (client.getSocketID() == socketID){
            return client;
        }                    
    }
}

function getStaticActivity(req){
    let activity = getCookie(req,"staticActivity");
    console.log("Static Activity: " + activity);
    if (fs.existsSync(__dirname + activity))
        return activity;    

    return undefined;
}

function getActivity(req){
    let display = findHostDisplayByRoomID(getCookie(req,"roomID"));
    if (display != undefined)
        return display.getCurrentActivity();
    
    return undefined;
}


function sendActivityFile(res, path, fileName, activityLabel){
    if (fs.existsSync(path)) {
        res.sendFile(path);
        console.log("File sent: " + fileName + "\t\tActivity: " + activityLabel);
    } 
    else {
        res.sendStatus(404);
        console.log("Failed file retrival: " + fileName + "(File not found) \t\tActivity: " + activityLabel);
    }
    
}


function consoleInput() { // Console Commands
    const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    })
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
                if (identifier != undefined){
                    if (identifier === "all"){
                        clients.forEach(client => {
                            console.log("DeviceID: " + client.getDeviceID() +"\tRoom: " + client.getRoom());
                        });
                    }
                    else if (identifier.length > 15){ // For roomIDs
                        findAllClientsByRoomID(identifier).forEach(client => {
                            console.log(client.getDeviceID());
                        });
                    } 
                    else { // For roomNames
                        findAllClientsByRoomName(identifier).forEach(client => {
                            console.log(client.getDeviceID());
                        });
                    }  
                } else {
                    console.log("Missing command arguments. Use help for more information");
                }                
            } 
            else if (line === "clear"){
                console.clear();              
            } 
            else if (line.startsWith("changeActivity",0)) {
		let lineTokens = line.split(" ");
		
                let roomName     = lineTokens[1];
                let optUrlParams = (lineTokens.length>=3) ? lineTokens[2] : null;

                let display = findHostDisplayByName(roomName);		
                display.activityChange(display, optUrlParams);
            }
            else if (line === "displays"){                
                displays.forEach(display => {
                    console.log("DeviceID: " + display.getDeviceID() +"\tRoomName: " + display.getShortName());
                });
            }
            else {
                console.log(`unknown command: "${line}"`);
            }
            rl.prompt();
        }).on('close',function(){
            resolve(exitCode) // this is the final result of the function
        });
    })
}
  
async function enableConsole() {
    try {
        let result = await consoleInput()
        console.log('Exit Code: ', result)
        process.exit(result);

    } catch(e) {
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

app.get('/join/:roomID', (req, res) => {
    console.log("Room join request: " + req.params.roomID);
    if (findHostDisplayByRoomID(req.params.roomID) != undefined){
        // Set a cookie so that the device joins the room of the screen whos QR code was scanned
        res.cookie('roomID', req.params.roomID, {sameSite: true, expires: new Date(Date.now() + (defaultCookieTimeout))}); // Create a cookie which only works on this site and lasts for the default timeout
        res.redirect('/'); // Prevents making a second cookie for a js file
        console.log("New device joined with roomID: " + req.params.roomID);
    } else if ((display = findHostDisplayByName(req.params.roomID)) != undefined) {
        res.cookie('roomID', display.getDeviceID(), {sameSite: true, expires: new Date(Date.now() + (defaultCookieTimeout))}); // Create a cookie which only works on this site and lasts for the default timeout
        res.redirect('/'); // Prevents making a second cookie for a js file
        console.log("New device joined with roomName: " + req.params.roomID);
    }  
    else { // If room doesn't exit
        res.redirect("/error/Unable to find that Display-id or Display-name");
    }    
});



app.get('/', (req, res) => {
    // Currently checking if the cookie is undefined in getCookie. If undefined then returns undefined
    let activity = getActivity(req);

    if(activity != undefined){
        // Check if there is a unique client file in activity otherwise provide default
        if(fs.existsSync(activityLocation + activity + '/client.html'))
            sendActivityFile(res, activityLocation + activity + '/client.html','/client.html',activity)
        else 
            sendActivityFile(res, __dirname + defaultActivity + '/client.html','/client.html',activity)
    } 
    else {
        // Check that there is no static Cookie
        activity = getStaticActivity(req);
        if (activity != undefined){
            if(fs.existsSync(activityLocation + activity + '/static.html'))
                sendActivityFile(res, activityLocation + activity + '/static.html', "/static.html", activity)
            else 
                sendActivityFile(res, __dirname + defaultActivity + '/static.html', "static.html", defaultActivityLabel)
        } else {
	    let roomID = getCookie(req,"roomID");
	    let staticActivity = getCookie(req,"staticActivity");

	    if ((roomID == undefined) && (staticActivity == undefined)) {
		res.redirect("/disconnected/No active display connection found.  This can be caused by client controller inactivity. Scan the QR Code again to rejoin");
	    }
	    else {
		res.redirect("/error/No valid Display-id or Standalone App-id found. Try scanning an new QR Code.");
	    }
        }
    }    
});

// Shortcut for the accessing the top-level display
app.get('/display', (req, res) => {
    res.redirect('/activity');
});

	
app.get('/activity', (req, res) => {
    // If there is a valid activity then direct display to that activity else go to default activity
    let activity = getActivity(req);
    
    if (activity != undefined){
        if (fs.existsSync(activityLocation + activity +'/index.html'))
            sendActivityFile(res, activityLocation + activity +'/index.html','/index.html',activity); // This is for reconecting displays
        else{
            sendActivityFile(res,__dirname + defaultActivity +'/index.html','/index.html',activity); // This is for activities not existing  
            console.log("File Error: Activity (" + activity +") didn't exist so default was sent to device: " + req.params.roomID);
        }
    }
    else {
	console.log("/activity serving up default activity index.html to client IP: " + req.ip);
	console.log("[For the curious, the request header IPs field is set to: " + req.ips +"]");
        sendActivityFile(res, __dirname + defaultActivity +'/index.html', '/index.html', defaultActivityLabel); // This is for new displays
    }   
});



/* similar to the above, but driven directly by URL provided by the top-level client */
// ****
// Currently not used (more testing and debugging needed)
// ****

/*
app.get('/activities/:activity/:fileName', (req, res) => {
    let activity = "/" + req.params.activity;
    let fileName = "/" + req.params.fileName;

    if (fileName == "/") {
	fileName += "index.html";
    }
    
    if (fs.existsSync(activityLocation + activity + fileName))
        sendActivityFile(res, activityLocation + activity + fileName,fileName,activity); 
    else{
        console.log("File Error: requested file " + fileName + " did not exist for activity " + activity +".  Attempting to send so default activity version to device: " + req.params.roomID);
        sendActivityFile(res,__dirname + defaultActivity + fileName,fileName,activity); 
    }
});
*/


app.get('/scripts/:fileName', (req, res) => {
    // Allow only files from verifiable activities
    let activity = getActivity(req)

    if (activity != undefined){
        sendActivityFile(res, activityLocation + activity + '/scripts/' + req.params.fileName, req.params.fileName, activity);
    } else {
        res.sendStatus(403); //
        console.log("Failed file retrival: " + req.params.fileName + "(Not associated with an activity) \treq roomID: " + req.params.roomID);
    }

    let display = findHostDisplayByRoomID(getCookie(req,"roomID"));
    if (display != undefined)
        activity = display.getCurrentActivity();

});

// '/disconnected' is really an alias to /error, but is a preferred URL to show to the use
// in certain situations
app.get('*/disconnected/:error', (req, res) => {
    res.cookie('error', req.params.error, {sameSite: true, expires: new Date(Date.now() + (defaultCookieTimeout))});
    res.redirect('/disconnected');
});

app.get('/disconnected', (req, res) => {
    res.sendFile(__dirname + '/error.html');
});

app.get('*/error/:error', (req, res) => {
    res.cookie('error', req.params.error, {sameSite: true, expires: new Date(Date.now() + (defaultCookieTimeout))});
    res.redirect('/error');
});

app.get('/error', (req, res) => {
    res.sendFile(__dirname + '/error.html');
});

app.get('/socketCreation.js', (req,res) => {
    res.sendFile(__dirname + '/socketCreation.js');
});

app.get('*', (req, res) => {
    // Send a file if it can be found inside either the public folder for the activity for the client or generic public folder
    // Requests from nonclients will be redirected to an error page
    let activity = getActivity(req);
    
    if (activity != undefined || req.params.roomName != undefined){
        if (fs.existsSync(activityLocation + activity + publicDirectory + req.path))
            sendActivityFile(res, activityLocation + activity + publicDirectory + req.path, req.path, activity);
        else if(fs.existsSync(__dirname + publicDirectory + req.path))
            sendActivityFile(res,__dirname + publicDirectory +req.path, req.path, activity);
        else {
            console.error("404 Error: Failed file retrival '" + req.path + "' (File not found) \tActivity: " + activity);
            res.sendStatus(404);
        }
    } else {
	if(fs.existsSync(__dirname + publicDirectory + req.path)) {
            sendActivityFile(res,__dirname + publicDirectory +req.path, req.path, activity);
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
        for (let index = 0; index < clients.length; index++) {
            const client = clients[index];
            if (client.getDeviceID() == socket.handshake.query.clientID) {
                // Handle updating socket information for this reconnecting device

                if (client.getRoom() != socket.handshake.query.roomID) {
                    let display = findHostDisplayByRoomID(client.getRoom());

                    if (display != undefined) {
                        display.message('clientDC', client.getDeviceID());
                        //io.to(display.getRoom()).emit('clientDC', client.getDeviceID());
                        display.numOfClients--; // Reduce client count by one for old room.
                    } else {
                        // Error
			console.error("io.on('connection'): When disconnecting old connection, did not find a display for roomID '" + client.getRoom());
                    }

                    display = findHostDisplayByRoomID(client.getRoom());

                    if (display != undefined) {
                        client.setRoom(socket.handshake.query.roomID);
                        display.numOfClients++; // Increase client count for new room by one.
                    } else {
                        // Error
			console.error("io.on('connection'): When setting up new conection, did not find a display for roomID '" + client.getRoom());
                    }                    
                }

                client.setNewSocket(socket);

                socket.join(client.getRoom());
                socket.join(client.getDeviceID());

                console.log("Client rejoined: \t" + client.connectionInformation());
                newConnection = false ;
            }
        }

        if (newConnection){
            // Handle creating a new Connection instance for this device

            var client = new Connection(io,socket,defaultActivity,defaultCookieTimeout);
	    
            // Add the new client to the list of clients

            let display = findHostDisplayByRoomID(client.getRoom());

            if (display != undefined){
                console.log("New Client: \t" + client.connectionInformation());

                clients.push(client);

                //Join client to room
                socket.join(client.getRoom());
                socket.join(client.getDeviceID())

                display = findHostDisplayByRoomID(client.getRoom());
                display.numOfClients++; // Increase client count for new room by one.

                var currentTime = new Date();
                if (currentTime - start < onStartReloadWindow){
                    client.message('reload');
                }

            }
	    else {
                // Could send error since there is no valid display for the client //////////////////////////
		console.error("io.on('connection'): Unable to form client-display socket connection, as no display found for for roomID '" + client.getRoom());
            }            
        }
    } 
    else if (socket.handshake.query.data == "display"){
        
        for (let index = 0; index < displays.length; index++) {
            const display = displays[index];
            if (display.getDeviceID() == socket.handshake.query.clientID){
                // Handle updating socket information for this reconnecting device
                console.log("Socket update for display (device id): " + display.getDeviceID());

                display.setNewSocket(socket);

                socket.join(display.getRoom());

                if (Date.now() - display.getLastInteraction() > 10000){
                    io.to(socket.id).emit("reload");
                    display.updateLastInteractionTime();
                } // 10 seconds

                newConnection = false;
                break;
            }
        }

        if (newConnection){
            // Handle creating a new Connection instance for this device
            let display = new Connection(io,socket,defaultActivity,defaultCookieTimeout);

            console.log("New Display: \t" + display.connectionInformation());
	    
            // Add the new display to the list of displays
            displays.push(display);

            // Assign the shortname to the display
            display.setShortName(shortNames.nextFree());

            // Using deviceID as the room identifier
	        let roomID = display.getDeviceID();
            socket.join(roomID);

            display.setAsRoomHost();
            display.setRoom(roomID);
            display.setCookie('roomID',roomID,defaultCookieTimeout) // mins => 1 day

            //io.to(socket.id).emit("reload"); // This is instead done once the name is set
            display.updateLastInteractionTime();
            

            var currentTime = new Date();
            if (currentTime - start < onStartReloadWindow){
                display.message('reload');
            }
        }
    } else {
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

        if (socket.handshake.query.data == "client"){
            for (let index = 0; index < clients.length; index++) {
                const client = clients[index];
                if (client.getSocketID() == socket.id){
                    client.updateLastInteractionTime();                    
                    
                    // Removes itself from room after disconnect is complete
    
                    return;
                }            
            }
        } else if (socket.handshake.query.data == "display"){
            for (let index = 0; index < displays.length; index++) {
                const display = displays[index];
                if (display.getSocketID() == socket.id){
                    display.updateLastInteractionTime();
    
                    var foundNewHost = false;
                    // Check if there is another display that can be made the host
                    for (let y = 0; y < displays.length; y++) {
                        const displayNew = displays[y];
                        if(displayNew.getRoom() == display.getRoom() && displayNew.getSocketID() != socket.id){
                            displayNew.setAsRoomHost();
                            
                            displayNew.message("host",true);
                            //io.to(displayNew.getSocketID()).emit("host",true) ////////////////// This emit hasn't been added to anything
                            foundNewHost = true;
                            break;
                        }                    
                    }
    
                    if (!foundNewHost){
                        
                        //disconnect all clients from the display and send them back to another room (if sub room) ////////////////////
                        // Otherwise drop connections and wait for 5min timeout to remove from connections
    
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
        let client = undefined;

        if (active){
            var room = args[0];

            switch (event) {   
                case "heartbeat":
                    display = findDisplayBySocketID(socket.id)
                    display.updateLastInteractionTime();
                    display.failedConsecutiveHeartbeat = 0;
                    break;

                case "selectActivity":
                    // Client has indicated an activity change
                    var activitySelected = args[1];
		    var optUrlParams     = args[2];
                    var callback         = args[3];

                    client = findClientBySocketID(socket.id);
                    if (client != undefined) {
                        client.updateLastInteractionTime();
                        if (client.getRoom() == room){
                            if (activitySelected == "/") {
				activitySelected = defaultActivity;                    
			    }
			    
                            console.log("New activity: " + activitySelected + "\tRoom: " + room);
    
                            display = findHostDisplayByRoomID(room);
                            if (display != undefined) {
                                display.activityChange(activitySelected,optUrlParams);
    
                                // Nothing is done for any subdisplays who are apart of this room.. Should this be assumed as part of the reload?
    
                            } else {
                                console.log("Display was undefined based on roomID for activity change. No change occured");
                            }        
                        }  
                    }
                                              

                    callback();
                    break;

                case "assignRoomName":
                    // Only displays will call this as per socketCreation.js
                    display = findDisplayBySocketID(socket.id);

                    // If no name could befound then assign new short name, else send current shortname
                    if (display.getShortName == undefined)
                        display.setShortName(shortNames.nextFree());
                    else 
                        display.resendShortName();
                    break;

                case "displayLoaded":
                    display = findDisplayBySocketID(socket.id);

                    // Check display exists
                    if (display != undefined){

                        // Turn off saving of messages
                        display.ready = true;
                        let messages = display.getMessages();

                        // Send saved messages to display if there are any
                        if (messages != null){
                            console.log("Forwarding saved messages for display host to room: " + display.getRoom());
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

                    // Format ('displayEmit',room/socket to send to,event,args for event...)
                    //              event          0                 1       2
                    eventToSend = args[1];
                    eventArgs   = args.slice(2);

                    // Hasn't been used with other displays yet, may run into issues
                    display = findDisplayBySocketID(socket.id); // using socket.id as no gaurantee room will be display

                    if (display != undefined && display.isRoomHost()) {
                        console.log("Re-emitted display event: " + eventToSend + "\t Args: "+ eventArgs + "\t\tRoom/Socket: " + room);
                        
                        socket.to(room).emit(eventToSend,...eventArgs);
                    } else {

                        // New logic has to be written to retrieve who the request was suppoesdly made
                        //console.lost("Non host display attempted to send displayEmit event: " + event + "\tRoom: " + room + "\tDevice ID: " + findClientBySocketID);
                    }    
                    break;

                case "displayReset":
                    // Reset the display back to the default activity and get clients to reload
                    display = findDisplayBySocketID(socket.id);
                    if (display != undefined) {
                        display.activityChange(defaultActivity,null); // Set to default, no optUrlParam to top-level default display
                        display.messageRoom('reload');
                        //io.to(display.getRoom()).emit('reload'); // Tell all devices to reload
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
                    display = findHostDisplayByRoomID(client.getRoom());
                    client.setCookie('staticActivity',display.getCurrentActivity(),staticCookieValidMins);
                    client.setCookie("roomID",'',0); // Invalidate old cookie

                    // Remove client
                    clients.forEach(function(clientTemp, index, object) {
                        if (clientTemp == client){

                            object.splice(index,1);
                        }
                    });

                    // Reload
                    io.to(socket.id).emit("reload");
                    break;

                default:

                    // Allow clients only sending to room displays which are the room host    
                    
                    client = findClientBySocketID(socket.id);

                    if (client != undefined){
                        display = findHostDisplayByRoomID(client.getRoom());
                        if (display != undefined){
                            display.message(event, client.getDeviceID(), ...args);
                            client.updateLastInteractionTime();                                
                        } else {
                            console.log("Undefined display for RoomID: " + client.getRoom() + '\tEvent: ' + event);
                        }
                    } else {
                        console.log("Couldn't find client from SocketID: " + socket.id + "\tEvent: " + event);
                    }
    
                    break;
            }
        }        
    })
});

server.listen(httpPort, () => {
    console.log('listening on *:' + httpPort);
});

clientTimeoutCheck(); // Call the next function and then let it loop

// Checks every 5 to see if client is active
async function clientTimeoutCheck()
{
    setTimeout(() => {
        clients.forEach(function(client, index, object) {
            if (client.timedOut()) {
                object.splice(index, 1);

                client.message('disconnected', 'Your device timed out, likely due to inactivity, and you have been removed from the display session. Scan the QR code again to rejoin.');
                //io.to(client.getSocketID()).emit('error', 'Your device timed out & you have been removed from the session. Scan another QR code to rejoin.');

                let display = findHostDisplayByRoomID(client.getRoom());
                if (display != undefined){
                    display.message('clientDC', client.getDeviceID());
                    //io.to(display.getSocketID()).emit('clientDC', client.getDeviceID()); // Inform the display to remove client
                    display.numOfClients--; // Reduce client count for room by one
                }

                console.log("Removed connection: " + client.getDeviceID());

            }
          });
        clientTimeoutCheck();
    }, 5000);   
}

displayHeartbeat();

function displayHeartbeat(){
    setTimeout(() => {
        displays.forEach(function(display, index, object) {
            if (display.timedOut()){
                if (display.failedConsecutiveHeartBeat++ >= 10){ // (@30 secs => 5 mins) Note: used to be 2
                    // Forget the display, forcing it to reconnect
                    shortNames.release(display.getShortName());
                    object.splice(index, 1);
                } else {
                    display.message('reload'); // Cause the display to catchup and keep ChromeCasts alive
                }

            } else {
                display.message('heartbeat');
            }
        });
        displayHeartbeat();
    }, 30 * 1000); // 30 seconds
}
