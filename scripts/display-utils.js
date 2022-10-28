
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
	// Need to make sure Hey There logo + QR code (and the jiggling text above, and URL below)
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

function displayJoinURL(displayPrefixURL,roomID,roomName, qrDim,roomIdElemId,roomNameElemId)
{
    // Fallback to 'roomID' if 'roomName' for some reason is not set
    //console.log("**** displayJoinURL() roomID = " + roomID + " roomName = " + roomName);
    
    //var roomNameSafe = ((roomName != undefined) && (roomName != "")) ? roomName : roomID;
    var roomNameSafe = (roomName != "") ? roomName : roomID;
    
    var joinRoomURL = displayPrefixURL + '/join/' + roomNameSafe;
    var joinRoomURLEncoded = encodeURIComponent(joinRoomURL)
    
    //var url = '/qrcode/?data=' + joinRoomURLEncoded + '&size=' + qrDim;
    var url = 'qrcode/?data=' + joinRoomURLEncoded + '&size=' + qrDim;
    
    var $img = $('<img>').attr('src',url);
    $img.css("width", "100%");
    $img.css("height","100%");
    
    $img.on("load", function() {
	$img.fadeIn(1000);
    });
    $img.css("display","none"); // The on-load() callback above then fades it in!
    
    $('#'+roomIdElemId).html($img);
    
    messageHTML = 'Take control via ';
    messageHTML += '<span style="white-space: nowrap;">';
    messageHTML +=   '<span style="color: #e03031; font-size: 100%; font-style: italic;">' + displayPrefixURL + '/join/' + roomNameSafe + '</span>';
    messageHTML += '</span>';
    
    $('#'+roomNameElemId).html(messageHTML);
}
