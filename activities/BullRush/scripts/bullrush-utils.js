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

