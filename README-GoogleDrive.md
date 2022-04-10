The solution used is based the Open Source project:

  https://astrada.github.io/google-drive-ocamlfuse/

Details written here larged based off:

    https://github.com/astrada/google-drive-ocamlfuse/wiki/Installation

To set up a Shared (Team) Drive, specific instructions at:

    https://github.com/astrada/google-drive-ocamlfuse/wiki/Team-Drives

See section below on the specific Team Drive setup used at Waikato.


* Preamble: For Default Debian Google Compute Engine (GCE) VM

Found that the libc, and some other low-level libraries, were
too new to work with the apt-get approach.  This led to the
decision to follow the 'opam' approach, which compiles from
soure, and so can match/bind to the low-level libraries your
installation has.

    curl -fsSL https://raw.githubusercontent.com/ocaml/opam/master/shell/install.sh > install-opam.sh
    chmod a+x install-opam.sh
    ./install-opam.sh

The above installs to /usr/local/bin by default.  The install script
probably ran a 'sudo' command as the last step, but as the GCE is
setup to run 'sudo' without promptig for a password, that particular
aspect wasn't observable.

    opam init
    opam update

These two commands can take a while to run.  If you are concerned whether or
not your GCE machine is still running the the installation process, open
up another terminal window, and run 'top'.

Each time you are prompted, accept the default choice.  Note this
means you will then need to do the setup command in a terminal window
where you run 'opam' commands, but note once 'google-drive-ocamlfuse'
you won't need to do this.

    eval $(opam env)

The instructions say to do the following:

    opam install depext

however for newer versions of 'opam' depext is built in and so the
command is not needed.  In fact running the command generates
an error message!

So, then it is on to:

    opam depext google-drive-ocamlfuse

A few messages were noted, warning about 'depext' already being installed,
but the command did ultimately run to completion successfully.

Now enter:

    opam install google-drive-ocamlfuse

    
## Granting Authorization on a Headless Server

On a headless server, to grant authorization see:

  https://github.com/astrada/google-drive-ocamlfuse/wiki/Headless-Usage-&-Authorization

It's quite tedious to find the various menu items within the Console Cloud Google dashbard.
Fortuntely, this web page also includes direct links to the areas they are desribing.  Much
faster to click on those (with open in new tab):

Enable the Google Drive API through:

    https://console.cloud.google.com/apis/library

Click on "Google Drive API", or else open directly:

    https://console.cloud.google.com/apis/library/drive.googleapis.com

Click "ENABLE API".


Generate your client ID and client secret:

    https://console.cloud.google.com/apis/credentials

Then click on the button "Create Credentials", and choose choose "OAuth client ID".
The following should get you there directly:

    https://console.cloud.google.com/apis/credentials/oauthclient .

google-drive-ocamlfuse -headless -id ##yourClientID##.apps.googleusercontent.com -secret ###yoursecret#####

The prints out a URL for you to copy-and-paste into your browser.  This generates a Verification Code when
you then copy-and-paste back into the terminal window where you ran the '-headless' command.


## Mount your Google-Drive

Create a directory for your Google drive to be mounted to:

    mkdir ~/google-drive

Then mount the drive:

    google-drive-ocamlfuse ~/google-drive/

If you get an error message about fusermount, then run

    sudo apt-get install fusermount
    

To dismount the drive:

    usermount -u ~/google-drive


## Specific @Waikato setup

At the time of writing, @waikato.ac.nz are Google accounts, however
not all Google services are available from these types of accounts,
but by being the Corporate style of account does support things like
Team Drive.

In contrast, a privately setup Google account, does support more services,
however, private accounts miss out of things like Team Drives and Google
File Stream.

This has lead to the follow configuration of operating the Hey You web
server with a Google Drive that presents as a networked drive using
google-drive-ocamlfuse.

The 'heyyouwaikato@gmail.com' forms the backbone to the project.  This
account has been signed up as a Google Cast Developer ($5), for example,
as it was found that an @waikato.ac.nz one was not able to sign up

The Gory Details: The initial steps to sign up work, but at the
  payment step the process got stuck -- no actual error message
  produced, but it was not possible to get the page to activate its
  'next' button that remained grayed out until a valid payment was
  made.  This was intrepretted as an, albeit particular weird, version
  of the @waikato.ac.nz accounts are able to access the complete set
  of services Google has.  After switching to heyyouwaikato@gmail.com,
  the same process, with the same credit card details, worked without
  a hitch.


In the 'heyyouwaikato' account:

  * 'Hey-You-Interactive-Display' was created as a new project;
  * The Google Drive API was enabled for this projet;
  * A consent screen was setup
  * The 'heyyouwaikato' user was was added as a developer

To be able to have a Team Drive that can be shared with others
at the Uni, in the davidb@waikato.ac.nz Google account the
following drive was created:

  Hey-You-Interactive-Display

And shared with the heyyouwaikato@gmail.com account.

Back on the Debian 10 Linux server, the process for authorizing
the mounting of a drive from 'heyyouwaikato' was followed.
The label 'heyYouTeamDrive' was used for this configuration,
and /home/heyyou/Hey-You-Slides-Drive the directory for the
mount point.

### Troubleshooting

Note, if you do a quick test as this point to mount the drive, then
what you get is the heyyouwaikato's regular files.  As detailed in the
google-drive-ocamlfuse Team Drive document, you need to modify:

    ~/.gdfuse/heyYouTeamDrive/config

to the Team Drive id.

This detail is mentioned, as one of the issues you might encounter
is that google-drive-ocamlfuse is likely to cache the files
from the frist test, and so even if you follow the correct
procedure for changing over the the Team Drive (having unmounted
first, added in Team Drive id, then remounted, then you might
still see the original 'heyyouwaikato' personal files.  This
was tracked down to a caching issue.  Cyling through
the process again,after unmounting the disk, remove the
~/.gdfuse/heyYouTeamDrive/cache, before the mount
command.

Another error enountered was that at the point of mounting
the disk, an read/write IO error is reported.  If this
occurs, go back to console.cloud.google.com and check
that the correct account (the heyyouwaikato one in this case)
has the Google API Drive enabled.


## Some notes taken while following the 'apt-get' approach

[The following instructions should be a faster/easier way to get
 going, however, for the Debian 10 machine we were using,
 incompatibilities were encountered with the libc and other core
 libraries.  The google-drive-ocamlfuse site recommended installing
 an older version of there software, which might help, but there
 wasn't sufficient detail on how to do that.  The apt command for
 listing versions of packages seemed to show there was only
 one version of this package from the repository it know about
 anyway.]

For Debian, you need to install 'add-apt-repository' first, whereas
Ubuntu already has this installed:

    sudo apt-get install software-properties-common
    sudo apt-get update
    
Then:

    sudo add-apt-repository ppa:alessandro-strada/ppa
    sudo apt-get update

If you get an error of the form:

    Err:8 http://ppa.launchpad.net/alessandro-strada/ppa/ubuntu jammy InRelease
    The following signatures couldn't be verified because the public key is not available: NO_PUBKEY AD5F235DF639B041

Then manually add the key in with:

    sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys AD5F235DF639B041

Now you are ready to install google-drive-ocamlfuse:


    sudo apt-get install google-drive-ocamlfuse


Now grant app authority to access the AteaSpace Google drive.  Run:

  google-drive-ocamlfuse

which will open your default browser at a page asking you to login,
and from there grant authority for the gsfuse app to have access to
the drive.



