/** utility functions maintained by Eric Yen
structure follows: http://stackoverflow.com/questions/881515/how-do-i-declare-a-namespace-in-javascript
jQuery can be used if loaded
*/

(function( util, $, undefined ) {
    //Private Property
    var privateVar = true;

    //Public Property
    util.publicVar = "utility library";

    //Public Method
    util.publicMethod = function() {
        console.log( "I am " + util.publicVar );
    };

    /***** Math *****/
    util.distanceP2P = function(v, w) {
    	return Math.sqrt((v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y));
    }

    // http://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment
    // basic idea: find projected point between v and w, then calculate distance
    util.distanceP2Segment = function(p, v, w) {
    	var l = util.distanceP2P(v, w);
		if (l == 0) return util.distanceP2P(p, v);
		var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / Math.pow(l, 2);
		t = Math.max(0, Math.min(1, t));
		return util.distanceP2P(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
    }

    // distance between a point to a d3 line (with x1, y1, x2, y2 attributes)
    util.distanceP2Line = function(p, l) {
    	return util.distanceP2Segment(p, { x: parseInt(l.attr('x1')), y: parseInt(l.attr('y1')) }, { x: parseInt(l.attr('x2')), y: parseInt(l.attr('y2')) });
    }

    //Private Method
    function privateMethod( x ) {
        if ( x !== undefined ) {
            console.log( x );
        }
    }
}( window.util = window.util || {}, jQuery ));