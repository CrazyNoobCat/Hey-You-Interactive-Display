const fs = require('fs');



class GlobalSettings
{    
    #settingsLookup = null;
    
    constructor(settingsFilename)
    {
	let readInFilename   = null;
	let writeOutFilename = null;
	
	if (fs.existsSync(settingsFilename)) {
	    readInFilename = settingsFilename;
	}
	else {
	    // look for '.in' version
	    if (fs.existsSync(settingsFilename+".in")) {
		readInFilename = settingsFilename + ".in";
		writeOutFilename = settingsFilename;
	    }
	    else {
		console.error("Failed to find configuration file: " + settingsFilename);
		console.error("Failed to find template configuration file: " + settingsFilename+".in");
	    }
	}
		
	if (readInFilename != null) {	

	    try {
		const settingsJSON = fs.readFileSync(readInFilename, "utf8");
		const settingsLookup = JSON.parse(settingsJSON);
		
		this.#settingsLookup = settingsLookup;

		if (writeOutFilename != null) {
		    fs.writeFileSync(writeOutFilename,settingsJSON, "utf8");
		}		
	    }
	    catch (err) {
		console.error("Failed to process activity-launcher configuration file: " + readInFilename);
		console.error();
		console.error(err)
	    }
	}
    }

    initialized()
    {
	return this.#settingsLookup != null;
    }

    get(settingName)
    {
	let settingParts = settingName.split(".");

	let part = settingParts.shift();
	let settingVal = this.#settingsLookup[part];
	
	while (typeof part !== "undefined") {
	    let nextPart = settingParts.shift();
	    
	    if ((typeof nextPart !== "undefined") && (nextPart in settingVal)) {
		// move on to the next block
		part = nextPart;
		settingVal = settingVal[part];
	    }
	    else {
		part = undefined;
	    }
	}	
	return settingVal;
    }
    
}


module.exports = GlobalSettings;
