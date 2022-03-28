const fs = require('fs');

class RoomNames
{
    #freeNames;
    #usedNames;

    #ipToPreallocatedNameLookup;
    #preallocatedNameToIPLookup;
    
    constructor (roomNamesTxtFilename, fixedIPsJsonFilename) {

	// Based on the first (keep it simple) approach given at
	//   https://geshan.com.np/blog/2021/10/nodejs-read-file-line-by-line/
	
	const txtData = fs.readFileSync(roomNamesTxtFilename, "utf8");
	this.#freeNames = txtData.split(/\r?\n/);

	this.#usedNames = [];

	this.#ipToPreallocatedNameLookup = [];
	this.#preallocatedNameToIPLookup = [];
	
	if (fixedIPsJsonFilename) {
	    const jsonData = fs.readFileSync(fixedIPsJsonFilename, "utf8");
	    let ipToNameArray = JSON.parse(jsonData);

	    for (let i=0; i<ipToNameArray.length; i++) {
		let ipRec = ipToNameArray[i];

		let ip   = ipRec.ip;
		let name = ipRec.roomName;

		// Look for it in '#freeNames' and remove it if it is there

		for (let f=0; f<=this.#freeNames.length; f++) {
		    if (name == this.#freeNames[f]) {
			this.#freeNames.splice(f,1); // remove element
			break;
		    }
		}

		this.#ipToPreallocatedNameLookup[ip] = name;
		this.#preallocatedNameToIPLookup[name] = ip;
	    }
	}
    }

    // Get the nextFree name. Will return undefined if there are no more free names
    nextFree(forIPaddress)
    {
	let fn = null;
	
	if (forIPaddress in this.#ipToPreallocatedNameLookup) {
	    fn = this.#ipToPreallocatedNameLookup[forIPaddress];
	}
	else {
            fn = this.#freeNames.shift(); // Get first item of freeNames

            if (fn != undefined) {
		this.#usedNames.push(fn);
	    }

	}
        return fn
    }

    release(roomName)
    {
	let foundRoom = true;
	
	if (roomName in this.#preallocatedNameToIPLookup) {
	    console.log("RoomName.release(): roomName '" + roomName +"' was statically allocated, so nothing dynamic to be released");
	}
	else {   	    
            // Mark name as unused
            let xName = (element) => element === roomName
            let index = this.#usedNames.findIndex(xName)
            
            if (index != -1){
		this.#usedNames.splice(index,1);
		this.#freeNames.push(roomName);
            }
	    else {
		console.error("RoomName.release(): Asked to free roomName '" + roomName +"'. But this roomName is not in use");
		foundRoom = false;
            }
	}

	return foundRoom;
    }
}

module.exports = RoomNames;
