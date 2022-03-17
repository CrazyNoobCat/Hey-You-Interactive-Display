
function displayRoomQRCode(displayHost,roomID,qrDim,elemId)
{
    // For the QR code, work directly with the roomID
    var full_room_id = displayHost + '/join/' + roomID;

    var url = 'https://api.qrserver.com/v1/create-qr-code/?data=' + full_room_id + '&size=' + qrDim +'x' + qrDim;
    
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
