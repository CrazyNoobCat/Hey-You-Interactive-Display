// Set up socket io
const script = document.createElement('script');
script.src = "/socket.io/socket.io.js";
document.head.appendChild(script);

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
    console.log(visitorID);
    var url = window.location.host;
    socket = io(url , {
        query: {
            "data" : type,
            "clientID" : visitorID
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
}    

function setupConnection(type){
    // Setup logic 
    getVisitorID(type);
}