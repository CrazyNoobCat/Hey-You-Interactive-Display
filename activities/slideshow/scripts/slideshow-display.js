var slideDir = "/smoke-and-mirrors-sampler";
var slideExt = ".PNG";

var currentSlidePos = 0;
var overlaySlidePos = 1;
var currentSlideFS  = currentSlidePos + 1;
var overlaySlideFS  = overlaySlidePos + 1;
      
var numSlides = 15;      
      
function doSlideTransition(transitionType)
{
    //console.log("doSlideTransition() called with transitionType = " + transitionType);
    
    var root = document.querySelector(':root');
    //root.style.setProperty('--animation-time', '2s');
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
    
    //console.log("*** startNextSlide()");
    
    slideAnimationReset();
    
    // Overlay slide becomes the new current slide
    document.getElementById("currentslide-img").src = slideDir + "/Slide" + overlaySlideFS + slideExt;
    
    // Advance the counter on by +1
    currentSlidePos = (currentSlidePos + 1) % numSlides;
    overlaySlidePos = (overlaySlidePos + 1) % numSlides;	    
    currentSlideFS = currentSlidePos + 1;
    overlaySlideFS = overlaySlidePos + 1;
    
    // Set up the new overlay slide
    document.getElementById("overlayslide-img").src = slideDir + "/Slide" + overlaySlideFS + slideExt;
    
    
    // Use setTimeout so initiating next slide occurs outside of the event handler for AnimationEnd
    // (with a small time delay)
    //
    // Use time delay trick for now.  For a more robust solution, see:
    //   https://css-tricks.com/restart-css-animation/
    
    setTimeout(() => { doSlideTransition("fromright") }, 100); 
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
    
    $currentSlideImg.attr("src", slideDir + "/Slide" + currentSlideFS + slideExt);
    $overlaySlideImg.attr("src", slideDir + "/Slide" + overlaySlideFS + slideExt);
    
    setTimeout(() => { doSlideTransition("fromright") }, 100);
}

$(document).ready(function() {
    // Set up first slide 
    var $currentSlideImg = $('#currentslide-img');
    var $overlaySlideImg = $('#overlayslide-img');
    
    $currentSlideImg.attr("src", slideDir + "/Slide" + currentSlideFS + slideExt);
    $overlaySlideImg.attr("src", slideDir + "/Slide" + overlaySlideFS + slideExt);
    
    $currentSlideImg.on("load", function() {
	$currentSlideImg.fadeIn(1000);
	
	if (numSlides > 1) {
	    // Get the next slide set up as the overlay, but need to wait until fadeIn done
	    setTimeout(() => { $overlaySlideImg.css("display", "block"); }, 1000);		  
	    
	}	  	      
    });

    // https://stackoverflow.com/questions/6186454/is-there-a-callback-on-completion-of-a-css3-animation        
    //var element = document.getElementById("currentslide-li");
    
    //element.addEventListener("webkitAnimationEnd", startNextSlide, false);
    //element.addEventListener("animationend",       startNextSlide, false);
    //element.addEventListener("oanimationend",      startNextSlide, false);
    //element.addEventListener("MSAnimationEnd",     startNextSlide, false);

    // Consider changing to jQuery way of doing this?
    //
    $("#currentslide-li").bind('animationend oanimationend webkitAnimationEnd MSAnimationEnd', function() { 
	startNextSlide() 
    });

    doSlideTransition("fromright");        
});
