// Set up socket io
const script = document.createElement('script');
script.src = "/socket.io/socket.io.js";
document.head.appendChild(script);

const DisplayCookieTimeoutMins   = 10;

var RoomID;
var Socket;

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
    console.log("startSocket(): Visitor ID: " + visitorID + " (type=" + type + ")");

    if (type == "display") {
        setCookieMins('roomID',visitorID,DisplayCookieTimeoutMins);
        RoomID = visitorID;
	console.log("startSocket(): Set Room ID to be:" + RoomID);	
    }
    else {
        RoomID = getCookie('roomID'); // Must be a client so get roomID
	console.log("startSocket(): From Cookie, Room ID:" + RoomID);	
    }

    var url = window.location.host;
    Socket = io(url , {
        query: {
            "data"     : type,
            "clientID" : visitorID,
            "roomID"   : RoomID
        }
    });

    Socket.on('reload', (optUrlParams) => {
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

    Socket.on('reconnect', () => {
        if (type == "display")
            window.location.href = '/activity';
        else
            window.location.href = '/';
    }); 

    Socket.on('loadPage', (page) => {
        window.location.href = page;
    }); 

    Socket.on('disconnected', (message)=> {
        // Could go to an HTML page instead
        console.log("Disconnected: " + message);
        setCookieMins('roomID','',0); // Cookie expires instantly
        window.location.href = '/disconnected/'+ message;
    });

    Socket.on('error', (message)=> {
        // Could go to an HTML page instead
        console.log("Error: " + message);
        setCookieMins('roomID','',0); // Cookie expires instantly
        window.location.href = '/error/'+ message;
    });

    Socket.on('extendRoom', (durationMins) => {
        console.log("Cookie duration extended for roomID and roomName (if defined)");
        let cookieContent = getCookie('roomID');
        setCookieMins('roomID',cookieContent, durationMins); // Extend cookie duration by above duration
        cookieContent = getCookie('roomName');
        if (cookieContent != '') {
            setCookieMins('roomName',cookieContent, durationMins); // Extend cookie duration by above duration
	}
    });

    Socket.on('heartbeat', () => {
        Socket.emit('heartbeat'); // **** Can this be replaced with this.emit() ???
        console.log("heartbeat");
    });

    Socket.on('setNewCookieMins', (cName, cContent, cDurationMins) => {
        setCookieMins(cName,cContent, cDurationMins);
    });

    const anyListener = (...args) => {
        console.log(...args);
        socketUpdate(...args); // This function must exist otherwise sockets will not work
    } // Off by default

    
    // Ensure roomName is present before returning

    if (type == 'display') {
        roomName = getCookie('roomName')
        if (roomName == '') {
            Socket.emit('assignRoomName');
	}
    }

    socketLoaded(anyListener);
}    

function selectActivity(activity,optUrlParams)
{
    Socket.emit("selectActivity", RoomID, activity, optUrlParams, (response) => {
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
    Socket.emit('vote');
}

function static(){
    Socket.emit('static');
}
