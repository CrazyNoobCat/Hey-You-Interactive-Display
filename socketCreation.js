// Set up socket io
const script = document.createElement('script');
script.src = "/socket.io/socket.io.js";
document.head.appendChild(script);


function getVisitorID(){
    const fpPromise = import('https://openfpcdn.io/fingerprintjs/v3')
    .then(FingerprintJS => FingerprintJS.load());
    
    fpPromise
    .then(fp => fp.get())
    .then(result => setupSocket(result.visitorId))    
}

function setupSocket(visitorID){
    console.log(visitorID);
    var socketType = 'display';
    var url = window.location.host;
    socket = io(url , {
        query: {
            "data" : socketType,
            "clientID" : visitorID
        }
    });

    socket.on('reload', () => {
        window.location.href = '/activity';
    }); 
}    