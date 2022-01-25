// Set up socket io
const script = document.createElement('script');
script.src = "/socket.io/socket.io.js";
document.head.appendChild(script);

var roomID;
var socket;

// Get the visitor identifier when you need it.
function getVisitorID(type){
    const fpPromise = import('https://openfpcdn.io/fingerprintjs/v3')
    .then(FingerprintJS => FingerprintJS.load());
    
    fpPromise
    .then(fp => fp.get())
    .then(result => startSocket(result.visitorId, type))    
}

function startSocket(visitorID, type){
    if (type == "display"){
        setCookie('roomID',visitorID,10);
        roomID = visitorID;
    }

    console.log("Device ID: " + visitorID);
    console.log("Room ID: " + roomID);

    var url = window.location.host;
    socket = io(url , {
        query: {
            "data" : type,
            "clientID" : visitorID,
            "roomID" : roomID
        }
    });

    socket.on('reload', () => {
        if (type == "display")
            window.location.href = '/activity';
        else
            window.location.href = '/';
    }); 

    socket.on('reconnect', () => {
        if (type == "display")
            window.location.href = '/activity';
        else
            window.location.href = '/';
    }); 

    socket.on('error', (message)=> {
        // Could go to an HTML page instead
        console.log("Error: " + message);
        setCookie('roomID','',0); // Cookie expiers instantly
        window.location.href = '/error/'+ message;
    });

    socket.on('extendRoomID', () => {
        console.log("Cookie duration extended");
        let cookieContent = getCookie('roomID');
        setCookie('roomID',cookieContent, 1000);
    });

    socket.on('setNewCookie', (cName, cContent, cDurationMins) => {        
        setCookie(cName,cContent, cDurationMins);
    });

    const anyListener = (event, ...args) => {
        console.log(event, args);
        socketUpdate(event, args); // This function must exist otherwise sockets will not work
    } // Off by default

    socketLoaded(anyListener);
}    

function selectActivity(activity) {
    socket.emit("selectActivity", roomID, activity, (response) => {
        console.log("Redirecting to " + activity);
        window.location.pathname = '/';
    });
  }

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function setCookie(cname, cvalue, exmins) {
    const d = new Date();
    d.setTime(d.getTime() + (exmins*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function setupConnection(type){
    // Setup logic  
    roomID = getCookie('roomID');
    getVisitorID(type);
}

function vote(userDecision){
    socket.emit('vote')
}