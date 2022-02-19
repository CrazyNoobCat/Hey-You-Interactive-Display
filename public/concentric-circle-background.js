
// The original concentric cirles was developed on 1000 x 1000 area

// Liked the RHS of this area to be the rendered background

// So ... for a phone : 360 x 640

var screen_x_dim = 360;
var screen_y_dim = 640;

var screen_diagonal = Math.sqrt((screen_x_dim*screen_x_dim) + (screen_y_dim*screen_y_dim));

var x_org = screen_x_dim - 1000; // '1000' => the original magic number
var y_org = 0;

var rendering_x_dim = screen_x_dim - x_org;
var rendering_y_dim = screen_y_dim;

var rendering_diagonal = Math.sqrt((rendering_x_dim*rendering_x_dim) + (rendering_y_dim*rendering_y_dim));


var radius_delta = 10;

var monochrome_sequence = [ "#222", "#777", "#aaa" ];

function pointInsideCircle(cx,cy,radius,pt_x,pt_y)
{
    var x = pt_x - cx;
    var y = pt_y - cy;

    return ((x*x) + (y*y)) < (radius*radius);
}

window.addEventListener("load",function() {
    
    var svgns = "http://www.w3.org/2000/svg";
    var svg_container = document.getElementById( 'svg-container' );
    
    //var b_box = svg_container.getBBox();
    var b_box = svg_container.getBoundingClientRect();

    console.log(b_box);
    //console.log("width = " + b_box.width);

    var mc_len = monochrome_sequence.length;    
    var radius = radius_delta;

    var concentric_circles = [];

    var num_culled_circles = 0;
    
    for (var x=0; x<rendering_x_dim; x+=radius_delta) {
	var mc_fill = monochrome_sequence[x % mc_len];

	rendered_x = x_org + x;
	rendered_y = y_org;

	//console.log(`x = ${x}, rendered_x=${rendered_x}, radius=${radius}`);

        var circle = document.createElementNS(svgns, 'circle');
        circle.setAttributeNS(null, 'cx', rendered_x);
        circle.setAttributeNS(null, 'cy', rendered_y);
        circle.setAttributeNS(null,  'r', radius);
        circle.setAttributeNS(null, 'style', 'fill:' + mc_fill);

	// crude version of bounding-box filtering, just looking at x value
	// (as written does not generalize; is making assumptions about the
	//  height being more than the width, and that the y_org is 0)

	var num_pts_inside = 0;
	if (pointInsideCircle(rendered_x, rendered_y, radius,            0,            0)) { num_pts_inside++ }
	if (pointInsideCircle(rendered_x, rendered_y, radius, screen_x_dim,            0)) { num_pts_inside++ }
	if (pointInsideCircle(rendered_x, rendered_y, radius,            0, screen_y_dim)) { num_pts_inside++ }
	if (pointInsideCircle(rendered_x, rendered_y, radius, screen_x_dim, screen_y_dim)) { num_pts_inside++ }
	
	if ((num_pts_inside !=0) && (num_pts_inside != 4)) {
	    concentric_circles.push(circle);
	}
	else {
	    num_culled_circles++;
	}

	/*
	if ((rendered_x + radius)>=0) {
	    // evidence that our radius has reached the drawing area

	    //if ((rendered_x + radius) <= (screen_x_dim + screen_y_dim)) {
	    
	    //cxy_diagonal = Math.sqrt((screen_x_dim-rendered_x)**2+(screen_y_dim-rendered_y)**2);
	    //if (cxy_diagonal <= screen_diagonal) {
	    if ((rendered_x + radius) <= (screen_x_dim + screen_y_dim)) {
		concentric_circles.push(circle);
	    }
	    else {
		// evidence that the circle has grown so large it no longer
		// even cuts back into the shape near the bottom of the screen rect
		num_culled_circles++;
	    }
	}
	else {
	    num_culled_circles++;
	}
	*/
	
	radius += radius_delta;
    }

    console.log("Number of culled circles:    " + num_culled_circles);
    console.log("Number of remaining circles: " + concentric_circles.length);
    
    for (var i=concentric_circles.length-1; i>=0; i--) {
	var circle = concentric_circles[i];
	svg_container.appendChild(circle);
    }

    var bg_rect = document.createElementNS(svgns, 'rect');
    bg_rect.setAttributeNS(null, 'x', x_org);
    bg_rect.setAttributeNS(null, 'y', 0);
    bg_rect.setAttributeNS(null, 'width',  rendering_x_dim);
    bg_rect.setAttributeNS(null, 'height', rendering_y_dim);
    bg_rect.setAttributeNS(null, 'fill', "url(#uni-red-to-yellow-grad)");
    svg_container.appendChild(bg_rect);
	
	
});
