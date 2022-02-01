
os=$(uname -s)

if [ "x$os" = "xLinux" ] ; then
    export PATH=$PWD/node-v16.13.2-linux-x64/bin:$PATH
elif [ "x${os%%_*}" = "xCygwin" ] ; then    
    export PATH=$PWD/node-v16.13.1-win-x64:$PATH
else
    echo "Unrecognized Operating System: $os" >&2
    echo "Failed to update PATH to include node, npm and npx"
    return 
fi


echo "Updated PATH to include node, npm and npx"

