# Hey-You-Interactive-Display

Steps:

1. run in terminal: node index.js.
2. in broswer for display navigate to: localhost:3000/activity.
3. scan the QR code and paste the url into the browser to join as a client to that session
4. alternatively navigate to localhost:3000/join/roomID. Replace the roomID with the deviceID of the display you wish to join. 



**Display Emit Codes**

- displayLoaded --> Indicates to server that the display is loaded and will then forward all messages from clients of the loaded display.. Format: ('displayLoaded')
- displayReset --> Resets the display back to the default activity and require clients to reload... Format: ('displayReset')
- displayEmit --> Event is sent to all clients/displays in room... Format: ('displayEmit', destination room/socket, event, extra arg)

**Client Emit Codes**

- selectActivity --> Tells the rooms activity to be changed to the requested activity... Format: ('selectActivity', room, activity folder name, callback function)

- default --> Format: (event, args)
All emit requests which don't fit one of the above values will be treated as a message which must be sent to the display.
The display will be sent (event, deviceID, args)

