
To install Hey-You as a service, operating as the user 'heyyou', run:

    ./INSTALL-SERVICE.sh

If you want to install the service to run as a different user, then run

    ./INSTALL-SERVICE.sh <username>

A common choice here is to run as the same user that the Apache2 web server
runs as:

    ./INSTALL-SERVICE.sh www-data

The INSTALL-SERViCE script checks a few things first, and if all is
well, goes ahead and creates the 'heyyou.service' file (in this folder),
and then installs it.

The script finishes by printing out some extra details, such as how to
use the service with 'systemctl', including how to add it in to the
boot-up sequence.

