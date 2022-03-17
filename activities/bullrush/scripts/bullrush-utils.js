// Enumerated types

const PlayerType = {
    Runner:    0,
    Tagger:    1,
    WaitingForAssignment: 2
};

Object.freeze(PlayerType);

const SafeZonePosition = {
    Unassigned: 0, // For example, when the game is over
    Left:       1,
    Right:      2
};

Object.freeze(SafeZonePosition);

// Audio resources

AudioResources = {
    "Collide": [ "collide-01.mp3",     "collide-02.mp3",    "collide-03.mp3" ],
    "InZone":  [ "got-to-zone-01.mp3", "got-to-zone-02.mp3" ],
    "Gotcha":  [ "gotcha-01.mp3",      "gotcha-02.mp3" ],
    "Winner":  [ "winner-01.mp3",      "winner-02.mp3",     "winner-03.mp3" ]
};


function optPlayAudio(audioId)
{
    if (audioId) {
	var $audio = $('#'+audioId);
	if ($audio.attr("src") != "") {
	    $audio[0].play(); // [0] maps jquery object to native HTML element
	}
    }
}

const zeroPad5    = (num)      => "00000".substr(num.length) + num; // ensures the number passed in is left-zero-padded to be 5 digits in leng
const random      = (min, max) => Math.floor(Math.random() * (max - min)) + min;
const randomCol5  = ()         => zeroPad5(Math.floor(Math.random() * 0x100000).toString(16)); // hex *5-digit* random value used as a colour in the form RGGBB

const randomArrayEntry = (array) => array[Math.floor(Math.random()*array.length)];

// Core drawing routines for Runner (coloured circle) and Tracker (red spikey ball)

function  drawRunner(ctx,xOrg,yOrg,radius,fillStyle,textLabel)
{
    // Draw a circle for runners (i.e. the non-taggers)
    ctx.lineWidth = 1;
    ctx.strokesStyle = "#FFFFFF";

    ctx.beginPath();
    ctx.arc(xOrg, yOrg, radius, 0, Math.PI*2);
    ctx.fillStyle = fillStyle;
    ctx.stroke();
    ctx.fill();
    ctx.closePath();

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = radius/2+"px Arial";
    ctx.fillStyle    = "#ffffff";
    ctx.fillText(textLabel, xOrg, yOrg);
}

function  drawTagger(ctx,xOrg,yOrg,radius,fillStyle,textLabel)
{
    //Draw a spike ball for taggers
    ctx.lineWidth = 1;
    ctx.strokesStyle = "#FFFFFF";

    var numSpikes = 16;
    var rot    = Math.PI / 2 * 3;
    var step   = Math.PI / numSpikes;

    // Propotions based off a radius of 20 (in normalized space, -0.5, and 4.0)
    var outerRadius = radius * 40/40.0; // **** Now just go all the way out!
    var innerRadius = radius * 16/20.0;

    var x = xOrg;
    var y = yOrg;
    
    ctx.beginPath();
    ctx.moveTo(xOrg, yOrg - outerRadius)
    for (var i=0; i<numSpikes; i++) {
	x = xOrg + Math.cos(rot) * outerRadius;
	y = yOrg + Math.sin(rot) * outerRadius;
	ctx.lineTo(x, y)
	rot += step
	
	x = xOrg + Math.cos(rot) * innerRadius;
	y = yOrg + Math.sin(rot) * innerRadius;
	ctx.lineTo(x, y)
	rot += step
    }
    
    ctx.lineTo(xOrg, yOrg-outerRadius);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.stroke();
    ctx.fill();
    ctx.closePath();

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = radius/2+"px Arial";
    ctx.fillStyle    = "#ffffff";
    ctx.fillText(textLabel, xOrg, yOrg);
}

