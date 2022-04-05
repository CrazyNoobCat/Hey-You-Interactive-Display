
const path   = require('path');

const SlideshowGenJSON = require('./SlideshowGenJSON');


const cmdlineArgs = process.argv.slice(2);

if ((cmdlineArgs.length != 1) && (cmdlineArgs.length != 2)) {
    console.error();
    console.error("Usage:");
    console.error("    " + process.argv[1] + " slideshow-dir [slide-overview-output.json]");
    console.error();
    process.exit(1);
}
    
const inputDir       = cmdlineArgs[0];
const outputJSONFile = (cmdlineArgs.length==1) ? path.join(inputDir,"slidesOverview.json") : cmdlineArgs[1];


let options = { overwriteExisting: false };
let slideshowGenJSON = new SlideshowGenJSON(inputDir, options);

let status = slideshowGenJSON.outputSlidesOverview(outputJSONFile);
    



