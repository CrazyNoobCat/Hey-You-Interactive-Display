const fs      = require('fs');
const path    = require('path');
const express = require('express');
const session = require('express-session');
const cors    = require('cors');
const http    = require('http');

const qr      = require('qr-image'); 

const { v4: uuidv4 } = require('uuid');
const { Server }     = require("socket.io");
const { Console }    = require('console');


const Connection       = require('./Connection');
const GlobalSettings   = require('./GlobalSettings');
const RoomNames        = require('./RoomNames')
const SlideshowGenJSON = require('./SlideshowGenJSON');

// Add date+timestamps in front of console messages
require('console-stamp')(console, { 
    format: ':date(yyyy/mm/dd HH:MM:ss.l) :label' 
} );

let gs = new GlobalSettings("etc/activity-launcher-conf.json");

if (!gs.initialized()) {
    console.error("Error encountered configuring global settings to server. Terminating!");
    process.exit();
}

//
// Various Settings-based Constants
//
const controllerTimeoutMins       = gs.get('Timeout.controllerCookieMins');  // Number of mins a controller will be displayed for, with no interactivity
const defaultCookieTimeoutMins    = gs.get('Timeout.defaultCookieMins');     // Number of mins a controller cookie will last for
const staticCookieValidMins       = gs.get('Timeout.staticCookieValidMins'); // Valid for 2 hours by default

const checkControllerTimeoutMSecs = gs.get('Timeout.checkControllerMSecs');   // The time between scans, checking for remaining active controllers
const checkDisplayTimeoutMSecs    = gs.get('Timeout.checkDisplayMSecs');      // The time between scans, checking that a display is still present

const IsBehindProxy               = gs.get('isBehindProxy');       // If running behind a public-facing web server such as Apache2, then set to true
const SlideDirRoot                = gs.get('Directory.slideRoot'); // typically '/slides' by default. Useful to change for Google Drive mounted dir

// Derived values
const controllerTimeoutMSecs      = controllerTimeoutMins    * 60 * 1000;
const defaultCookieTimeoutMSecs   = defaultCookieTimeoutMins * 60 * 1000;

    
//
// Get web-server and web-sockets instantiated
//
const app    = express();
const server = http.createServer(app);
const io     = new Server(server); // new io()

var   sessionOptions = { secret: 'keyboard cat', // ****
			 resave: false, 
			 saveUninitialized: false,
			 cookie: {} }

const httpHost = process.env.HEYYOU_LOCAL_HOST || "localhost";
const httpPort = process.env.HEYYOU_LOCAL_PORT || 3000;
const httpLocalServer = "http://" + httpHost + ":" + httpPort;

const publicDirectory = "/public";

const roomNames = new RoomNames('etc/room-names-dynamic.txt','etc/room-names-preallocated.json');

// The general setup of Hey There is as follows:
//  
//   1. A 'display' starts by showing the home page to the activity-launcher
//
//   2. When a 'controller' (phone-based user) connects via the QR code
//      (or else by entering the URL the activity-launcher displays) they
//      are shown (on their phone) a list of apps that can be launched
//
//   3. Upon selecting an app (activity) from the list, the display is 
//      send the relevent activities/<activity>/display.html and the
//      phone changed to display the controller for the activity
//      activities/<activity>/controller.html
//
//   4. If another controller joins a display while it us running an app,
//      then the controller is directly provided the controller for
//      that app


var displays    = []; // An array containing all the displays
var controllers = []; // An array containing all the controllers


const defaultActivity         = ''; // if ever make none empty, then needs to be of the form '/foo'
const defaultActivityLabel    = 'Activity-Launcher (Default)';

const defaultActivityLocation = __dirname + defaultActivity;
const activityLocation        = __dirname + '/activities';


const ServerEpochStartTime     = new Date();    // This is the time which the server started. Use to reload connections after a restart
//const onStartReloadWindowMSecs = 2 * 60 * 1000  // i.e. 2 mins

console.log("Server Epoch Start Time: " + ServerEpochStartTime);


function getCookie(req,cookieName)
{
    let cookies = req.headers.cookie; 
    if (cookies == undefined)
        return undefined;

    let splitCookie = cookies.split('; ');
    for (let index = 0; index < splitCookie.length; index++) {
        const current = splitCookie[index];
        const content = current.split('=');
        if (content[0] == cookieName) {
            return content[1];
        }
        
    }
    return undefined;
}

function findHostDisplayByRoomID(roomID)
{
    for (let index = 0; index < displays.length; index++) {
        const display = displays[index];
        if (display.getRoomID() == roomID && display.isRoomHost()) {
            return display;
        }
    }
}

function findHostDisplayByName(name)
{
    for (let index = 0; index < displays.length; index++) {
        const display = displays[index];
        if (display.getRoomName() == name) {
            return display;
        }                    
    }
}

function findDisplayBySocketID(socketID)
{
    for (let index = 0; index < displays.length; index++) {
        const display = displays[index];
        if (display.getSocketID() == socketID) {
            return display;
        }                    
    }
}

function findAllControllersByRoomID(roomID)
{
    let foundControllers = [];
    for (let index = 0; index < controllers.length; index++) {
        const controller = controllers[index];
        if (controller.getRoomID() == roomID) {
            foundControllers.push(controller);
        }                    
    }
    return foundControllers;
}

function findAllControllersByRoomName(roomName)
{
    let roomID = findHostDisplayByName(roomName).getRoomID();
    return findAllControllersByRoomID(roomID);
}

function findControllerBySocketID(socketID)
{
    for (let index = 0; index < controllers.length; index++) {
        const controller = controllers[index];
        if (controller.getSocketID() == socketID) {
            return controller;
        }                    
    }
}

function getStaticActivity(req)
{
    let activity = getCookie(req,"staticActivity");
    console.log("Static Activity: " + activity);
    if (fs.existsSync(__dirname + activity))
        return activity;    

    return undefined;
}

function getActivity(req)
{
    //let display = findHostDisplayByRoomID(getCookie(req,"roomID"));
    let roomID = getCookie(req,"roomID");
    let display = findHostDisplayByRoomID(roomID);

    if (display != undefined) {
	let activity = display.getCurrentActivity();
        return activity;
    }
    
    return undefined;
}

function getActivityLabel(activity)
{
    return (activity == defaultActivity) ? defaultActivityLabel : activity;
}

function resolveActivityFile(req,fileName,strict=false)
{
    let activity = getActivity(req)

    let foundActivityLabel = null;
    let fullFoundActivityFileName = null;

    if (activity != undefined) {
	let activityPublicDir = activityLocation + activity + publicDirectory;
	let defaultPublicDir  = __dirname + publicDirectory;

	let activityLabel = getActivityLabel(activity);	
	let fullActivityFileName = activityPublicDir + fileName;
	
	if (fs.existsSync(fullActivityFileName)) {
	    foundActivityLabel = activityLabel;
	    fullFoundActivityFileName = fullActivityFileName;
	}
	else {
	    if (strict) {
		// Under strict conditions, while the file does not exist
		// we still want to capture where on the file-system we looked
		foundActivityLabel = activityLabel;
		fullFoundActivityFileName = fullActivityFileName;
	    }
	    else {
		// If not strict, assume they are in the default area
		foundActivityLabel = defaultActivityLabel;
		fullFoundActivityFileName = defaultPublicDir + fileName;
	    }
	}	    
    }
    else {
	let defaultActivityPublicDir  = __dirname + publicDirectory;
	
	foundActivityLabel = defaultActivityLabel;
	fullFoundActivityFileName = defaultActivityPublicDir + fileName;
    }

    return [ foundActivityLabel, fullFoundActivityFileName ];

}

function sendActivityFile(res, path, fileName, activityLabel)
{
    if (fs.existsSync(path)) {
        res.sendFile(path);
        console.log("sendActivityFile() Activity: '" + activityLabel +"' File sent: " + fileName);
    } 
    else {
        res.sendStatus(404);
        console.error("sendActivityFile() Activity: '" + activityLabel +"' Failed file retrival: " + fileName + " (File not found)");
    }
    
}


function getVisitorSocketIPAddress(socket)
{
    // In Hey There, we use 'visitor' when the in-coming connection could be either a
    // display or controller
    
    // The following is the recommended way to get a connecting client's IP address
    // However, it only works in the case of a direct connection between client and server
    // => commenting this out and using the next technique
    let remoteAddressIP = socket.request.connection.remoteAddress;

    // The initialization code below for our Express server does:
    //    app.set('trust proxy', true)
    // (because we're the ones that have stood up the Apache web server that operates as the proxy)
    // This means we can determine the connecting client's IP address form the x-forward-for header
    // information

    // For more details, see:
    //   https://stackoverflow.com/questions/6458083/get-the-clients-ip-address-in-socket-io
    //let ipAddress = socket.handshake.headers['x-forwarded-for'].split(',')[0]

    let ipAddress = null;
    
    let forwarded_header = socket.handshake.headers['x-forwarded-for'];
    
    if (forwarded_header != undefined) {
	ipAddress = forwarded_header.split(',')[0];
    }
    else {
	ipAddress = socket.request.connection.remoteAddress;
    }
    
    return ipAddress;
}

function consoleInput()
{
    // Console Commands
    
    const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    var exitCode = 0;
    return new Promise(function(resolve, reject) {
        rl.setPrompt('');
        rl.prompt();
        rl.on('line', function(line) {
            if (line === "exit") {
                exitCode = 1; // User initiated
                rl.close();
                return; // bail here, so rl.prompt() isn't called again
            } 
            else if (line === "help" || line === '?') {
                console.log(`Commands:\n\tcontrollers {roomName/ID}/all\n\texit\n\tclear\n\tchangeActivity {roomName} {optUrlParams}\n\tdisplays\n`);
            } 
            else if (line.startsWith("controllers",0)) {
                console.log("Controllers: ")
                let identifier = line.split(" ")[1]; // Get the 2nd parsed value
                if (identifier != undefined) {
                    if (identifier === "all") {
                        controllers.forEach(controller => {
                            console.log("DeviceID: " + controller.getDeviceID() +"\tRoom: " + controller.getRoomID());
                        });
                    }
                    else if (identifier.length > 15) { // For roomIDs
                        findAllControllersByRoomID(identifier).forEach(controller => {
                            console.log(controller.getDeviceID());
                        });
                    } 
                    else { // For roomNames
                        findAllControllersByRoomName(identifier).forEach(controller => {
                            console.log(controller.getDeviceID());
                        });
                    }  
                }
		else {
                    console.log("Missing command arguments. Use help for more information");
                }                
            } 
            else if (line === "clear") {
                console.clear();              
            } 
            else if (line.startsWith("changeActivity",0)) {
		let lineTokens = line.split(" ");
		
                let roomName     = lineTokens[1];
                let optUrlParams = (lineTokens.length>=3) ? lineTokens[2] : null;

                let display = findHostDisplayByName(roomName);		
                display.activityChange(display, optUrlParams);
            }
            else if (line === "displays") {                
                displays.forEach(display => {
                    console.log("DeviceID: " + display.getDeviceID() +"\tRoomName: " + display.getRoomName());
                });
            }
            else {
                console.log(`unknown command: "${line}"`);
            }
            rl.prompt();
        }).on('close',function() {
            resolve(exitCode) // this is the final result of the function
        });
    });
}
  
async function enableConsole()
{
    try {
        let result = await consoleInput()
        console.log('Exit Code: ', result)
        process.exit(result);

    }
    catch(e) {
        console.log('failed:', e)
    }
}


/* Main program */

const cmdline_args = process.argv.slice(2);

if (cmdline_args[0] == "-console") {
    enableConsole()
}


if (IsBehindProxy) {
    console.log("Server is set to operate behind a secure (https) proxy");
    //
    // Based on discussion at:
    //   https://stackoverflow.com/questions/10849687/express-js-how-to-get-remote-client-address
    //
    // Make it easy to look up a client's IP, even when we are routing the request to HeyYou
    // through a front-end web server (Apache2 in our case)
    //
    
    app.set('trust proxy', 1);    
}

// UUID details based on
//   https://medium.com/@mfahadqureshi786/creating-session-in-nodejs-a72d5544e4d1

/*
sessionOptions.name = "heyYouSessionID";

sessionOptions.genid =  function(req) {
    let uuid = uuidv4();
    console.log('Express session id created: ' + uuid);
    return uuid;
}
*/


app.use(session(sessionOptions));

console.log("Allowing CORS access");
app.use(cors());

//app.use(express.static(__dirname + '/node_modules/socket.io/client-dist'));


//
// To support a dedicated list of Chromecast around the devices being served fix IPs
// we need to register the MAC addresses of the Chromecast's with the DHCP server
//
// For detecting a Chromecast's MAC address see:
//   https://support.google.com/chromecast/answer/6292171?hl=en


/* Restful HTTP responses triggered by incoming GET requests */

app.get('/join/:roomIdOrName', (req, res) => {
    console.log("Room join request: '" + req.params.roomIdOrName + "'");
    if (findHostDisplayByRoomID(req.params.roomIdOrName) != undefined) {
	let roomID = req.params.roomIdOrName;

	// Create a cookie which only works on this site and lasts for the default timeout
        res.cookie('roomID', roomID, {sameSite: true, expires: new Date(Date.now() + (defaultCookieTimeoutMSecs))}); 
        res.redirect(httpLocalServer+'/controller'); // Prevents making a second cookie for a javascript file
        console.log("New device joined with roomID: '" + roomID + "'");
    }
    else {
	let display = findHostDisplayByName(req.params.roomIdOrName);	
	if (display != undefined) {	
	    let roomName = req.params.roomIdOrName;
	    let roomID   = display.getDeviceID();
	    
            // Create a cookie which only works on this site and lasts for the default timeout
	    res.cookie('roomID', roomID, {sameSite: true, expires: new Date(Date.now() + (defaultCookieTimeoutMSecs))}); 
            res.redirect(httpLocalServer+'/controller'); // Prevents making a second cookie for a javascript file
            console.log("New device joined with roomName: '" + roomName +"'");
	}  
	else {
	    // If room doesn't exit
            res.redirect(httpLocalServer+"/error/Unable to find Display-id or Display-name " + req.params.roomIdOrName);
	}
    }
});


app.get('/controller', (req, res) => {
    // Currently checking if the cookie is undefined in getCookie. If undefined then returns undefined
    let activity = getActivity(req);

    if (activity != undefined) {
	let activityLabel = getActivityLabel(activity);
        // Check if there is a unique controller file in activity otherwise provide default
        if (fs.existsSync(activityLocation + activity + '/controller.html')) {
            sendActivityFile(res, activityLocation + activity + '/controller.html','/controller.html',activityLabel);
	}
        else  {
            sendActivityFile(res, __dirname + defaultActivity + '/controller.html','/controller.html',defaultActivityLabel);
	}
    } 
    else {
        // Check that there is no static Cookie
        activity = getStaticActivity(req);
        if (activity != undefined) {
	    let activityLabel = activity;
            if (fs.existsSync(activityLocation + activity + '/static.html')) {
                sendActivityFile(res, activityLocation + activity + '/static.html', "/static.html", activityLabel);
	    }
            else {
                sendActivityFile(res, __dirname + defaultActivity + '/static.html', "/static.html", defaultActivityLabel);
	    }
        }
	else {
	    let roomID = getCookie(req,"roomID");
	    let staticActivity = getCookie(req,"staticActivity");

	    if ((roomID == undefined) && (staticActivity == undefined)) {
		res.redirect("disconnected/No active display connection found.  This can be caused by controller inactivity. Scan the QR Code again to rejoin");
	    }
	    else {
		res.redirect("error/No valid Display-id or Standalone App-id found. Try scanning an new QR Code.");
	    }
        }
    }    
});

app.get('/display-reset', (req, res) => {
    //res.redirect(httpLocalServer+"/display-home");
    res.redirect("display-home");
});
    
// A "circuit-breaker" URL => disconnect all controllers, and return the HTML page for the top-level/default activity display
app.get('/display-home', (req, res) => {

    // Start a display (forced refresh if necessary) with the default (i.e. top-level) activity

    let roomID = getCookie(req,"roomID");
    let display = findHostDisplayByRoomID(roomID);
    
    if (display != undefined) {
	// Forced refresh => disconnect any any controllers currently connected
	
	findAllControllersByRoomID(roomID).forEach(controller => {
	    display.message('controllerDisconnect', controller.getDeviceID());
	});
	
	display.activityChange(defaultActivity,null);
    }

    
    console.log("/display-home serving up fresh default activity display.html to requesting IP: " + req.ip);
    //console.log("[For the curious, the request header IPs field is set to: " + req.ips +"]");
    sendActivityFile(res, __dirname + defaultActivity +'/display.html', '/display.html', defaultActivityLabel); // This is for new displays
});

app.get('/activity', (req, res) => {
    res.redirect("display");
});
	
app.get('/display', (req, res) => {
    // If there is a valid activity then direct display to that activity else go to default activity
    //console.log("Responding to /display GET request");
    let activity = getActivity(req);
    
    if (activity != undefined) {
	// This is for reconecting displays
	
	let activityLabel = getActivityLabel(activity);

	if (activity == defaultActivity) {
	    sendActivityFile(res,__dirname + defaultActivity +'/display.html','/display.html',defaultActivityLabel); 
	}	
        else if (fs.existsSync(activityLocation + activity +'/display.html')) {
            sendActivityFile(res, activityLocation + activity +'/display.html','/display.html',activityLabel); 
	}
	else {
	    let roomID = getCookie(req,"roomID");
	    console.error("404 Error: Failed file retrival '" + req.path + "' (File not found) \tActivity: " + activity + "roomID:" + roomID);
            res.sendStatus(404);
	    //sendActivityFile(res,__dirname + defaultActivity +'/display.html','/display.html',defaultActivityLabel); 
	    //console.error("File Error: Activity (" + activity +") didn't exist so default was sent to device: " + roomID);
        }
    }
    else {
	console.log("/activity serving up default activity display.html to requesting IP: " + req.ip);
	//console.log("[For the curious, the request header IPs field is set to: " + req.ips +"]");
        sendActivityFile(res, __dirname + defaultActivity +'/display.html', '/display.html', defaultActivityLabel); // This is for new displays
    }   
});


app.get('/scripts/:fileName', (req, res) => {
    // Allow only files from verifiable activities
    let activity = getActivity(req)

    let fileName = "/scripts/"+req.params.fileName;
    
    if (activity != undefined) {
	let activityLabel = getActivityLabel(activity);	
	let fullActivityFileName = activityLocation + activity + fileName;
	
	if (fs.existsSync(fullActivityFileName)) {
	    sendActivityFile(res, fullActivityFileName, fileName, activityLabel);
	}
	else {
	    let fullDefaultFileName = __dirname + defaultActivity + fileName;
	    sendActivityFile(res, fullDefaultFileName, fileName, defaultActivityLabel);
	}	    
    }
    else {
	let fullDefaultActivityFileName = __dirname + defaultActivity + fileName;
	sendActivityFile(res, fullDefaultActivityFileName, fileName, defaultActivityLabel);
    }       
});




app.get('/slides/:slideDeck/:file', (req,res) => {

    let slideDeck = req.params.slideDeck;
    let file      = req.params.file;
    
    let fileName = SlideDirRoot+"/"+slideDeck+"/" + file;
    //let fileName = req.path;


    /*
    let activity = getActivity(req)

    let foundActivityLabel = null;
    let fullFoundActivityFileName = null;
    */
    
    // Refactor below into a function, and then call it here and in get(*) below // ****

    // strict=true param to strict location of file to be within the file-system
    // area of the current activity    
    let resolvedVals = resolveActivityFile(req,fileName,true); 

    let foundActivityLabel        = resolvedVals[0];
    let fullFoundActivityFileName = resolvedVals[1];
/*    
    if (activity != undefined) {
	let activityPublicDir = activityLocation + activity + publicDirectory;
	let defaultPublicDir  = __dirname + publicDirectory;

	let activityLabel = getActivityLabel(activity);	
	let fullActivityFileName = activityPublicDir + fileName;
	
	if (fs.existsSync(fullActivityFileName)) {
	    foundActivityLabel = activityLabel;
	    fullFoundActivityFileName = fullActivityFileName;
	}
	else {
	    foundActivityLabel = defaultActivityLabel;
	    fullFoundActivityFileName = defaultPublicDir + fileName;
	}	    
    }
    else {
	let defaultActivityPublicDir  = __dirname + publicDirectory;
	
	foundActivityLabel = defaultActivityLabel;
	fullFoundActivityFileName = defaultActivityPublicDir + fileName;
    }
*/

    // opportunity to generate (or update) slidesOverview.json
    // if not present on the filesystem (or else has changed)

    if (file == "slidesOverview.json") {
	if (!fs.existsSync(fullFoundActivityFileName)) {
	    let fullFoundActivityDir = path.dirname(fullFoundActivityFileName);
	    
	    let slideshowFromFileSystem = new SlideshowGenJSON(fullFoundActivityDir);	    
	    let slidesOverviewJSON = slideshowFromFileSystem.generateSlidesOverview();

	    res.setHeader("Content-Type", "application/json");
	    res.end(JSON.stringify(slidesOverviewJSON));
	}
	else {
	    sendActivityFile(res, fullFoundActivityFileName, fileName, foundActivityLabel);
	}
    }
    else {
	sendActivityFile(res, fullFoundActivityFileName, fileName, foundActivityLabel);
    }
    
});



// '/disconnected' is really an alias to /error, but is a preferred URL to show to the use
// in certain situations
app.get('*/disconnected/:error', (req, res) => {
    res.cookie('error', req.params.error, {sameSite: true, expires: new Date(Date.now() + (defaultCookieTimeoutMSecs))});
    res.redirect(httpLocalServer+'/disconnected');
});

app.get('/disconnected', (req, res) => {
    res.sendFile(__dirname + '/error.html');
});

app.get('*/error/:error', (req, res) => {
    res.cookie('error', req.params.error, {sameSite: true, expires: new Date(Date.now() + (defaultCookieTimeoutMSecs))});
    res.redirect(httpLocalServer+'/error');
});

app.get('/error', (req, res) => {
    res.sendFile(__dirname + '/error.html');
});

app.get('/socketCreation.js', (req,res) => {
    res.sendFile(__dirname + '/socketCreation.js');
});


app.get('/qrcode', (req, res) => {
    let data = req.query.data || "https://interactwith.us/about.html";
    let xDim = parseInt(req.query.size) || 250;

    // We a QR code set based on overall image width/height, however the 'qr-image' mode
    // is driven by the dimension of a single pixel
    // => create the raw underlying matrix the qr-image uses first, which sets the
    //    overall size of the QR code, and from that work back to how big a single
    //    pixel needs to be

    var calibrateMatrix = qr.matrix(data, 'M', false); // (text, ec_level, parse_url)
    var calibrateSize = calibrateMatrix.length;
    
    var requiredPixelSize = Math.max(1,Math.floor(xDim / calibrateSize));
    
    var qrcode = qr.image(data, { type: 'png', ec_level: 'M', size: requiredPixelSize, margin: 0 });

    res.setHeader('Content-type', 'image/png');
    qrcode.pipe(res);
});

app.get('/getSlideshowList', (req,res) => {

    let activitySlideshowPublicDir = activityLocation + "/slideshow" + publicDirectory;    
    let fullSlideDirRoot = activitySlideshowPublicDir + "/" + SlideDirRoot;

    let slideshowDirs = [];

    let returnJSON = null;
    
    try {
	let files = fs.readdirSync(fullSlideDirRoot,"utf8");
	
	files.forEach(function (file) {
	    let fullSlideDir = fullSlideDirRoot + "/" + file;
		      
	    if (fs.lstatSync(fullSlideDir).isDirectory() && !file.startsWith(".")) {
		slideshowDirs.push(file);
	    }
	});

	returnJSON = { "status": "ok", "slideshows": slideshowDirs };
    }
    catch (err) {
	let err_message = "Failed to read directory: " + fullSlideDirRoot;
	
	console.error(err_message);
	console.error();
	console.error(err);

	returnJSON = { "status": "failed", "error": err_message };
    }

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(returnJSON));    	   
});

    
app.get('/getSessionID', (req, res) => {
        
    let sess = req.session;
    console.log("session = " + JSON.stringify(sess));
    
    if (sess.sessionID) {
	console.log("Returning previously allocated sessionID = " + sess.sessionID);
    }
    else {
	sess.sessionID = uuidv4();
	console.log("Allocating new sessionID = " + sess.sessionID);
    }

    returnJSON = { "sessionID": sess.sessionID }

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(returnJSON));    
});


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/about.html');
});


app.get('*', (req, res) => {
    //console.log(`app.get(*): req.path=${req.path}`);
    
    // Send a file if it can be found inside either the public folder for the activity for the controller or generic public folder
    // Requests from non-controller files will be redirected to an error page
    let activity = getActivity(req);
    //console.log(`app.get(*): activity=${activity}`);
    
    // ****
    // Not clear why req.params.roomName was being check for in the following if-statement,
    // as it is then never used.  As written it could allow an undefined activity through
    // lead to mal-funtioning code
    //if (activity != undefined || req.params.roomName != undefined) {
    if (activity != undefined) {
	let activityLabel = getActivityLabel(activity);
	
	let activityPublicPath = activityLocation + activity + publicDirectory + req.path;
	let defaultPublicPath  = __dirname + publicDirectory + req.path;
	
        if (fs.existsSync(activityPublicPath)) {
            sendActivityFile(res, activityPublicPath, req.path, activityLabel);
	}
        else if (fs.existsSync(defaultPublicPath)) {
            sendActivityFile(res, defaultPublicPath, req.path, defaultActivityLabel);
	}
        else {
            console.error("404 Error: Failed file retrival '" + req.path + "' (File not found) \tActivity: " + activity);
            res.sendStatus(404);
        }
    }
    else {
	let defaultActivityPublicPath  = __dirname + publicDirectory + req.path;
	
	if (fs.existsSync(defaultActivityPublicPath)) {
            sendActivityFile(res,defaultActivityPublicPath, req.path, defaultActivityLabel);
	}
	else {
            console.error("403 Error: Failed file retrival '" + req.path + "' (Not associated with an activity) \treq roomID: " + req.params.roomID);
            res.sendStatus(403);
	}
    }
    
});

io.on('connection', (socket, host) => {
    // Check if this new socket is already a recorded connection

    var newConnection = true;

    if (socket.handshake.query.data == "controller") {
	console.log("io.on('connection'): Handling controller connection");
	
        for (let index=0; index<controllers.length; index++) {
            const controller = controllers[index];
            if (controller.getDeviceID() == socket.handshake.query.controllerID) {
                // Handle updating socket information for this reconnecting device

                if (controller.getRoomID() != socket.handshake.query.roomID) {
                    let display = findHostDisplayByRoomID(controller.getRoomID());

                    if (display != undefined) {
                        display.message('controllerDisconnect', controller.getDeviceID());
                        //io.to(display.getRoomID()).emit('controllerDisconnect', controller.getDeviceID());
                        display.numOfControllers--; // Reduce controller count by one for old room.
                    }
		    else {
                        // Error
			console.error("io.on('connection'): When disconnecting an old connection, did not find a display for roomID '" + controller.getRoomID());
                    }

                    display = findHostDisplayByRoomID(controller.getRoomID());

                    if (display != undefined) {
                        controller.setRoomID(socket.handshake.query.roomID);
                        display.numOfControllers++; // Increase controller count for new room by one.
                    }
		    else {
                        // Error
			console.error("io.on('connection'): When setting up new conection, did not find a display for roomID '" + controller.getRoomID());
                    }                    
                }

                controller.setNewSocket(socket);

                socket.join(controller.getRoomID());
                socket.join(controller.getDeviceID());

                console.log("Controller rejoined: \t" + controller.connectionInformation());
                newConnection = false ;
            }
        }

        if (newConnection) {
            // Handle creating a new Connection instance for this device

            var controller = new Connection(io,socket,defaultActivity,controllerTimeoutMSecs);
	    
            // Add the new controller to the list of controllers

            let display = findHostDisplayByRoomID(controller.getRoomID());

            if (display != undefined) {
                console.log("New Controller: \t" + controller.connectionInformation());

                controllers.push(controller);

                //Join controller to room
                socket.join(controller.getRoomID());
                socket.join(controller.getDeviceID())

                display = findHostDisplayByRoomID(controller.getRoomID());
                display.numOfControllers++; // Increase controller count for new room by one.
            }
	    else {
                // Could send error since there is no valid display for the controller //////////////////////////
		console.error("io.on('connection'): Unable to form controller-display socket connection, as no display found for for roomID '" + controller.getRoomID());
            }            
        }
    } 
    else if (socket.handshake.query.data == "display") {
        console.log("io.on('connection'): Handling display connection");
	
        for (let index=0; index<displays.length; index++) {
            const display = displays[index];
            if (display.getDeviceID() == socket.handshake.query.controllerID) {
                // Handle updating socket information for this reconnecting device
                console.log("Socket update for display (device id): " + display.getDeviceID());

                display.setNewSocket(socket);

		display.ready = true;		
		display.updateLastInteractionTime();
		
		//console.log("*** display = " + JSON.stringify(display));
		let roomID   = display.getRoomID();
                socket.join(roomID);

                newConnection = false;
                break;
            }
        }

        if (newConnection) {
            // Handle creating a new Connection instance for this device
            let display = new Connection(io,socket,defaultActivity,controllerTimeoutMSecs);

            console.log("New Display: \t" + display.connectionInformation());
	    let visitor_ip = getVisitorSocketIPAddress(socket);
	    console.log("  Client IP: \t" +visitor_ip);
	    
            // Add the new display to the list of displays
            displays.push(display);

	    var forIPaddress = getVisitorSocketIPAddress(socket);
	    let roomName = roomNames.nextFree(forIPaddress);
            display.setAndSendRoomName(roomName);

            // Using deviceID as the room identifier
	    let roomID = display.getDeviceID();
            socket.join(roomID);

            display.setAsRoomHost();
            display.setRoomID(roomID);
            display.setCookieMins('roomID',roomID,defaultCookieTimeoutMins)

            //io.to(socket.id).emit("reload"); // This is instead done once the name is set
            display.updateLastInteractionTime();            	    
        }
    }
    else {
        console.log("Invalid connection request\t Type: " + socket.handshake.query.data + "\tReferer: " + socket.handshake.headers.referer);
    }

    socket.on('connection callback', (response) =>{
        if (response.orientation !== null) {
            console.log("Emiting Orientation: " + response.orientation);
            io.to(response.socket).emit('orientation', response.orientation);
        }
    })

    socket.on('disconnect', () => {
        console.log('Device disconnect: ' + socket.handshake.query.controllerID);

        if (socket.handshake.query.data == "controller") {
            for (let index = 0; index < controllers.length; index++) {
                const controller = controllers[index];
                if (controller.getSocketID() == socket.id) {
                    controller.updateLastInteractionTime();                    
                    
                    // Removes itself from room after disconnect is complete
    
                    return;
                }            
            }
        }
	else if (socket.handshake.query.data == "display") {
            for (let index=0; index<displays.length; index++) {
                const display = displays[index];
                if (display.getSocketID() == socket.id) {
		    // Found that display that this 'disconnect' refers to
                    display.updateLastInteractionTime();
    
                    // Check if there is another display that can be made the host
                    var foundNewHost = false;

                    for (let y=0; y<displays.length; y++) {
                        const displayNew = displays[y];
                        if (displayNew.getRoomID() == display.getRoomID() && displayNew.getSocketID() != socket.id) {
                            displayNew.setAsRoomHost();
                            
                            displayNew.message("host",true);
                            //io.to(displayNew.getSocketID()).emit("host",true) ////////////////// This emit hasn't been added to anything
                            foundNewHost = true;
                            break;
                        }                    
                    }

		    if (foundNewHost) {
			console.log("socket.on('disconnect'): Found alternative display, and made it the host");
		    }
		    else {
                        //disconnect all controllers from the display and send them back to another room (if sub room) ////////////////////
                        // Otherwise drop connections and wait for controllerTimeoutCheck() to remove from connections
			
			console.log("socket.on('disconnect'): No alternative display found to transfer to => Display is disconnected. ");
                    }
		    
                    return;
                }    
            }
        }         
    });

    socket.onAny((event, ...args) => {

        // Check if socket is active (authorised)
        let active = true;
        let display     = undefined;
        let controller  = undefined;
	
        if (active) {
            var roomID = args[0];
	    
            switch (event) {   
                case "heartbeat":
                    display = findDisplayBySocketID(socket.id); // **** need to check 'display' is not undefined on next line
		    if (display != undefined) {
			display.updateLastInteractionTime();
			display.failedConsecutiveHeartbeat = 0;
		    }		
                    break;

                case "selectActivity":
                    // Controller has indicated an activity change
                    var newActivity  = args[1];
		    var optUrlParams = args[2];
                    var callback     = args[3];

                    controller = findControllerBySocketID(socket.id);
                    if (controller != undefined) {
                        controller.updateLastInteractionTime();

                        if (controller.getRoomID() == roomID) {
                            if (newActivity == "/") {
				newActivity = defaultActivity;                    
			    }

			    var newActivityLabel = getActivityLabel(newActivity)
                            console.log("New activity: '" + newActivityLabel + "' for RoomID: " + roomID);
    
                            display = findHostDisplayByRoomID(roomID);
                            if (display != undefined) {
                                display.activityChange(newActivity,optUrlParams);
    
                                // Nothing is done for any subdisplays who are apart of this roomID. Should this be assumed as part of the reload?
    
                            }
			    else {
                                console.log("Display was undefined based on roomID for activity change. No change occured");
                            }        
                        }  
                    }

		    if (typeof callback === "function") {
			callback();
		    }
                    break;

                case "assignRoomName":
                    // Only displays will call this as per socketCreation.js
                    display = findDisplayBySocketID(socket.id);

                    // If no name could be found then assign new room name, else send current room name
                    if (display.getRoomName() == undefined) {
		        var forIPaddress = getVisitorSocketIPAddress(socket)
			let roomName = roomNames.nextFree(forIPaddress);
                        display.setAndSendRoomName(roomName);
		    }
                    else {
			display.resendRoomName();
		    }
                    break;
		
                case "displayLoaded":
                    display = findDisplayBySocketID(socket.id);

                    // Check display exists
                    if (display != undefined) {

                        // Turn off saving of messages
                        display.ready = true;
                        let messages = display.getMessages();

                        // Send saved messages to display if there are any
                        if (messages != null) {
                            console.log("Forwarding saved messages for display host to roomID: " + display.getRoomID());
                            messages.forEach(message => {
                                display.message(...message);
                                //io.to(display.getSocketID()).emit(event, controllerDeviceID);
                            });
                            display.clearMessages();
                        }
                        
                    }
                    break;
    
                case "displayEmit":    
                    // Indicate an event that the display wants to send to a controller or the whole room

                    // Format ('displayEmit',roomID/socket to send to,event,args for event...)
                    //              event          0                 1       2
                    eventToSend = args[1];
                    eventArgs   = args.slice(2);

                    // Hasn't been used with other displays yet, may run into issues
                    display = findDisplayBySocketID(socket.id); // using socket.id as no gaurantee room will be display
		
                    if (display != undefined && display.isRoomHost()) {
                        console.log("Re-emitted display event: " + eventToSend + "\t Args: "+ eventArgs + "\t\tRoomID/Socket: " + roomID);
                        
                        socket.to(roomID).emit(eventToSend,...eventArgs);
                    } else {

                        // New logic has to be written to retrieve who the request was suppoesdly made
                        //console.lost("Non host display attempted to send displayEmit event: " + event + "\tRoomID: " + roomID + "\tDevice ID: " + findControllerBySocketID);
                    }    
                    break;

                case "displaySelectActivity":
                    // Display has indicated an activity change
                    var newActivity  = args[1];
		    var optUrlParams = args[2];
                    var callback     = args[3];

		    //console.log(`ws cmd=displaySelectActivity: roomID=${roomID}, newActivity=${newActivity} optUrlParams=${optUrlParams}`);
		
                    if (newActivity == "/") {
			newActivity = defaultActivity;                    
		    }

		    var newActivityLabel = getActivityLabel(newActivity)
                    console.log("Display initiated new activity: '" + newActivityLabel + "' for RoomID: " + roomID);
    
                    display = findHostDisplayByRoomID(roomID);
                    if (display != undefined) {
			display.activityChange(newActivity,optUrlParams);
			// Nothing is done for any subdisplays who are apart of this roomID. Should this be assumed as part of the reload?
                    }
		    else {
			console.log("Display was undefined based on roomID for activity change. No change occured");
                    }

		    if (typeof callback === "function") {
			callback();
		    }
                    break;

		
                case "displayReset":
                    // Reset the display back to the default activity and get controllers to reload
                    display = findDisplayBySocketID(socket.id);
                    if (display != undefined) {
                        display.activityChange(defaultActivity,null); // Set to default, no optUrlParam to top-level default display
                        display.messageRoom('reload');
                        //io.to(display.getRoomID()).emit('reload'); // Tell all devices to reload
                    }
                    break;

                case 'vote':
                    // Increase vote counter

                    // Someone starts a vote
                    // Server needs to register this against the activity/hostDisplay
                    // Display needs a voteRunning boolean
                    // Display needs 



                    break;

                case 'static':
                    // Set staticActivity cookie
                    controller = findControllerBySocketID(socket.id);
                    display = findHostDisplayByRoomID(controller.getRoomID());
                    controller.setCookieMins('staticActivity',display.getCurrentActivity(),staticCookieValidMins);
                    controller.setCookieMins("roomID",'',0); // Invalidate old cookie

                    // Remove controller
                    controllers.forEach(function(controllerTemp, index, object) {
                        if (controllerTemp == controller) {
                            object.splice(index,1);
                        }
                    });

                    // Reload
                    io.to(socket.id).emit("reload");
                    break;

                default:

                    // Allow controllers to only sending to room displays which are the room host    
                    
                    controller = findControllerBySocketID(socket.id);

                    if (controller != undefined) {
                        display = findHostDisplayByRoomID(controller.getRoomID());
                        if (display != undefined) {
                            display.message(event, controller.getDeviceID(), ...args);
                            controller.updateLastInteractionTime();                                
                        }
			else {
                            console.log("Undefined display for RoomID: " + controller.getRoomID() + '\tEvent: ' + event);
                        }
                    }
		    else {
                        console.log("Couldn't find controller for SocketID: " + socket.id + "\tEvent: " + event);
                    }
    
                    break;
            }
        }        
    })
});

server.listen(httpPort, () => {
    console.log('For all interfaces, listening on port: ' + httpPort);

    console.log('Local server: ' + httpLocalServer);
});


// Checks every few mins (checkControllerTimeoutMSecs)to see which controllers are still is active
// Remove ones that aren't active
function controllerTimeoutCheck()
{
    setTimeout(() => {
        controllers.forEach(function(controller, index, object) {
            if (controller.timedOut()) {
                object.splice(index, 1);

                controller.message('disconnected', 'Your device timed out, likely due to inactivity, and you have been removed from the display session. Scan the QR code again to rejoin.');
                //io.to(controller.getSocketID()).emit('error', 'Your device timed out & you have been removed from the session. Scan another QR code to rejoin.');

                let display = findHostDisplayByRoomID(controller.getRoomID());
                if (display != undefined) {
                    display.message('controllerDisconnect', controller.getDeviceID());
                    //io.to(display.getSocketID()).emit('controllerDisconnect', controller.getDeviceID()); // Inform the display to remove controller
                    display.numOfControllers--; // Reduce controller count for room by one
                }

                console.log("Removed connection: " + controller.getDeviceID());

            }
          });
        controllerTimeoutCheck();
    }, checkControllerTimeoutMSecs);
}


function displayHeartbeat()
{
    setTimeout(() => {
        displays.forEach(function(display, index, object) {
            if (display.timedOut()) {
		display.failedConsecutiveHeartBeat++;
                if (display.failedConsecutiveHeartBeat >= 10) { // (@30 secs => 5 mins) Note: used to be 2
                    // Forget the display, forcing it to reconnect
                    roomNames.release(display.getRoomName());
                    object.splice(index, 1);
                }
		else {
                    display.message('reload'); // Cause the display to catchup and keep ChromeCasts alive
                }
            }
	    else {
                display.message('heartbeat');
            }
        });
        displayHeartbeat();
    }, checkDisplayTimeoutMSecs);
}

// Endless looping calls using setTimeout() to check controllers
controllerTimeoutCheck(); 

// Endless looping calls using setTime() to check displays
displayHeartbeat();

