const fs     = require('fs');
const path   = require('path');

const sizeOf = require('image-size');

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

		const imageDims = sizeOf(path.join(inputDir,file));
		const imageXDim = imageDims.width;
		const imageYDim = imageDims.height;
		
		//console.log("  Slide match: " + slideNumFS + "." + slideExt);
		
		const slideImageRec = { "file": file, "slideNum": slideNumFS-1, "xdim": imageXDim, "ydim": imageYDim };
		slideImageRecsLookup[slideNumFS] = slideImageRec;
	    }
	});
		     	
	var sortedKeys = Object.keys(slideImageRecsLookup).sort((n1,n2) => n1 - n2)
	
	for (var i=0; i<sortedKeys.length; i++) {
	    const key = sortedKeys[i];
	    const rec = slideImageRecsLookup[key];
	    
	    console.log("  Storing slide record for: " + JSON.stringify(rec));
	    
	    slideImageRecs.push(rec);
	}
    }
    catch (err) {
	console.error("Failed to read directory: " + inputDir);
	console.error();
	console.error(err)
    }

    return slideImageRecs;

}

function generateSlidesOverview(slideImageRecs)
{
    var slidesOverview = {
	"defaultSlideTransition": "fromright",
	"defaultSlideTransitionComment": "Other slide transition(s) supported: 'crossfade'",
	"defaultSlideDuration":   "10s"
    };
    
    if (slideImageRecs.length>0) {
	slideImageRecs[0].slideDuration = "15s"; // example of how to override default
    }

    if (slideImageRecs.length>1) {
	slideImageRecs[1].slideTransition = "crossfade"; // example of how to override default
    }

    slidesOverview["slides"] = slideImageRecs;
	
    // calc max image width and height, and store in overview
    var maxXDim = 0;
    var maxYDim = 0;
    
    var src_i = 0;
    var dst_i = 0;
    
    for (var i=0; i< slideImageRecs.length; i++) {
	const rec = slideImageRecs[i];

	if (rec.xdim > maxXDim) {
	    maxXDim = rec.xdim;
	}	
	if (rec.ydim > maxYDim) {
	    maxYDim = rec.ydim;
	}
    }

    slidesOverview["maxXDim"] = maxXDim;
    slidesOverview["maxYDim"] = maxYDim;

    return slidesOverview;
}


if ((cmdlineArgs.length != 1) && (cmdlineArgs.length != 2)) {
    console.error();
    console.error("Usage:");
    console.error("    " + process.argv[1] + " slideshow-dir [slide-overview-output.json]");
    console.error();
    process.exit(1);
}
    
const inputDir       = cmdlineArgs[0];
const outputJSONFile = (cmdlineArgs.length==1) ? path.join(inputDir,"slideOverview.json") : cmdlineArgs[1];

if (fs.existsSync(outputJSONFile)) {
    console.error();
    console.error("Error: Output JSON file already exists:");
    console.error("    " + outputJSONFile);
    console.error("Not overwriting it!");
    console.error("Manually remove first, if you want to regenerate this slide overview file.");
    console.error();
    
    process.exit(1);
}


var slideImageRecs     = readSlidesDir(inputDir);
var slidesOverviewJSON = generateSlidesOverview(slideImageRecs);


//console.log();
//console.log("slideOverview:");
//console.log(JSON.stringify(slidesOverviewJSON, null,2));

try {
    console.log();
    console.log("Saving slide overview JSON to:")
    console.log("   " + outputJSONFile);    
    fs.writeFileSync(outputJSONFile, JSON.stringify(slidesOverviewJSON,null,2));
}
catch (err) {
    console.error("Failed to output JSON to: " + outputJSONFile);
    console.error();
    console.error(err)
}
