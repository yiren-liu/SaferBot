/*
	The main Causal Reasoning Controller
*/

;var CR = function (ID) {
	// public variables
	var cr = {
		_GraphUI: undefined,
		_NarrativePanel: undefined,
		_Variables: undefined,
		_$VariableMenu: undefined,
		_ID: ID,
	}


	// private variables
	var _$container,
		_options = {
			'layout': { // 'layout': null, means the layout is already intialized
				'narrative_pos': 'right', // 'right' | 'below'
				'overall_width': 900,
				'graph_width': 500, // ignored when 'narrative_pos' is 'below'
				'graph_height': 450,
				'narrative_height': 450,
			},
			'save_log': false,
		};

	// store functions to call on certain events
	var _eventListeners = {};

	// public functions
	function initLayout(layout_option) {
		_.merge(_options.layout, layout_option);
		let l = _options.layout;

		_$container.html($('#CR_layout_template').html());
		if (_options.layout.narrative_pos === 'right') {
			// default template
		}
		else {
			// _options.layout.narrative_pos === 'below'
			// move narrative-panel to the end of panel-container after <hr>
			_$container.find('.panel-container').append(['<hr>', _$container.find('.narrative-panel')]);
			l.overall_width = l.graph_width;
		}

		// use template
		_$container
			.css({
				'width': l.overall_width,
			});

		// NOTE: DON'T USE JQUERY TO APPEND SVG! It won't work. Use d3 to append it. Maybe related to issues of xmlns
		let graph_ui_div = _$container.find('.graph-ui');
		d3.select(graph_ui_div[0])
			.append('svg');

		_$container.find('.graph-ui')
			.css({
				'width': l.graph_width,
				'height': l.graph_height,
			});
		_$container.find('.narrative-panel')
			.css({
				'height': l.graph_height,
			})

	}

	//
	function initSystem($container, options) {
		// set parameters
		_$container = $container;
		_.merge(_options, options); // note: undefined in options will be skipped, while null or other values will be applied

		// init layout
		if (_options.layout) {
			initLayout(_options.layout);
		}


		// new handlers
		cr._GraphUI = new GraphUI();
		cr._GraphUI.init(ID, d3.select(_$container.find('.graph-ui svg')[0]), [], this, {}, 'graph_ui');

		cr._NarrativePanel = new NarrativePanel();
		cr._NarrativePanel.init(ID, _$container.find('.narrative-panel'), this, 'narrative_panel');
	}

	function initRegression($div, data_path) {
		cr._RegressionFeature = new RegressionFeature();
		cr._RegressionFeature.init(cr._Variables, cr._GraphUI.get_causal_diagram(), this, data_path, $div);
	}

	function initVizFeature($div, data) {
		cr._VizFeature = new VizFeature();
		cr._VizFeature.init(data, cr, $div, 'viz_feature');
	}

	// this will set cr._$VariableMenu
	function addVariableMenu($div) {
		// add variables into the button
		let $menu = $(`
			<div class="btn-group">
				<button type="button" class="btn btn-sm btn-info dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
					Variable List
				</button>
				<div class="dropdown-menu"></div>
			</div>`)
			.appendTo($div);

		let dropdwon_menu = $menu.find('.dropdown-menu');
		cr._Variables.forEach(function(v) {
			let $li = $('<li class="dropdown-item"></li>')
				.text(v.name)
				.attr('vid', v.id)
				.addClass(
						cr._GraphUI.get_causal_diagram().find_node(v.id) ?
						'disabled' :
						''
					)
				.click(function(){
					if (cr._GraphUI.get_causal_diagram().find_node(v.id) === undefined) {
						cr._GraphUI.move_node(v.id, undefined, 500);
						$(this).addClass('disabled');

						// LOG
						saveLog("ADD_VARIABLE", {
							name: v.name,
							id: v.id,
						})
					}
					else {
						util.showModal({
							'title': 'Hint',
							'body': 'This variable is already in the diagram.',
						})
						$(this).addClass('disabled');
					}
				});
			dropdwon_menu.append($li);
		});
		cr._$VariableMenu = $menu;
	}

	// this will set cr._$VariableMenu
	function addVariableMenu($div) {
		// add variables into the button
		let $menu = $(`
			<div class="btn-group">
				<button type="button" class="btn btn-sm btn-info dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
					Variable List
				</button>
				<div class="dropdown-menu"></div>
			</div>`)
			.appendTo($div);

		let dropdwon_menu = $menu.find('.dropdown-menu');
		cr._Variables.forEach(function(v) {
			let $li = $('<li class="dropdown-item"></li>')
				.text(v.name)
				.attr('vid', v.id)
				.addClass(
						cr._GraphUI.get_causal_diagram().find_node(v.id) ?
						'disabled' :
						''
					)
				.click(function(){
					if (cr._GraphUI.get_causal_diagram().find_node(v.id) === undefined) {
						cr._GraphUI.move_node(v.id, undefined, 500);
						$(this).addClass('disabled');

						// LOG
						saveLog("ADD_VARIABLE", {
							name: v.name,
							id: v.id,
						})
					}
					else {
						util.showModal({
							'title': 'Hint',
							'body': 'This variable is already in the diagram.',
						})
						$(this).addClass('disabled');
					}
				});
			dropdwon_menu.append($li);
		});
		cr._$VariableMenu = $menu;
	}

	// a mutable version of addVariableMenu, each time selected will create a new variable
	function addVariableMenuCanvas($div) {
		// add variables into the button
		let $menu = $(`
			<div class="btn-group">
				<button type="button" class="btn btn-sm btn-info dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
					Variable List
				</button>
				<div class="dropdown-menu"></div>
			</div>`)
			.appendTo($div);

		let dropdwon_menu = $menu.find('.dropdown-menu');
		let canvas_variables = [
			'circle',
			'rectangle',
		]

		canvas_variables.forEach(function(t) {
			let $li = $('<li class="dropdown-item"></li>')
				.text(t)
				.click(function(){
					let new_v_info = {
						'id': cr._Variables.length,
						'name': 'component' + '_' + cr._Variables.length,
						'variable_shape': t,
						'type': '',
						'description': '',
						'stakeholder': '',
					};
					let v = new DataVariable(new_v_info);
					cr._Variables.push(v)

					//todo: first create the UI nodes
					cr._GraphUI.setSingleVariable(v);
					// then move the node to visible range
					cr._GraphUI.move_node(v.id, undefined, 500);

					// LOG
					saveLog("ADD_VARIABLE", {
						name: v.name,
						id: v.id,
					})
				});
			dropdwon_menu.append($li);
		});
		cr._$VariableMenu = $menu;
	}

	// Note that the variables will be used and mutated by GraphUI.
	// Don't share variables among different CRs.
	function setScenario(variables, causal_diagram) {
		cr._Variables = variables;
		cr._GraphUI.setVariables(variables);
		setDiagram(causal_diagram);
	}

	function setDiagram(causal_diagram, duration) {
		cr._GraphUI.setGraph(causal_diagram, duration);

		// update variable menu
		cr._$VariableMenu?.find('li.dropdown-item').each(function() {
			$(this).toggleClass(
				'disabled',
				cr._GraphUI.get_causal_diagram().find_node($(this).attr('vid')) !== undefined
			)
		})
	}

	// syncing functions
	function updateDiagram(action, type, parameters, caller_id) {
		if (caller_id !== 'graph_ui') {
			// called by NarrativePanel
			cr._GraphUI.updateDiagram(action, type, parameters);
		}
		if (caller_id !== 'narrative_panel') {
			// called by GraphUI
			if (type === 'edge') {
				cr._NarrativePanel.updateNarrative(action, parameters);
			}
		}
		if (_options.save_log) {
			saveLog('UPDATE_DIAGRAM', {
				action: action,
				type: type,
				parameters: parameters,
				caller_id: caller_id,
			});
		}
	}

	// This function might be called by any component
	function selectArrow(vid_from, vid_to, caller_id = undefined) {
		// console.log('CR', vid_from, vid_to, caller_id);
		if (caller_id !== 'graph_ui') {
			cr._GraphUI.selectEdge(vid_from, vid_to);
		}
		if (caller_id !== 'narrative_panel') {
			// VICA.NarrativePanel.highlightNarrative(vid_from, vid_to);
			cr._NarrativePanel.selectArrow(vid_from, vid_to);
		}
		if (caller_id !== 'viz_feature') {
			// let visual_setting = autoVisualSet([VICA.variables[vid_from], VICA.variables[vid_to]]);
			// VICA.VizFeature.drawViz(visual_setting);
			if (vid_from !== undefined && vid_to !== undefined) {
				cr._VizFeature?.drawViz([cr._Variables[vid_from], cr._Variables[vid_to]]);
			}
		}
		if (caller_id !== 'regression_feature') {
			if (vid_from !== undefined && vid_to !== undefined) {
				cr._RegressionFeature?.autoRegressions([cr._Variables[vid_from],cr._Variables[vid_to]]);
			}
		}

		_eventListeners['select_arrow']?.(vid_from, vid_to, caller_id);
	}

	// Currently called by GraphUI only. Not triggered when the edge is clicked, but will be triggered when
	// a variable is clicked. The variables are the final selected variables no matter the user is unselect
	// or select a variable.
	function selectVariables(variables, caller_id = undefined) {
		// different diagram have different set of variables (some have data-related attributes)
		// use the ids of the variables to filter out the diagram's own variable set
		let own_variables = cr._Variables.filter(v => variables.map(vv => vv.id).includes(v.id));

		if (caller_id !== 'graph_ui') {
			cr._GraphUI.selectVariables(own_variables);
		}
		if (caller_id !== 'viz_feature') {
			// let visual_setting = autoVisualSet(variables);
			cr._VizFeature?.drawViz(own_variables);
		}
		if (caller_id !== 'regression_feature') {
			cr._RegressionFeature?.autoRegressions(own_variables);
		}

		_eventListeners['select_variables']?.(own_variables, caller_id);
	}

	function unselectAllArrows(caller_id) {
		if (caller_id !== 'graph_ui') {
			cr._GraphUI.selectEdge(undefined, undefined);
		}
		cr._NarrativePanel.selectArrow();
	}

	function showVariableDetail(variable) {
		let $panel = $('.variable-info-panel', _$container);
		$('span.name', $panel).text(variable.name);
		$('span.type', $panel).text(variable.type);
		$('span.long-description', $panel).text(variable.long_description);
	}

	async function addArrow (link, show_alert = false) {
		// if the link is already existing in GraphUI
		if (cr._GraphUI.get_causal_diagram().find_edge(link.id_from, link.id_to)) {
			if (show_alert) {
				util.showAlert({
					text: 'The arrow is already in your graph.',
					'classes': 'alert-info',
				})
			}
		}
		else {
			// note: this may not be accurate because this function is a generic one
			// however, in the current setting, this function always called when 'Add Arrow' button is clicked
			// in the crowd panel.
			saveLog('CLICK_CROWD_ADD_ARROW', {
				name_from: cr._Variables[link.id_from].name,
				name_to: cr._Variables[link.id_to].name,
				id_from: link.id_from,
				id_to: link.id_to,
			})

			await cr._GraphUI.addLink(link);
			cr._NarrativePanel.updateNarrative('set', {
				'vid_from': link.id_from,
				'vid_to': link.id_to,
				'info': link.info,
			})
		}

		_eventListeners['add_arrow']?.(link, show_alert);
	}

	function on(event, func) {
		_eventListeners[event] = func;
	}

	return Object.assign(cr, {
		initSystem,
		setDiagram,
		setScenario,
		updateDiagram,
		selectArrow,
		selectVariables,
		unselectAllArrows,
		showVariableDetail,
		addArrow,
		initRegression,
		initVizFeature,
		addVariableMenu,
		addVariableMenuCanvas,
		on,
	})
}
