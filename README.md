# Hey-You-Interactive-Display

If you do not already have NodeJS installed at the command-line, for
convenience you can find packaged up binaries in 'cli-packages' for
64-bit Linux and Windows.  The 'cli-packages' directory approach has
the added advantage that it captures the version of NodeJS that the
development work was done using.

In 'cli-packagtes' untar (Linux) or unzip (Cygwin) the relevant file,
and then back in the top-level directory of the project:

    source ./heyyou-setup.bash
Or
    . ./heyyou-setup.bash

The sourced script is designed to check for a few, common-place issues.

With 'node' in your PATH, you can set the Hey You server with:

  ./heyyou-start-server.sh

This automatically sources the setup.bash file, and logs output to:

    heyyou-server.log

For production use, 'heyyou' can be setup to run as a service using
'systemctl'.  See the README file in the 'service.d' directory for
more details.

Putting this all together, for a 'localhost' setup, running say
Debian ...

Setup:
  1. cd cli-packages
  2. tar xvf node-v16.13.2-linux-x64.tar.xz
  3. cd ..

Start up the web server:
  * ./heyyou-start-server.sh &

Initiate a starting activity (akin to a home page for your installation)

  * In a desktop browser, navigate to http://localhost:3000/activiy which will display a page with a QR code on it

Connect as an end-user to try out the install:

  * On a phone, scan the QR code (or paste the url shown below it into a browser) to join as a client to that session
  * Alternatively navigate to localhost:3000/join/roomID. Replace the roomID with the deviceID of the display you wish to join. 



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

