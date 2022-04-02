
$(document).ready(function() {
      // page specific functions
      var form  = document.getElementById('form');
      var input = document.getElementById('input');

      document.addEventListener('keydown', buttondown, false);
      document.addEventListener('keyup',   buttonup, false);

      var left  = document.getElementById('left');
      var right = document.getElementById('right');
   
      ///////////////////////////////////////////////////////////////////////   
      class JoystickController
      {
        // stickID:     ID of HTML element (representing joystick) that will be dragged
        // maxDistance: maximum amount joystick can move in any direction
        // deadzone:    joystick must move at least this amount from origin to register value change
        constructor( stickID, maxDistance, deadzone )
        {
          this.left = false;
          this.right = false;
          this.up = false;
          this.down = false;
          this.id = stickID;
          let stick = document.getElementById(stickID);

          // location from which drag begins, used to calculate offsets
          this.dragStart = null;

          // track touch identifier in case multiple joysticks present
          this.touchId = null;
          
          this.active = false;
          this.value = { x: 0, y: 0 }; 
              this.xPlace = 0;
              this.yPlace = 0;

          let self = this;

          function handleDown(event)
          {
              self.active = true;

            // all drag movements are instantaneous
            stick.style.transition = '0s';

            // touch event fired before mouse event; prevent redundant mouse event from firing
            event.preventDefault();

              if (event.changedTouches)
                self.dragStart = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
              else
                self.dragStart = { x: event.clientX, y: event.clientY };

            // if this is a touch event, keep track of which one
              if (event.changedTouches)
                self.touchId = event.changedTouches[0].identifier;
          }
          
          function handleMove(event) 
          {
              if ( !self.active ) return;

              // if this is a touch event, make sure it is the right one
              // also handle multiple simultaneous touchmove events
              let touchmoveId = null;
              if (event.changedTouches)
              {
                for (let i = 0; i < event.changedTouches.length; i++)
                {
                  if (self.touchId == event.changedTouches[i].identifier)
                  {
                    touchmoveId = i;
                    event.clientX = event.changedTouches[i].clientX;
                    event.clientY = event.changedTouches[i].clientY;
                  }
                }

                if (touchmoveId == null) return;
              }

              const xDiff = event.clientX - self.dragStart.x;
              const yDiff = event.clientY - self.dragStart.y;
              const angle = Math.atan2(yDiff, xDiff);
              const distance = Math.min(maxDistance, Math.hypot(xDiff, yDiff));
              const xPosition = distance * Math.cos(angle);
              const yPosition = distance * Math.sin(angle);

              // move stick image to new position
              stick.style.transform = `translate3d(${xPosition}px, ${yPosition}px, 0px)`;

              // deadzone adjustment
              const distance2 = (distance < deadzone) ? 0 : maxDistance / (maxDistance - deadzone) * (distance - deadzone);
              const xPosition2 = distance2 * Math.cos(angle);
              const yPosition2 = distance2 * Math.sin(angle);
              const xPercent = parseFloat((xPosition2 / maxDistance).toFixed(4));
              const yPercent = parseFloat((yPosition2 / maxDistance).toFixed(4));
              
              self.xPlace = xPercent;
              self.yPlace = yPercent;
              self.value = { x: self.xPlace, y: self.yPlace };
            }

          function handleUp(event) 
          {
            if ( !self.active ) return;

            // if this is a touch event, make sure it is the right one
            if (event.changedTouches && self.touchId != event.changedTouches[0].identifier) return;

            // transition the joystick position back to center
            stick.style.transition = '.2s';
            stick.style.transform = `translate3d(0px, 0px, 0px)`;

            // reset everything
            self.value = { x: 0, y: 0 };
            self.touchId = null;
            self.active = false;
            self.xPlace = 0;
            self.yPlace = 0;
          }

          stick.addEventListener('mousedown', handleDown);
          stick.addEventListener('touchstart', handleDown);
          document.addEventListener('mousemove', handleMove, {passive: false});
          document.addEventListener('touchmove', handleMove, {passive: false});
          document.addEventListener('mouseup', handleUp);
          document.addEventListener('touchend', handleUp);
        }
      }
      ///////////////////////////////////////////////////////////////////////

      let joystick1 = new JoystickController("stick1", 120, 8);

      function update()
      {
        //Left and Right
        if(joystick1.xPlace < -0.25 && joystick1.left == false){
          joystick1.right = false;
          Socket.emit('leftOn', roomID);
          Socket.emit('rightOff', roomID);
          joystick1.left = true;
        }
        if(joystick1.xPlace > 0.25 && joystick1.right == false){
          joystick1.left = false;
          Socket.emit('rightOn', roomID);
          Socket.emit('leftOff', roomID);
          joystick1.right = true;
        }
        if(joystick1.xPlace > -0.25 && joystick1.xPlace < 0.25 && (joystick1.left == true || joystick1.right == true)){
          joystick1.left = false;
          joystick1.right = false;
          Socket.emit('rightOff', roomID);
          Socket.emit('leftOff', roomID);
        }

        //Up and down
        if(joystick1.yPlace < -0.25 && joystick1.up == false){
          joystick1.down = false;
          Socket.emit('upOn', roomID);
          Socket.emit('downOff', roomID);
          joystick1.up = true;
        }
        if(joystick1.yPlace > 0.25 && joystick1.down == false){
          joystick1.up = false;
          Socket.emit('downOn', roomID);
          Socket.emit('upOff', roomID);
          joystick1.down = true;
        }
        if(joystick1.yPlace > -0.25 && joystick1.yPlace < 0.25 && (joystick1.up == true || joystick1.down == true)){
          joystick1.up = false;
          joystick1.down = false;
          Socket.emit('upOff', roomID);
          Socket.emit('downOff', roomID);
        }
      }

      //Function for when arrowkeys on the keyboard are pressed
      function buttondown(e) {
        if (e.key == 'ArrowLeft'){
          console.log('Left');
          document.getElementById("left").style.backgroundColor = "burlywood";
          Socket.emit('left key down');
        }
        if (e.key == 'ArrowRight'){
          console.log('Right');
          document.getElementById("right").style.backgroundColor = "burlywood";
          Socket.emit('right key down');
        }
        //alert("Key pressed: "+ e.key)
        //Socket.emit('key down', e.key);
      }

      function buttonup(e) {
        if (e.key == 'ArrowLeft'){
          document.getElementById("left").style.backgroundColor = "cadetblue";
          Socket.emit('left key up');
        }
        if (e.key == 'ArrowRight'){
          document.getElementById("right").style.backgroundColor = "cadetblue";
          Socket.emit('right key up');
        }
        //alert("Key pressed: "+ e.key)
        //Socket.emit('key up', e.key);
      }

    function init()
    {
	var collideMP3 = randomArrayEntry(AudioResources.Collide);
	$('#collide').attr("src","audio/" + collideMP3);
	
	var inZoneMP3  = randomArrayEntry(AudioResources.InZone);
	$('#in-zone').attr("src","audio/" + inZoneMP3);

    	var gotchaMP3  = randomArrayEntry(AudioResources.InZone);
	$('#gotcha').attr("src","audio/" + gotchaMP3);

    	var winnerMP3  = randomArrayEntry(AudioResources.InZone);
	$('#winner').attr("src","audio/" + winnerMP3);
    }
    
    function loop()
    {
        requestAnimationFrame(loop);
        update();
    }
    
    init();    
    loop();
    
});
