      
function doSlideTransition(transitionType)
{
    //console.log("doSlideTransition() called with transitionType = " + transitionType);
    
    var root = document.querySelector(':root');
    //root.style.setProperty('--animation-time', '2s');
    root.style.setProperty('--animation-baseslide', transitionType+'-baseslide');
    root.style.setProperty('--animation-overlay',   transitionType+'-overlay');
    
    document.getElementById("baseslide-li").classList.add("baseslide-animation");
    document.getElementById("overlay-li").classList.add("overlay-animation");
    
    var progressBar = document.getElementById("progress-bar");
    progressBar.style.display = "block";
    progressBar.style.width = "0px";
    progressBar.classList.add("progress-bar-animate");
    
}

function slideAnimationReset()
{
    //console.log("slideAnimationReset() called with optCallback = " + optCallback);
    /*
      document.getElementById("baseslide-img").src = slideDir + "/Slide" + overlaySlideFS + slideExt;
      
      currentSlidePos = (currentSlidePos + 1) % maxSlides;
      overlaySlidePos = (overlaySlidePos + 1) % maxSlides;
      
      currentSlideFS = currentSlidePos + 1;
      overlaySlideFS = overlaySlidePos + 1;
      
      //if (overlaySlidePos < maxSlides) {
      document.getElementById("overlay-img").src = slideDir + "/Slide" + overlaySlideFS + slideExt;
      //}
      */
    
    document.getElementById("baseslide-li").classList.remove("baseslide-animation");
    document.getElementById("overlay-li").classList.remove("overlay-animation");
    document.getElementById("progress-bar").classList.remove("progress-bar-animate");
}



var startNextSlide = function () {
    // console.log("*** startNextSlide");
    
    slideAnimationReset();
    
    // Overlay slide becomes the new current slide
    document.getElementById("baseslide-img").src = slideDir + "/Slide" + overlaySlideFS + slideExt;
    
    // Advance the counter on by +1
    currentSlidePos = (currentSlidePos + 1) % maxSlides;
    overlaySlidePos = (overlaySlidePos + 1) % maxSlides;	    
    currentSlideFS = currentSlidePos + 1;
    overlaySlideFS = overlaySlidePos + 1;
    
    // Set up the new overlay slide
    document.getElementById("overlay-img").src = slideDir + "/Slide" + overlaySlideFS + slideExt;
    
    
    // Use setTimeout so initiating next slide occurs outside of the event handler for AnimationEnd
    // (with a small time delay)
    //
    // Use time delay trick for now.  For a more robust solution, see:
    //   https://css-tricks.com/restart-css-animation/
    
    setTimeout(() => { doSlideTransition("fromright") }, 100); 
};


$(document).ready(function() {
    // Set up first slide 
    var $baseSlideImg = $('#baseslide-img');
    var $overlaySlideImg = $('#overlay-img');
    
    $baseSlideImg.attr("src", slideDir + "/Slide" + currentSlideFS + slideExt);
    $overlaySlideImg.attr("src", slideDir + "/Slide" + overlaySlideFS + slideExt);
    
    $baseSlideImg.on("load", function() {
	$baseSlideImg.fadeIn(1000);
	
	if (maxSlides > 1) {
	    // Get the next slide set up as the overlay, but need to wait until fadeIn done
	    setTimeout(() => { $overlaySlideImg.css("display", "block"); }, 1000);		  
	    
	}	  	      
    });

    // https://stackoverflow.com/questions/6186454/is-there-a-callback-on-completion-of-a-css3-animation        
    var element = document.getElementById("baseslide-li");
    
    element.addEventListener("webkitAnimationEnd", startNextSlide, false);
    element.addEventListener("animationend",       startNextSlide, false);
    element.addEventListener("oanimationend",      startNextSlide, false);
    element.addEventListener("MSAnimationEnd",     startNextSlide, false);

    // Consider changing to jQuery way of doing this?
    //
    // $("#baseslide-li").bind('animationend oanimationend webkitAnimationEnd MSAnimationEnd', function() { 
    //  startNextSlide() 
    // });

    doSlideTransition("fromright");        
});
