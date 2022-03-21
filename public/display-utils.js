
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
	qrDim = (viewportHeight * 0.8) / 2;
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

    
function displayRoomQRCode(displayHost,roomID,qrDim,elemId)
{
    // For the QR code, work directly with the roomID
    var full_room_id = displayHost + '/join/' + roomID;

    //var url = 'https://api.qrserver.com/v1/create-qr-code/?data=' + full_room_id + '&size=' + qrDim +'x' + qrDim;
    var url = '/qrcode/?data=' + full_room_id + '&size=' + qrDim;
    
    var $img = $('<img>').attr('src',url);
    $img.on("load", function() {
	$img.fadeIn(1000);
    });
    $img.css("display","none"); // The on-load() callback above then fades it in!
    
    //$('#barcode').html($img);
    $('#'+elemId).html($img);
}

function displayRoomURL(displayHost,roomName, elemId)
{
    // For roomURL we work with the roomName to give a nicer URL to type in
    // This is subsequently mapped to the roomID URL by the server
    
    messageHTML = 'Or visit on your phone: <span style="white-space: nowrap;">' + displayHost + '/join/' + roomName + '</span>';
    $('#'+elemId).html(messageHTML);
    //$('#website').html('Or visit on your phone: <span style="white-space: nowrap;">' + displayHost + '/join/' + roomName + '</span>');
}
