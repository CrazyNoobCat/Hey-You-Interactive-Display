const fs     = require('fs');
const path   = require('path');

//const sizeOf = require('image-size');

const cmdlineArgs = process.argv.slice(2);


function readSlidesDir(inputDir)
{
    let slideImageRecs = [];
    
    try {
	let slideImageRecsLookup = {};

	let files = fs.readdirSync(inputDir,"utf8");

	console.log("Processing: ");
	
	files.forEach(function (file) {

	    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Groups_and_Ranges
	    
	    let reSlideNumFS =  /^Slide(?<slideNumFS>\d+)\.(?<slideExt>png|gif|jpg|jpeg)$/is;
	    let slideMatch = reSlideNumFS.exec(file);

	    if (slideMatch) {
		const slideNumFS = slideMatch.groups.slideNumFS;
		const slideExt   = slideMatch.groups.slideExt;

		//console.log("  Slide match: " + slideNumFS + "." + slideExt);
		
		const slideImageRec = { "file": file, "slideNum": slideNumFS-1 };
		slideImageRecsLookup[slideNumFS] = slideImageRec;
	    }
	});
		     	
	var sortedKeys = Object.keys(slideImageRecsLookup).sort((n1,n2) => n1 - n2)
	
	for (var i=0; i<sortedKeys.length; i++) {
	    const key = sortedKeys[i];
	    const rec = slideImageRecsLookup[key];
	    
	    console.log("  Storing slide record for: " + rec.file);
	    
	    slideImageRecs.push(rec);
	}
    }
    catch (err) {
	console.error("Failed to read directory: " + inputDir);
	//console.error(err)
    }

    return slideImageRecs;

}


if (cmdlineArgs.length != 1) {
    console.error();
    console.error("Usage:");
    console.error("    " + process.argv[1] + " slideshow-dir");
    console.error();
    process.exit(1);
}
    
const inputDir = cmdlineArgs[0];


var slideImageRecs = readSlidesDir(inputDir);



//sizeOf('images/funny-cats.png', function (err, dimensions) {
//  console.log(dimensions.width, dimensions.height);
//});
	      
