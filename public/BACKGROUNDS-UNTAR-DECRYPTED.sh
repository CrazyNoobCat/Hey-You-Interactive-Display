#!/bin/bash

# Added '-pinentry' to support operation when logged in through 'su - heyyou'
# For more details see:
#    https://askubuntu.com/questions/1080204/gpg-problem-with-the-agent-permission-denied

echo ""
echo "The git commited tgz.gpg file was encrypted with the lab password"
echo ""

gpg --decrypt --pinentry-mode=loopback waikato-uni-backgrounds.tgz.gpg > waikato-uni-backgrounds.tgz \
    && tar xvzf waikato-uni-backgrounds.tgz \
    && /bin/rm waikato-uni-backgrounds.tgz
