#!/bin/bash

# Work out where we are on the filesystem:
#   https://stackoverflow.com/questions/59895/how-can-i-get-the-source-directory-of-a-bash-script-from-within-the-script-itsel

HEYYOU_HOME=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

echo "Logging output to:"
echo "  $PWD/heyyou-server.log"

cd "$HEYYOU_HOME" \
    && . ./heyyou-setup.bash \
    && node app-launcher.js </dev/null >heyyou-server.log 2>&1

