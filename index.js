const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const fs = require('fs');
const { Console } = require('console');
const publicDirectory = "/public";

var clients = []; // An array containing all the clients. 
var displays = []; // An array containing all displays.

const defaultActivity = '';
const defaultCookieTimeout = 1000 * 60 * 1000; // Number of minutes a cookie will last for

const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
})

function consoleInput() { // Console Commands
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
                console.log(`Commands:\n\tclients {roomName/ID}/all\n\texit\n\tclear\n\tchangeActivity {roomName} {folder}\n\tdisplays\n`);
            } 
            else if (line.startsWith("clients",0)) {
                console.log("Clients: ")
                let identifier = line.split(" ")[1]; // Get the 2nd parsed value
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
            } 
            else if (line === "clear"){
                console.clear();              
            } 
            else if (line.startsWith("changeActivity",0)){
                let roomName = line.split(" ")[1];
                let folder = line.split(" ")[2];
                let display = findHostDisplayByName(roomName);
                display.activityChange(display);
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

enableConsole()

app.get('/join/:roomID', (req, res) => {
    if (findHostDisplayByRoomID(req.params.roomID) != undefined){
        // Set a cookie so that the device joins the room of the screen whos QR code was scanned
        res.cookie('roomID', req.params.roomID, {sameSite: true, expires: new Date(Date.now() + (defaultCookieTimeout))}); // Create a cookie which only works on this site and lasts for the default timeout
        res.redirect('/'); // Prevents making a second cookie for a js file
    } else if ((display = findHostDisplayByName(req.params.roomID)) != undefined) {
        res.cookie('roomID', display.getDeviceID(), {sameSite: true, expires: new Date(Date.now() + (defaultCookieTimeout))}); // Create a cookie which only works on this site and lasts for the default timeout
        res.redirect('/'); // Prevents making a second cookie for a js file
    }  
    else { // If room doesn't exit
        res.redirect("/error/Room doesn't exist, rescan QR code");
    }    
});

app.get('/', (req, res) => {
    // Currently checking if the cookie is undefined in getCookie. If undefined then returns undefined
    let activity = getActivity(req);
    console.log(activity);

    if(activity != undefined){
        // Check if there is a unique client file in activity otherwise provide default
        if(fs.existsSync(__dirname + activity + '/client.html'))
            res.sendFile(__dirname + activity + '/client.html');
        else 
            res.sendFile(__dirname + defaultActivity + '/client.html')
    } 
    else {
        // Check that there is no static Cookie
        activity = getStaticActivity(req);
        console.log(activity);
        if (activity != undefined){
            if(fs.existsSync(__dirname + activity + '/static.html'))
                res.sendFile(__dirname + activity + '/static.html');
            else 
                res.sendFile(__dirname + defaultActivity + '/static.html')
        } else {
            res.redirect("/error/No valid RoomID or Static Activity found, rescan QR code")
        }
    }    
});

app.get('/activity', (req, res) => {
    // If there is a valid activity then direct display to that activity else go to default activity
    let activity = getActivity(req);
    if (activity != undefined){
        if (fs.existsSync(__dirname + activity +'/index.html'))
            res.sendFile(__dirname + activity +'/index.html') // This is for reconecting displays
        else
            res.sendFile(__dirname + defaultActivity +'/index.html'); // This is for new displays  
    }
    else 
        res.sendFile(__dirname + defaultActivity +'/index.html'); // This is for new displays
});

app.get('/scripts/:fileName', (req, res) => {
    // Allow only files from verifiable activities
    let activity = getActivity(req)

    if (activity != undefined){
        console.log("File sent Activity: " + activity + "\tFile: " + req.params.fileName);
        res.sendFile(__dirname + activity + '/scripts/' + req.params.fileName);
    } else {
        res.redirect("/error/No valid RoomID found, rescan QR code");
    }

    let display = findHostDisplayByRoomID(getCookie(req,"roomID"));
    if (display != undefined)
        activity = display.getCurrentActivity();

});

app.get('*/error/:error', (req, res) => {
    res.cookie('error', req.params.error, {sameSite: true, expires: new Date(Date.now() + (1 * 60 * 1000))});
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
    if (activity != undefined){
        if (fs.existsSync(__dirname + activity + publicDirectory + req.path)){
            console.log("File sent: " + activity + publicDirectory + req.path);
            res.sendFile(__dirname + activity + publicDirectory + req.path);
        }
        else if(fs.existsSync(__dirname + publicDirectory +req.path)){
            console.log("File sent: " + publicDirectory + req.path);
            res.sendFile(__dirname + publicDirectory +req.path);
        }
        else {
            console.log("Failed file get request: " + req.path)
            res.sendStatus(404);
        }
    } else {
        res.redirect("/error/No valid RoomID found, rescan QR code");
    }
    
});

io.on('connection', (socket, host) => {

    // Check if this new socket is already a recorded connection

    var newConnection = true;

    if (socket.handshake.query.data == "client"){
        for (let index = 0; index < clients.length; index++) {
            const client = clients[index];
            if (client.getDeviceID() == socket.handshake.query.clientID){
                // Handle updating socket information for this reconnecting device

                if (client.getRoom() != socket.handshake.query.roomID){

                    console.log("here");

                    let display = findHostDisplayByRoomID(client.getRoom());

                    if (display!= undefined){
                        display.message('clientDC', client.getDeviceID());
                        //io.to(display.getRoom()).emit('clientDC', client.getDeviceID());
                        display.numOfClients--; // Reduce client count by one for old room.
                    } else {
                        // Error
                    }

                    display = findHostDisplayByRoomID(client.getRoom());

                    if (display!= undefined){
                        client.setRoom(socket.handshake.query.roomID);
                        display.numOfClients++; // Increase client count for new room by one.
                    } else {
                        // Error 
                    }

                    
                }

                client.setNewSocket(socket);

                socket.join(client.getRoom());
                socket.join(client.getDeviceID());

                console.log("Client rejoined: " + client.connectionInformation());
                newConnection = false ;
            }
        }

        if (newConnection){
            // Handle creating a new Connection instance for this device

            var client = new Connection(socket,defaultActivity);  

            // Add the new client to the list of clients

            let display = findHostDisplayByRoomID(client.getRoom());

            if (display != undefined){
                clients.push(client);

                //Join client to room
                socket.join(client.getRoom());
                socket.join(client.getDeviceID())

                display = findHostDisplayByRoomID(client.getRoom());
                display.numOfClients++; // Increase client count for new room by one.

                console.log("New Client: " + client.connectionInformation());
            } else {
                // Could send error since there is no valid display for the client //////////////////////////
            }

            
        }
    } 
    else if (socket.handshake.query.data == "display"){
        
        for (let index = 0; index < displays.length; index++) {
            const display = displays[index];
            if (display.getDeviceID() == socket.handshake.query.clientID){
                // Handle updating socket information for this reconnecting device
                display.setNewSocket(socket);

                socket.join(display.getRoom());

                console.log("Socket update for display (device id): " + display.getDeviceID());

                console.log(Date.now() - display.getLastInteraction());
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

            let display = new Connection(socket,defaultActivity);

            // Add the new display to the list of displays
            displays.push(display);

            // Assign the shortname to the display
            assignShortName(display);

            // Using deviceID as the room identifier
            socket.join(display.getDeviceID());

            display.setAsRoomHost();
            display.setRoom(display.getDeviceID());
            display.setCookie('roomID',display.getDeviceID(),1440) // 1 day

            //io.to(socket.id).emit("reload"); // This is instead done once the name is set
            display.updateLastInteractionTime();
            
            console.log(display.connectionInformation());
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
                case "selectActivity":
                    // Client has indicated an activity change
                    var activitySelected = args[1];
                    var callback = args[2]

                    client = findClientBySocketID(socket.id);
                    if (client != undefined) {
                        client.updateLastInteractionTime();
                        if (client.getRoom() == room){
                            if (activitySelected == "/")
                            activitySelected = defaultActivity;                    
    
                            console.log("New activity: " + activitySelected + "\tRoom: " + room);
    
                            display = findHostDisplayByRoomID(room);
                            if (display != undefined){
                                display.activityChange(activitySelected);
    
                                // Nothing is done for any subdisplays who are apart of this room.. Should this be assumed as part of the reload?
    
                            } else {
                                console.log("Display was undefined based on roomID for activity change. No change occured");
                            }        
                        }  
                    }
                                              

                    callback();

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
                                display.message(message);
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
                    eventArgs = args[2];

                    // Hasn't been used with other displays yet, may run into issues
                    display = findDisplayBySocketID(socket.id); // using socket.id as no gaurantee room will be display

                    if (display != undefined && display.isRoomHost()) {
                        console.log("Re-emitted display event: " + eventToSend + "\t With args: "+ eventArgs + "\t\tRoom/Socket: " + room);
                        
                        socket.to(room).emit(eventToSend,eventArgs);
                    } else {

                        // New logic has to be written to retrieve who the request was suppoesdly made
                        //console.lost("Non host display attempted to send displayEmit event: " + event + "\tRoom: " + room + "\tDevice ID: " + findClientBySocketID);
                    }    
                    break;

                case "displayReset":
                    // Reset the display back to the default activity and get clients to reload
                    display = findDisplayBySocketID(socket.id);
                    if (display != undefined){
                        display.activityChange(defaultActivity); // Set to default
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
                    client.setCookie('staticActivity',display.getCurrentActivity(),60); // Only valid for an hour
                    client.setCookie("roomID",'',0.0001); // Invalidate old cookie

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
                        if (client.getRoom() == room){
                            display = findHostDisplayByRoomID(room);
                            if (display != undefined){
                                display.message(event, client.getDeviceID(), args[0]);
                                client.updateLastInteractionTime();                                
                            } else {
                                console.log("Undefined display for RoomID: " + room + '\tEvent: ' + event);
                            }
                        } else {
                            console.log("Non room client attempted to send to room host. Room: " + room + "\tClient Device ID: " + client.getDeviceID());
                        }
                    } else {
                        console.log("Couldn't find client from SocketID: " + socket.id + "\tEvent: " + event);
                    }
    
                    break;
            }
        }        
    })
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});

clientTimeoutCheck(); // Call the next function and then let it loop

// Checks every second to see if client is active
async function clientTimeoutCheck(){
    setTimeout(() => {
        clients.forEach(function(client, index, object) {
            if (client.timedOut()) {
                object.splice(index, 1);

                client.message('error', 'Your device timed out & you have been removed from the session. Scan another QR code to rejoin.');
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
    }, 1000);   
}

async function assignShortName(display){
    fs.readFile('shortURLnames.txt', 'utf8', (err, data) => {
        if (err){
            console.error(err);
            return;
        }
        let names = data.split('\n');    
        if (displays.length < names.length)
            display.setShortName(names[displays.length -1]);
        else
            display.setShortName(displays.length - 1);
    })
}

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

class Connection{
    static timeOutLimit = defaultCookieTimeout;

    // # before a variable here indicates private

    // Analytics variables
    #lastActivity;
    #currentActivity;
    #initalConnectionTime;
    

    // Connection variables
    #socket;
    #room;
    ready = false;

    // Only used for displays
    #host = false;
    #messages = []; // All messages which the display hasn't recieved due to it not being ready 
    numOfClients = 0;
    #shortName = null;
    
    // Only used for clients
    #lastInteractionTime;
    
    constructor(socket, activity){
        this.#socket = socket;
        this.#currentActivity = activity; // Connection class itself;
        this.#room = socket.handshake.query.roomID;

        this.#initalConnectionTime = Date.parse(socket.handshake.time);
        this.updateLastInteractionTime();
    }

    //

    timedOut(){
        if (Date.now() - this.#lastInteractionTime > Connection.timeOutLimit)
            return true;
        else
            return false;        
    }

    // Setters
    activityChange(activity){
        this.ready = false; // Allows time for the ready status to be set to true and enables saving of messages.   
        this.#lastActivity = this.#currentActivity;
        this.#currentActivity = activity;
        this.messageRoom('reload');
        //io.to(this.#room).emit('reload');
    }
    setNewSocket(socket){
        this.#socket = socket;
        this.#lastInteractionTime = Date.now();
    } // Occurs on connection change or region
    setRoom(room){
        // Should probably have some logic for removing from the old room
        this.#room = room;
    }
    setAsRoomHost(){this.#host = true;}

    removeAsRoomHost(){this.#host = false;}
    
    updateLastInteractionTime(){
        this.#lastInteractionTime = Date.now();
        console.log("socket id: " + this.#socket.id);
        if (this.#host == true || this.#shortName != null || this.numOfClients > 0) // Characteristics of a display
            return;
        else
            this.message('extendRoomID');
            //io.to(this.#socket.id).emit('extendRoomID'); // Informs the socket to extend it's cookie validty
    }

    addMessage(...args){
        this.#messages.push([...args]);
    }
    
    clearMessages(){this.#messages = []};

    setShortName(name){
        this.#shortName = name
        this.setCookie('roomName',name,1440 * 365); // 1 year
        this.message('reload');
    };

    setCookie(cName, cContent, cDurationMins){
        this.message('setNewCookie', cName, cContent, cDurationMins);
    }


    // Getters

    getDeviceID(){return this.#socket.handshake.query.clientID;}
    getSocketID(){return this.#socket.id;}
    getType(){return this.#socket.handshake.query.data;}
    getCurrentActivity(){return this.#currentActivity;} // Should I be treating this as another connection class?? Or should I have its own class for activities or displays?
    getLastActivity(){return this.#lastActivity;}
    getInitalConnection(){return this.#initalConnectionTime;}
    getLastInteraction(){return this.#lastInteractionTime;}
    getRoom(){return this.#room;}
    isRoomHost(){return this.#host;}
    getMessages(){return this.#messages;}
    getShortName(){return this.#shortName;}

    // Debug information

    connectionInformation(){
        var debugText = "DeviceID: " + this.getDeviceID() + "\tType: " + this.getType() + "\tRoom ID: " + this.getRoom();
        return debugText;
    }

    // Functions
    message(...args){ // Handles sending socket updates to device
        if(this.ready){
            console.log("Message sent to: " + this.getDeviceID() + "\tArgs: " + args);
            io.to(this.getSocketID()).emit(...args);
            //io.to(display.getSocketID()).emit(event, client.getDeviceID(), args[0]); // Send only to room host
        } else {
            // When device is not ready save the messages to it
            this.addMessage(args);
        }   
    }

    messageRoom(...args){
        io.to(this.getRoom()).emit(...args);
    }

}
