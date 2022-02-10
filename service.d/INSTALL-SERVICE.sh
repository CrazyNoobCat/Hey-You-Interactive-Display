#!/bin/bash

full_progname="$PWD/${BASH_SOURCE#./}"
heyyou_home=${full_progname%/*/*}

if [ -d "/etc/systemd/system/" ] ; then

#    heyyou_service_username=${1-www-data}
    heyyou_service_username=${1-heyyou}
    echo ""
    
    echo "****"
    echo "* Generating heyyou.service from heyyou.service.in"
    echo "****"
    cat heyyou.service.in \
	| sed "s%@HEYYOU_HOME@%$heyyou_home%g" \
	| sed "s%@HEYYOU_SERVICE_USERNAME@%$heyyou_service_username%g" \
	      > heyyou.service
     
    echo "****"
    echo "* Copying heyyou.service to /etc/systemd/system/"
    echo "****"
    sudo /bin/cp heyyou.service /etc/systemd/system/.

    echo ""
    echo "----"
    echo "General info:"
    echo "  In the event of the service being updated, you will most likely need to run:"
    echo "    sudo systemctl daemon-reload"
    echo ""
    echo "  To enable this service to be run at boot-up time, run:"
    echo "    sudo systemctl enable heyyou"
    echo "----"
    
else
    echo "Error: Failed to find '/etc/systemd/system'" >&2
    echo "This install script was developed on a Debian system." >&2
    echo "It looks like your Linux Distribution uses a different directory structure for services" >&2

    exit 1
fi  

