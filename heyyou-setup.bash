
# Edit the following if you want to change the default values used
# Otherwise consider commenting out this block, and uncommenting
# the "For Developer Testing" below it

#export HEYYOU_LOCAL_HOST=localhost
#export HEYYOU_LOCAL_PORT=3000
## The following by being empty, default to browser root level
#export HEYYOU_EXTERNAL_PREFIX=
#export HEYYOU_EXTERNAL_WSPREFIX=

# For Developer Testing:
#  (a) on a different port (for localhost) and
#  (b) using a different URL prefix (when externally accessed via proxy server)) 
#
export HEYYOU_LOCAL_HOST=localhost
export HEYYOU_LOCAL_PORT=4000
export HEYYOU_EXTERNAL_PREFIX=/heyyou-dev
export HEYYOU_EXTERNAL_WSPREFIX=$HEYYOU_EXTERNAL_PREFIX
#export HEYYOU_EXTERNAL_WSPREFIX=/wsheyyou-dev

echo ""
echo "Hey You Server Settings:"
echo "  Local connection: http://$HEYYOU_LOCAL_HOST:$HEYYOU_LOCAL_PORT"
if [ "x$HEYYOU_EXTERNAL_PREFIX" != "x" ] ; then
    echo "  External http/https URL prefix: $HEYYOU_EXTERNAL_PREFIX"
fi
if [ "x$HEYYOU_EXTERNAL_WSPREFIX" != "x" ] && [ "x$HEYYOU_EXTERNAL_WSPREFIX" != "x$HEYYOUR_EXTERNAL_WSPREFIX" ] ; then
    echo "  External Web-Socket URL prefix: $HEYYOU_EXTERNAL_PREFIX"
fi
echo ""
   
nodejs_package=node-v16.13.2

os_full_lc=`uname -s | tr '[:upper:]' '[:lower:]'`
os_root=${os_full_lc%%_*}

if [ "x$os_root" = "xlinux" ] ; then
    nodejs_package=$nodejs_package-linux-x64
    export PATH=$PWD/cli-packages/$nodejs_package/bin:$PATH
    echo "Updated PATH to include node, npm and npx"

    export NODE_PATH=$PWD/cli-packages/$nodejs_package/lib/node_modules
    echo "Set NODE_PATH to include $nodejs_package/lib/node_modules"
    
elif [ "x$os_root" = "xcygwin" ] ; then
    nodejs_package=$nodejs_package-win-x64
    export PATH=$PWD/cli-packages/$nodejs_package:$PATH
    echo "Updated PATH to include node, npm and npx"    
else
    echo "Unrecognized Operating System: $os" >&2
    echo "Failed to update PATH to include node, npm and npx"
    return 
fi

if [ ! -d cli-packages/$nodejs_package ] ; then
    echo "" >&2
    echo "Warning: Failed to find directory:" >&2
    echo "  cli-packages/$nodejs_package" >&2
    echo "" >&2
    if [ "x$os_root" = "xcygwin" ] ; then
	echo "Have you unzipped the NodeJS binary distribution?" >&2
	echo "For example:" >&2
	echo "  cd cli-packages && unzip $nodejs_package.zip" >&2
    else
	echo "Have you untarred the NodeJS binary distribution?" >&2
	echo "For example:" >&2
	echo "  cd cli-packages && tar xvf $nodejs_package.tar.xz" >&2
    fi
    echo "" >&2
    return
fi

if [ "x$os_root" = "xcygwin" ] ; then
    if [ ! -x cli-packages/$nodejs_package/node.exe ] ; then
	echo "" >&2
	echo "**** Note ****" >&2
	echo "Under Cygwin, the programs in the 'bin' directory often lack" >&2
	echo "execute permissions.  This can be addressed with:" >&2
	echo "  cd cli-packages && chmod a+x $nodejs_package/*.{exe,bat,cmd} $nodejs_package/{npm,npx}" >&2
    fi
fi



