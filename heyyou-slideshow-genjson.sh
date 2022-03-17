#!/bin/bash

# Work out where we are on the filesystem:
#   https://stackoverflow.com/questions/59895/how-can-i-get-the-source-directory-of-a-bash-script-from-within-the-script-itsel

HEYYOU_HOME=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )


cd "$HEYYOU_HOME" \
    && . ./heyyou-setup.bash

if [ $? = "0" ] ; then
    
   node slideshow-genjson.js $*
    
else
    echo "Failed to successfully source 'heyyou-setup.bash'" >&2
fi
