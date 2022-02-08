
nodejs_package=node-v16.13.2


os_full_lc=`uname -s | tr '[:upper:]' '[:lower:]'`

os_root=${os_full_lc%%_*}


if [ "x$os_root" = "xlinux" ] ; then
    nodejs_package=$nodejs_package-linux-x64
    export PATH=$PWD/$nodejs_package/bin:$PATH
    echo "Updated PATH to include node, npm and npx"

    export NODE_PATH=$PWD/$nodejs_package/lib/node_modules
    echo "Set NODE_PATH to include $nodejs_package/lib/node_modules"
    
elif [ "x$os_root" = "xcygwin" ] ; then
    nodejs_package=$nodejs_package-win-x64
    export PATH=$PWD/$nodejs_package:$PATH
    echo "Updated PATH to include node, npm and npx"    
else
    echo "Unrecognized Operating System: $os" >&2
    echo "Failed to update PATH to include node, npm and npx"
    return 
fi

if [ ! -d $nodejs_package ] ; then
    echo "" >&2
    echo "Warning: Failed to find directory:" >&2
    echo "  $nodejs_package" >&2
    echo "" >&2
    if [ "x$os_root" = "xcygwin" ] ; then
	echo "Have you unzipped the NodeJS binary distribution?" >&2
	echo "For example:" >&2
	echo "  unzip $nodejs_package.zip" >&2
    else
	echo "Have you untarred the NodeJS binary distribution?" >&2
	echo "For example:" >&2
	echo "  tar xvf $nodejs_package.tar.xz" >&2
    fi
    echo "" >&2
    return
fi

if [ "x$os_root" = "xcygwin" ] ; then
    if [ ! -x $nodejs_package/node.exe ] ; then
	echo "" >&2
	echo "**** Note ****" >&2
	echo "Under Cygwin, the programs in the 'bin' directory often lack" >&2
	echo "execute permissions.  This can be addressed with:" >&2
	echo "  chmod a+x $nodejs_package/*.{exe,bat,cmd} $nodejs_package/{npm,npx}" >&2
    fi
fi



