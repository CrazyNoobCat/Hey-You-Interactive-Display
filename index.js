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
const defaultCookieTimeout = 1 * 60 * 1000; // Number of minutes a cookie will last for

app.get('/join/:roomID', (req, res) => {
    if (findHostDisplayByRoomID(req.params.roomID) != undefined){
        // Set a cookie so that the device joins the room of the screen whos QR code was scanned
        res.cookie('roomID', req.params.roomID, {sameSite: true, expires: new Date(Date.now() + (defaultCookieTimeout))}); // Create a cookie which only works on this site and lasts for the default timeout
        res.redirect('/'); // Prevents making a second cookie for a js file
    } else { // If room doesn't exit
        res.redirect("/error/Room doesn't exist, rescan QR code");
    }    
});

app.get('/', (req, res) => {
    // Need to handle hosts that directly navigate to this url isntead of through a room id

    // Currently checking if the cookie is undefined in getCookie. If undefined then returns undefined
    let activity = getActivity(req);

    if(activity != undefined){
        // Check if there is a unique client file in activity otherwise provide default
        if(fs.existsSync(__dirname + activity + '/client.html'))
            res.sendFile(__dirname + activity + '/client.html');
        else 
            res.sendFile(__dirname + defaultActivity + '/client.html')
    } else {
        res.redirect("/error/No valid RoomID found, rescan QR code")
    }    
});

app.get('/activity', (req, res) => {
    // If there is a valid activity then direct display to that activity else go to default activity
    let activity = getActivity(req);
    if (activity != undefined)
        res.sendFile(__dirname + activity +'/index.html') // This is for reconecting displays
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
        activity = display.getCurentActivity();

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
    let activity = getActivity(req);
    if (activity != undefined){
        if (fs.existsSync(__dirname + activity + publicDirectory +req.path)){
            console.log("File sent: " + req.path);
            res.sendFile(__dirname + activity + publicDirectory +req.path);
        }
        else if(fs.existsSync(__dirname + publicDirectory +req.path)){
            console.log("File sent: " + req.path);
            res.sendFile(__dirname + publicDirectory +req.path);
        } // public inside application folder
        else {
            console.log("Failed file get request: " + req.path)
            res.sendStatus(404);
            //res.status(404).send("Requested file does not exist\nError: 404");
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
                        io.to(display.getRoom()).emit('clientDC', client.getDeviceID());
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

            // Using deviceID as the room identifier
            socket.join(display.getDeviceID());

            display.setAsRoomHost();
            display.setRoom(display.getDeviceID());

            io.to(socket.id).emit("reload");
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
    
                    //
    
                    var foundNewHost = false;
                    // Check if there is another display that can be made the host
                    for (let y = 0; y < displays.length; y++) {
                        const displayNew = displays[y];
                        if(displayNew.getRoom() == display.getRoom() && displayNew.getSocketID() != socket.id){
                            displayNew.setAsRoomHost();
                            
                            io.to(displayNew.getSocketID()).emit("new-host") ////////////////// This emit hasn't been added to anything
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

                    if (activitySelected == "/")
                        activitySelected = defaultActivity;                    

                    console.log("New activity: " + activitySelected + "\tRoom: " + room);

                    display = findHostDisplayByRoomID(room);
                    if (display != undefined){
                        display.activityChange(activitySelected);

                        // Nothing is done for any subdisplays who are apart of this room.. Should this be assumed as part of the reload?

                        io.to(room).emit('reload'); // This is relying on the trust that the clients room id is correct and not presaved???
                    } else {
                        console.log("Display was undefined based on roomID for activity change. No change occured");
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
                                let event = message[0];
                                let clientDeviceID = message[1];    
                                io.to(display.getSocketID()).emit(event, clientDeviceID);
                            });
                            display.clearMessages();
                        }
                        
                    }
                    break;
    
                case "displayEmit":    
                    // Indicate an event that the display wants to send to all clients/displays in room

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
                        io.to(display.getRoom()).emit('reload'); // Tell all devices to reload
                    }
                    break;

                case 'vote':
                    // Increase vote counter

                    // Someone starts a vote
                    // Server needs to register this against the activity/hostDisplay
                    // Display needs a voteRunning boolean
                    // Display needs 



                    break;

                default:

                    // Allow clients only sending to room displays which are the room host    
                    
                    client = findClientBySocketID(socket.id);

                    if (client != undefined){
                        if (client.getRoom() == room){
                            display = findHostDisplayByRoomID(room);
                            if (display != undefined){
                                if(display.ready){
                                    console.log("event: " + event + "\tClient: " + client.getDeviceID());
                                    io.to(display.getSocketID()).emit(event, client.getDeviceID()); // Send only to room host
                                    client.updateLastInteractionTime();
                                    console.log("Re-emitted event: " + event + "\t\tRoom: " + room + "\tDeviceID: " + client.getDeviceID());
                                } else {
                                    // When display is not ready save the messages to it
                                    display.addMessage(event,client.getDeviceID());
                                }   
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

clientTimeoutCheck();

// Checks every second to see if client is active
async function clientTimeoutCheck(){
    setTimeout(() => {
        clients.forEach(function(client, index, object) {
            if (client.timedOut()) {
                object.splice(index, 1);

                io.to(client.getSocketID()).emit('error', 'Your device timed out & you have been removed from the session. Scan another QR code to rejoin.');

                let display = findHostDisplayByRoomID(client.getRoom());
                if (display != undefined){
                    io.to(display.getSocketID()).emit('clientDC', client.getDeviceID()); // Inform the display to remove client
                    display.numOfClients--; // Reduce client count for room by one
                }

                console.log("Removed connection: " + client.getDeviceID());

            }
          });
        clientTimeoutCheck();
    }, 1000);   
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
}

function findHostDisplayByRoomID(roomID){
    for (let index = 0; index < displays.length; index++) {
        const display = displays[index];
        if (display.getRoom() == roomID && display.isRoomHost()){
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

function findClientBySocketID(socketID){
    for (let index = 0; index < clients.length; index++) {
        const client = clients[index];
        if (client.getSocketID() == socketID){
            return client;
        }                    
    }
}

function getActivity(req){
    let display = findHostDisplayByRoomID(getCookie(req,"roomID"));
    if (display != undefined)
        return display.getCurentActivity();
    else 
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

    // Only used for displays
    #host = false;
    ready = false;
    #messages = []; // All messages which the display hasn't recieved due to it not being ready 
    numOfClients = 0;
    
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
        io.to(this.#socket.id).emit('extendRoomID'); // Informs the socket to extend it's cookie validty
    }

    addMessage(event, clientDeviceID){
        this.#messages.push([event, clientDeviceID]);
    }
    
    clearMessages(){this.#messages = []};


    // Getters

    getDeviceID(){return this.#socket.handshake.query.clientID;}
    getSocketID(){return this.#socket.id;}
    getType(){return this.#socket.handshake.query.data;}
    getCurentActivity(){return this.#currentActivity;} // Should I be treating this as another connection class?? Or should I have its own class for activities or displays?
    getLastActivity(){return this.#lastActivity;}
    getInitalConnection(){return this.#initalConnectionTime;}
    getLastInteraction(){return this.#lastInteractionTime;}
    getRoom(){return this.#room;}
    isRoomHost(){return this.#host;}
    getMessages(){return this.#messages;}

    // Debug information

    connectionInformation(){
        var debugText = "DeviceID: " + this.getDeviceID() + "\tType: " + this.getType() + "\tRoom ID: " + this.getRoom();
        return debugText;
    }

}