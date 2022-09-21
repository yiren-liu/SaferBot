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

	/***** dictionary operation *****/
	// This function replaces an object in place; that is, all existing pointers to the old object will have access to the updated data.
	// In addition, it works on JSON object and makes sure the two input objects remains independent.
	util.replaceJSONInPlace = function(obj_old, obj_new) {
		// if they are the same object, skip. Otherwise both of objects will be empty
		if (Object.is(obj_old, obj_new)) { return }

		// reset old object
		for (var key in obj_old) delete obj_old[key];
		// "deep copy" the new object and save it into original object
		Object.assign(obj_old, JSON.parse(JSON.stringify(obj_new)));
	}

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

	// take two circles (with circle position x & y), find the positions of the points on each circle that draws a shortest line from edge to edge
	// If the two circles are overlapped, fall back to center to center
	// Assume the radius of the two circles are given and equivalent
	util.circleCentersToEdges = function(c1, c2, radius) {
		// return { p1: c1, p2: c2};

		var center_distance = util.distanceP2P(c1, c2);
		// if the circles are overlapped, fall back to center to center (thus the line is 'hidden' and doesn't matter)
		var offset = 5; // a small distance off from the edge
		if( center_distance <= (radius + offset) * 2) {
			return { p1: {x: c1.x, y: c1.y}, p2: {x: c2.x, y: c2.y}};
		}
		else {
			// move each center toward each other by a distance of radius
			delta_x = (c2.x - c1.x) * (radius + offset) / center_distance;
			delta_y = (c2.y - c1.y) * (radius + offset) / center_distance;
			return { p1: {x: c1.x + delta_x, y: c1.y + delta_y}, p2: {x: c2.x - delta_x, y: c2.y - delta_y}};
		}
	}

	// Assume the length of the vector is 1 unit, move the starting point or the ending point inward certain units.
	// This function is usful to shrink a vector proportionally
	util.scaleVector = function(start_p, end_p, start_offset = 0.3, end_offset = 0) {
		let x_diff = end_p.x - start_p.x;
		let y_diff = end_p.y - start_p.y;
		return {
			p1: {
				x: start_p.x + x_diff * start_offset,
				y: start_p.y + y_diff * start_offset,
			},
			p2: {
				x: end_p.x - x_diff * end_offset,
				y: end_p.y - y_diff * end_offset,
			}
		}
	}

	// return a randomly selected item in array
	// return undefined if array is empty
	util.random_select = function(array) {
		return array[Math.floor(Math.random() * array.length)];
	}

	// return the first item that is not 'undefined', good to use in setting default value
	// return undefined if there is no non-undefined value in array
	util.first_not_undefined = function(...args) {
		for (var i = 0; i < args.length; i++) {
			if (typeof(args[i]) !== 'undefined') return args[i];
		}
	}

	util.showModal = function({
			title = 'Title',
			body = 'Modal Body',
			buttons = {
				primary: {
					text: 'Close',
				}
			}
		}) {

		let $modal = $('div.modal#general_modal');
		$modal.find('.modal-title').html(title);
		$modal.find('.modal-body').html(body);
		$modal.find('#close_button')
			.text(buttons.primary.text)
			.unbind()
			.click(buttons.primary.onclick);

		let $btn = $('div.modal#general_modal button#secondary_button');
		if (buttons.secondary) {
			$btn.text(buttons.secondary.text)
				.unbind()
				.click(buttons.secondary.onclick)
				.show();
		}
		else {
			$btn.hide();
		}

		$modal.modal('show');
	}

	// function that shows an alert
	// When a second alert is called, the first alert is discarded.
	// duration = -1 means the alert will stay until it is closed by users or a second alert is called
	util.showAlert = (function(){
		let $alert = $('#main_alert_container .alert');
		let timeout_id;

		return function({
			text = 'no message',
			classes = ['alert-secondary'],
			duration = 5000,
		}){

			// reset the alert
			$alert.attr('class', ['alert', 'alert-dismissible'].concat(classes).join(' '))
				  .css({top: '50px', display: 'none'});
	
			$('span.alert-text', $alert).html(text);
	
			$alert.fadeIn({queue: false}) // set queue to false so that the animation below will begin simultaneously
				  .animate({top: '0px'});
	
			// TODO: for better animation control, I should record this animation id and cancel it if a second show_alert is called before
			// the alert is hidden.
			if (duration != -1) {
				if (timeout_id !== undefined) {
					console.log(`clearTimeout id = ${timeout_id}`);
					clearTimeout(timeout_id);
				}
				timeout_id = setTimeout(() => {
						$alert.fadeOut();
						timeout_id = undefined;
					}
					, duration);	
			}
			
		}

	})();

	util.hideAlert = function() {
		$('#main_alert_container .alert').fadeOut();
	}


	//  function({
	// 		text = 'no message',
	// 		classes = ['alert-secondary'],
	// 		duration = 5000,
	// 	}) {

	// 	let timeout_id;

	// 	{
	// 		let $alert = $('#main_alert_container .alert');
	// 		// reset the alert
	// 		$alert.attr('class', ['alert', 'alert-dismissible'].concat(classes).join(' '))
	// 			  .css({top: '50px', display: 'none'});
	
	// 		$('span.alert-text', $alert).html(text);
	
	// 		$alert.fadeIn({queue: false}) // set queue to false so that the animation below will begin simultaneously
	// 			  .animate({top: '0px'});
	
	// 		// TODO: for better animation control, I should record this animation id and cancel it if a second show_alert is called before
	// 		// the alert is hidden.
	// 		let timeout_id = setTimeout(() => {
	// 				let $alert = $('#main_alert_container .alert');
	// 				$alert.fadeOut();
	// 			}
	// 			, duration);
	// 	}
	// }


	util.addButtonTo = function($dest, {
			id = '',
			classes = ['btn-outline-secondary'],
			text = '',
			onclick = () => {},
		}) {

		let $button = $('<button>')
			.attr('id', id)
			.attr('class', ['btn btn-sm'].concat(classes).join(' '))
			.attr('type', 'button')
			.text(text)
			.click(onclick);

		$dest.append([' ', $button, ' ']); // append a tailing space so the next buttons will be separated
	}

	//Private Method
	function privateMethod( x ) {
		if ( x !== undefined ) {
			console.log( x );
		}
	}
}( window.util = window.util || {}, jQuery ));