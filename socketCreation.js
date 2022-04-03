// Set up socket io
//const script = document.createElement('script');
//script.src = "/socket.io/socket.io.js";
//document.head.appendChild(script);

const DisplayCookieTimeoutMins   = 10;

var RoomID;
var Socket;

// Get the visitor identifier when you need it.
function getVisitorIDOpenFP(type)
{
    const fpPromise = import('https://openfpcdn.io/fingerprintjs/v3')
    .then(FingerprintJS => FingerprintJS.load());
    
    fpPromise
    .then(fp => fp.get())
    .then(result => startSocket(result.visitorId, type))    
}

function getVisitorID(type)
{
    var request = $.ajax({
	method: "GET",
	url:    "/getSessionID",
	dataType: "json"
    });

    request.done(function(jsonData) {
	console.log( "getVisitorID() JSON data returned: " + JSON.stringify(jsonData) );
	var visitorID = type + "-" + jsonData.sessionID;
	startSocket(visitorID, type);	
    });

    request.fail(function(jqXHR,textStatus) {
	alert( "/getSessionID request failed: " + textStatus );
    });    
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
        RoomID = getCookie('roomID'); // Must be a controller so get roomID
	console.log("startSocket(): From Cookie, Room ID:" + RoomID);	
    }

    var url = window.location.host;
    Socket = io(url , {
        query: {
            "data"         : type,
            "controllerID" : visitorID,
            "roomID"       : RoomID
        }
    });

    Socket.on('reload', (optUrlParams) => {
        if (type == "display") {
	    let full_href = "/display";
	    if (optUrlParams !== null) {
		full_href += "?" + optUrlParams;
	    }
            window.location.href = full_href;
	}
        else {
            window.location.href = '/controller';
	}
    }); 

    Socket.on('reconnect', () => {
        if (type == "display")
            window.location.href = '/display';
        else
            window.location.href = '/controller';
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
        Socket.emit('heartbeat');
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
    if (typeof launchRandomActivityTimeout !== "undefined") {
	console.log("Canceling launchRandomActivity");
	clearTimeout(launchRandomActivityTimeout);
    }
        
    Socket.emit("selectActivity", RoomID, activity, optUrlParams, (response) => {
        console.log("Redirecting to " + activity);
        window.location.pathname = '/controller'; // Consider passing on the optUrlParms to the controller web page also?
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

    // For details about SameSite, see:
    //   https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
    
    var cookie = cname + "=" + cvalue + "; "
    if (window.location.protocol == "https:") {
	cookie += "SameSite=Strict; Secure; "
    }
    cookie += expires + "; path=/";

    document.cookie = cookie
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
