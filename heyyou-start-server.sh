#!/bin/bash

# Work out where we are on the filesystem:
#   https://stackoverflow.com/questions/59895/how-can-i-get-the-source-directory-of-a-bash-script-from-within-the-script-itsel

HEYYOU_HOME=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )


cd "$HEYYOU_HOME" \
    && . ./heyyou-setup.bash

if [ $? = "0" ] ; then
    echo ""
    echo "Launching node activity-launcher as a background process"
    echo ""
    echo "Logging output to:"
    echo "  $PWD/heyyou-server.log"
    echo ""

    echo "Initializing ..."
    
    node activity-launcher.js </dev/null >heyyou-server.log 2>&1 &
    heyyou_server_pid=$!
    
    # Give the server a bit of time to start up in the background
    sleep 2
    
    if [ -d /proc/$heyyou_server_pid ] ; then
	echo "                ... successfully initialized"
	echo $heyyou_server_pid >heyyou-server.pid
    else
	echo "" >&2
	echo "Error encountered running: $0" >&2
	echo "" >&2
	
	echo "... failed to initialize initialization"
	echo ""
	echo "For further details see:"
	echo "  heyyou-server.log"
	echo ""
    fi
    
else
    echo "Failed to successfully source 'heyyou-setup.bash'" >&2
fi
