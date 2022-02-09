#!/bin/bash

full_progname=`pwd`/${BASH_SOURCE}
heyyou_home=${full_progname%/*}

echo "Logging output to:"
echo "  heyyou-server.log"

cd "$heyyou_home" \
    && . ./heyyou-setup.bash \
    && node index.js </dev/null >heyyou-server.log 2>&1

