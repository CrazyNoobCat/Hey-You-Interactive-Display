// $(window).width() and window.height() are available from the get-go (i.e., don't need to wait for DOM ready)
var viewportXDim = $(window).width();
var viewportYDim = $(window).height();

var SlideMaxXDim = (viewportXDim <= 1300) ? viewportXDim * 0.8 : viewportXDim * 0.9;
var SlideMaxYDim = (viewportXDim <= 1300) ? viewportYDim * 0.8 : viewportYDim * 0.9;
var QRDim = Math.floor(viewportXDim * 0.10);
