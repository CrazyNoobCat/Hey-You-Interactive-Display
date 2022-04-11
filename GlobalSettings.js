const fs = require('fs');

const globalSettingsFilename = "etc/activity-launcher-conf.json";

class GlobalSettings
{    
    #settingsLookup = null;
    
    constructor()
    {

	try {
	    const settingsJSON = fs.readFileSync(globalSettingsFilename, "utf8");
	    const settingsLookup = JSON.parse(settingsJSON);

	    this.#settingsLookup = settingsLookup;
	}
	catch (err) {
	    console.error("Failed to process activity-launcher configuration file: " + globalSettingsFilename);
	    console.error();
	    console.error(err)
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
