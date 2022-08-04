const fs     = require('fs');
const path   = require('path');
const sizeOf = require('image-size');


class SlideshowGenJSON
{
    #inputDir; 
    #slideImageRecs;

    #overwriteExisting = false;
    
    constructor(inputDir, options = { overwriteExisting: false } )
    {
	this.#inputDir       = inputDir;

	if ("overwriteExisting" in options) {
	    this.#overwriteExisting = options.overwriteExisting;
	}
	
	// The following will be an empty array if readSlideDir() either:
	//   (i) failed to find any valid slide images, or
	//  (ii) did not have the right file permissions	
	this.#slideImageRecs = this.readSlidesDir(inputDir);
    }
        
    readSlidesDir(inputDir)
    {
	let slideImageRecs = [];
	
	try {
	    let slideImageRecsLookup = {};
	    
	    let files = fs.readdirSync(inputDir,"utf8");
	    
	    console.log("Reading in: ");
	    
	    files.forEach(function (file) {
		
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Groups_and_Ranges
	    
		let reSlideNumFS =  /^Slide\s*(?<slideNumFS>\d+)\.(?<slideExt>png|gif|jpg|jpeg)$/is;
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
	    
	    let sortedKeys = Object.keys(slideImageRecsLookup).sort((n1,n2) => n1 - n2)
	    
	    for (let i=0; i<sortedKeys.length; i++) {
		const key = sortedKeys[i];
		const rec = slideImageRecsLookup[key];
		
		console.log("  Storing slide record for: " + JSON.stringify(rec));
		
		slideImageRecs.push(rec);
	    }
	}
	catch (err) {
	    console.error("Failed to read directory: " + inputDir);
	    console.error();
	    console.error(err);
	}
	
	return slideImageRecs;	
    }

    generateSlidesOverview()
    {
	
	let slidesOverview = {
	    "defaultSlideTransition": "fromright",
	    "defaultSlideTransitionComment": "Other slide transition(s) supported: 'crossfade'",
	    "defaultSlideDuration":   "10s"
	};
	
	if (this.#slideImageRecs.length>0) {
	    this.#slideImageRecs[0].slideDuration = "15s"; // example of how to override default
	}
	
	if (this.#slideImageRecs.length>1) {
	    this.#slideImageRecs[1].slideTransition = "crossfade"; // example of how to override default
	}
	
	slidesOverview["slides"] = this.#slideImageRecs;
	
	// calc max image width and height, and store in overview
	let maxXDim = 0;
	let maxYDim = 0;
	
	let src_i = 0;
	let dst_i = 0;
	
	for (let i=0; i<this.#slideImageRecs.length; i++) {
	    const rec = this.#slideImageRecs[i];
	    
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

    outputSlidesOverview(outputJSONFile)
    {
	let status = true;
	
	let slidesOverviewJSON = this.generateSlidesOverview();

	if (!this.#overwriteExisting && fs.existsSync(outputJSONFile))	{
	    console.error();
	    console.error("Error: Output JSON file already exists:");
	    console.error("    " + outputJSONFile);
	    console.error("Not overwriting it!");
	    console.error("Manually remove first, if you want to regenerate this slide overview file.");
	    console.error();
	    
	    //process.exit(1);
	    status = false;
	}
	else {
	    try {
		console.log();
		console.log("Saving slide overview JSON to:")
		console.log("   " + outputJSONFile);    
		fs.writeFileSync(outputJSONFile, JSON.stringify(slidesOverviewJSON,null,4));
	    }
	    catch (err) {
		console.error("Failed to output JSON to: " + outputJSONFile);
		console.error();
		console.error(err);
		status = false;
	    }
	}

	return status;
    }
}




module.exports = SlideshowGenJSON;
