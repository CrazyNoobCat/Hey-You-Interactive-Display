// Set up socket io
const script = document.createElement('script');
script.src = "/socket.io/socket.io.js";
document.head.appendChild(script);

const DisplayCookieTimeoutMins   = 10;

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

function startSocket(visitorID, type)
{
    if (type == "display"){
        setCookieMins('roomID',visitorID,DisplayCookieTimeoutMins);
        roomID = visitorID;
    }
    else {
        roomID = getCookie('roomID'); // Must be a client so get roomID
    }

    console.log("startSocket: Device ID: " + visitorID);
    console.log("startSocket: Room ID:   " + roomID);

    var url = window.location.host;
    socket = io(url , {
        query: {
            "data" : type,
            "clientID" : visitorID,
            "roomID" : roomID
        }
    });

    socket.on('reload', (optUrlParams) => {
        if (type == "display") {
	    let full_href = "/activity";
	    if (optUrlParams !== null) {
		full_href += "?" + optUrlParams;
	    }
            window.location.href = full_href;
	    //window.location.href = '/activity';
	}
        else {
            window.location.href = '/';
	}
    }); 

    socket.on('reconnect', () => {
        if (type == "display")
            window.location.href = '/activity';
        else
            window.location.href = '/';
    }); 

    socket.on('loadPage', (page) => {
        window.location.href = page;
    }); 

    socket.on('disconnected', (message)=> {
        // Could go to an HTML page instead
        console.log("Disconnected: " + message);
        setCookieMins('roomID','',0); // Cookie expiers instantly
        window.location.href = '/disconnected/'+ message;
    });

    socket.on('error', (message)=> {
        // Could go to an HTML page instead
        console.log("Error: " + message);
        setCookieMins('roomID','',0); // Cookie expiers instantly
        window.location.href = '/error/'+ message;
    });

    socket.on('extendRoom', (durationMins) => {
        console.log("Cookie duration extended");
        let cookieContent = getCookie('roomID');
        setCookieMins('roomID',cookieContent, durationMins); // Extend cookie duration by above duration
        cookieContent = getCookie('roomName');
        if (cookieContent != '')
            setCookieMins('roomName',cookieContent, durationMins); // Extend cookie duration by above duration
    });

    socket.on('heartbeat', () => {
        socket.emit('heartbeat');
        console.log("heartbeat");
    });

    socket.on('setNewCookieMins', (cName, cContent, cDurationMins) => {
        setCookieMins(cName,cContent, cDurationMins);
    });

    const anyListener = (...args) => {
        console.log(...args);
        socketUpdate(...args); // This function must exist otherwise sockets will not work
    } // Off by default

    // Ensure roomName is present before returning

    if (type == 'display'){
        roomName = getCookie('roomName')
        if (roomName == '')
            socket.emit('assignRoomName');
    }

    socketLoaded(anyListener);
}    

function selectActivity(activity,optUrlParams)
{
    socket.emit("selectActivity", roomID, activity, optUrlParams, (response) => {
        console.log("Redirecting to " + activity);
        window.location.pathname = '/'; // Consider passing on the optUrlParms to the client web page also?
    });   
}

function getCookie(cname) {
    let name = cname + "=";    
    let ca = listDecodedURICookies();
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

function listDecodedURICookies(){
    let decodedCookie = decodeURIComponent(document.cookie);
    return decodedCookie.split(';');
}

function setCookieMins(cname, cvalue, expireMins) {
    const d = new Date();
    d.setTime(d.getTime() + (expireMins*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";

    console.log(`set/update cookie: ${cname}=${cvalue} (${expires})`);
}

function setupConnection(type){
    
    // Once the window has loaded then setup will start
    // Makes sure all required files are loaded before starting

    window.addEventListener('load', function() { 
        getVisitorID(type);         
    });    
}

function vote(userDecision){
    socket.emit('vote');
}

function static(){
    socket.emit('static');
}
