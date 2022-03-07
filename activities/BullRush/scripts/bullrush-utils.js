function  drawPlayer(ctx,xOrg,yOrg,radius,fillStyle)
{
    // Circle for nontaggers
    ctx.lineWidth = 1;
    ctx.strokesStyle = "#FFFFFF";

    ctx.beginPath();
    ctx.arc(xOrg, yOrg, radius, 0, Math.PI * 2);
    ctx.fillStyle = fillStyle;
    ctx.stroke();
    ctx.fill();
    ctx.closePath();
}

function  drawTagger(ctx,xOrg,yOrg,radius,fillStyle)
{
    //Draw a spike ball for taggers
    ctx.lineWidth = 1;
    ctx.strokesStyle = "#FFFFFF";

    var spikes = 16;
    var rot = Math.PI / 2 * 3;
    var step = Math.PI / spikes;

    // When radius was hardwired to 18
    // console.log("*** drawTagger() radius = " + radius);
    // var outerRadius = radius - 0.5;
    // var innerRadius = radius - 4;

    var outerRadius = radius * 35/36.0;
    var innerRadius = radius * 14/18.0;

    var x = xOrg;
    var y = yOrg;
    
    ctx.beginPath();
    ctx.moveTo(xOrg, yOrg - outerRadius)
    for (var i = 0; i < spikes; i++) {
	x = xOrg + Math.cos(rot) * outerRadius;
	y = yOrg + Math.sin(rot) * outerRadius;
	ctx.lineTo(x, y)
	rot += step
	
	x = xOrg + Math.cos(rot) * innerRadius;
	y = yOrg + Math.sin(rot) * innerRadius;
	ctx.lineTo(x, y)
	rot += step
    }
    ctx.lineTo(xOrg, yOrg - outerRadius);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.stroke();
    ctx.fill();
    ctx.closePath();
}

