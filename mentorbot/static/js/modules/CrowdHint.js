/*
	Crowd Hint module. It renders hints from the crowd intelligence.
*/

;var CrowdHint = function (ID) {
	// public variables
	var ch = {
		_Variables: undefined,
		_CrowdDiagram: undefined, // note that this is not the CausalDiagram object. 
		_NarrativePanel: undefined,
		_ID: ID,
		_CR: undefined,
	}

	// private variables
	var _$container,
		_crowd_num,
		_options = {},
		_color_same_arrow = d3.scaleLinear()
			.domain([0, 100])
			.range(['#28a745', '#28a745']), // always green
			// .range(['#dc3545', '#28a745']), // red to green
		_color_reverse_arrow = d3.scaleLinear()
			.domain([0, 100])
			.range(['#dc3545', '#dc3545']); // always red
			// .range(['#007bff']); // blue

	// private functions
	function hideInfo() {
		_$container.find('.same-arrow').hide();
		_$container.find('.reverse-arrow').hide();
		_$container.find('.further-arrows .content').hide();
	}

	function populateArrowInfo(edge, $div, options) {
		let peer_count = edge.info?.crowd.peer_count ?? 0,
			crowd_pct = (peer_count / _crowd_num * 100).toFixed(0),
			v_from = ch._Variables[edge.id_from],
			v_to = ch._Variables[edge.id_to];

		$div.find('.crowd-pct').text(crowd_pct);
		$div.find('.v_from').text(v_from.name);
		$div.find('.v_to').text(v_to.name);
		$div.find('.peer-count').text(peer_count);
		$div.find('.progress-bar').css('width', crowd_pct + '%');
		if (options?.bar_color_scale) {
			$div.find('.progress-bar').css({
				'background-color': options.bar_color_scale(crowd_pct),
			})
		}

		// // Narrative accepts older version of parameters...
		// let _edge = {
		// 	'vid_from': edge.id_from,
		// 	'vid_to': edge.id_to,
		// 	'info': edge.info,
		// };
		// let $narratives = ch._NarrativePanel.generate_hypothesis_item(_edge, ch._Variables, false);
		// if ($narratives.find('table').length) {
		// 	$div.find('.card-body').html($narratives.find('table'));	
		// }
		// else {
		// 	// no info in this edge
		// 	$div.find('.card-body').html('');		
		// }
		
		$div.find('.card-body .peer-count').text(
			peer_count + ' (' + crowd_pct + '%)'
		);
		$div.find('.card-body .narrative-table').html(generateNarrativeTable(edge));
	}

	// return $table using the edge info (and _Variables to get names)
	// return '' if there is no narratives
	function generateNarrativeTable(edge) {
		if (edge === undefined) return '';

		// Narrative accepts older version of parameters...
		let _edge = {
			'vid_from': edge.id_from,
			'vid_to': edge.id_to,
			'info': edge.info,
		};
		let $narratives = ch._NarrativePanel.generate_hypothesis_item(_edge, ch._Variables, false);
		if ($narratives.find('table').length) {
			return $narratives.find('table');	
		}
		else {
			// no info in this edge
			return '';
		}
	}

	function addArrowBtnClickHandler() {
		let $tr = $(this).closest('tr'),
			id_from = +$tr.attr('id_from'),
			id_to = +$tr.attr('id_to'),
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
		return ch._CR.addArrow?.(edge);
	}

	function furtherRowClickHandler() {
		let $tr = $(this).closest('tr'),
			id_from = +$tr.attr('id_from'),
			id_to = +$tr.attr('id_to'),
			actie_class = 'table-active';


		$tr.addClass(actie_class)
			.find('td .btn').addClass('btn-primary').removeClass('btn-secondary');
		$tr.siblings('tr').removeClass(actie_class)
			.find('td .btn').removeClass('btn-primary').addClass('btn-secondary');

		let edge = ch._CrowdDiagram.causal_diagram.edges.find(e => e.id_from == id_from && e.id_to == id_to);
		_$container.find('.further-arrows .v_from').html(ch._Variables[edge.id_from].name);
		_$container.find('.further-arrows .v_to').html(ch._Variables[edge.id_to].name);
		_$container.find('.further-arrows .narrative-title').show();
		_$container.find('.further-arrows .arrow-narratives').html(
			generateNarrativeTable(edge).addClass('border-highlighted position-relative')
		);
	}

	function populateFurtherArrows(arrows, user_diagram, node_id) {
		// empty tbody
		let $tbody = _$container.find('.further-arrows table.arrow-table tbody');
		$tbody.html('');

		arrows
			.slice()
			.sort((e1, e2) => e1.info.crowd.peer_count - e2.info.crowd.peer_count)
			.reverse()
			.forEach( (edge, i) => {
				let crowd_pct = (edge.info.crowd.peer_count / _crowd_num * 100).toFixed(0);
				let $tr = $(_$container.find('template.tr').html());
				$tr.find('td:eq(0)').html(ch._Variables[edge.id_from].name);
				$tr.find('td:eq(1) span')
					.html(ch._Variables[edge.id_to].name)
					.toggleClass('new-variable', user_diagram.find_node(+edge.id_to) === undefined);
				$tr.find('td:eq(2) span').html(crowd_pct + '%');
				$tr.attr('id_from', edge.id_from);
				$tr.attr('id_to', edge.id_to);
				$tr.find('td:eq(3) button').click(addArrowBtnClickHandler);
				$tr.click(furtherRowClickHandler);
				$tr.appendTo($tbody);

				// 'click' the first item
				if (i === 0) {
					$tr.trigger('click');
				}
			})

		// no further arrows
		if (arrows.length === 0) {
			$tbody.html(`<tr><td class="font-i text-center" colspan="4">
				No other arrows from <strong>${ch._Variables[node_id].name}</strong> were drawn by other people.</td></tr>`);
			_$container.find('.further-arrows .narrative-title').hide();
			_$container.find('.further-arrows .arrow-narratives').html('')
		}
	}

	// public functions
	function init({variables, $container, crowd_diagram, CR}) {
		ch._Variables = variables;
		ch._CrowdDiagram = crowd_diagram;
		ch._NarrativePanel = new NarrativePanel(); // we only need its generate_hypothesis_item()
		ch._CR = CR;

		_$container = $container;
		_$container.html($('template#crowd_hint_template').html());
		// TODO: if there are multiple CrowdHint, then the collapse elements have to have unique ids to work 
		// However, currently it's unlikely to have multiple CrowdHint


		// one-liner to get # of unique username in the crowd diagram...
		_crowd_num = new Set(ch._CrowdDiagram.causal_diagram.edges.map(e => e.info.crowd.peer_info.map(i => i.username)).reduce((a1, a2) => a1.concat(a2), [])).size;
	}

	// user_diagram is used to filter out existing arrows for 'further-arrows' feature
	function showHint(id_from, id_to, user_diagram) {
		if (id_from === undefined) {
			hideInfo();
			return;
		}
		
		if (id_to !== undefined) {
			// same direction
			let edge = ch._CrowdDiagram.causal_diagram.edges.find(e => e.id_from == id_from && e.id_to == id_to) ??
				// if not found
				{
					id_from: id_from,
					id_to: id_to,
				};
			let $div = _$container.find('.same-arrow');

			populateArrowInfo(edge, $div, {
				'bar_color_scale': _color_same_arrow,
			});
			$div.fadeIn();
			
			// reverse
			let reverse_edge = ch._CrowdDiagram.causal_diagram.edges.find(e => e.id_from == id_to && e.id_to == id_from) ??
				// if not found
				{
					id_from: id_to,
					id_to: id_from,
				};;
			let $reverse_div = _$container.find('.reverse-arrow');
			populateArrowInfo(reverse_edge, $reverse_div, {
				'bar_color_scale': _color_reverse_arrow,
			});
			$reverse_div.fadeIn();			
		}
		else {
			_$container.find('.same-arrow').hide();
			_$container.find('.reverse-arrow').hide();
		}

		// show more arrows to add
		showNewArrowsFrom(id_to ?? id_from, user_diagram);
	}

	function showNewArrowsFrom(node_id, user_diagram) {
		// show more arrows to add
		let further_arrows = ch._CrowdDiagram.causal_diagram.edges
			.filter(e => e.id_from == node_id)
			.filter(e => user_diagram.find_edge(e.id_from, e.id_to) === undefined);
		populateFurtherArrows(further_arrows, user_diagram, node_id);
		_$container.find('.further-arrows .content').fadeIn();
	}

	return Object.assign(ch, {
		init,
		showHint,
	})
}