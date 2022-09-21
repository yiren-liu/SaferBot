/*
	For relationship inspiration feature
	Global objects: saveLog()
*/

;var CausalInspirationFeature = (function() {
	// private variable 
	let _Variables;
	let _CausalDiagram;
	let _VICA;
	let _$inspiration_modal;
	// let GraphUI = {};
	let current_inspiration_variables = [];
	let written_reasons = {

	}
	
	function get_inspiration_variables() {
		// let select_one = Math.random() > 0.5;
		let select_one = false; // disable selecting just one variable

		// randomly select one variable
		if (select_one) {
			return [util.random_select(_Variables)];
		}
		// randomly select two variables that do not have an arrow in between
		else {
			var count = 0;
			while (true) {
				// a stupid way to avoid generating two variables that are already linked
				var v1 = util.random_select(_Variables);
				var v2 = util.random_select(_Variables.filter(v => v.id != v1.id));

				if (_CausalDiagram.edges.filter(e => 
						(e.id_from == v1.id && e.id_to == v2.id) ||
						(e.id_from == v2.id && e.id_to == v1.id)
					).length === 0) {
					break;
				}
				count += 1;
				if (count > 100) {
					// brute force breaking infinite loop
					break;
				}
			}
			return [v1, v2];
		}
	}

	function show_inspiration(variables) {
		// reset UI
		$('#reject_reason', _$inspiration_modal).hide();
		$('#normal_footer', _$inspiration_modal).show();
		$('#reject_footer', _$inspiration_modal).hide();		

		// make sure the variables are set
		current_inspiration_variables = variables; 

		if (variables.length === 1) {
			$('#one_variable_inspiration span.v1').text(variables[0].name);
			$('#one_variable_inspiration').show();
			$('#two_variables_inspiration').hide();
		}
		else if (variables.length === 2) {
			let v1 = variables[0], 
				v2 = variables[1],
				v1_text = v1.name,
				v2_text = v2.name;

			if (v1.term_in_sentence) {
				v1_text = v1.term_in_sentence + ' (' + v1.name + ')';
			}
			if (v2.term_in_sentence) {
				v2_text = v2.term_in_sentence + ' (' + v2.name + ')';	
			} 
			$('#two_variables_inspiration span.v1').text(v1_text);
			$('#two_variables_inspiration span.v2').text(v2_text);
			$('#one_variable_inspiration').hide();
			$('#two_variables_inspiration').show();
		}
		$('#inspiration_modal').modal('show');
	}

	function show_crowd_inspiration() {
		$('#crowd_inspiration_modal').modal('show');
	}

	function inspiration_button_click() {
		// show_inspiration(get_inspiration_variables());
		show_crowd_inspiration();
	}

	function reject_click() {
		let civ_id = current_inspiration_variables.map(v => v.id);
		saveLog('INSPIRATION_REJECT', {'Q': civ_id, 'A': [], 'info': get_info()});

		// show the panel for writing a reason
		// find the written reason between the pair
		let key = civ_id.slice().sort();
		if (written_reasons[key] !== undefined) {
			$('#reject_reason textarea', _$inspiration_modal).val(written_reasons[key]);
		}
		else {
			$('#reject_reason textarea', _$inspiration_modal).val();
		}
		
		$('#reject_reason', _$inspiration_modal).show();

		// change the footer
		$('#normal_footer', _$inspiration_modal).hide();
		$('#reject_footer', _$inspiration_modal).show();		

		// show_inspiration(get_inspiration_variables());
	}

	// called when users accept the inspiration
	function accept_click() {
		_VICA.createHypothesis(current_inspiration_variables);

		let civ_id = current_inspiration_variables.map(v => v.id);
		saveLog('INSPIRATION_ACCEPT', {'Q': civ_id, 'A': civ_id, 'info': get_info()});
	}

	// called when users finish writing a reason for rejection and click 'Next' button
	function next_click() {
		let civ_id = current_inspiration_variables.map(v => v.id);
		let reason = $('#reject_reason textarea', _$inspiration_modal).val();
		saveLog('INSPIRATION_REJECT_REASON', {'Q': civ_id, 'A': [], 'reason': reason, 'info': get_info()});
		
		// save reason in local dict
		written_reasons[civ_id.slice().sort()] = reason;

		$('#reject_reason textarea', _$inspiration_modal).val('')

		show_inspiration(get_inspiration_variables());	
	}

	// get the current inspiration's information
	function get_info() {
		let ids = current_inspiration_variables.map(v => v.id);
		let names = current_inspiration_variables.map(v => v.name);
		return {
			ids: ids,
			names: names,
		}
	}

	// called when users accept the reversed inspiration
	function accept_reverse_click() {
		_VICA.createHypothesis(current_inspiration_variables.slice().reverse());

		let civ_id = current_inspiration_variables.map(v => v.id);
		saveLog('INSPIRATION_ACCEPT_REVERSE', {'Q': civ_id, 'A': civ_id.slice().reverse()});
	}

	function init(Variables, CausalDiagram, VICA) {
		// access global variables
		_Variables = Variables;
		_CausalDiagram = CausalDiagram.causal_diagram;
		_VICA = VICA;
		// GraphUI = _GraphUI;
		

		// append the "Inspire Me" button and the modal on the UI
		let $inspiration_button = $($('template#inspiration_template').html());
		$('#top_panel_buttons').append($inspiration_button);

		// set the modal to be draggable
		// when it is dragged, the top and left attributes are set by jQuery UI
		$('#inspiration_modal .modal-dialog').draggable({
			handle: '.modal-header',
			// https://api.jqueryui.com/draggable/#event-stop
			stop: function (event, ui) {
				// this is the original offset from the top
				let original_margin_top = parseFloat(getComputedStyle(ui.helper[0])['margin-top']);

				// if the modal is dragged above the top page border, move it down so it can be dragged again
				if (ui.position.top < -original_margin_top) {
					d3.select('#inspiration_modal .modal-dialog')
						.transition()
						.duration(200)
						// change the top attribute to '-original_margin_top'
						.style('top', (-original_margin_top) + 'px');
				}
			},
		});

		// set button onclick handler
		$('#inspiration_button').click(inspiration_button_click);
		$('#inspiration_modal #response_no').click(reject_click);
		$('#inspiration_modal #response_reverse').click(accept_reverse_click);
		$('#inspiration_modal #response_yes').click(accept_click);

		_$inspiration_modal = $('#inspiration_modal'); // Assume there is only one inspiration modal on the interface
		$('button#next', _$inspiration_modal).click(next_click);




		// experimental feature: crowd inspiration
		let $crowd_inspiration_modal = $($('template#crowd_inspiration_template').html());
		$('.wrapper').append($crowd_inspiration_modal);

		// set the modal to be draggable
		// when it is dragged, the top and left attributes are set by jQuery UI
		$('#crowd_inspiration_modal .modal-dialog').draggable({
			handle: '.modal-header',
			// https://api.jqueryui.com/draggable/#event-stop
			stop: function (event, ui) {
				// this is the original offset from the top
				let original_margin_top = parseFloat(getComputedStyle(ui.helper[0])['margin-top']);

				// if the modal is dragged above the top page border, move it down so it can be dragged again
				if (ui.position.top < -original_margin_top) {
					d3.select('#inspiration_modal .modal-dialog')
						.transition()
						.duration(200)
						// change the top attribute to '-original_margin_top'
						.style('top', (-original_margin_top) + 'px');
				}
			},
		});

	}

	function export_written_reasons() {
		return written_reasons;
	}

	return {
		init: init,
		export_written_reasons: export_written_reasons,
	}
})();