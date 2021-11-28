var canvas = document.getElementById('gameCanvas');
var ctx = canvas.getContext('2d');

canvas.width = innerWidth - 30;
canvas.height = innerHeight - 30;

var players = [];
var taggers = [];
var tagged = [];

var safeZone = 80;  // Constant
var tempSafeZone = safeZone; // Draw this one
var activeSafeZone = 2; // 0 = null, i.e. game over. 1 = left, 2 = right
var playersInSafeZone = 0;

var gameOver = false; // Set to true when game needs to be restarted
var gameReady = false;

const random = (min, max) => Math.floor(Math.random() * (max - min)) + min;
const randomColor = () => Math.floor(Math.random() * 1048576).toString(16); //Only prints out max of 5 bits of the 6 colours

    // Manual start --> call function draw();
    // Automatic start: when there are at least 2 players
    gameStart();

function gameStart(timeout = 200) {
    for (var i = 1; i <= 5; i++) {
        setTimeout(() => {
            updatePlayerDisplayAtGameStart();
        }, (timeout / 5) * i);
    }

    setTimeout(() => {
        if (players.length <= 0) {//minimum players
            updatePlayerDisplayAtGameStart();
            console.log("Waiting for enough players to join. Will retry in 5 seconds");
            gameStart(5000);
        } else {
            decreaseSafeZone();
            draw();
        }
    }, timeout);
}

function setBackground() {
    var num = Math.floor(Math.random() * 4);  //0 - 4
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
}

function updatePlayerDisplayAtGameStart() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "100px Arial";
    ctx.fillText('Players in game: ' + (players.length + taggers.length), canvas.width / 10, canvas.height / 2);
}

function draw() {

    //End game occurs here
    if (gameOver == true) {
        ctx.fillStyle = "black";
        ctx.font = "100px Arial";
        ctx.fillText('GAME OVER - RELOADING', canvas.width / 10, canvas.height / 2);
        setTimeout(() => { document.location.reload(); }, 6000);
        // Will need to add logic for keeping sockets conected???
    } else {
        //Clear screen
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        //Safe zone
        drawSafeZone();

        //Borders
        ctx.lineWidth = 2;
        ctx.strokesStyle = "#FFFFFF";
        ctx.strokeRect(0, 0, canvas.width, canvas.height);

        //Players
        drawTeam(players);
        drawTeam(taggers);

        //Move players if move enabled
        playerMove();
        taggerMove();

        //Update taggers
        updateTaggers();

        if (playersInSafeZone == players.length && players.length != 0) {
            if (activeSafeZone == 1) {
                activeSafeZone++;
            } else {
                activeSafeZone--;
            }
            tempSafeZone = safeZone;
            playersInSafeZone = 0;
            decreaseSafeZone();
        }

        // Will need to implement a delay?
        requestAnimationFrame(draw);
    }
}

function drawSafeZone() {
    // Draw left zone
    ctx.beginPath();
    if (activeSafeZone == 1) {
        ctx.rect(0, 0, safeZone, canvas.height)
        ctx.fillStyle = "#98FF98"; //Greenish colour
    } else {
        ctx.rect(0, 0, tempSafeZone, canvas.height)
        ctx.fillStyle = "#EBECF0"; //Grayish colour
    }
    ctx.fill();
    ctx.closePath();


    //Draw right zone
    ctx.beginPath();
    if (activeSafeZone == 2) {
        ctx.rect(canvas.width - safeZone, 0, safeZone, canvas.height)
        ctx.fillStyle = "#98FF98"; //Greenish colour
    } else {
        ctx.rect(canvas.width - tempSafeZone, 0, tempSafeZone, canvas.height)
        ctx.fillStyle = "#EBECF0"; //Grayish colour
    }
    ctx.fill();
    ctx.closePath();
}

// Have to add the socket here
function playerAdd(newSocket) {
    var socketID = String(newSocket);
    if (taggers.length == 0 || players.length % 8 == 0 && players.length >= 1) {
        console.log("Added tagger: " + newSocket);
        taggers.push(new player(canvas.width / 4 + random(0, canvas.width / 2), random(30, canvas.height - 30), 1, socketID, canvas, safeZone, activeSafeZone));

    } else {
        console.log("Added player: " + newSocket);
        if (activeSafeZone == 2 && tempSafeZone <= 25) {
            var newX = random(canvas.width - tempSafeZone + 20, canvas.width - 20);
            var newSafeZone = 2;
        } else {
            var newX = random(20, tempSafeZone - 20);
            var newSafeZone = 1;
        }
        if (newSafeZone == activeSafeZone){
            playersInSafeZone++;
        }
        players.push(new player(newX, random(20, canvas.height - 20), 0, socketID, canvas, safeZone, newSafeZone)); // 20 comes from max player radius
    }

    // Any other logic for adding a player
}

function playerRemove(team, player) {
    if (team == "p"){
        players = arrayRemove(players, player);
    } else {
        taggers = arrayRemove(taggers, player);
    }

    if (players.length == 0 || taggers.length == 0) {
        gameOver = true;
    }

    // Other remove logic? player checking
}

function playerMove() {
    for (var i = 0; i < players.length; i++) {
        if (players[i].quit == true) {
            playerRemove("p", players[i]);
        } else {
            playersInSafeZone += players[i].move(canvas, activeSafeZone, safeZone, tempSafeZone);
            for (var j = 0; j < taggers.length; j++) {
                //Tagger intersect colission
                var difx = players[i].x - taggers[j].x;
                var dify = players[i].y - taggers[j].y;
                var distance = Math.sqrt(difx * difx + dify * dify);

                if (distance < players[i].radius + taggers[j].radius) {
                    tagged.push(players[i])
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
            taggers[i].move(canvas, activeSafeZone, safeZone, tempSafeZone);
        }
    }
}

function updateTaggers() {
    // Add player to taggers and remove from players
    // Change player properties to equal a taggers. HANDLED IN OBJECT

    if (players.length == 0){
        //tagged[tagged.length - 1].setWinner();
        gameOver = true;
    }

    for (var i = 0; i < tagged.length; i++) {
        tagged[i].typeChange(1, canvas, safeZone);

        players = arrayRemove(players, tagged[i]);
        taggers.push(tagged[i]);
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

function socketUpdate(num, e) {
    // Itterate through every player until the socket number matches
    if (!loopTeamSocketUpdate(num, e, players))
        loopTeamSocketUpdate(num, e, taggers);
}

function loopTeamSocketUpdate(num, e, team) {
    for (var i = 0; i < team.length; i++) {
        if (team[i].socketEventHandler(num, e))
            return true;
    }
    return false;
}

function decreaseSafeZone() {
    setTimeout(() => {
        console.log("Decreaseing Safe Zone");
        tempSafeZone = tempSafeZone - 0.3;
        if (tempSafeZone > 0) {
            decreaseSafeZone();
        }
    }, 100);
}

class player {
    socket = '';
    type = 0; // 0 - normal player, 1 - tagger, 2 - waiting for new round
    radius = 5;
    x = 0;
    y = 0;
    dx = 2;
    dy = 2;
    moveLeft = false;
    moveRight = false;
    moveUp = false;
    moveDown = false;
    colour = ("#40E0D0"); //turquoise //Red = (255,0,0)
    currSafeZone = 0; // 1 - left, 2 - right
    quit = false;

    constructor(newX, newY, newType, newSocket, canvas, safeZone, newSafeZone) {
        this.x = newX;
        this.y = newY;
        this.socket = newSocket;
        this.currSafeZone = newSafeZone;
        this.typeChange(newType, canvas, safeZone);
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
                case "controller disconnection":
                    console.log("Controller dc signal recieved for player: " + this.socket + " In team: " + this.type);
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

    draw(ctx) {
        // Circle for nontaggers
        ctx.lineWidth = 1;
        ctx.strokesStyle = "#FFFFFF";
        if (this.type == 0) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.colour;
            ctx.stroke();
            ctx.fill();
            ctx.closePath();
        }
        //Draw a spike ball for taggers
        else if (this.type == 1) {
            var spikes = 16;
            var rot = Math.PI / 2 * 3;
            var step = Math.PI / spikes;
            var outerRadius = this.radius - 0.5;
            var innerRadius = this.radius - 4;
            var x = this.x;
            var y = this.y;

            ctx.beginPath();
            ctx.moveTo(this.x, this.y - outerRadius)
            for (var i = 0; i < spikes; i++) {
                x = this.x + Math.cos(rot) * outerRadius;
                y = this.y + Math.sin(rot) * outerRadius;
                ctx.lineTo(x, y)
                rot += step

                x = this.x + Math.cos(rot) * innerRadius;
                y = this.y + Math.sin(rot) * innerRadius;
                ctx.lineTo(x, y)
                rot += step
            }
            ctx.lineTo(this.x, this.y - outerRadius);
            ctx.closePath();
            ctx.fillStyle = this.colour;
            ctx.stroke();
            ctx.fill();
            ctx.closePath();
        }

    }

    move(canvas, activeSafeZone, safeZone, tempSafeZone) {
        /*Basic colission*/
        if (this.type == 0) { //Normal player
            if (this.moveLeft && this.x - this.radius - this.dx > 0) {
                this.x -= this.dx;
                if (activeSafeZone == 1 && this.currSafeZone != 1 && this.x - this.radius < safeZone) {
                    this.currSafeZone = 1;
                    return 1;
                }
            }
            if (this.moveRight && this.x + this.radius < canvas.width - this.dx) {
                this.x += this.dx;
                if (activeSafeZone == 2 && this.currSafeZone != 2 && this.x + this.radius > canvas.width - safeZone) {
                    this.currSafeZone = 2;
                    return 1;
                }
            }
            if (this.moveUp && this.y - this.radius - this.dx > 0) {
                this.y -= this.dy;
            }
            if (this.moveDown && this.y + this.radius <= canvas.height - this.dy) {
                this.y += this.dy;
            }
        } else { //Tagger
            if (activeSafeZone == 1) {
                if (this.moveLeft && this.x - this.radius - this.dx > 0 + safeZone) {
                    this.x -= this.dx;
                }
                if (this.moveRight && this.x + this.radius + tempSafeZone < canvas.width - this.dx) {
                    this.x += this.dx;
                }
                if (this.moveUp && this.y - this.radius - this.dx > 0) {
                    this.y -= this.dy;
                }
                if (this.moveDown && this.y + this.radius <= canvas.height - this.dy) {
                    this.y += this.dy;
                }
            } else {
                if (this.moveLeft && this.x - this.radius - this.dx > 0 + tempSafeZone) {
                    this.x -= this.dx;
                }
                if (this.moveRight && this.x + this.radius + safeZone < canvas.width - this.dx) {
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
        // if (this.type == 0) {
        //     if (activeSafeZone == 1) {
        //         if (this.moveLeft && this.x - this.radius - this.dx > 0) {
        //             this.x -= this.dx;
        //         }
        //         if (this.moveRight && this.x + this.radius < canvas.width - this.dx && (this.x + this.radius + this.dx < safeZone)) {
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
        //             else if (this.x - this.radius - this.dx > canvas.width - safeZone)
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
        //     if (activeSafeZone == 1) {
        //         if (this.moveLeft && this.x - this.radius - this.dx > 0 + safeZone) {
        //             this.x -= this.dx;
        //         }
        //         if (this.moveRight && this.x + this.radius + tempSafeZone < canvas.width - this.dx) {
        //             this.x += this.dx;
        //         }
        //         if (this.moveUp && this.y - this.radius - this.dx > 0) {
        //             this.y -= this.dy;
        //         }
        //         if (this.moveDown && this.y + this.radius <= canvas.height - this.dy) {
        //             this.y += this.dy;
        //         }
        //     } else {
        //         if (this.moveLeft && this.x - this.radius - this.dx > 0 + tempSafeZone) {
        //             this.x -= this.dx;
        //         }
        //         if (this.moveRight && this.x + this.radius + safeZone < canvas.width - this.dx) {
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

    typeChange(newType, canvas, safeZone) {
        // Set any and all type properties in here
        this.type = newType;
        this.moveLeft = false;
        this.moveRight = false;
        this.moveUp = false;
        this.moveDown = false;

        switch (this.type) {
            case 0: //Player
                this.colour = ("#0" + randomColor()); //Red Minor 
                this.dx = random(3, 4);
                this.dy = random(3, 4);
                this.radius = random(12, 19);
                break;

            case 1: //Tagger
                this.colour = ("#FF0000"); //Red
                this.dx = random(2, 5);
                this.dy = random(2, 5);
                this.radius = random(13, 20);

                if (this.x + this.radius > canvas.width - safeZone) {
                    this.x = canvas.width - safeZone - this.radius;
                } else if (this.x - this.radius < safeZone) {
                    this.x = safeZone + this.radius;
                }

                break;

            default:
                break;
        }

        // Emit colour
        emitColour(this.socket, this.colour);

    }

    setWinner(){
        // Emit to player they are the winner
        console.log("Send winner signal");
    }
}
