
var ViewportXDim = window.innerWidth;
var ViewportYDim = window.innerHeight;

var SlideMaxXDim = (ViewportXDim <= 1300) ? ViewportXDim * 0.9 : ViewportXDim * 0.95;
var SlideMaxYDim = (ViewportXDim <= 1300) ? ViewportYDim * 0.9 : ViewportYDim * 0.95;
var QRDim = Math.floor(ViewportXDim * 0.10);

// State variables for slideshow activity
var currentSlidePos = 0;
var overlaySlidePos = 1;
var currentSlideFS  = currentSlidePos + 1;
var overlaySlideFS  = overlaySlidePos + 1;

var cleanSlidePassthrough    = true;
var uninterruptedSlideCount = 0;

var SlidesOverview = null;      
var slideDir  = null;
var numSlides = null;

var actualSlideImageXDim = null;
var actualSlideImageYDim = null;

var displaySlideXDim = null;
var displaySlideYDim = null;

var defaultSlideTransition = null;
var defaultSlideDuration   = null;

var slideDeck = null;

function activateSlideshow(slideshowName,slidesOverviewJSON)
{
    //console.log("activateSlideshow() called!");

    slideDeck = slidesOverviewJSON.slides;
    numSlides = slideDeck.length;
    
    defaultSlideTransition = slidesOverviewJSON.defaultSlideTransition;
    defaultSlideDuration   = slidesOverviewJSON.defaultSlideDuration;
        
    actualSlideImageXDim = slidesOverviewJSON.maxXDim;
    actualSlideImageYDim = slidesOverviewJSON.maxYDim;
    
    var scaleXDim = SlideMaxXDim / actualSlideImageXDim ;
    var scaleYDim = SlideMaxYDim / actualSlideImageYDim ;
    
    if (scaleXDim < scaleYDim) {
	// Don't want to overflow, so scale by the smaller amount
	displaySlideXDim = SlideMaxXDim;
	displaySlideYDim = actualSlideImageYDim * scaleXDim;
    }
    else {
	displaySlideXDim = actualSlideImageXDim * scaleYDim;
	displaySlideYDim = SlideMaxYDim;
    }
    displaySlideXDim = Math.floor(displaySlideXDim);
    displaySlideYDim = Math.floor(displaySlideYDim);
    
    // following code used to be in dom.ready()

    $('#currentslide-img').css("width", displaySlideXDim+"px");
    $('#currentslide-img').css("height",displaySlideYDim+"px");
    $('#overlayslide-img').css("width", displaySlideXDim+"px");
    $('#overlayslide-img').css("height",displaySlideYDim+"px");
    
    var root = document.querySelector(':root');
    root.style.setProperty('--slideshow-width',      displaySlideXDim+'px');
    root.style.setProperty('--slideshow-height',     displaySlideYDim+'px');
    root.style.setProperty('--slideshow-negwidth',  -displaySlideXDim+'px');
    root.style.setProperty('--slideshow-negheight', -displaySlideYDim+'px');
    
    // Set up first slide 
    var $currentSlideImg = $('#currentslide-img');
    var $overlaySlideImg = $('#overlayslide-img');

    var currentSlideFile = slideDeck[currentSlidePos].file;
    var overlaySlideFile = slideDeck[overlaySlidePos].file;

    $currentSlideImg.attr("src", slideDir + "/" + currentSlideFile);
    $overlaySlideImg.attr("src", slideDir + "/" + overlaySlideFile);
    
    $currentSlideImg.on("load", function() {
	$currentSlideImg.fadeIn(1000);
	      
	if (numSlides > 1) {
	    // Get the next slide set up as the overlay, but need to wait until fadeIn done
	    setTimeout(() => { $overlaySlideImg.css("display", "block"); }, 1000);		  	    
	}	  	      
    });
    
    // https://stackoverflow.com/questions/6186454/is-there-a-callback-on-completion-of-a-css3-animation        
    $("#currentslide-li").bind('animationend oanimationend webkitAnimationEnd MSAnimationEnd', function() { 

	var doneDisplayReset = false;
	if (cleanSlidePassthrough) {
	    uninterruptedSlideCount++;
	    if (uninterruptedSlideCount == numSlides) {
		// completed an uninterrupted passthrough
		// disconnect slideshow display, to return to top-level dispay-home
		displayReset();
		doneDisplayReset = true;
	    }
	}

	if (!doneDisplayReset) {
	    startNextSlide();
	}	
    });

    var localSlideDuration   = slideDeck[currentSlidePos].slideDuration;
    var localSlideTransition = slideDeck[overlaySlidePos].slideTransition;

    doSlideTransition(localSlideDuration,localSlideTransition);
}

function loadSlideshow(slideshowName)
{        
    slideDir = "/slides/" + slideshowName;

    $.getJSON(slideDir+"/slidesOverview.json")
	.done(function(jsondata) {
	    activateSlideshow(slideshowName,jsondata)
	})
	.fail(function( jqxhr, textStatus, error ) {
	    var err = textStatus + ", " + error;
	    console.error( "Request Failed: " + err );
	    alert( "Request Failed: " + err );
	});
}

function doSlideTransition(localSlideDuration,localSlideTransition)
{
    //console.log("doSlideTransition() called"));

    var transitionDur  = localSlideDuration   || defaultSlideDuration;
    var transitionType = localSlideTransition || defaultSlideTransition;
    
    var root = document.querySelector(':root');

    root.style.setProperty('--animation-time', transitionDur);
    root.style.setProperty('--animation-currentslide', transitionType+'-currentslide');
    root.style.setProperty('--animation-overlayslide', transitionType+'-overlayslide');
    
    document.getElementById("currentslide-li").classList.add("currentslide-animation");
    document.getElementById("overlayslide-li").classList.add("overlayslide-animation");
    
    var progressBar = document.getElementById("progress-bar");
    progressBar.style.display = "block";
    progressBar.style.width = "0px";
    progressBar.classList.add("progress-bar-animate");
    
}

function slideAnimationReset()
{
    //console.log("slideAnimationReset() called with optCallback = " + optCallback);
    
    document.getElementById("currentslide-li").classList.remove("currentslide-animation");
    document.getElementById("overlayslide-li").classList.remove("overlayslide-animation");
    document.getElementById("progress-bar").classList.remove("progress-bar-animate");
}

function startNextSlide() {
    
    //console.log("startNextSlide()called");
    
    slideAnimationReset();

    var $currentSlideImg = $('#currentslide-img');
    var $overlaySlideImg = $('#overlayslide-img');
    
    // Overlay slide becomes the new current slide
    var currentSlideFile = slideDeck[overlaySlidePos].file;
    $currentSlideImg.attr("src", slideDir + "/" + currentSlideFile);
    
    //document.getElementById("currentslide-img").src = slideDir + "/Slide" + overlaySlideFS + slideExt;
    
    // Advance the counter on by +1
    currentSlidePos = (currentSlidePos + 1) % numSlides;
    overlaySlidePos = (overlaySlidePos + 1) % numSlides;	    
    currentSlideFS = currentSlidePos + 1;
    overlaySlideFS = overlaySlidePos + 1;

    if (currentSlidePos == 0) {
	cleanSlidePassthrough = true;
    }

    // Set up the new overlay slide
    var overlaySlideFile = slideDeck[overlaySlidePos].file;
    $overlaySlideImg.attr("src", slideDir + "/" + overlaySlideFile);

    //document.getElementById("overlayslide-img").src = slideDir + "/Slide" + overlaySlideFS + slideExt;
    
    
    // Use setTimeout so initiating next slide occurs outside of the event handler for AnimationEnd
    // (with a small time delay)
    //
    // Use time delay trick for now.  For a more robust solution, see:
    //   https://css-tricks.com/restart-css-animation/

    var localSlideDuration   = slideDeck[currentSlidePos].slideDuration;
    var localSlideTransition = slideDeck[overlaySlidePos].slideTransition;

    if (cleanSlidePassthrough) {
	if (uninterruptedSlideCount == numSlides-1) {
	    // Away to auto-exit slideshow at the end of this side (uninterrupted clean passthrough)
	    // => Override slideDeck transition with one that doesn't start keyframe change to the next (overlay) slide
	    localSlideTransition = "lastslide-exit";
	}
    }
		
    setTimeout(() => { doSlideTransition(localSlideDuration,localSlideTransition) }, 100); 
};

function startPrevSlide()
{
    //console.log("*** startPrevSlide()");
    
    slideAnimationReset();

    // Wind everything back by one
    currentSlidePos = (numSlides + currentSlidePos - 1) % numSlides;
    overlaySlidePos = (numSlides + overlaySlidePos - 1) % numSlides;
    
    currentSlideFS = currentSlidePos + 1; // Slide num on file system starts at 1, not 0
    overlaySlideFS = overlaySlidePos + 1; // ditto
	      
    var $currentSlideImg = $('#currentslide-img');
    var $overlaySlideImg = $('#overlayslide-img');

    var currentSlideFile = slideDeck[currentSlidePos].file;
    var overlaySlideFile = slideDeck[overlaySlidePos].file;

    $currentSlideImg.attr("src", slideDir + "/" + currentSlideFile);
    $overlaySlideImg.attr("src", slideDir + "/" + overlaySlideFile);
    
    //$currentSlideImg.attr("src", slideDir + "/Slide" + currentSlideFS + slideExt);
    //$overlaySlideImg.attr("src", slideDir + "/Slide" + overlaySlideFS + slideExt);

    var localSlideDuration   = slideDeck[currentSlidePos].slideDuration;
    var localSlideTransition = slideDeck[overlaySlidePos].slideTransition;
    
    setTimeout(() => { doSlideTransition(localSlideDuration,localSlideTransition) }, 100);
}

