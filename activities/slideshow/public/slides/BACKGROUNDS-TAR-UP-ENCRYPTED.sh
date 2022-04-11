#!/bin/bash

tar cvzf waikato-uni-backgrounds.tgz waikato-uni-backgrounds

# Added '-pinentry' to support operation when logged in through 'su - heyyou'
# For more details see:
#    https://askubuntu.com/questions/1080204/gpg-problem-with-the-agent-permission-denied

gpg --symmetric --pinentry-mode=loopback -o waikato-uni-backgrounds.tgz.gpg waikato-uni-backgrounds.tgz

/bin/rm waikato-uni-backgrounds.tgz
