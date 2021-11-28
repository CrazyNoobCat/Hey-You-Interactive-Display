const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

var controllerSockets = [];
var hostController;

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

app.get('/PongMultiplayer', (req, res) => {
    res.sendFile(__dirname + activity + '/pongMultiplayer.html');
});

// Dont think this is used
//app.get('/controllerInput.js', (req, res) => {
//    var file = activity + '/controllerInput.js';
//    res.sendFile(__dirname + file);
//});

app.get('/selectActivity', (req, res) => {
    res.sendFile(__dirname + '/hostController.html');
});

app.get('/main.js', (req, res) => {
    console.log(__dirname + activity + '/Scripts/main.js');
    res.sendFile(__dirname + activity + '/Scripts/main.js');
});

app.get('/qr-code', (req, res) => {
    res.sendFile(__dirname + '/qr.png');
});

app.get('/dashboard', (req, res) => {
    res.sendFile(__dirname + '/dashboard.html');
});

io.on('connection', (socket, host) => {
    // getting the type from the socket (display or controller)
    var socketType = socket.handshake.query.data;
    // Show the id of the new socket
    console.log(socket.id +' socket connected: ' + socketType + ' ' + controllerSockets.length);
    // if the socket is a display save it to the displaySockets variable (if there isn't already a display)
    if (socketType == "display"){
        displaySockets.push(socket.id);
        // adds all the already existing controllers to the new display instance
        controllerSockets.forEach(control =>{
            io.to(socket.id).emit('controller connection', control);
        });
    }
    // if the socket is a controller send it to the display socket
    if (socketType == "controller"){
        if (hostController == null) hostController = socket.id;
        controllerSockets.push(socket.id);
        if (activity == '') io.to(hostController).emit("select activity");
        console.log("Triggering emit to controller with response");        
        displaySockets.forEach(displaySocket =>{
            io.to(displaySocket).emit('controller connection', socket.id);
        });
    }

    // if (host) {
    //     if (hostController != null){
    //         io.to(socket).emit('reconnect');
    //         console.log("There is already a host controller");
    //     }
    // }

    socket.on('connection callback', (response) =>{
        if (response.orientation !== null) {
            console.log("Emiting Orientation: " + response.orientation);
            io.to(response.socket).emit('orientation', response.orientation);
        }
    })

    socket.on('disconnect', () => {
        // if the display disconnects, release the associated displaySocket variable
        if (displaySockets.includes(socket.id)){
            console.log("Removed a display socket");
            //io.emit('reconnect');
            try{
                // remove it from the list of displaySockets
                var index = displaySockets.indexOf(socket.id);
                displaySockets.splice(index, 1);
            }
            catch(e){
                console.log("ERROR: " + e);
                return;
            }
        }

        // if a controller disconnects
        // check it is in our list of controllers
        if (controllerSockets.includes(socket.id)) {
            try{
                // remove it from the list of controllers
                var index = controllerSockets.indexOf(socket.id);
                controllerSockets.splice(index, 1);
                // tell display to remove the controller
                displaySockets.forEach(displaySocket =>{
                    io.to(displaySocket).emit('controller disconnection', socket.id);
                });
                
                if (hostController == socket.id) {
                    if (controllerSockets.length > 0) {
                        hostController = controllerSockets[0];
                    }
                    else hostController = null;
                }
            }
            catch(e){
                console.log("ERROR: " + e);
                return;
            }
        }
        console.log(socketType + ' user disconnected');
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
                displaySockets.forEach(displaySocket =>{
                    io.to(displaySocket).emit('reload');
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
