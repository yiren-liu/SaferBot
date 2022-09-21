/*
	This module handles narrative panel
*/

'use strict';
;var NarrativePanel = function() {
	// This module do not modify these objects below
	let _component_id; // assigned by VICA when init() is called
	let _graph_id;
	let _VICA;
	let _crowd_num = undefined;
	
	// This module maintain the UI on this reference
	let _$div;

	// Private variables
	// let _sig_threshold = .05;

	/////////////////////////////////////////////////////////////////////
	///// Private Functions /////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////

	// generate a hypothesis ul item
	// Input: 
	//     parameters: (very similar to the structure of 'edge' in CausalDiagram but has additional information, 
	//                  e.g, diagram_id)
	//         "v1"
	//         {
	//             vid_from: int, 
	//             vid_to: int, 
	//             hypothesis: string, 
	//             magnitude: integer,
	//             diagram_id: string,
	//         }
	//         "v2"
	//         {
	//             "vid_from": int, 
	//             "vid_to": int, 
	//             "info": {
	//                 "own": { (their own knowledge)
	//                     "narrative": string,
	//                     "magnitude": integer,
	//                 }
	//                 "crowd": {
	//                     "peer_count": integer,
	//                     "peer_magnitude_total": integer,
	//                     "peer_magnitude_avg": float,
	//                     "peer_info": [ (peers' knowledge)
	//                         {
	//                             "username": string,
	//                             "narrative": string,
	//                             "magnitude": integer,
	//                         },
	//                         ...
	//                     ]
	//                 }
	//             },
	//             diagram_id: string,
	//         }
	//     variables: An array of variables with their names
	function generate_hypothesis_item(parameters, variables, editable) {
		let vid_from = parameters.vid_from,
			vname_from = variables[parameters.vid_from].name,
			vid_to = parameters.vid_to,
			vname_to = variables[parameters.vid_to].name,
			diagram_id = _graph_id;

		// version v2
		if (parameters.info) {
			// individual mental model (only one narrative)
			if (parameters.info.own) {

				let $hypothesis_item = $($('template#entered_hypotheses_list_item_template').html());
				$hypothesis_item
					.attr('vid_from', parameters.vid_from)
					.attr('vid_to', parameters.vid_to);
				$('span.v_from', $hypothesis_item).text(variables[parameters.vid_from].name);
				$('span.v_to', $hypothesis_item).text(variables[parameters.vid_to].name);
				let $textarea = $('textarea.hypothesis', $hypothesis_item)
					.val(parameters.info.own.narrative)
					.prop('disabled', !editable);

				// effect magnitude
				let $magnitude_input = $('.magnitude-input', $hypothesis_item);
				if (parameters.info.own.magnitude === undefined) {
					$magnitude_input.val(3); // actually the input will default to be '3' so this is not necessary
				}
				else {
					$magnitude_input.val(parameters.info.own.magnitude);
				}
				$magnitude_input.on('input change', function() {
					let vid_from = parameters.vid_from,
						vid_to = parameters.vid_to,
						narrative = $("textarea.hypothesis", $hypothesis_item).val(),
						magnitude = parseInt($(this).val());

					// _VICA.update_edge(vid_from, vid_to, {
					// 	'own': {
					// 		'narrative': narrative,
					// 		'magnitude': magnitude,
					// 	}
					// })
					_VICA.updateDiagram('set', 'edge', {
						'vid_from': vid_from,
						'vid_to': vid_to,
						'info': {
							'own': {
								'narrative': narrative,
								'magnitude': magnitude,
							}
						}
					}, _component_id)
					// VICA.hypothesisUpdated(vid_from, vid_to, hypothesis, magnitude); // deprecated
				});	

				// narrative textarea
				$("textarea.hypothesis", $hypothesis_item)
					.on("focus", function() {
						// highlight the link
						let vid_from = parameters.vid_from,
							vid_to = parameters.vid_to;
						// _VICA.hypothesisFocused(vid_from, vid_to);
						_highlightNarrative(vid_from, vid_to);
						_VICA.selectArrow(vid_from, vid_to, _component_id);
					})
					.on('blur', function() {
						let vid_from = parameters.vid_from,
							vid_to = parameters.vid_to,
							narrative = $("textarea.hypothesis", $hypothesis_item).val(),
							magnitude = $('.effect-magnitude select', $hypothesis_item).val();

						// _VICA.update_edge(vid_from, vid_to, {
						// 	'own': {
						// 		'narrative': narrative,
						// 		'magnitude': magnitude,
						// 	}
						// })		
						_VICA.updateDiagram('set', 'edge', {
							'vid_from': vid_from,
							'vid_to': vid_to,
							'info': {
								'own': {
									'narrative': narrative,
									'magnitude': magnitude,
								}
							},
						}, _component_id)				
					});

				// For reacting to peer hypotheses
				let input_id = 'new_idea_' + diagram_id + '_' + vid_from + '_' + vid_to;
				$('.new_idea input', $hypothesis_item).attr('id', input_id);
				$('.new_idea label', $hypothesis_item).attr('for', input_id);
				
				// UPVOTE
				$('button.upvote', $hypothesis_item).click(function() {
					$('button.upvote', $hypothesis_item)
						.addClass('btn-primary')
						.removeClass('btn-outline-secondary');
					$('button.downvote', $hypothesis_item)
						.removeClass('btn-primary')
						.addClass('btn-outline-secondary');

					let narrative = $("textarea.hypothesis", $hypothesis_item).val();
					let magnitude = $("input.magnitude-input", $hypothesis_item).val();
					saveLog('REACT_VOTE', {
						vote: 'up',
						vid_from: vid_from,
						vid_to: vid_to,
						narrative: narrative,
						magnitude: magnitude,
						vname_from: vname_from,
						vname_to: vname_to,
						diagram_id: diagram_id,
					});
				})

				// DOWNVOTE
				$('button.downvote', $hypothesis_item).click(function() {
					$('button.downvote', $hypothesis_item)
						.addClass('btn-primary')
						.removeClass('btn-outline-secondary');
					$('button.upvote', $hypothesis_item)
						.removeClass('btn-primary')
						.addClass('btn-outline-secondary');

					let narrative = $("textarea.hypothesis", $hypothesis_item).val();
					let magnitude = $("input.magnitude-input", $hypothesis_item).val();
					saveLog('REACT_VOTE', {
						vote: 'down',
						vid_from: vid_from,
						vid_to: vid_to,
						narrative: narrative,
						magnitude: magnitude,
						vname_from: vname_from,
						vname_to: vname_to,
						diagram_id: diagram_id,
					});
				})

				// NEW_IDEA
				$('input.new_idea_checkbox', $hypothesis_item).change(function() {
					let is_new = this.checked;

					let narrative = $("textarea.hypothesis", $hypothesis_item).val();
					let magnitude = $("input.magnitude-input", $hypothesis_item).val();
					saveLog('REACT_NEW_IDEA', {
						is_new: is_new,
						vid_from: vid_from,
						vid_to: vid_to,
						narrative: narrative,
						magnitude: magnitude,
						vname_from: vname_from,
						vname_to: vname_to,
						diagram_id: diagram_id,
					});
				});

				// COMMENT
				$('button.leave-comment', $hypothesis_item).click(function() {
					$('textarea.comment', $hypothesis_item).slideDown({duration: 'slow', queue: false});
				})
				$('textarea.comment', $hypothesis_item)
					.on('blur', function() {
						let comment = $('textarea.comment', $hypothesis_item).val();
						let narrative = $("textarea.hypothesis", $hypothesis_item).val();
						let magnitude = $("input.magnitude-input", $hypothesis_item).val();
						saveLog('REACT_COMMENT', {
							comment: comment,
							vid_from: vid_from,
							vid_to: vid_to,
							narrative: narrative,
							magnitude: magnitude,
							vname_from: vname_from,
							vname_to: vname_to,
							diagram_id: diagram_id,
						});
					})


				if (editable) {
					$(".delete_edge", $hypothesis_item).click(function(){
						let vid_from = parameters.vid_from,
							vid_to = parameters.vid_to;
						// _VICA.hypothesisDeleted(vid_from, vid_to);
						_VICA.updateDiagram('delete', 'edge', {vid_from: vid_from, vid_to: vid_to}, _component_id);
						updateNarrative('delete', {vid_from: vid_from, vid_to: vid_to});
						// do not directly remove this hypothesis item (there should be an empty placeholder if this is the last item)
						// ui_update_hypothesis_panel('delete', {vid_from: vid_from, vid_to: vid_to}, variables);
					});
				}
				else {
					// in the 'crowd' diagram
					$(".delete_edge", $hypothesis_item).remove();
					// display reactions
					$('.reaction', $hypothesis_item).show();
					$magnitude_input.attr('disabled', true);
				}			

				return $hypothesis_item;

			}
			// crowd mental model (many narratives); currently always not editable
			else if (parameters.info.crowd) {
				let peer_pct = parameters.info.crowd.peer_count / parameters.info.crowd.peer_total * 100;

				let $hypothesis_item = $($('#crowd_narratives_template').html());
				$hypothesis_item
					.attr('vid_from', parameters.vid_from)
					.attr('vid_to', parameters.vid_to);
				$('span.v_from', $hypothesis_item).text(variables[parameters.vid_from].name);
				$('span.v_to', $hypothesis_item).text(variables[parameters.vid_to].name);
				$('.narrative_num', $hypothesis_item).text(
					parameters.info.crowd.peer_count + ' (' + peer_pct.toFixed(0) + '%)'
				);
				$hypothesis_item.find('.add-arrow-btn').click(_addArrowBtnClick);
				
				parameters.info.crowd.peer_info
					.slice() // Don't mutate the original data after sorting (just be safe)
					.sort((i1, i2) => i1.magnitude - i2.magnitude)  // by magnitude 
					.reverse()
					.forEach( function (peer) {
						let $tr = $($('#crowd_narratives_tr_template').html());
						let pid = peer.username.replace('peer', 'p');
						$('.username', $tr).text(pid);
						$('.narrative', $tr).text(peer.narrative);
						$('.magnitude', $tr).text(peer.magnitude);

						$('tbody', $hypothesis_item).append($tr);
					})

				return $hypothesis_item;
			}
		}
		else {
			// 'v1' case
		}

		// TODO: when there is no info
		return $('<div>');
	}

	function _addArrowBtnClick() {
		let $li = $(this).closest('li'),
			id_from = +$li.attr('vid_from'),
			id_to = +$li.attr('vid_to'),
			edge = {
				'id_from': id_from,
				'id_to': id_to,
				'info': {
					'own': {
						'narrative': '',
						'magnitude': 3,
					}
				}
			};
		return _VICA.addArrow?.(edge);
	}

	// if the narrative is not found. De-highlight all narratives
	function _highlightNarrative(vid_from, vid_to) {
		$('li', _$div).removeClass('highlighted');

		let $li = $('li[vid_from="' + vid_from + '"][vid_to="' + vid_to + '"]', _$div);

		if ($li.length === 0) {
			// console.warn('narrative not found');
		}
		else {
			$li.addClass('highlighted');
			_$div.animate({scrollTop: $li[0].offsetTop})	
		}
		// scrollIntoView will scroll the whole page
		// $li[0].scrollIntoView({behavior: 'smooth'}); 
	}


	/////////////////////////////////////////////////////////////////////
	///// Public Functions //////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////

	// The init function that sets references to other modules
	function init(graph_id, $div, VICA, component_id) {
		// set references
		_graph_id = graph_id;
		_$div = $div;
		_VICA = VICA;
		_component_id = component_id;
		
		// UI
		let $initial_list = $($('template#entered_hypotheses_list_template').html());
		_$div.append($initial_list);
	}

	// parameters: {
	//                 vid_from: int,
	//                 vid_to: int,
	//                 info: {
	//                     own: {...}
	//                     crowd: {...}
	//                 }
	//             }
	function updateNarrative(action, parameters, editable = true) {
		let variables = _VICA.variables ?? _VICA._Variables;
		let $hypothesis_list = $('ul', _$div);
		let $hypothesis_item = $('li[vid_from=' + parameters.vid_from + '][vid_to=' + parameters.vid_to + ']', _$div);

		// add a new hypothesis item or update the existing one
		if (action === 'set') {
			if ($hypothesis_item.length === 0) {
				$hypothesis_item = generate_hypothesis_item(parameters, variables, editable);
				$hypothesis_list.append($hypothesis_item);
			}
			else {
				// assume this is 'own' narrative
				if (parameters.info && parameters.info.own) {
					$('textarea.hypothesis', $hypothesis_item).val(parameters.info.own.narrative);
					$('.effect-magnitude select', $hypothesis_item).val(parameters.info.own.magnitude);
				}

				// TODO: currently, updating an existing crowd narrative is not supported
			}
			// set the height of the textarea to be fitting the content.
			// this has to run here (after the element is actually added on the browser)
			$('textarea.hypothesis', $hypothesis_item).each(function(i, elem) {

				elem.style.height = (elem.scrollHeight + 2) +'px';
				// note: after this is executed, scrollHeight will be updated to elem.style.height - 2px
				// to avoid over-increasing the height when this function is executed more than once for the same
				// update, only increase the height by 2px;
			})
		}
		// delete the existing one
		else if (action === 'delete') {
			$hypothesis_item.remove();
		}

		// add an "empty placeholder" if there is no hypothesis
		let placeholder_number = $('li#empty_item', $hypothesis_list).length;
		let hypotheses_number = $('li', $hypothesis_list).length - placeholder_number;
		if (hypotheses_number === 0) {
			if (placeholder_number === 0) {
				let $empty_content = $($('template#entered_hypotheses_list_template').html()).find('ul');
				$hypothesis_list.html($empty_content.html());	
			}
		}
		else {
			$('#empty_item', $hypothesis_list).remove();	
		}
	}

	

	function selectArrow(vid_from, vid_to) {
		_highlightNarrative(vid_from, vid_to);
	}


	return {
		init: init,
		updateNarrative: updateNarrative,
		selectArrow: selectArrow,
		generate_hypothesis_item: generate_hypothesis_item,
	}

}