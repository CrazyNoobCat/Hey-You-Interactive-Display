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
    
    if (type == "display"){
        socket.on('reload', () => {
            window.location.href = '/activity';
        }); 

        socket.on('reconnect', () => {
            window.location.href = '/activity';
        }); 
    } else if (type == "client"){
        socket.on('reload', () => {
            window.location.href = '/';
        }); 
        socket.on('reconnect', () => {
            window.location.href = '/activity';
        }); 
    }    

    socket.on('timeout', () => {
        // Could go to an HTML page instead
        alert("Connection timed out. Refresh to rejoin.");
    });

    socketLoaded();
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