
Note: These instructions were run on a Debian 10 Google Computre Engine

For Step 2 below, for a different Linux distribution, see:
  https://certbot.eff.org/instructions

    
1. Follow the instructions first in README-apache2.md to get
   going witha regular http setup
   

2. Now do the following

Check if 'certbot' is already installed

    which cerbiot

The certbot web site recommends remove such installed versions
and then working through the 'snap' installation package
manager to add in 'certbot'


    sudo apt-get remove certbot

Now install 'snapd' and use that to install certbot.

    sudo apt install snapd

    sudo snap install core
    sudo snap refresh core

    sudo snap install --classic certbot
    sudo ln -s /snap/bin/certbot /usr/bin/certbot

Reconfigure you Apache config files to use https with
a signed certificate with:

    sudo certbot --apache

