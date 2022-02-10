#!/bin/bash

full_progname="$PWD/${BASH_SOURCE#./}
heyyou_home=${full_progname%/*/*}

cd "$heyyou_home" && . ./heyyou-setup.sh && ant stop


