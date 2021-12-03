const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const fs = require('fs');
const publicDirectory = "/public";

var clients = []; // An array containing all the clients. 
var displays = []; // An array containing all displays.

var activity = '';

/*app.get('*', (req, res) => {
    switch(req.path){
        case '/activity':

            break;

        default:
            if(fs.existsSync(__dirname + publicDirectory +req.path)){
                console.log("File sent: " + req.path);
                res.sendFile(__dirname + publicDirectory +req.path);
            }
            else {
                console.log("Failed file get request: " + req.path)
                res.status(404).send("Requested file does not exist\nError: 404");
            }
            break;
    }
});*/

app.get('/activity', (req, res) => {
    // If there is a valid activity then direct display to that activity else go to waiting screen
    res.sendFile(__dirname + activity + '/index.html');
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + activity + '/client.html');
});

app.get('/Sounds', (req, res) => {
    res.sendFile(__dirname + activity + '/Sounds');
});

app.get('/main.js', (req, res) => {
    res.sendFile(__dirname + activity + '/Scripts/main.js');
});

app.get('/dashboard', (req, res) => {
    res.sendFile(__dirname + '/dashboard.html');
});

app.get('/socketCreation.js', (req,res) => {
    res.sendFile(__dirname + '/socketCreation.js');
});

app.get('*', (req, res) => {
    if(fs.existsSync(__dirname + publicDirectory +req.path)){
        console.log("File sent: " + req.path);
        res.sendFile(__dirname + publicDirectory +req.path);
    }
    else {
        console.log("Failed file get request: " + req.path)
        res.status(404).send("Requested file does not exist\nError: 404");
    }
});

io.on('connection', (socket, host) => {

    // Check if this new socket is already a recorded connection

    var newConnection = true;

    if (socket.handshake.query.data == "client"){
        for (let index = 0; index < clients.length; index++) {
            if (clients[index].getDeviceID == socket.handshake.query.clientID){
                // Handle updating socket information for this reconnecting device

                clients[index].setNewSocket = socket;
                console.log(clientTemp.connectionInformation());
                newConnection = false ;
            }
        }

        if (newConnection){
            // Handle creating a new Connection instance for this device

            var client = new Connection(socket,null);

            // Add the new client to the list of clients
            clients.push(client);

            console.log(client.connectionInformation());

            // TEMPORARY SHOULD BE USING rooms//////////////............
            displays.forEach(display =>{
                io.to(display.getSocketID()).emit('client connection', client.getSocketID());
            });
        }
    } 
    else if (socket.handshake.query.data == "display"){
        
        for (let index = 0; index < displays.length; index++) {
            if (displays[index].getDeviceID == socket.handshake.query.clientID){
                // Handle updating socket information for this reconnecting device
                displays[index].setNewSocket = socket;

                console.log(displayTemp.connectionInformation());
                break;
            }
        }

        if (newConnection){
            // Handle creating a new Connection instance for this device

            var display = new Connection(socket,null,null);

            // Add the new display to the list of displays
            displays.push(display);

            socket.join()

            // Do displays get a choice of which room to join on first connection
            // Create a new room//////////////////////////
            /* Room identifiers:
            device id
            socket id (to displays even need a device id?)
            Incrementing number kept as a count by the server
            


            */


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
        console.log('Device inactive: ' + socket.handshake.query.clientID);

        if (socket.handshake.query.data == "client"){
            for (let index = 0; index < clients.length; index++) {
                if (clients[index].getSocketID == socket.id){
                    clients[index].updateLastInteractionTime();
                    
                    
                    // Removes itself from room after disconnect is complete
    
                    return;
                }            
            }
        } else if (socket.handshake.query.data == "display"){
            for (let index = 0; index < displays.length; index++) {
                if (displays[index].getSocketID == socket.id){
                    displays[index].updateLastInteractionTime();
    
                    //
    
                    var foundNewHost = false;
                    // Check if there is another display that can be made the host
                    for (let y = 0; y < displays.length; y++) {
                        if(displays[y].getRoom() == displays[index].getRoom() && displays[y].getSocketID() != socket.id){
                            displays[y].setAsRoomHost();
                            
                            io.to(displays[y].getSocketID()).emit("new-host") ////////////////// This emit hasn't been added to anything
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
        var active = false;

        for (let index = 0; index < clients.length; index++) {
            if (clients[index].getSocketID() == socket.id){
                active = true;
                break;
            }
        }

        if (active){
            switch (event) {
                case "playerColour":
                    var client = args[0];
                    var colour = args[1];
                    console.log("Emitting colour: " + colour + " to: " + client);
                    io.to(client).emit('playerColour', colour);
                    break;
                
                case "selectGame":
                    var selected = args[0];
                    var callback = args[1];
                    console.log("New activity selected: " + selected);
                    activity = selected;
                    displays.forEach(displaySocket =>{
                        io.to(displaySocket.getSocketID()).emit('reload');
                    });         
                    clients.forEach(client =>{
                        io.to(client.getSocketID()).emit('reload');
                    });       
                    callback();
    
                case "displayEmit":          
    
                    // Find the display who sent this emit and send to all clients in the same room as that display
                    for (let index = 0; index < displays.length; index++) {
                        if (displays[index].getSocketID() == socket.id){
                            // Only allow hosts to send to the room
                            if (displays[index].isRoomHost()){
                                console.log("Re-emitted display event: " + event + "\tRoom: " + displays[index].getRoom());
                                socket.to(displays[index].getRoom()).emit(emit);
                            } else {
                                console.lost("Non host display attempted to send displayEmit event: " + event + "\tRoom: " + displays[index].getRoom() + "\tDevice ID: " + displays[index].getDeviceID())
                            }
                            break;
                        }                    
                    }
    
                    break;
    
                default:
                    console.log("Re-emitted event: " + event + "\tRooms: " + socket.rooms);
    
                    // Allow only sending to room displays which are the room host
    
                    displays.forEach(display => {
                        if (socket.rooms.has(display.getRoom()) && display.isRoomHost()){
                            io.to(display.getSocketID()).emit(event);
                        }
                    });
    
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

                io.to(client.getSocketID()).emit('timeout');

                console.log("Removed connection: " + client.getDeviceID());

            }
          });
        clientTimeoutCheck();
    }, 1000);   
}

class Connection{
    static timeOutLimit = 60000; // 1 Minutes

    // # before a variable here indicates private

    // Analytics variables
    #lastActivity;
    #currentActivity;
    #initalConnectionTime;
    

    // Connection variables
    #socket;
    #room;

    #host = false;
    
    #lastInteractionTime;
    
    constructor(socket, activity, room){
        this.#socket = socket;
        this.#currentActivity = activity; // Connection class itself;
        this.#room = room;

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
        this.#lastActivity = this.#currentActivity;
        this.#currentActivity = activity;
    }
    setNewSocket(socket){
        this.#socket = socket;
        this.#lastInteractionTime = Date.now();
    } // Occurs on connection change or region
    setRoom(room){
        this.#room = room;
    }
    setAsRoomHost(){this.#host = true;}

    removeAsRoomHost(){this.#host = false;}
    
    updateLastInteractionTime(){ this.#lastInteractionTime = Date.now();}


    // Getters

    getDeviceID(){return this.#socket.handshake.query.clientID;}
    getSocketID(){return this.#socket.id;}
    getType(){return this.#socket.handshake.query.data;}
    getCurentActivityType(){return this.#currentActivity.getType();} // Should I be treating this as another connection class?? Or should I have its own class for activities or displays?
    getLastActivity(){return this.#lastActivity;}
    getInitalConnection(){return this.#initalConnectionTime;}
    getLastInteraction(){return this.#lastInteractionTime;}
    getRoom(){return this.#room;}
    isRoomHost(){return this.#host;}

    // Debug information

    connectionInformation(){
        var debugText = "DeviceID: " + this.getDeviceID() + "\tType: " + this.getType() + "\tConnection start: " + Date(this.getInitalConnection()) + "\tLast Interaction: " + Date(this.getLastInteraction());
        return debugText;
    }

}