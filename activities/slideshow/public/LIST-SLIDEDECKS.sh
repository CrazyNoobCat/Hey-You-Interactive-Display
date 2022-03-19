#!/bin/bash

ofile="slideDeckList.json"

dir_list=""
for f in */slidesOverview.json ; do
    d=${f%/*.json}

#    echo $d/

    if [ "x$dir_list" = "x" ] ; then
	#dir_list="\"slideDeck:\"\"$d\""
	dir_list="\"$d\""
    else
    #	dir_list="$dir_list \"slideDeck:\"\"$d\""
	dir_list="$dir_list \"$d\""
    fi
done

dir_list_json=`echo $dir_list | sed 's/ /,\\\n/g'`

echo ""
echo "Outputing Slide Deck List to:"
echo "    '$ofile'"
echo ""

echo "["                > $ofile
echo -e $dir_list_json  > $ofile
echo "]"                > $ofile
