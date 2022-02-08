# Hey-You-Interactive-Display

If you do not already have NodeJS installed at the command-line, for
convenience you can find packaged up binaries in 'cli-packages' for
64-bit Linux and Windows.  Untar (Linux) or unzip (Cygwin) the
relevant file, and then 'source ./SETUP.bash'

Steps:

1. run in terminal: 'node index.js -console'.
2. in broswer for display navigate to: localhost:3000/activity.
3. scan the QR code and paste the url into the browser to join as a client to that session
4. alternatively navigate to localhost:3000/join/roomID. Replace the roomID with the deviceID of the display you wish to join. 


If you want to run the server in the background, this can be accomplished with:

    nohup node index.js </dev/null  2>&1 &


**Display Emit Codes**

- displayLoaded --> Indicates to server that the display is loaded and will then forward all messages from clients of the loaded display.. Format: ('displayLoaded')
- displayReset --> Resets the display back to the default activity and require clients to reload... Format: ('displayReset')
- displayEmit --> Event is sent to all clients/displays in room... Format: ('displayEmit', destination room/socket, event, extra arg)

**Client Emit Codes**

- selectActivity --> Tells the rooms activity to be changed to the requested activity... Format: ('selectActivity', room, activity folder name, callback function)

- default --> Format: (event, ...args)
All emit requests which don't fit one of the above values will be treated as a message which must be sent to the display.
The display will be sent (event, deviceID, args)

**Notes**

Folders cannot be named z. This is due to static pages defaulting to /stiatic/z so that it is refered to the default static page

Displays or clients expecting custom messages should have a function called socketUpdate(...args) and enable the any listener inside of the relevant html page (e.g. index.html for displays and client.html for clients) using the line: 

    socket.onAny(anyListener); // Turns on the any istener

