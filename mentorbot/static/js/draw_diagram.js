/*
	Global Variables
*/

var graph;
var variable_gs;
var hypothesis_object;
var NumberVariable, DummyVariable;

var mainVariables;
var mainCausalDiagram = new CausalDiagram();
var mainGraphUI = new GraphUI();
var mainRegressionFeature = new RegressionFeature();
var mainNarrativePanel = new NarrativePanel();
var systemLayout = getDefaultLayout({
		overall_width: 900,
		graph_width: 500,
		graph_height: 450,
	});

// Viz
var mainVizFeature = new VizFeature();

var hypothesis_object_width = 500,
	hypothesis_object_height = 130,
	hypothesis_object_x = 130,
	hypothesis_object_y = 10;

var graph_default_positions = [];
var stakeholder_scale = d3.scaleOrdinal(d3.schemePastel2);
// Below needs some cleaner way to 'register' a component to VICA
VICA.variables = mainVariables;
VICA.stakeholder_scale = stakeholder_scale; // temporary fix for having another GraphUI
VICA.mainCausalDiagram = mainCausalDiagram; // temporary link for syncing causal diagrams
VICA.NarrativePanel = mainNarrativePanel; // setting up links

// graph_mouse_mode
// default to 'NORMAL': click variables/lines, 
//                      drag variables
//            'DRAWLINE': draw line from node to node
// var graph_mouse_mode = 'NORMAL' || 'DRAWLINE';
// var graph_edgehovered_variable = -1;
// var graph_hovered_variable = -1; // used for drawing a line to a new hovered variable
// var max_selected_nodes = 3;


// store the controllers of the peer diagrams
var peer_diagrams = {}

// configs global variable is first initialized in draw_diagram.html
var visualized_relations, tested_relations = [];
var raw_data;


// currently is the same with raw_data (the whole dataset)
var filtered_data;

/****************** 
	For Graph Analysis
 ******************/

// construct a graph from the working area
var workingGraph; // global graph variable, stores all the nodes

// Called by any UI buttons
VICA.saveDiagram = function () {
	return saveLog('CAUSAL_DIAGRAM_SAVE', {
		'task': configs.task,
		'variable_diagram': {
			variables: mainVariables.map(v => ({
				// if a value is undefined, JSON.stringify will just ignore it
				id: v.id,
				name: v.name,
				type: v.type,
				key: v.key,
				description: v.description,
				term_in_sentence: v.term_in_sentence,
				long_description: v.long_description,
				stakeholder: v.stakeholder,
				// additional information
				x: v.x,
				y: v.y,
				default_x: v.default_x,
				default_y: v.default_y,
			})),
			causal_diagram: mainCausalDiagram.causal_diagram,
		},
		'reject_reasons': CausalInspirationFeature.export_written_reasons(),
	})
	.then(server_msg => {
		if (server_msg.status === 'success') {
			VICA.show_alert({
				text: 'Saved',
				classes: 'alert-success',
				duration: 1000,
			})
		}
		else {
			VICA.show_alert({
				text: 'Error: save failed',
				classes: 'alert-danger',
				duration: 2000,
			})
		}
	})
	.catch(error => {
		VICA.show_alert({
			text: 'Error: save failed, please check your Internet connection.',
			classes: 'alert-danger',
			duration: 2000,
		})
	})
}

VICA.updateDiagram = function(action, type, parameters, caller_id) {
	if (caller_id !== 'graph_ui') {
		// called by NarrativePanel
		VICA.GraphUI.updateDiagram(action, type, parameters);
	}
	if (caller_id !== 'narrative_panel') {
		// called by GraphUI
		if (type === 'edge') {
			VICA.NarrativePanel.updateNarrative(action, parameters);
		}
	}
	saveLog('UPDATE_DIAGRAM', {	
		action: action,
		type: type,
		parameters: parameters,
		caller_id: caller_id,
	});
},

// This function might be called by any component
VICA.selectArrow = function (vid_from, vid_to, caller_id = undefined) {
	if (caller_id !== 'graph_ui') {
		VICA.GraphUI.selectEdge(vid_from, vid_to);
	}
	if (caller_id !== 'narrative_panel') {
		// VICA.NarrativePanel.highlightNarrative(vid_from, vid_to);
		VICA.NarrativePanel.selectArrow(vid_from, vid_to);
	}
	if (caller_id !== 'viz_feature' && VICA.VizFeature) {
		// let visual_setting = autoVisualSet([VICA.variables[vid_from], VICA.variables[vid_to]]);
		// VICA.VizFeature.drawViz(visual_setting);
		VICA.VizFeature.drawViz([VICA.variables[vid_from], VICA.variables[vid_to]]);
	}
}

// Currently called by GraphUI only. Not triggered when the edge is clicked, but will be triggered when
// a variable is clicked. The variables are the final selected variables no matter the user is unselect 
// or select a variable.
VICA.selectVariables = function (variables, caller_id = undefined) {
	if (caller_id !== 'viz_feature') {
		// let visual_setting = autoVisualSet(variables);
		VICA.VizFeature.drawViz(variables);
	}
}

VICA.unselectAllArrows = function () {
	VICA.NarrativePanel.selectArrow();
}

// For showing peers' graphs
VICA.showPeerGraphs = function(peer_diagrams) {
	// disable the button
	$('#show_peer_graph_button').prop('disabled', true);

	if (peer_diagrams === undefined) {
		VICA.show_alert({
			text: '<strong>Info:</strong> No peer diagrams available',
			classes: 'alert-info',
		})
		return;
	}
	
	let sl = configs.systemLayout; // following the same layout as the main configuration.
	
	// Insert Peer Diagrams Template
	let $peer_diagrams_container = $($('template#peer_diagrams_template').html())
		.attr('id', 'peer_diagrams_container');

	// If there is no visualization panel, insert this on the right; otherwise, append below.
	if (configs.data_visualization !== true) {
		$('.vica-container').append($peer_diagrams_container);

		// adjust layout
		let vspace = 20;
		$peer_diagrams_container.css({
			position: 'absolute',
			left: sl.middle_panel_width + vspace,
			top: 0, // hardcoded now
		});
		$('.wrapper').css({
			width: '1882px', // hardcoded now
		});
	}
	else {
		$('.wrapper').append($peer_diagrams_container);
	}
	
	// $('.title', $peer_diagrams_container).html("Peer's Causal Diagram:")

	// Populate each causal diagram
	let $tablist = $('ul.nav', $peer_diagrams_container);
	let $tab_template = $('#peer_diagrams_tab_template');
	let $panelist = $('div.tab-content', $peer_diagrams_container);
	let $panel_template = $('#peer_diagrams_panel_template');

	let count = 0;
	for (let peer_name in peer_diagrams) {
		let peer_id = 'peer' + count;
		// append tab
		let $tab = $($tab_template.html());
		let $tab_a = $('a', $tab)
		      .attr('id', peer_id + '-tab')
		      .attr('href', '#' + peer_id)
		      .attr('aria-controls', peer_id)
		      .text(peer_name);
		if (count === 0) { $tab_a.addClass('active') }
		$tablist.append($tab);

		// append panel
		let peer_diagram = peer_diagrams[peer_name];
		let $panel = $($panel_template.html());
		$panel.attr('id', peer_id)
		      .attr('aria-labelledby', peer_id + '-tab');
		if (count === 0) { $panel.addClass('active show') }

		// generate causal diagram
		let causal_diagram_interface = generate_causal_diagram_interface(
			peer_diagram.variable_diagram, 
			{
				id: peer_id,
				diagram_name: peer_name,
			}
		)

		// adjust hypotheses textarea heights after they are shown
		$tab_a.on('shown.bs.tab', function (e) {
			$('textarea.hypothesis', $panel).each(function(i, elem) {
				elem.style.height = (elem.scrollHeight + 3) +'px'; 
			})
		});

		$panel.append(causal_diagram_interface);
		$panelist.append($panel);

		// the first tab does not trigger 'shown.bs.tab' (it is set active by css classes)
		if (count == 0) {
			$('textarea.hypothesis', $panel).each(function(i, elem) {
				elem.style.height = (elem.scrollHeight + 3) +'px'; 
			})
		}

		count += 1;
	}
	
}

// let local_GraphUI;
function generate_causal_diagram_interface(variable_diagram, parameters) {
	'use strict';

	let sl = getDefaultLayout({
		overall_width: 900,
		graph_width: 500,
		graph_height: 450,
	});
	let diagram_id = parameters.id;

	// enlarge system layout


	let $core_interface = $($('template#core_graph_interface_template').html())
		.attr('id', parameters.id);
		// .attr('diagram_name', parameters.diagram_name);
	
	// initialize the layout
	
	let $stakeholder_panel = $('.stakeholder-panel', $core_interface)
		.css('width', sl.top_panel_width + 'px');
	
	let $main_panel = $('.main-panel', $core_interface)
		.css({
			'width': sl.middle_panel_width + 'px',
			'height': sl.middle_panel_height + 'px',
		});
	
	let $graph_ui = $('.graph-ui', $core_interface)
		.css({
			'position': 'absolute',
			'width': sl.graph_width + 'px',
			'height': sl.graph_height + 'px',
			'left': sl.graph_left + 'px',
		});
	
	let $hypothesis_panel = $('.hypothesis-panel', $core_interface)
		.css({
			'top': 0,
			'left': sl.middle_right_panel_left + 'px',
			'width': sl.middle_right_panel_width + 'px',
			'height': '100%',
		});
	
	$('.variable-detail-panel', $core_interface)
		.css({
			'width': sl.top_panel_width + 'px',
		});

	// init graph
	let local_variables = variable_diagram.variables;
	// an obejct for handling the second graph
	let local_graph = {
		variables: local_variables,
		stakeholder_scale: d3.scaleOrdinal(d3.schemePastel2),
		NarrativePanel: new NarrativePanel(),
	};
	// Narrative Panel initialization (this has to be done before GraphUI.set_Graph())
	local_graph.NarrativePanel.init(diagram_id, $hypothesis_panel, local_graph, 'narrative_panel');

	local_graph = Object.assign(local_graph, {
		
		showVariableDetail: function (variable) {
			let $panel = $('.variable-detail-panel', $core_interface);
			$('span.name', $panel).text(variable.name);
			$('span.type', $panel).text(variable.type);
			$('span.long-description', $panel).text(variable.long_description);
		},
		setMiddlePanelHeight: function (height) {
			$main_panel.css('height', height + 'px');
			$graph_ui.css('height', height + 'px');
		},
		updateDiagram: function(action, type, parameters, caller_id) {
			if (caller_id !== 'graph_ui') {
				// called by NarrativePanel
				local_graph.GraphUI.updateDiagram(action, type, parameters);
			}
			if (caller_id !== 'narrative_panel') {
				// called by GraphUI
				if (type === 'edge') {
					local_graph.NarrativePanel.updateNarrative(action, parameters);
				}
			}
		},
		// This function might be called by any component
		selectArrow: function (vid_from, vid_to, caller_id = undefined) {
			if (caller_id !== 'graph_ui') {
				local_graph.GraphUI.selectEdge(vid_from, vid_to);
			}
			if (caller_id !== 'narrative_panel') {
				// VICA.NarrativePanel.highlightNarrative(vid_from, vid_to);
				local_graph.NarrativePanel.selectArrow(vid_from, vid_to);
			}
		}
	});



	let local_svg_graph = d3.select($('.graph-ui', $core_interface)[0])
					        .append('svg')
						    .attr('id', parameters.id + '_graph_svg');
	
	let local_GraphUI = new GraphUI();
	let local_configs = JSON.parse(JSON.stringify(configs));
	local_configs.graph_editable = true;

	local_GraphUI.init(diagram_id, local_svg_graph, local_variables, local_graph, local_configs, 'graph_ui');
	local_GraphUI.set_graph(variable_diagram.causal_diagram);
	local_graph['GraphUI'] = local_GraphUI;
	
	if (local_configs.visualize_stakeholder === true) {
		// insert stakeholder legend template
		let $stakeholder_legend = $($('#stakeholder_legend_template').html())
			.css({
				border: 'none',
			})
		$('.stakeholder-panel', $core_interface).append($stakeholder_legend);

		// populate stakeholder legend
		local_graph.stakeholder_scale.domain().forEach(function(title) {
			add_stakeholder_legend(title, $stakeholder_legend);
		});
	}
	else {
		$stakeholder_panel.remove();
	}

	

	// $('#second_graph')[0].scrollIntoView({behavior: 'smooth'});
	// store controller to global variable
	peer_diagrams[parameters.diagram_name] = local_graph;
	return $core_interface;
}

// First Function
function setTask(task_name) {

	configs.task = task_name;
	configs.data = task_configs[task_name];
	sl = configs.systemLayout = systemLayout;
	VICA.variables = mainVariables = configs.data.Variables;

	// the settings in task_configs have higher priority in configs
	// Not a clean way to do this but works for now
	['visualize_stakeholder', 'data_visualization'].forEach( key => 
		configs[key] = util.first_not_undefined(configs.data[key], configs[key])
	);

	VICA.init(configs, $('.wrapper'));

	// update UI
	$('#dataset_name').html(task_name);
	$('#task_question').html(configs.data.question);

	
	if (configs.data_visualization === true) {
		let paddings = parseFloat($('.wrapper').css('padding-left')) + parseFloat($('.wrapper').css('padding-left'));
		sl.overall_width = sl.overall_width + sl.chart_width + paddings;
		$('#chart_container').css({
			display: 'block',
			position: 'absolute',
			width: sl.chart_width,
			height: sl.chart_height,
			left: sl.chart_left,
			top: 0,
		});
		$('.wrapper').css({
			width: sl.overall_width,
		})
	}

	if (configs.data_regression === true) {
		// only enables when 'data_visualization' is set to true
		if (configs.data_visualization === true) {
			// configure regression panel layout
			$('#regression_panel').css({
				display: 'block',
				position: 'absolute',
				width: sl.regression_width,
				height: sl.regression_height,
				left: sl.regression_left,
				top: sl.regression_top,
			});
			// create UI
			$div = $('<div>', {
				'id': 'regression_feature',
				'class': 'w-100 h-100',
			}).appendTo($('#regression_panel'));
			// init
			mainRegressionFeature.init(mainVariables, mainCausalDiagram, VICA, configs.data.path, $div);
			VICA.RegressionFeature = mainRegressionFeature;
		}
		else {
			configs.data_regression = false;
		}
	}

	// update variable order
	// configs.variable_order = [...Array(100).keys()];

	// update next step button href
	// toUpdate
	// $('a#next').attr('href', configs.data.next_link);

	// set the stakeholder_scale before initializing graphs
	if (configs.visualize_stakeholder === true) {
		stakeholder_scale.domain(mainVariables.map(v=>v.stakeholder));
	}

	if (configs.data_visualization === true) {
		if (typeof(configs.data.path) !== 'string') {
			console.warn('configs.data.path is not a string: ' + configs.data.path);
			initializePage();
		}
		else {
			NumberVariable = {	'name': 'Number of ' + configs.data.object_name, 'type': 'numerical',    'function': function(d) { return count(d); }, 'dummy': true};
			DummyVariable = {	'name': '',    'type': 'categorical',  'key': '_dummy_', 'labels': ['All'], 'dummy': true};

			// load google chart package, starting point, entry point
			google.charts.load('current', {packages: ['corechart', 'scatter', 'bar']});
			google.charts.setOnLoadCallback(function(){
				loadData(configs.data.path, initializePage);
			});	
		}
	}
	else {
		initializePage();
	}

	if (configs.relationship_inspiration === true) {
		CausalInspirationFeature.init(mainVariables, mainCausalDiagram, VICA);
	}

	VICA.add_top_panel_button({
		text: 'Verify',
		classes: 'btn-info',
		onclick: () => {
			VICA.RegressionFeature.getPathAnalysisResults()
				.then(arrow_status => {
					VICA.GraphUI.colorArrows(arrow_status);
				})
		}
	})

	// Features for crowd model
	VICA.add_top_panel_button({
		text: 'Visualize Differences',
		classes: 'btn-success',
		onclick: () => {
			if (!peer_diagrams["Crowd"]) {
				VICA.showModal({
					title: 'Error',
					body: 'There is no crowd model. Click "Next Step" before using this button.'
				});
				return
			}

			peer_diagrams["Crowd"].GraphUI.showEdgeDifferences(mainCausalDiagram);
			mainGraphUI.showEdgeDifferences(peer_diagrams["Crowd"].GraphUI.get_causal_diagram());

		}
	})

	VICA.add_top_panel_button({
		text: 'Toggle Edge Ranking (Disabled)',
		classes: 'btn-secondary',
		onclick: (e) => {
			if (!peer_diagrams["Crowd"]) {
				VICA.showModal({
					title: 'Error',
					body: 'There is no crowd model. Click "Next Step" before using this button.'
				});
				return
			}

			let $button = $(e.target);
			if ($button.text() === 'Toggle Edge Ranking (Disabled)') {
				$button.addClass('btn-primary')
				       .removeClass('btn-secondary')
				       .text('Toggle Edge Ranking (Enabled)');

					peer_diagrams["Crowd"].GraphUI.set_config({"edge_width": "popularity"});	
			}
			else {
				$button.addClass('btn-secondary')
				       .removeClass('btn-primary')
				       .text('Toggle Edge Ranking (Disabled)');	
					peer_diagrams["Crowd"].GraphUI.set_config({"edge_width": "fixed"});
			}
		}
	})


	// if (configs.add_new_variable === true) {
	// 	let $add_new_variable = $($('template#add_new_variable_template').html());
	// 	$('#top_panel_buttons').append($add_new_variable);

	// 	// do not show stakeholder based on configs
	// 	if (configs.visualize_stakeholder === true) {
	// 		// populate existing stakeholder
	// 		let stakeholders = [...new Set(mainVariables.map(v=>v.stakeholder))];
	// 		let $options = stakeholders.map(function(name) {
	// 			return $('<a>').addClass('dropdown-item').text(name);
	// 		})
	// 		$('#add_variable_modal [aria-labelledby="variable_stakeholder"]').prepend($options);
	// 	}
	// 	else {
	// 		$('label[for=variable_stakeholder]').parent().css('display', 'none');
	// 	}

		
	// 	// use dropdown menus as selects
	// 	$('#add_variable_modal div.dropdown div.dropdown-menu a').click(function(){
	// 		let $a = $(this);
	// 		let $parent_dropdown = $a.parents('div.dropdown');

	// 		if ($a.hasClass('create-button')) {
	// 			// special case, use the input value as the selected option
	// 			let new_stakeholder = $('#new_stakeholder', $parent_dropdown).val();
	// 			if (new_stakeholder !== '') {
	// 				$('span', $parent_dropdown).text(new_stakeholder);
	// 			}
	// 		}
	// 		else {
	// 			$('span', $parent_dropdown).text($a.text());
	// 		}
	// 	});

	// 	$('#add_variable_modal button#confirm').click(function (){
	// 		let v_info = {
	// 			'name': $('#add_variable_modal input#variable_name').val(),
	// 			'type': $('#add_variable_modal #variable_type span').text(),
	// 			'description': $('#add_variable_modal textarea#variable_description').val(),
	// 			'stakeholder': $('#add_variable_modal #variable_stakeholder span').text(),
	// 		};
	// 		add_new_variable(v_info);
	// 		$('#add_variable_modal').modal('hide');
	// 	});
	// }

	// VICA.add_top_panel_button({
	// 	text: 'Run Regressions on Data',
	// 	classes: 'btn-success',
	// 	onclick: () => {
	// 		mainGraphUI.verify_graph_debug();
	// 		$('.regressions_panel').fadeIn();
	// 	}
	// })

	VICA.add_top_panel_button({
		text: 'DEBUG',
		classes: 'btn-outline-secondary float-right ml-1',
		onclick: () => {
			$('.debug').toggle();
		}
	})

	// for log purposes
	VICA.add_top_panel_button({
		text: 'END',
		classes: 'btn-outline-secondary float-right ml-1',
		onclick: function() {
			saveLog('TASKEND')
				.then(response => {
					if (response.status === 'success') {
						VICA.show_alert({
							text: 'Ended',
							classes: 'alert-success',
						})
					}	
					else {
						VICA.show_alert({
							text: 'Error' + response,
							classes: 'alert-danger',
						})
					}
					
				})
				.catch(error => {
					VICA.show_alert({
						text: 'Error: ending failed, please check your Internet connection.',
						classes: 'alert-danger',
						duration: 2000,
					})
				});
		}
	});

	// Save and Load feature
	if (configs.save_and_load_graph === true) {
		VICA.add_top_panel_button({
			text: 'Save My Graph', 
			classes: 'btn-outline-secondary float-right ml-1',
			onclick: VICA.saveDiagram,
		});
		VICA.add_top_panel_button({
			text: 'Reload My Graph', 
			classes: 'btn-outline-secondary float-right ml-1',
			onclick: function() {
				if (!configs.saved_diagram.variable_diagram) {
					VICA.show_alert({
						text: "<strong>Info</strong>: you don't have saved graph.",
						classes: 'alert-info',
						duration: 3000,
					})
					return;
				}

				// Add new variables if the id does not exist
				configs.saved_diagram.variable_diagram.variables.forEach(v_info => {
					if (!mainVariables.map(v => v.id).includes(v_info.id)) {
						// TODO: this assumes the variable's id matches its order in the array.
						add_new_variable(v_info);
					}
				})

				let causal_diagram = configs.saved_diagram.variable_diagram.causal_diagram;
				
				saveLog('CAUSAL_DIAGRAM_LOAD', {
					'task': task_name,
					'variable_diagram': causal_diagram,
				});

				mainGraphUI.set_graph(causal_diagram,1000);

				VICA.show_alert({
					text: 'Graph Reloaded',
					classes: 'alert-success',
				})
			} 
		});
	}

	VICA.add_top_panel_button({
		text: 'START',
		classes: 'btn-outline-secondary float-right ml-1',
		onclick: function() {
			saveLog('TASKSTART')
				.then(response => {
					if (response.status === 'success') {
						VICA.show_alert({
							text: 'Started',
							classes: 'alert-success',
						})
					}	
					else {
						VICA.show_alert({
							text: 'Error' + response,
							classes: 'alert-danger',
						})
					}
					
				})
				.catch(error => {
					VICA.show_alert({
						text: 'Error: starting failed, please check your Internet connection.',
						classes: 'alert-danger',
						duration: 2000,
					})
				});
		}
	});

	

	// if (configs.show_second_graph === true) {
	// 	VICA.add_top_panel_button({
	// 		id: 'show_peer_graph_button',
	// 		text: "Show a Peer's Graph",
	// 		onclick: function() {
	// 			// VICA.showSecondGraph(configs.peer_diagram);
	// 			VICA.showPeerGraphs(configs.peer_diagrams)
	// 		}
	// 	})
	// }

	// This is a seemingly complicated function, but it basically just configures the work flow:
	// If the user proceed to next step, show the peer diagram and adds a finish button
	VICA.add_top_panel_button({
		id: 'next_to_show_peer_diagram',
		text: 'Next Step',
		classes: 'btn-secondary ml-3',
		onclick: () => {
			// show the modal to confirm the user wants to proceed to next step
			VICA.showModal({
				title: 'Proceed to next step', 
				body: 'Are you positive that there are no more causal hypotheses?', 
				buttons: {
					primary: {
						text: 'Yes, next step',
						onclick: async () => {
							// if the user confirms they want to proceed
							// await VICA.saveDiagram();

							VICA.showPeerGraphs(configs.peer_diagrams);
							// VICA.showSecondGraph(configs.peer_diagram);
							$('#next_to_show_peer_diagram').prop('disabled', true);

							// add a finish button
							VICA.add_top_panel_button({
								text: 'Finish',
								classes: 'btn-secondary',
								onclick: () => {
									// show a modal to confirm the user wants to finish
									VICA.showModal({
										title: 'Finish task',
										body: 'Are you sure you want to finish the task?',
										buttons: {
											primary: {
												text: 'Yes, finish',
												onclick: async () => {
													await VICA.saveDiagram();

													// window.location.href = "/finish/"
												}
											}
										}
									})
								}
							})
						}
					}, 
					secondary: {
						text: 'No',
					}
				}
			});
		}
	})


	
	
	// // Finally, add the finish task button
	// let $finish_task_button = $($('template#finsih_task_button_template').html());
	// $('#top_panel_buttons').append($finish_task_button);

	// crowd diagram experimenting
	$('#crowd_diagram_debug textarea').val(JSON.stringify(configs.peer_diagrams['Crowd']));
}

// Second Function
// - loadData() is called if necessary
function initializePage() {
	let sl = configs.systemLayout;
	// set up top panel width and height
	d3.select('#top_panel')
		.style('width', sl.top_panel_width + 'px')
	// set up middle panel height
	d3.select('#middle_panel')
		.style('width', sl.middle_panel_width + 'px')
		.style('height', sl.middle_panel_height + 'px');
	// set up graph container
	d3.select('#graph_container')
		.style('left', sl.graph_left + 'px')
		.style('width', sl.graph_width + 'px')
		.style('height', sl.graph_height + 'px');
	// set up middle right panel
	d3.select('#middle_right_panel')
		.style('left', sl.middle_right_panel_left + 'px')
		.style('width', sl.middle_right_panel_width + 'px')
		.style('height', sl.middle_right_panel_height + 'px');
	// set up variable detail panel
	d3.select('.variable-detail-panel')
		.style('width', sl.middle_panel_width + 'px')

	if (configs.condition == 'control') {
		initGraph_Control();
		// move chart block next to variable view
		d3.select('#chart_container').style('left', working_line+3 + 'px');
	}
	else {
		initGraph();	
	}

	if (configs.data_visualization === true) {
		configs.variable_click_select = true; // set variable select handler flag
		initChart();	
	}

	// hide assisting features
	if (configs.assisting === false) {
		$('#suggestion_container').hide();
		// $('button[data-target='#detailPanel']').hide();
	};

	if (configs.visualize_stakeholder === true) {
		// insert stakeholder legend template
		$('#top_panel').append($($('#stakeholder_legend_template').html()));

		// populate stakeholder legend
		stakeholder_scale.domain().forEach(function(title) {
			add_stakeholder_legend(title, $('#stakeholder_legend'));
		});
	}
}

// Third Function
function loadData(csvFile, callback) {
	d3.csv(csvFile, configs.data.row_conversion)
		.then(function(data) {
			raw_data = data;
			preprocessVariable(raw_data, mainVariables);
			filtered_data = raw_data; // for future extension

			callback();
		});
}

// Forth Function: initGraph_Control() or initGraph()
function initGraph_Control() {
	// set up graph width, height (attribute list and graph component)
	graph = d3.select('#graph_container')
				.html('') // reset the graph
				.style('width', working_line + 'px')
				.style('height', graph_height + 'px')
			  .append('svg')
				.attr('id', 'graph_svg')
				.attr('width', working_line)
				.attr('height', graph_height);

	// update x, y position for each Variables
	mainVariables.forEach(function(e,i){
		e['id'] = i;
		e['x'] = variable_margin;
		e['y'] = e['default_y'] = variable_margin + (variable_height+variable_margin)*configs.variable_order[i];
		e['selected'] = false; // selected to visualize
		e['active'] = false;   // in graph area
	})

	let variable_gs = graph.selectAll('g.g-variable').data(mainVariables).enter()
						.append('g')
						  .attr('transform', function(d){ return 'translate(' + d.x + ',' + d.y + ')'})
						  .classed('g-variable', true)
						  .on('click', variable_click);

	if (configs.variable_shape === 'rect') {
		variable_gs.append('rect')
					.classed('rect-variable', true)
					.attr('width', variable_width)
					.attr('height', variable_height)
	}
	else if (configs.variable_shape === 'circle') {
		variable_gs.append('circle')
		           .classed('circle-variable', true)
		           .attr('cx', variable_height/2)
		           .attr('cy', variable_height/2)
		           .attr('r', variable_height/2);
	}

	variable_gs.append('text')
				  .attr('x', .5 * variable_width)
				  .attr('y', .5 * variable_height)
				  .attr('alignment-baseline', 'middle')
				  .attr('text-anchor', 'middle')
				  // .style('font-weight', 'bold')
				  .text(function(d) {return d.name})
}

function initGraph() {
	let sl = configs.systemLayout;
	let svg_graph = d3.select('#graph_container')
						.html('') // reset the graph
						// .style('width', sl.graph_width + 'px')
						// .style('height', sl.graph_height + 'px')
					  .append('svg')
						.attr('id', 'graph_svg')
	
	mainGraphUI.init("main", svg_graph, mainVariables, VICA, configs, 'graph_ui');
	VICA.GraphUI = mainGraphUI;

	mainNarrativePanel.init("main", $('#middle_right_panel'), VICA, 'narrative_panel'); // This will initialize the empty list
	VICA.NarrativePanel = mainNarrativePanel;

	// for hypothesis input feature
	if (configs.hypothesis_input === true) {
		hypothesis_object = svg_graph.append('foreignObject')
			.attr('id', 'hypothesis_object')
			.attr('width', hypothesis_object_width)
			.attr('height', hypothesis_object_height)
			.attr('x', hypothesis_object_x)
			.attr('y', hypothesis_object_y);

		// hypothesis_object.append('xhtml:div'); // https://stackoverflow.com/questions/13848039/svg-foreignobject-contents-do-not-display-unless-plain-text
		var hypothesis_object_content = $($('template#hypothesis_input_template').html());
		$('#hypothesis_object').append(hypothesis_object_content);
		$('#save_hypothesis').click(function(){
			let vid_from = $('#hypothesis_object').attr('vid_from'),
				vid_to = $('#hypothesis_object').attr('vid_to')
			update_causal_diagram('set', 'edge', {
				'vid_from': vid_from,
				'vid_to': vid_to,
				'hypothesis': $('#hypothesis_textarea').val(),
			});
			// disable the save button
			$('#save_hypothesis').prop('disabled', true);
			// enable hide button
			$('#hide_hypothesis').prop('disabled', false);
		})
		$('#hypothesis_textarea').on('input propertychange', function() {
			// enable the save button
			$('#save_hypothesis').prop('disabled', false);
			// disable hide button
			$('#hide_hypothesis').prop('disabled', true);
		});
		$('#delete_edge').click(function(){
			let vid_from = $('#hypothesis_object').attr('vid_from'),
				vid_to = $('#hypothesis_object').attr('vid_to');

			$('#hypothesis_object div').fadeOut();
			VICA.hypothesisDeleted(vid_from, vid_to);
		})
		$('#hide_hypothesis').click(function(){
			$('#hypothesis_object div').fadeOut();	
		})
	}
}

function add_stakeholder_legend(title, $stakeholder_legend) {
	let $legend_item = $($('#stakeholder_legend_item_template').html());
	$('.legend_color', $legend_item).css('background-color', stakeholder_scale(title));
	$('.legend_title', $legend_item).text(title);
	$stakeholder_legend.append($legend_item);
}

/****************** 
	For Adding New Variable
 ******************/

function add_new_variable(v_info) {
	let variable = new DataVariable({
		'name': v_info.name,
		'type': v_info.type,
		'long_description': v_info.description,
		'stakeholder': v_info.stakeholder,
	});
	variable['id'] = v_info['id'] = mainVariables.length;
	mainVariables.push(variable);

	// if there is new stakeholder
	if (configs.visualize_stakeholder === true) {
		if (!stakeholder_scale.domain().includes(v_info.stakeholder)) {
			let color = stakeholder_scale(v_info.stakeholder); // this will implicitly add the value in the domain
			add_stakeholder_legend(v_info.stakeholder, $('#stakeholder_legend'));

			let $stakeholder_option = $('<a>').addClass('dropdown-item').text(v_info.stakeholder);
			$('#add_variable_modal [aria-labelledby="variable_stakeholder"]').prepend($stakeholder_option);
		}
	}

	// call GraphUI
	mainGraphUI.drawNewVariable(variable);

	// log
	saveLog('ADD_NEW_VARIABLE', v_info);
	
}


function initChart() {
	let $div = $('#chart_container div.chart');
	mainVizFeature.init(raw_data, VICA, $div, 'viz_feature');
	VICA.VizFeature = mainVizFeature;
}

// Some old codes about data visualization are removed - refer to the commit on Sep 8, 2020, or
// refer to 'visualization-mediation.js' 

// Some old codes are removed - refer to 'visualization-mediation.js' for them. 
// Those codes are not used/maintained anymore here.
// Some removed functions include old mediation analysis feature, graph clear/verify/extend features

/****************** 
	Debug
 ******************/

function debugUpdateDiagram() {
	let log = JSON.parse($('#crowd_diagram_debug textarea').val());
	
	mainGraphUI.set_graph(log.variable_diagram.causal_diagram,1000);

	VICA.show_alert({
		text: 'Graph Reloaded',
		classes: 'alert-success',
	})
}

/****************** 
	Entry Point
 ******************/

// getting the basic configurations
setTask(configs.task);
