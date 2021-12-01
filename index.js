const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const fs = require('fs');
const { type } = require('os');
const publicDirectory = "/public";

var clients = []; // An array containing all the clients. 
var displays = []; // An array containing all displays.

var controllerSockets = [];

var displaySockets = [];
var activity = '';

app.get('/activity', (req, res) => {
    // If there is a valid activity then direct display to that activity else go to waiting screen
    res.sendFile(__dirname + activity + '/index.html');
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + activity + '/controller.html');
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

    if (socket.handshake.query.data == "controller"){
        var clientTemp = null;
        for (let index = 0; index < clients.length; index++) {
            if (clients[index].getDeviceID == socket.handshake.query.clientID){
                clientTemp = clients[index];
                break;
            }
        }

        if (clientTemp != null){
            // Handle updating socket information for this reconnecting device

            var index = clients.indexOf(clientTemp)

            clients[index].setNewSocket = socket;

            console.log(clientTemp.connectionInformation());

        } else {
            // Handle creating a new Connection instance for this device

            var client = new Connection(socket,null);

            // Add the new client to the list of clients
            clients.push(client);

            console.log(client.connectionInformation());

            // TEMPORARY SHOULD BE USING rooms//////////////............
            displays.forEach(display =>{
                io.to(display.getSocketID()).emit('controller connection', client.getSocketID());
            });
        }
    } 
    else if (socket.handshake.query.data == "display"){
        var displayTemp = null;
        for (let index = 0; index < displays.length; index++) {
            if (displays[index].getDeviceID == socket.handshake.query.clientID){
                displayTemp = displays[index];
                break;
            }
        }

        if (displayTemp != null){
            // Handle updating socket information for this reconnecting device

            var index = displays.indexOf(displayTemp)

            displays[index].setNewSocket = socket;

            console.log(displayTemp.connectionInformation());

        } else {
            // Handle creating a new Connection instance for this device

            var display = new Connection(socket,null);

            // Add the new display to the list of displays
            displays.push(display);

            console.log(display.connectionInformation());
        }
    } else {
        console.log("Invalid connection request\t Type: " + socket.handshake.query.data + "\tReferer: " + socket.handshake.headers.referer);
    }
    



    // Socket type (display or controller)
    //var socketType = socket.handshake.query.data;
    //var deviceID = socket.handshake.query.clientID;
    //var ipAddr = socket.handshake.address;

    //console.log("Connection attempt...\t Device ID: " + deviceID + "\tSocket ID: " + socket.id +'\t    Type: ' + socketType + "\tIP: " + ipAddr);
    //console.log("ip: "+socket.request.connection.remoteAddress);
    //console.log("user-agent: "+socket.request.headers['user-agent']);
    // Add display
    /*if (socketType == "display"){
        displaySockets.push(socket.id);

        // Add all existing controllers to the new display
        controllerSockets.forEach(control =>{
            io.to(socket.id).emit('controller connection', control);
        });
        console.log("Connection success...\t Device ID: " + deviceID + "\tSocket ID: " + socket.id +'\t    Type: ' + socketType +'('+ displaySockets.length +')'+ "\tIP: " + ipAddr);
    }
    // Add controller
    else if (socketType == "controller"){
        // Add to array
        controllerSockets.push(socket.id);

        // Add the new controller to all displays   
        displaySockets.forEach(displaySocket =>{
            io.to(displaySocket).emit('controller connection', socket.id);
        });
        
        console.log("Connection success...\t Device ID: " + deviceID + "\tSocket ID: " + socket.id +'\t    Type: ' + socketType +'('+ controllerSockets.length +')'+ "\tIP: " + ipAddr); 
        
    }*/

    socket.on('connection callback', (response) =>{
        if (response.orientation !== null) {
            console.log("Emiting Orientation: " + response.orientation);
            io.to(response.socket).emit('orientation', response.orientation);
        }
    })

    socket.on('disconnect', () => {
        console.log('Device inactive: ' + socket.handshake.query.clientID);

        for (let index = 0; index < clients.length; index++) {
            if (clients[index].getSocketID == socket.id){
                clients[index].updateLastInteractionTime();
                // Remove from room //////////////////////////////

                return;
            }            
        }

        for (let index = 0; index < displays.length; index++) {
            if (displays[index].getSocketID == socket.id){
                displays[index].updateLastInteractionTime();
                // Remove from room //////////////////////////////
                // Remove all clients from room //////////////////
                return;
            }    
        }



        // if the display disconnects, release the associated displaySocket variable
        /*if (displaySockets.includes(socket.id)){
            try{
                // remove it from the list of displaySockets
                var index = displaySockets.indexOf(socket.id);
                displaySockets.splice(index, 1);
                
            }
            catch(e){
                console.log("ERROR: " + e);
                return;
            }
            console.log(socketType + ' disconnected');
        }

        // if a controller disconnects
        // check it is in our list of controllers
        else if (controllerSockets.includes(socket.id)) {
            try{
                // remove it from the list of controllers
                var index = controllerSockets.indexOf(socket.id);
                controllerSockets.splice(index, 1);
                // tell display to remove the controller
                displaySockets.forEach(displaySocket =>{
                    io.to(displaySocket).emit('controller disconnection', socket.id);
                });             
            }
            catch(e){
                console.log("ERROR: " + e);
                return; 
            }

            console.log(socketType + ' disconnected');
        } */       
    });

    socket.onAny((event, ...args) => {
        switch (event) {
            case "playerColour":
                var controller = args[0];
                var colour = args[1];
                console.log("Emitting colour: " + colour + " to: " + controller);
                io.to(controller).emit('playerColour', colour);
                break;
            
            case "selectGame":
                var selected = args[0];
                var callback = args[1];
                console.log("New activity selected: " + selected);
                activity = selected;
                displays.forEach(displaySocket =>{
                    io.to(displaySocket.getSocketID()).emit('reload');
                });         
                controllerSockets.forEach(controllerSocket =>{
                    io.to(clients.getSocketID()).emit('reload');
                });       
                callback();

            default:
                console.log("Re-emitted event: " + event);
                io.emit(event, socket.id);
                break;
        }
    })
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});

class Connection{
    static timeOutLimit = 300000 // 5 Minutes

    // # before a variable here indicates private

    // Analytics variables
    #lastActivity;
    #currentActivity;
    #initalConnectionTime;

    // Connection variables
    #socket;
    
    #lastInteractionTime;
    
    constructor(socket, activity){
        this.#socket = socket;
        this.#currentActivity = activity; // Connection class itself;

        this.#initalConnectionTime = Date.parse(socket.handshake.time);
        this.updateLastInteractionTime();
    }

    //

    timedOut(){
        if (Date.now() - this.#lastInteractionTime > timeOutLimit)
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
    
    updateLastInteractionTime(){ this.#lastInteractionTime = Date.now();}


    // Getters

    getDeviceID(){return this.#socket.handshake.query.clientID;}
    getSocketID(){return this.#socket.id;}
    getType(){return this.#socket.handshake.query.data;}
    getCurentActivityType(){return this.#currentActivity.getType();} // Should I be treating this as another connection class?? Or should I have its own class for activities or displays?
    getLastActivity(){return this.#lastActivity;}
    getInitalConnection(){return this.#initalConnectionTime;}
    getLastInteraction(){return this.#lastInteractionTime;}

    // Debug information

    connectionInformation(){
        var debugText = "DeviceID: " + this.getDeviceID() + "\tType: " + this.getType() + "\tConnection start: " + Date(this.getInitalConnection()) + "\tLast Interaction: " + Date(this.getLastInteraction());
        return debugText;
    }

}