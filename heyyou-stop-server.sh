#!/bin/bash

# Work out where we are on the filesystem:
#   https://stackoverflow.com/questions/59895/how-can-i-get-the-source-directory-of-a-bash-script-from-within-the-script-itsel

HEYYOU_HOME=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )


cd "$HEYYOU_HOME"

if [ -f heyyou-server.pid ] ; then
    heyyou_pid=$(cat heyyou-server.pid)

    echo "Detected process running as PID $heyyou_pid"
    echo "Shutting down process"
    kill $heyyou_pid

    if [ $? = "0" ] ; then
	/bin/rm heyyou-server.pid
    fi
else
    echo "Failed to find:" >&2
    echo "  heyyou-server.pid" >&2
    echo "Unable to stop the NodeJS process." >&2
    echo "" >&2
    echo "You can check if the process is running by reviewing the output from:" >&2
    echo "  ps auxww | grep node" >&2
    echo "" >&2
fi
