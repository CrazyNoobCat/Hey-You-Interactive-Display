
This README file covers how to run Hey You, Interact With Me! through
a public facing Apache2 web server.

The details are written for a Debian 10 server (spun up as a Google
Compute Engine), mapped to the domain name www.interactwith.us.
Adjust as necessary to suit you circumstances.

Install the Apache2 http web server:

  sudo apt-get install apache2

Then activate the following modules:

    sudo a2enmod proxy proxy_http proxy_balancer
    sudo a2enmod lbmethod_byrequests
    sudo a2enmod rewrite

Add the following file:

    /etc/apache2/sites-enabled/interactwith-us.conf

with the contents:

````
<VirtualHost *:80>
        ServerName interactwith.us
        ServerAlias www.interactwith.us

        ServerAdmin webmaster@localhost
        DocumentRoot /var/www/html

        ErrorLog ${APACHE_LOG_DIR}/interactwith_us-error.log
        CustomLog ${APACHE_LOG_DIR}/interactwith_us-access.log combined

        ProxyPass / http://localhost:3000/
        ProxyPassReverse / http://localhost:3000/


        # Set up websockets to work through the proxy
        RewriteEngine On
        RewriteCond %{REQUEST_URI}  ^/socket.io            [NC]
        RewriteCond %{QUERY_STRING} transport=websocket    [NC]
        RewriteRule /(.*)           ws://localhost:3000/$1 [P,L]

</VirtualHost>
````

Using your favourite editor, for example:


    sudo emacs /etc/apache2/sites-enabled/interactwith-us.conf

Or

    sudo vi /etc/apache2/sites-enabled/interactwith-us.conf

The apt-get install apache2 typically starts the web server,
to one you have loaded in the extra modules and added in
the configuration file, restart your server:

    sudo systemctl restart apache2