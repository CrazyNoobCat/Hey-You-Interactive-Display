
var GameStartRetryTimeSecs = 5;

var runners = [];
var taggers = [];
var tagged  = [];
var winners = [];

var getToSafeZoneWidth   = 80;                 // Stays constant
var shrinkgingZoneWidth  = getToSafeZoneWidth; // Reduces over time

var getToSafeZoneBgCol =  "#faaa33"; // yellow-ish
var shrinkingZoneBgCol =  "#faaa33"; // yellow-ish (after some testing, using same colour as getToSafeZone worked out for the best)

var directionArrowsXNum = 20;

var directionArrowsXQuarter1End   = Math.round(directionArrowsXNum/4);
var directionArrowsXQuarter4Start = Math.round((3*directionArrowsXNum)/4);

var directionArrowLength = 50;
var directionArrowWidth  = 10;

var directionArrowCol    = "#ffffff";

var numFinishLineBars  = 50;
var finishLineBarWidth = 6;

var activeSafeZone    = SafeZonePosition.Right;  
var runnersInSafeZone = 0;

var gameOver  = false; // Set to true when game needs to be restarted
var gameIsOn  = false;

var displayResetThreshold = 10; // This is how many retry attemtps it takes before emiting a displayReset
var retryCount            = 0;


var canvas = null;
var ctx    = null;

var headingFontSize   = null;
var paragraphFontSize = null;

$(document).ready(function() {

    // Init canvas variables
    
    canvas = document.getElementById('gameCanvas');
    ctx    = canvas.getContext('2d');
    
    // Most of setting the canvas is dealth with in the CSS, but see:
    //   https://stackoverflow.com/questions/10214873/make-canvas-as-wide-and-as-high-as-parent
    // for detail about the canvas.width and canvas.height needing to also be set
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    minDimension = Math.min(canvas.width,canvas.height);
    
    headingFontSize   = Math.round(minDimension/24.0);
    paragraphFontSize = Math.round(minDimension/24.0);
    
    drawBoard(false); // draw board, but don't start animation     
    gameStart();      // triggers drawBoard(true) when enough players have join

});


function gameStart(timeout = 200) {

    // Quit players aren't updated, only added players as dc players occurs in movement loop

    for (var i=1; i<=5; i++) {
        setTimeout(() => {
            updatePlayerDisplayAtGameStart();
        }, (timeout / 5) * i);
    }

    setTimeout(() => {
        if (runners.length <= 0) {// not enough players yet
            updatePlayerDisplayAtGameStart();
            retryCount++;
            console.log("Waiting for enough players to join. Will retry in " + GameStartRetryTimeSecs + " seconds");

            if (retryCount >= displayResetThreshold){
                reset();
            }

            gameStart(GameStartRetryTimeSecs * 1000);
        }
	else {
	    gameIsOn = true;
            decreaseSafeZone();
            drawBoard(true);
        }
    }, timeout);
}

function setBackgroundRandomDeprecated() {
    // ****
    // To use this, need to reinstate bullrush.css.orig as bullrush.css
    
    var num = Math.floor(Math.random() * 5);  //0 - 5 // **** Note: Math.random() choose from 0 to <1 (not <=1) so this will never select the last pos of "5"
    
    if(num == 0) {
        document.body.className = "animated-shape";
    }
    else if(num == 1) {
        document.body.className = "meteor";
        
    }
    else if(num == 2) {
        document.body.className = "circles";

        
    }
    else if(num == 3) {
        document.body.className = "waves";
        
    }
    else if(num == 4) {
        document.body.className = "lines";
        
    }
    else if(num == 5) {
	document.body.className = "waves-monochrome";
        
    }    
}

function updatePlayerDisplayAtGameStart() {
    // console.log("canvas: " + canvas.width + " x " + canvas.height);

    var num_all_players = runners.length + taggers.length;

    var info_message = "Players in game: " + num_all_players;
    if (num_all_players > 1) {
	info_message += "<br /><b>Game on!</b>";
    }
    else {
	info_message += "<br /><i>More players needed to start game</i>";
    }
    
    
    $('#infobox').html(info_message);    
}

var goLeftArrows  = null;
var goRightArrows = null;

/* Adapted from: https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array */

function shuffle(array, startPos, endPos)
{
    //var currentIndex = array.length;
    var currentIndex = endPos + 1;
    
    // While there remain elements to shuffle...
    while (currentIndex > startPos) {

	// Pick a remaining element...
	//var randomIndex = Math.floor(Math.random() * currentIndex);
	var randomIndex = startPos + Math.floor(Math.random() * (currentIndex-startPos));

	currentIndex--;

	// And swap it with the current element.
	[array[currentIndex], array[randomIndex]] = [ array[randomIndex], array[currentIndex] ];
    }

  return array;
}

function generateRandomArrowPoints(arrowsXNum,xOrg,yOrg,xDim,yDim)
{
    var storedPoints = [];

    var arrowsYGrid = Math.round(arrowsXNum/2.0);
    
    var yGridPos = [];
    for (var i=0; i<arrowsXNum; i++) {
	yGridPos[i] = i % arrowsYGrid;
    }
    shuffle(yGridPos,0,arrowsYGrid-1);
    shuffle(yGridPos,arrowsYGrid,arrowsXNum-1);

    arrowsYGrid -= 1; // produces more balanced y-spread

    var xSpace = Math.round(xDim / arrowsXNum);
    var ySpace = Math.round(yDim / arrowsYGrid);
    
    for (var i=0; i<arrowsXNum; i++) {
	
	var randomX = xOrg + (i*xSpace);
	var randomY = yOrg + (yGridPos[i] * ySpace);

	storedPoints.push({x: randomX, y: randomY});
    }

    return storedPoints;
}

function drawDirectionArrowHints(xOrg,yOrg,xDim,yDim)
{
    var paddingX    = 60;
    var paddingY    = 260;
 
    // Reduce selection area for arrows to ensure they fit
    xOrg += paddingX;
    yOrg += paddingY;
    xDim -= (2*paddingX);
    yDim -= (2*paddingY);

    var storedArrows = null;
    
    if (activeSafeZone == SafeZonePosition.Left) {
	// getToSafeZone is on the left

	if (goLeftArrows == null) {
	    goLeftArrows = generateRandomArrowPoints(directionArrowsXNum,xOrg,yOrg,xDim,yDim);
	}
	storedArrows = goLeftArrows;
    }
    else {
	// getToSafeZone is on the right

	if (goRightArrows == null) {
	    goRightArrows = generateRandomArrowPoints(directionArrowsXNum,xOrg,yOrg,xDim,yDim);
	}
	storedArrows = goRightArrows;
    }
    
    
    for (var i=0; i<directionArrowsXNum; i++) {

	// skip middle part
	if (i>directionArrowsXQuarter1End && i<directionArrowsXQuarter4Start) { continue; }
	
	var randomX = storedArrows[i].x;
	var randomY = storedArrows[i].y;

	if (activeSafeZone == SafeZonePosition.Left) {
	    // getToSafeZone is on the left	    
	    drawArrow(ctx, randomX+directionArrowLength,randomY, randomX,randomY, directionArrowWidth, directionArrowCol);	
	}
	else {
	    // getToSafeZone is on the right
	    drawArrow(ctx, randomX,randomY, randomX+directionArrowLength,randomY, directionArrowWidth, directionArrowCol);	
	}
    }	
}

function moveTaggersOutOfSafeZone(activeSafeZone)
{
    if (activeSafeZone == SafeZonePosition.Left) {
	// Move out any taggers in the left zone area
	var lhsLine = getToSafeZoneWidth;
	
	for (var i=0; i<taggers.length; i++) {
	    var tagger = taggers[i];
	    if (tagger.x <= lhsLine) {
		tagger.x = lhsLine + tagger.radius + 2; // 2 = wiggle room
	    }
	}
    }
    else {
	// Move out taggers in the right zone area
	var rhsLine = canvas.width - getToSafeZoneWidth;
	
	for (var i=0; i<taggers.length; i++) {
	    var tagger = taggers[i];
	    if (tagger.x >= rhsLine) {
		tagger.x = rhsLine - tagger.radius - 2; // 2 = wiggle room
	    }
	}
    }
}

function drawBoard(startAnimation)
{

    //End game occurs here
    if (gameOver == true) {
	$('#infobox').html("Game Over: Returning to main display ...");

        setTimeout(() => { reset(); }, 10000);
        // Will need to add logic for keeping sockets conected???
    }
    else {
        //Clear screen
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        //Safe zone
        drawSafeZone();

        //Borders
        ctx.lineWidth = 2;
        ctx.strokesStyle = "#FFFFFF";
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
	
	drawDirectionArrowHints(getToSafeZoneWidth,0,canvas.width-(2*getToSafeZoneWidth),canvas.height);
	
        //Players
        drawTeam(runners);
        drawTeam(taggers);

        //Move players if move enabled
        runnerMove();
        taggerMove();

        //Update taggers
        updateTaggers();

        if (runnersInSafeZone == runners.length && runners.length != 0) {
	    // Change which size the safe zone is on
	    
            if (activeSafeZone == SafeZonePosition.Left) {		
                activeSafeZone = SafeZonePosition.Right;
            } else {
                activeSafeZone = SafeZonePosition.Left;
            }
	    // For the new SafeZone being set up, need to move any
	    // taggers that might be there (as result of the zone
	    // having previously shrunk away), otherwise they will get
	    // stuck there
	    moveTaggersOutOfSafeZone(activeSafeZone)
	    
            shrinkgingZoneWidth = getToSafeZoneWidth;
            runnersInSafeZone = 0;
            decreaseSafeZone();
        }

	if (startAnimation) {
            // Will need to implement a delay?
            requestAnimationFrame(drawBoard);
	}
    }
}

function drawFinishLine(xMid,yDim,numBars,barWidth)
{
    ctx.beginPath();

    //var barWidth  = 5;
    var barHeight = (yDim / numBars);

    var x = xMid - (barWidth/2.0);    
    var y = 0;
    
    for (var i=0; i<numBars; i++) {
	var barBgCol = ((i%2) == 0) ? "#000000" : "#ffffff";

        ctx.fillStyle = barBgCol;
        ctx.fillRect(x,y,barWidth,barHeight)
	
	y += barHeight;	
    }
    
    ctx.closePath();    
}

/* Based on: https://codepen.io/chanthy/pen/WxQoVG */

function drawArrow(ctx, fromx, fromy, tox, toy, directionArrowWidth, col){
    //variables to be used when creating the arrow
    var headlen = 10;
    var angle = Math.atan2(toy-fromy,tox-fromx);
 
    ctx.save();
    ctx.strokeStyle = col;
 
    //starting path of the arrow from the start square to the end square
    //and drawing the stroke
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.lineWidth = directionArrowWidth;
    ctx.stroke();
 
    //starting a new path from the head of the arrow to one of the sides of
    //the point
    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/7),
               toy-headlen*Math.sin(angle-Math.PI/7));
 
    //path from the side point of the arrow, to the other side point
    ctx.lineTo(tox-headlen*Math.cos(angle+Math.PI/7),
               toy-headlen*Math.sin(angle+Math.PI/7));
 
    //path from the side point back to the tip of the arrow, and then
    //again to the opposite side point
    ctx.lineTo(tox, toy);
    ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/7),
               toy-headlen*Math.sin(angle-Math.PI/7));
 
    //draws the paths created above
    ctx.stroke();
    ctx.restore();
}

function drawSafeZone() {
    // Draw left zone
    var transitionX = null;
    
    ctx.beginPath();
    if (activeSafeZone == SafeZonePosition.Left) {
	transitionX = getToSafeZoneWidth;
	
        ctx.rect(0, 0, getToSafeZoneWidth, canvas.height)
        ctx.fillStyle = getToSafeZoneBgCol;
    }
    else {
        ctx.rect(0, 0, shrinkgingZoneWidth, canvas.height)
        ctx.fillStyle = shrinkingZoneBgCol;
    }
    ctx.fill();
    ctx.closePath();


    //Draw right zone
    ctx.beginPath();
    if (activeSafeZone == SafeZonePosition.Right) {
	transitionX = canvas.width - getToSafeZoneWidth;

        ctx.rect(transitionX, 0, getToSafeZoneWidth, canvas.height)
        ctx.fillStyle = getToSafeZoneBgCol;

    }
    else {
        ctx.rect(canvas.width - shrinkgingZoneWidth, 0, shrinkgingZoneWidth, canvas.height)
        ctx.fillStyle = shrinkingZoneBgCol;
    }
    ctx.fill();
    ctx.closePath();

    drawFinishLine(transitionX,canvas.height,numFinishLineBars, finishLineBarWidth);
}

// Have to add the socket here
function playerAdd(newSocket) {
    var socketID = String(newSocket);
    p = playerExist(socketID);

    if (p == null) {
        if (taggers.length == 0 || runners.length % 8 == 0 && runners.length >= 1) {
            console.log("Added tagger: " + newSocket);
	    var newX = canvas.width / 4 + random(0, canvas.width / 2);
	    var newY = random(30, canvas.height - 30);
	    var newPlayerLabel = "T" + (runners.length+1);
            var newPlayer = new player(newX,newY, 1, newPlayerLabel, socketID, canvas, getToSafeZoneWidth, activeSafeZone);
	    
            taggers.push(newPlayer);    
        }
	else {
            console.log("Added runner: " + newSocket);
            if (activeSafeZone == SafeZonePosition.Right && shrinkgingZoneWidth <= 25) {
                var newX = random(canvas.width - shrinkgingZoneWidth + 20, canvas.width - 20);
                var newSafeZone = SafeZonePosition.Right;
            } else {
                var newX = random(20, shrinkgingZoneWidth - 20);
                var newSafeZone = SafeZonePosition.Left;
            }
            if (newSafeZone == activeSafeZone){
                runnersInSafeZone++;
            }
	    var newY = random(20, canvas.height - 20); // 20 comes from max player radius
	    var newPlayerLabel = "R" + (runners.length+1);
            var newPlayer = new player(newX, newY, 0, newPlayerLabel, socketID, canvas, getToSafeZoneWidth, newSafeZone); 
	    
            runners.push(newPlayer);
        }
    }
    else {
        console.log("New client already existed. Resent colour");
        emitPlayerMarker(socketID, p.colour, p.type, p.playerLabel);
    }
}

function playerRemove(team, player) {
    if (team == "r"){
        runners = arrayRemove(runners, player);
    } else {
        taggers = arrayRemove(taggers, player);
    }

    /*
    if (runners.length == 0 || taggers.length == 0) {
	if (gameIsOn) {
            gameOver = true;
	}
    }
    */
}

function runnerMove() {
    for (var i=0; i<runners.length; i++) {
        if (runners[i].quit == true) {
            playerRemove("r", runners[i]);
        } else {
            runnersInSafeZone += runners[i].move(canvas, activeSafeZone, getToSafeZoneWidth, shrinkgingZoneWidth);
            for (var j = 0; j < taggers.length; j++) {
                //Tagger intersect collision
                var difx = runners[i].x - taggers[j].x;
                var dify = runners[i].y - taggers[j].y;
                var distance = Math.sqrt((difx*difx) + (dify*dify));

                if (distance < runners[i].radius + taggers[j].radius) {
		    // Collision! Runner has been hit (i.e., tagged)
		    var runner = runners[i];
		    var tagger = taggers[j];

		    emitRunnerHasBeenTagged(runner.socket);
		    emitTaggerHasCaughtRunner(tagger.socket);
		    
                    tagged.push(runners[i])
                }
            }
        }
    }
}

function taggerMove() {
    for (var i = 0; i < taggers.length; i++) {
        if (taggers[i].quit == true) {
            playerRemove("t", taggers[i]);
        } else {
            taggers[i].move(canvas, activeSafeZone, getToSafeZoneWidth, shrinkgingZoneWidth);
        }
    }
}

function playerExist(socketID){
    for (var i = 0; i < runners.length; i++) {
        const p = runners[i];
        if (p.socket == socketID){
            return p;
        }
    }
    for (var i = 0; i < taggers.length; i++) {
        const p = taggers[i];
        if (p.socket == socketID){
            return p;
        }
    }
    return null;
}

function updateTaggers()
{
    // Add player to taggers and remove from runners
    // But hold off changing the player marker and updating infoTopline in case those now tagged are the last runners standing
    // In which case those runner(s) are the winners
    
    for (var i=0; i<tagged.length; i++) {
	var tagged_runner = tagged[i];
        runners = arrayRemove(runners, tagged_runner);
        taggers.push(tagged_runner);
    }

    //
    // Test to see if game should end
    //
    if (runners.length == 0) {
	// Everyone has been captured

	if (gameIsOn) {

	    // In theory, greater than one runner can be caught in the last
	    // cycle, meaning they all count as winners

	    var rememberWinners = {};
	    
	    for (var w=0; w<tagged.length; w++) {
		var winningRunner = tagged[w];	
		emitWinner(winningRunner.socket);

		rememberWinners[winningRunner.socket] = true;
	    }

	    for (var l=0; l<taggers.length; l++) {
		var tagger = taggers[l];
		if (rememberWinners[tagger.socket]) {
		    continue;
		}
		
		if (tagger.playerLabel.startsWith("R")) {
		    var capturedRunner = tagger;
		    emitYouWereCaught(capturedRunner.socket);
		}
		else {
		    var alwaysATagger = tagger;
		    emitEveryoneCaptured(alwaysATagger.socket);
		}
	    }

            gameOver = true;
	    gameIsOn = false;

	    winners = tagged.slice(); // with no args, does (shallow) array copy
	}
    }
    else {
	// Most recent tagged Runner(s) are not the overall winners
	// So convert to being Taggers
	
	for (var i=0; i<tagged.length; i++) {
	    var tagged_runner = tagged[i];
            tagged_runner.typeChange(PlayerType.Tagger, canvas, getToSafeZoneWidth);
	    emitInfoTopline(tagged_runner.socket, 'You have been caught, and are now a Tagger<div style="font-size:85%">Now it is your turn to capture Runners</div>');	
	}
    }
    
    tagged.length = 0;    
}

function drawTeam(team) {
    if (team.length != null) {
        for (var i = 0; i < team.length; i++) {
            team[i].draw(ctx);
        }
    }
}

function arrayRemove(arr, value) {
    return arr.filter(function (ele) {
        return ele != value;
    });
}

// Broken so just place the js file into this file
function include(file) {
    var script = document.createElement('script');
    script.src = file;
    script.type = 'text/javascript';
    script.defer = true;

    document.getElementsByTagName('head').item(0).appendChild(script);
}

function socketUpdate(e, ...args) {
    if (e == 'clientConnected'){
        var id = args[0];
        console.log("New client: " + id);
        playerAdd(id);
    }
    else {
        var num = args[0];
	// Iterate through every player until the socket number matches
	// Start with checking the runners
        if (!loopTeamSocketUpdate(num, e, runners))
	    // Didn't get a match as a runner => try the taggers
            loopTeamSocketUpdate(num, e, taggers);
    }
}

function loopTeamSocketUpdate(num, e, team) {
    for (var i=0; i<team.length; i++) {
        if (team[i].socketEventHandler(num, e)) {
            return true;
	}
    }
    return false;
}

function decreaseSafeZone() {
    setTimeout(() => {
        console.log("Decreaseing Safe Zone");
        shrinkgingZoneWidth = shrinkgingZoneWidth - 0.3;
        if (shrinkgingZoneWidth > 0) {
            decreaseSafeZone();
        }
    }, 100);
}

class player {
    type        = PlayerType.WaitingForAssignment; // 0 - normal runner, 1 - tagger, 2 - waiting for new round
    playerLabel = null;

    x  = null;
    y  = null;
    dx = null;
    dy = null;
    
    radius = null;
    colour = null;

    moveLeft  = false;
    moveRight = false;
    moveUp    = false;
    moveDown  = false;

    socket = null;
    
    currSafeZone = SafeZonePosition.Unassigned;  // once assigned, signifies Left or Right
    quit = false;


    constructor(newX, newY, newType, playerLabel, newSocket, canvas, getToSafeZoneWidth, newSafeZone)
    {
        this.x = newX;
        this.y = newY;
	this.playerLabel = playerLabel;
	
        this.socket = newSocket;
        this.currSafeZone = newSafeZone;
        this.typeChange(newType, canvas, getToSafeZoneWidth);

	if (newType == PlayerType.Runner) {
	    emitInfoTopline(this.socket, 'You are a Runner<div style="font-size:85%">Avoid the Taggers as long as you can</div>');
	}
	else {
	    emitInfoTopline(this.socket, 'You are a Tagger<div style="font-size:85%">Capture Runners until none are left</div>');
	}
    }

    typeChange(newType, canvas, getToSafeZoneWidth) {
        // Set any and all type properties in here
        this.type = newType;

        this.moveLeft  = false;
        this.moveRight = false;
        this.moveUp    = false;
        this.moveDown  = false;

        switch (this.type) {
            case PlayerType.Runner: // Runner
                this.dx = random(3, 4);
                this.dy = random(3, 4);
                //this.radius = random(12, 19);
                this.radius = 20;
                this.colour = ("#0" + randomCol5()); // Red Minor 
                break;

            case PlayerType.Tagger: // Tagger
                this.dx = random(2, 5);
                this.dy = random(2, 5);
                //this.radius = random(13, 20);
                this.radius = 20;

                if (this.x + this.radius > canvas.width - getToSafeZoneWidth) {
                    this.x = canvas.width - getToSafeZoneWidth - this.radius;
                } else if (this.x - this.radius < getToSafeZoneWidth) {
                    this.x = getToSafeZoneWidth + this.radius;
                }

                this.colour = ("#FF0000"); // Fully red

                break;

            default:
	        console.log("typeChange(): Unrecognized type '" + this.type + "'")
                break;
        }

        emitPlayerMarker(this.socket, this.colour, this.type, this.playerLabel);
    }
    
    socketEventHandler(num, e) {
        // Only allow updates for identical sockets?
        //console.log("Does socket: " + this.socket + " = " + num);

        var result = (num === this.socket);
        //console.log("Result: " + result);

        if (num === this.socket) {
            switch (e) {
                case "upOn":
                    this.moveUp = true;
                    break;

                case "upOff":
                    this.moveUp = false;
                    break;

                case "leftOn":
                    this.moveLeft = true;
                    break;

                case "leftOff":
                    this.moveLeft = false;
                    break;

                case "rightOn":
                    this.moveRight = true;
                    break;

                case "rightOff":
                    this.moveRight = false;
                    break;

                case "downOn":
                    this.moveDown = true;
                    break;

                case "downOff":
                    this.moveDown = false;
                    break;
                case "clientDC":
                    console.log("Controller dc signal recieved for player: " + this.socket + " for player type: " + this.type);
                    this.quit = true;
                    break;
                default:
                    break;
                // Add more socket events here
            }
            return true;
        }
        return false;
    }

    draw(ctx,prefixLabel)
    {
        if (this.type == PlayerType.Runner) {
	    drawRunner(ctx,this.x,this.y,this.radius,this.colour,this.playerLabel);
        }
        else if (this.type == PlayerType.Tagger) {
	    drawTagger(ctx,this.x,this.y,this.radius,this.colour,this.playerLabel);
        }
	else {
	    console.error("player.draw(): unrecognized player type: " + this.type);
	}
    }

    move(canvas, activeSafeZone, getToSafeZoneWidth, shrinkgingZoneWidth) {
        /* Basic collision */
        if (this.type == PlayerType.Runner) { // Runner
            if (this.moveLeft && this.x - this.radius - this.dx > 0) {
                this.x -= this.dx;
                if (activeSafeZone == SafeZonePosition.Left && this.currSafeZone != SafeZonePosition.Left && this.x - this.radius < getToSafeZoneWidth) {
                    this.currSafeZone = SafeZonePosition.Left;
                    return 1;
                }
            }
            if (this.moveRight && this.x + this.radius < canvas.width - this.dx) {
                this.x += this.dx;
                if (activeSafeZone == SafeZonePosition.Right && this.currSafeZone != SafeZonePosition.Right && this.x + this.radius > canvas.width - getToSafeZoneWidth) {
                    this.currSafeZone = SafeZonePosition.Right;
                    return 1;
                }
            }
            if (this.moveUp && this.y - this.radius - this.dx > 0) {
                this.y -= this.dy;
            }
            if (this.moveDown && this.y + this.radius <= canvas.height - this.dy) {
                this.y += this.dy;
            }
        }
	else { // Tagger
            if (activeSafeZone == SafeZonePosition.Left) {
                if (this.moveLeft && this.x - this.radius - this.dx > 0 + getToSafeZoneWidth) {
                    this.x -= this.dx;
                }
                if (this.moveRight && this.x + this.radius + shrinkgingZoneWidth < canvas.width - this.dx) {
                    this.x += this.dx;
                }
                if (this.moveUp && this.y - this.radius - this.dx > 0) {
                    this.y -= this.dy;
                }
                if (this.moveDown && this.y + this.radius <= canvas.height - this.dy) {
                    this.y += this.dy;
                }
            } else {
                if (this.moveLeft && this.x - this.radius - this.dx > 0 + shrinkgingZoneWidth) {
                    this.x -= this.dx;
                }
                if (this.moveRight && this.x + this.radius + getToSafeZoneWidth < canvas.width - this.dx) {
                    this.x += this.dx;
                }
                if (this.moveUp && this.y - this.radius - this.dx > 0) {
                    this.y -= this.dy;
                }
                if (this.moveDown && this.y + this.radius <= canvas.height - this.dy) {
                    this.y += this.dy;
                }
            }
        }

        return 0;
        /* Advanced colission in progress */
        // if (this.type == PlayerType.Runner) {
        //     if (activeSafeZone == SafeZonePosition.Left) {
        //         if (this.moveLeft && this.x - this.radius - this.dx > 0) {
        //             this.x -= this.dx;
        //         }
        //         if (this.moveRight && this.x + this.radius < canvas.width - this.dx && (this.x + this.radius + this.dx < getToSafeZoneWidth)) {
        //             this.x += this.dx;
        //         }
        //         if (this.moveUp && this.y - this.radius - this.dx > 0) {
        //             this.y -= this.dy;
        //         }
        //         if (this.moveDown && this.y + this.radius <= canvas.height - this.dy) {
        //             this.y += this.dy;
        //         }
        //     } else {
        //         if (this.moveLeft && this.x - this.radius - this.dx > 0) {
        //             if (this.currSafeZone != activeSafeZone)
        //                 this.x -= this.dx;
        //             else if (this.x - this.radius - this.dx > canvas.width - getToSafeZoneWidth)
        //                 this.x -= this.dx;
        //         }
        //         if (this.moveRight && this.x + this.radius < canvas.width - this.dx) {
        //             this.x += this.dx;
        //             if
        //         }
        //         if (this.moveUp && this.y - this.radius - this.dx > 0) {
        //             this.y -= this.dy;
        //         }
        //         if (this.moveDown && this.y + this.radius <= canvas.height - this.dy) {
        //             this.y += this.dy;
        //         }
        //     }

        // } else {
        //     if (activeSafeZone == SafeZonePosition.Left) {
        //         if (this.moveLeft && this.x - this.radius - this.dx > 0 + getToSafeZoneWidth) {
        //             this.x -= this.dx;
        //         }
        //         if (this.moveRight && this.x + this.radius + shrinkgingZoneWidth < canvas.width - this.dx) {
        //             this.x += this.dx;
        //         }
        //         if (this.moveUp && this.y - this.radius - this.dx > 0) {
        //             this.y -= this.dy;
        //         }
        //         if (this.moveDown && this.y + this.radius <= canvas.height - this.dy) {
        //             this.y += this.dy;
        //         }
        //     } else {
        //         if (this.moveLeft && this.x - this.radius - this.dx > 0 + shrinkgingZoneWidth) {
        //             this.x -= this.dx;
        //         }
        //         if (this.moveRight && this.x + this.radius + getToSafeZoneWidth < canvas.width - this.dx) {
        //             this.x += this.dx;
        //         }
        //         if (this.moveUp && this.y - this.radius - this.dx > 0) {
        //             this.y -= this.dy;
        //         }
        //         if (this.moveDown && this.y + this.radius <= canvas.height - this.dy) {
        //             this.y += this.dy;
        //         }
        //     }
        // }
    }
    
}
