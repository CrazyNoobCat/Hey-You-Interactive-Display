# Hey-You-Interactive-Display

The Hey You server is written in NodeJS. Binaries (Linux and Windows)
for this are bundled in the 'cli-packages' directory.  These
binaries represent the minimum version of NodeJS that Hey You
has been tested with.  If you already have a NodeJS on your
system you are welcome to use that instead (as long as it
meets the minimum version number).

The following instructions are written for working the Linux bundled
version of NodeJS in cli-packages.  Adapt as necessary for your
installation.  Hey You has also been successfully installed
on Windows using Cygwin.

In 'cli-packagtes' untar (Linux) [or unzip on Cygwin] the relevant file,
and then back in the top-level directory of the project:

    source ./heyyou-setup.bash
Or
    . ./heyyou-setup.bash

The sourced script is designed to check for a few, to help identify some
common-place issues.  If everything checks out, then you environment
is set up to run NodeJS (the binary 'node' is now on your PATH).

You can start the Hey You server with:

    ./heyyou-start-server.sh

which logs output to:

    heyyou-server.log

For production use, Hey You can be setup to run as a system installed
service using 'systemctl'.  See the README file in the 'service.d'
directory for more details.

Putting this all together, for a 'localhost' setup, running say
Debian ...

**Setup**

    cd cli-packages
    tar xvf node-v16.13.2-linux-x64.tar.xz
    cd ..

**Start up the web server**

    ./heyyou-start-server.sh &

  * Note: this automatically sources heyyou-setup.bash, if it has not already
    been run

**Display an Activity Home Page**

  * In a desktop browser, navigate to http://localhost:3000/activiy
    which will display a page with a QR code on it

  * Note: we are using a desktop browser here just for testing
    purposes.  Typically the Hey You Activity Home Page is launched on a
    display screen through ChromeCast
  
Connect as an end-user to try out the install:

  * On a phone, scan the QR code (or paste the url shown below it into
    a browser) to join as a controller to that session

  * Alternatively navigate to localhost:3000/join/roomID. Replace the
    roomID with the deviceID of the display you wish to join.

**Chromecast Setup**

To operate Hey You on the Chromecast device, you need to sign up
as a Google Cast developer.

    https://cast.google.com/publish/#/overview
    
There is a small admin fee ($5 approx).  We found that the UoW Google
accounts are not set up by default to allow this service to be added
in, and so ended up using a privately created account
(heyyouwaikato@gmail.com).

Once you have paid the fee, you can register your Chromecast device in
your account.  Next create a Chromecast App, named for example:

  My Hey You Chromecast App

For "Receiver Application URL" set this to be:

    https://interactwith.us/display-home

Now turn your attention to the Chromecast device itself, and
get that set up. A critial attention to detail in getting
the device set up is that the Google Account the Chromecast
device is set up with is the same one you have registered
as a Chromecast Developer.  This is because the app we'll
be installing isn't a publicly published one, requiring
the computer where you deploy the app from to be logged
in to the same account as the account the Chromecast
device uses.

You're now ready to deploy the Hey You Chromecast App!

Still logged in to the Google account where you have
registered the Chromecast device and app, visit Caactool:

  https://casttool.appspot.com/cactool/

Through this dashboard, you can upload your Chromecast App
to your Chromecast device.

Copy the Application Id from:

    https://cast.google.com/publish/#/overview

into Caactool, and press SET APP ID.

All going well, in the top bar of the Caactool page (on the left) you
have a Chromecast Icon/logo display.  Click on this, and from the menu
that appears, locate and click on your Chromecast device.

If problems in the setup process are going to occur, we found they
tended turn up in this last step: v. annoying!  It help to put your
device into Developer mode, as the app you are deploying is one you
have privately set up (and not published).  It's also important
to keep track of which Google account you are logged into.  If the
browser where you are running the Caactool is not logged into the
same account the Chromecast device uses, then upon pasting
in the Application Id into Caactool and pressing SET APP ID, then
the Chromecast icon/logo in the top bar (on the left) disappears.

It would be nice if some sort of message is produced at that point
notifying you what has happened, but at the time of writing, we
were not able to find anything.  By removing the Chromecast
Icon from the top bar, what the system appears to be trying
to tell you is that there are no know Chromecast devices that
it can see that are prepared to accept the deplaoyment of
the Hey You Chromecast App.


*Hey You Messaging over WebSockets*

**Display Emit Codes**

- displayLoaded --> Indicates to server that the display is loaded and will then forward all messages from controller of the loaded display.. Format: ('displayLoaded')
- displayReset  --> Resets the display back to the default activity and require controllers to reload... Format: ('displayReset')
- displayEmit   --> Event is sent to all controllers/displays in room... Format: ('displayEmit', destination room/socket, event, extra arg)

**Controller Emit Codes**

- selectActivity --> Tells the rooms activity to be changed to the requested activity... Format: ('selectActivity', room, activity folder name, callback function)

- default --> Format: (event, ...args)
All emit requests which don't fit one of the above values will be treated as a message which must be sent to the display.
The display will be sent (event, deviceID, args)

**Server Emit Codes**
- clidentDisconnect Format: ('controllerDisconnect', controllerDeviceID); --> Informs the display that a controller has been disconnected from their activity

**Notes**

Folders cannot be named z. This is due to static pages defaulting to /stiatic/z so that it is refered to the default static page

Displays or controllerss expecting custom messages should have a function called socketUpdate(...args) and enable the any listener inside of the relevant
html page (e.g. display.html for displays and controller.html for controllers) using the line: 

    socket.onAny(anyListener); // Turns on the any istener

