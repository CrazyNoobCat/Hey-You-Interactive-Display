
nodejs_package=node-v16.13.2


os=$(uname -s)

if [[ "x$os" =~ "xLinux" ]] ; then
    nodejs_package=$nodejs_package-linux-x64
    export PATH=$PWD/$nodejs_package/bin:$PATH
elif [[ "x${os%%_*}" =~ "xCYGWIN" ]] ; then
    nodejs_package=$nodejs_package-win-x64
    export PATH=$PWD/$nodejs_package:$PATH
else
    echo "Unrecognized Operating System: $os" >&2
    echo "Failed to update PATH to include node, npm and npx"
    return 
fi

if [ ! -d $nodejs_package ] ; then
    echo "" >&2
    echo "Failed to find directory:" >&2
    echo "  $nodejs_package" >&2
    echo "" >&2
    echo "Have you untarred/unzipped the NodeJS binary distribution?" >&2
    echo "For example:" >&2
    echo "  tar xvf $nodejs_package.tar.xz" >&2
    echo "Or:" >&2
    echo "  unzip $nodejs_package.zip" >&2
    echo "" >&2
    return
fi
    

echo "Updated PATH to include node, npm and npx"

