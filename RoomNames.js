const fs = require('fs');

class RoomNames
{
    #freeNames;
    #usedNames = [];

    constructor (fileName) {

	// Based on the first (keep it simple) approach given at
	//   https://geshan.com.np/blog/2021/10/nodejs-read-file-line-by-line/
	
	const data = fs.readFileSync(fileName, "utf8");
	this.#freeNames = data.split(/\r?\n/);			
    }

    // Get the nextFree name. Will return undefined if there are no more free names
    nextFree()
    {
        let fn = this.#freeNames.shift(); // Get first item of freeNames

        if (fn != undefined) {
            this.#usedNames.push(fn);
	}
	
        return fn
    }

    release(roomName)
    {
        // Mark name as unused
        let xName = (element) => element === roomName
        let index = this.#usedNames.findIndex(xName)
        
        if (index != -1){
            this.#usedNames.splice(index,1);
            this.#freeNames.push(roomName);
        }
	else {
            return "roomName not in use"
        }

        // Return result i.e. success or failure/abort reasoning
    }
}

module.exports = RoomNames;
