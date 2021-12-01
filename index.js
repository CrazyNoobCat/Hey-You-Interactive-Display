const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const cookie = require("cookie");

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
    console.log(__dirname + activity + '/Scripts/main.js');
    res.sendFile(__dirname + activity + '/Scripts/main.js');
});

app.get('/dashboard', (req, res) => {
    res.sendFile(__dirname + '/dashboard.html');
});

io.on('connection', (socket, host) => {
    // Socket type (display or controller)
    var socketType = socket.handshake.query.data;
    var deviceID = socket.handshake.query.clientID;
    var ipAddr = socket.handshake.address;

    console.log("Connection attempt...\t Device ID: " + deviceID + "\tSocket ID: " + socket.id +'\t    Type: ' + socketType + "\tIP: " + ipAddr);
    //console.log("ip: "+socket.request.connection.remoteAddress);
    //console.log("user-agent: "+socket.request.headers['user-agent']);
    // Add display
    if (socketType == "display"){
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
        
    }

    socket.on('connection callback', (response) =>{
        if (response.orientation !== null) {
            console.log("Emiting Orientation: " + response.orientation);
            io.to(response.socket).emit('orientation', response.orientation);
        }
    })

    socket.on('disconnect', () => {
        console.log('dc info: ' +   socket.id);

        // if the display disconnects, release the associated displaySocket variable
        if (displaySockets.includes(socket.id)){
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
        }

        /*else if (hostController == socket.id){
            hostController = null;
            if (controllerSockets.length > 0 && activity == '') {
                io.to(controllerSockets[0]).emit('select activity');
                controllerSockets.shift();
            }
            console.log(socketType + ' disconnected');
        }*/

        
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
                controllerSockets.forEach(controllerSocket =>{
                    io.to(controllerSocket).emit('reload');
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
