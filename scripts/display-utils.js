
//
// Timeout Constants
//
//var IAmBoredTimeoutMSecs = 15 * 1000;
var IAmBoredTimeoutMSecs = 2 * 60 * 1000; // 2 mins


function getURLParams()
{
    var urlParams = {};

    var paramPairs = location.search.substr(1).split("&");

    if (paramPairs !== "") {
	for (var i=0; i<paramPairs.length; i++) {
	    var paramPair = paramPairs[i];
	    
	    var paramTokens = paramPair.split("=");
	    var paramName = paramTokens[0];
	    var paramVal  = (paramTokens.length>=2) ? decodeURIComponent(paramTokens[1].replace(/\+/g, " ")) : null;
	    
	    urlParams[paramName] = paramVal;
	}
    }	

    return urlParams;
}
    
    
function computeQRDimMaximizeHeight(viewportWidth,viewportHeight)
{		      	
    console.log("computeQRDimMaximizeHeight() Viewport Dimensions: " + viewportWidth + " x " + viewportHeight);

    var qrDim = 0;
    
    if (viewportHeight <= viewportWidth) {
	// Need to make sure Hey You logo + QR code (and the jiggling text above, and URL below)
	// all fit
	
	// => allow 20% space for text top and bottom, then equally split remaining space
	qrDim = (viewportHeight * 0.6) / 2; // used to be 0.8
    }
    else {
	// Not such a big issue when viewPort is already tall and thin (more wiggle room)
	// => viewportWidth / 2 would guarantee that logo and QR code would fit
	// However, there is the issue of the text top and bottom to fit in, and
	// that issue depends on how much taller the viewport is compared to width
	
	// The approach taken here is to:
	//    (i  provisionally set the QR code (and logo) to be viewportWidth/2
	//   (11) assume the text takes up 20% of viewport "min" dimension (i.e. width)
	//  (iii) then see if that added on the logo and qr-code exceeds the viewportHeight
	//   (iv) if it does, reduce the calculated QR code + logo dim by that amount so it does fit
	
	qrDim = (viewportWidth /2);
	var textDim = viewportWidth * 0.2;
	
	if (((qrDim * 2) + textDim) > viewportHeight) {
	    qrDim -= (textDim/2); // the div by 2 is because the textDim reduction spans 2 images (QR code + Logo)
	}
    }
    qrDim = Math.round(qrDim);

    console.log("Dynamically computed qrDim = " + qrDim);

    return qrDim;
}

 /*   
function displayRoomQRCode(displayHost,roomID,qrDim,elemId)
{
    // For the QR code, work directly with the roomID
    var full_room_id = displayHost + '/join/' + roomID;

    var url = 'https://api.qrserver.com/v1/create-qr-code/?data=' + full_room_id + '&size=' + qrDim +'x' + qrDim;
    //var url = '/qrcode/?data=' + full_room_id + '&size=' + qrDim;
    
    var $img = $('<img>').attr('src',url);
    $img.on("load", function() {
	$img.fadeIn(1000);
    });
    $img.css("display","none"); // The on-load() callback above then fades it in!
    
    $('#'+elemId).html($img);
}

function displayRoomURL(displayHost,roomName, elemId)
{
    // For roomURL we work with the roomName to give a nicer URL to type in
    // This is subsequently mapped to the roomID URL by the server
    
    messageHTML = 'Or visit on your phone:<br />';
    messageHTML += '<span style="white-space: nowrap;">';
    //messageHTML +=   '<span class="globe-icon-bg" style="padding-right: 3px;"></span>';
    messageHTML +=   '<img width="16" height="16" src="icons/globe-solid.svg" style="padding-right: 3px;"/>';
    messageHTML +=   '<span style="color: #e03031; font-size: 85%; font-style: italic;">https://' + displayHost + '/join/' + roomName + '</span>';
    //messageHTML +=   '<span style="color: #e03031">' + displayHost + '/join/' + roomName + '</span>';
    messageHTML += '</span>';
    
    $('#'+elemId).html(messageHTML);
}
 */


function displayJoinURL(displayHost,roomID,roomName, qrDim,roomIdElemId,roomNameElemId)
{
    // Fallback to 'roomID' if 'roomName' for some reason is not set
    console.log("**** displayJoinURL() roomID = " + roomID + " roomName = " + roomName);
    
    //var roomNameSafe = ((roomName != undefined) && (roomName != "")) ? roomName : roomID;
    var roomNameSafe = (roomName != "") ? roomName : roomID;
    
    var joinRoomURL = displayHost + '/join/' + roomNameSafe;

    var url = 'https://api.qrserver.com/v1/create-qr-code/?data=' + joinRoomURL + '&size=' + qrDim +'x' + qrDim;
    //var url = '/qrcode/?data=' + joinRoomURL + '&size=' + qrDim;
    
    var $img = $('<img>').attr('src',url);
    $img.on("load", function() {
	$img.fadeIn(1000);
    });
    $img.css("display","none"); // The on-load() callback above then fades it in!
    
    $('#'+roomIdElemId).html($img);
    
    messageHTML = 'Or visit on your phone:<br />';
    messageHTML += '<span style="white-space: nowrap;">';
    messageHTML +=   '<img width="16" height="16" src="icons/globe-solid.svg" style="padding-right: 3px;"/>';
    messageHTML +=   '<span style="color: #e03031; font-size: 85%; font-style: italic;">https://' + displayHost + '/join/' + roomNameSafe + '</span>';
    messageHTML += '</span>';
    
    $('#'+roomNameElemId).html(messageHTML);
}
