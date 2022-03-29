const fs = require('fs');

class RoomNames
{
    #dynamicFreeNames;
    #dynamicUsedNames;

    #preallocatedIPtoNameLookup;
    #preallocatedNameToIPLookup;

    #preallocatedUsedNamesLookup;
    
    constructor (dynamicNamesTxtFilename, preallocatedNamesJsonFilename)
    {
	// Based on the first (keep it simple) approach given at
	//   https://geshan.com.np/blog/2021/10/nodejs-read-file-line-by-line/
	
	const txtData = fs.readFileSync(dynamicNamesTxtFilename, "utf8");
	this.#dynamicFreeNames = txtData.split(/\r?\n/);

	this.#dynamicUsedNames = [];

	this.#preallocatedIPtoNameLookup = {};
	this.#preallocatedNameToIPLookup = {};
	
	this.#preallocatedUsedNamesLookup = {};
	
	if (preallocatedNamesJsonFilename) {
	    const jsonData = fs.readFileSync(preallocatedNamesJsonFilename, "utf8");
	    let ipToNameArray = JSON.parse(jsonData);

	    for (let i=0; i<ipToNameArray.length; i++) {
		let ipRec = ipToNameArray[i];

		let ip   = ipRec.ip;
		let name = ipRec.roomName;

		// Look for it in '#dynamicFreeNames' and remove it if it is there

		for (let f=0; f<=this.#dynamicFreeNames.length; f++) {
		    if (name == this.#dynamicFreeNames[f]) {
			this.#dynamicFreeNames.splice(f,1); // remove element
			break;
		    }
		}

		this.#preallocatedIPtoNameLookup[ip] = name;
		this.#preallocatedNameToIPLookup[name] = ip;
	    }
	}
    }

    // Get the nextFree name. Will return undefined if there are no more free names
    nextFree(forIPaddress)
    {
	let roomName = null;
	    
	if (forIPaddress in this.#preallocatedIPtoNameLookup) {

            if (forIPaddress in this.#preallocatedUsedNamesLookup) {
		console.log("nextFree(): Preallocated IP address " + forIPaddress + " requesting another name. Switching to dynamically allocated one")
	    }
	    else {
		roomName = this.#preallocatedIPtoNameLookup[forIPaddress];
		this.#preallocatedUsedNamesLookup[forIPaddress] = true;
	    }	    
	}

	if (roomName == null) {
            roomName = this.#dynamicFreeNames.shift(); // Get first item of freeNames

            if (roomName != undefined) {
		this.#dynamicUsedNames.push(roomName);
	    }

	}
        return roomName;
    }

    release(roomName)
    {
	let foundRoom = false;
	
	if (roomName in this.#preallocatedNameToIPLookup) {
	    let forIPaddress = this.#preallocatedNameToIPLookup[roomName];

	    if (forIPaddress in this.#preallocatedUsedNamesLookup) {
		delete this.#preallocatedUsedNamesLookup[forIPaddress];
		foundRoom = true;
	    }
	}

	if (!foundRoom) {
	    // was either 'natively' dynamically allocated, or else a subsequent preallocated request that was switched to dynamic

            // Mark name as unused
            let xName = (element) => element === roomName
            let index = this.#dynamicUsedNames.findIndex(xName)
            
            if (index != -1){
		this.#dynamicUsedNames.splice(index,1);
		this.#dynamicFreeNames.push(roomName);
		foundRoom = true;
            }
	}

	if (!foundRoom) {
	    console.error("RoomName.release(): Asked to free roomName '" + roomName +"'. But this roomName is not in use");
        }
	
	return foundRoom;
    }
}

module.exports = RoomNames;
