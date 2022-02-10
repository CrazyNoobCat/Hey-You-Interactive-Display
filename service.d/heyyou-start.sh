#!/bin/bash

# Work out where we are on the filesystem:
#   https://stackoverflow.com/questions/59895/how-can-i-get-the-source-directory-of-a-bash-script-from-within-the-script-itsel

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
HEYYOU_HOME=${SCRIPT_DIR%/*}

(cd "$HEYYOU_HOME" && ./heyyou-start-server.sh )&

