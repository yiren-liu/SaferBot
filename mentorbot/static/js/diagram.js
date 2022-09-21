/*
	Global Variables
*/

var mainCR;     // the one thing that rules everything
var raw_data;   // the loaded data
// var system_options = {
// 	'crowd_intelligence': 'diagram', // 'diagram' or 'hint'
// }

// First Function
function entry() {

	let $crowd_overview_col = $('.crowd-CR-col');
	let $crowd_focus_col = $('.hint-feature-col');
	let $self_diagram_col = $('.self-diagram-col');
	let $data_col = $('.data-col');

	// getting predefined task configurations
	configs.data = task_configs[configs.context];
	let crowd_diagram = configs.peer_diagrams?.Crowd?.variable_diagram;
	// if (crowd_diagram == null) {crowd_diagram = undefined}; // adjust for Python None type

	let CR_options = {
		'layout': null,
	}

	// configure the

	// init main CausalReasoning controller
	mainCR = new CR('self_diagram');
	mainCR.initSystem($('.self-CR'), CR_options);
	mainCR.setScenario(configs.data.Variables, new CausalDiagram().causal_diagram);
	mainCR.initRegression($('.regression-feature'), configs.data.path);
	// initialize chart after data is loaded.

	mainCR.addVariableMenu($self_diagram_col.find('.button-list'));

	crowdCR = undefined;
	if (crowd_diagram !== undefined) {
		if (configs.system_options.crowd_intelligence === 'overview') {
			$crowd_focus_col.remove();
			$crowd_overview_col.css('display', 'block');


			crowdCR = new CR('crowd_diagram');
			crowdCR.initSystem($('.crowd-CR'), CR_options);
			crowdCR.setScenario(crowd_diagram.variables, crowd_diagram.causal_diagram);

			// mainCR._CrowdHint = new CrowdHint('crowd_hint');
			// mainCR._CrowdHint.init({
			// 	variables: mainCR._Variables,
			// 	$container: $('.crowd-hint-feature'),
			// 	crowd_diagram: crowd_diagram,
			// })

			// set syncing functions
			mainCR.on('select_arrow', (vid_from, vid_to, caller_id) => {
				if (caller_id !== crowdCR._ID) {
					crowdCR.selectArrow(vid_from, vid_to, mainCR._ID);
				}
			})
			crowdCR.on('select_arrow', (vid_from, vid_to, caller_id) => {
				if (caller_id !== mainCR._ID) {
					mainCR.selectArrow(vid_from, vid_to, crowdCR._ID);
				}
			})

			mainCR.on('select_variables', (variables, caller_id) => {
				if (caller_id !== crowdCR._ID) {
					crowdCR.selectVariables(variables, mainCR._ID);
				}
			})
			crowdCR.on('select_variables', (variables, caller_id) => {
				if (caller_id !== mainCR._ID) {
					mainCR.selectVariables(variables, crowdCR._ID);
				}
			})

			// the 'add_arrow' event will be triggered when the 'Add This Arrow?' button is clicked
			// in the crowd diagam panel
			crowdCR.on('add_arrow', (link) => {
				mainCR.addArrow(link, true);
			})
		}
		else if (configs.system_options.crowd_intelligence === 'none') {
			$crowd_overview_col.remove();
			$crowd_focus_col.remove();
		}
		else {
			// configs.system_options.crowd_intelligence === 'focus' or undefined
			$crowd_overview_col.remove(); //
			$crowd_focus_col.css('display', 'block');

			mainCR._CrowdHint = new CrowdHint('crowd_hint');
			mainCR._CrowdHint.init({
				variables: mainCR._Variables,
				$container: $('.crowd-hint-feature'),
				crowd_diagram: crowd_diagram,
				CR: mainCR,
			})

			// set hint functions
			mainCR.on('select_arrow', (vid_from, vid_to, caller_id) => {
				if (caller_id !== crowdCR?._ID) {
					crowdCR?.selectArrow(vid_from, vid_to, mainCR._ID);
				}

				mainCR._CrowdHint.showHint(vid_from, vid_to, mainCR._GraphUI.get_causal_diagram());
			})

			mainCR.on('select_variables', (variables, caller_id) => {
				let mainCausalDiagram = mainCR._GraphUI.get_causal_diagram();
				if (variables.length === 2) {
					// only show arrow narratives if the edge is in user diagram
					if (mainCausalDiagram.find_edge(...variables.map(v => v.id))) {
						mainCR._CrowdHint.showHint(...variables.map(v => v.id), mainCausalDiagram);
					}
					else if (mainCausalDiagram.find_edge(...variables.map(v => v.id).reverse())) {
						mainCR._CrowdHint.showHint(...variables.map(v => v.id).reverse(), mainCausalDiagram);
					}
					else {
						mainCR._CrowdHint.showHint();
					}
				}
				else if (variables.length === 1) {
					mainCR._CrowdHint.showHint(variables[0].id, undefined, mainCausalDiagram);
				}
			})
		}

	}
	else {
		$crowd_focus_col.remove();
		$crowd_overview_col.remove();
	}

	// add buttons
	util.addButtonTo($self_diagram_col.find('.button-list'), {
		text: 'Save Graph',
		// classes: ['btn-outline-secondary', 'advanced-feature'],
		onclick: () => {
			save_variable_diagram()
				.then(response => {
					if (response.status === 'success') {
						util.showAlert({
							text: 'Saved',
							classes: 'alert-success',
							duration: 1000,
						})
					}
					else {
						util.showAlert({
							text: 'Error: save failed',
							classes: 'alert-danger',
							duration: 2000,
						})
					}
				})
			// update configs.saved_diagram
			// use JSON transformation; otherwise the reference will be saved and continues to update automatically.
			// The user thus cannot load to the previous saved diagram
			configs.saved_diagram.variable_diagram = JSON.parse(JSON.stringify(mainCR._GraphUI.export_variable_diagram()));

			saveLog('SAVE_GRAPH', {
				variable_diagram: configs.saved_diagram.variable_diagram,
			})
		}
	});

	util.addButtonTo($self_diagram_col.find('.button-list'), {
		text: 'Load Graph',
		// classes: ['btn-outline-secondary', 'advanced-feature'],
		onclick: () => {
			let variable_diagram = configs.saved_diagram?.variable_diagram;
			if (variable_diagram) {
				mainCR.setDiagram(variable_diagram.causal_diagram, 500);

				saveLog('LOAD_GRAPH', {
					variable_diagram: variable_diagram,
				})
			}
			else {
				util.showAlert({
					text: "<strong>Info</strong>: you don't have saved graph.",
					classes: 'alert-info',
					duration: 3000,
				})
			}
		}
	})

	if (crowd_diagram !== undefined && configs.system_options.crowd_intelligence === 'overview') {
		// util.addButtonTo($('.btn-panel'), {
		// 	text: 'Arrow Popularity (Disabled)',
		// 	classes: 'btn-secondary',
		// 	onclick: (e) => {
		// 		let $button = $(e.target);
		// 		if ($button.text() === 'Arrow Popularity (Disabled)') {
		// 			$button.addClass('btn-primary')
		// 			       .removeClass('btn-secondary')
		// 			       .text('Arrow Popularity (Enabled)');

		// 				crowdCR._GraphUI.set_config({"edge_width": "popularity"});
		// 		}
		// 		else {
		// 			$button.addClass('btn-secondary')
		// 			       .removeClass('btn-primary')
		// 			       .text('Arrow Popularity (Disabled)');
		// 				crowdCR._GraphUI.set_config({"edge_width": "fixed"});
		// 		}
		// 	}
		// })

		util.addButtonTo($crowd_overview_col.find('.button-list'), {
			text: 'Show Diagram Differences',
			classes: 'btn-primary',
			onclick: () => {
				// unselect edges
				mainCR.selectArrow(undefined, undefined, 'button');

				crowdCR._GraphUI.showEdgeDifferences(mainCR._GraphUI.get_causal_diagram());
				mainCR._GraphUI.showEdgeDifferences(crowdCR._GraphUI.get_causal_diagram());

				saveLog('CLICK_SHOW_CROWD_DIFF')
			}
		});

		util.addButtonTo($crowd_overview_col.find('.button-list'), {
			text: 'Reset Color',
			// classes: 'btn-secondary',
			onclick: () => {
				// reset color
				// mainCR._GraphUI.resetArrows();
				crowdCR._GraphUI.resetArrows();
			}
		})
	}

	util.addButtonTo($data_col.find('.button-list'), {
		text: 'Show Significance on My Diagram',
		classes: 'btn-primary',
		onclick: () => {
			// reset color
			// mainCR._GraphUI.colorArrows('default');
			// crowdCR?._GraphUI.colorArrows('default');
			mainCR.selectArrow(undefined, undefined, 'button');

			mainCR._RegressionFeature.getPathAnalysisResults()
				.then(arrow_status => {
					mainCR._GraphUI.colorArrowStatus(arrow_status);
				})

			saveLog('CLICK_SHOW_DATA_SIG')
		}
	});

	util.addButtonTo($self_diagram_col.find('.button-list'), {
		text: 'Reset Color',
		// classes: 'btn-secondary',
		onclick: () => {
			// reset color
			mainCR._GraphUI.resetArrows();
			// crowdCR?._GraphUI.resetArrows();
		}
	})

	// load data
	google.charts.load('current', {packages: ['corechart', 'scatter', 'bar']});
	google.charts.setOnLoadCallback(function(){
		loadData(configs.data.path)
			.then(() => {
				mainCR.initVizFeature($('.viz-feature .chart'), raw_data)
			});
	});
}

// Second Function
function loadData(csvFile, callback) {
	return d3.csv(csvFile, configs.data.row_conversion)
		.then(function(data) {
			raw_data = data;
			preprocessVariable(raw_data, configs.data.Variables);
		});
}

async function save_variable_diagram(label = 'analysis') {
	let variable_diagram = mainCR._GraphUI.export_variable_diagram();
	let fields = {
		'command': 'save_variable_diagram',
		'context': configs.context,
		'label': label,
		'variables_json': JSON.stringify(variable_diagram.variables),
		'causal_diagram_json': JSON.stringify(variable_diagram.causal_diagram),
	};

    return $.ajax({
		type: "POST",
		url: "/ajax/",
		data: fields,
	});
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

// Some old colds about stakeholder and old VICA-style codes are removed - refer to the commit on Oct 14, 2020

// Some old codes about data visualization are removed - refer to the commit on Sep 8, 2020, or
// refer to 'visualization-mediation.js'

// Some old codes are removed - refer to 'visualization-mediation.js' for them.
// Those codes are not used/maintained anymore here.
// Some removed functions include old mediation analysis feature, graph clear/verify/extend features

/******************
	Debug
 ******************/

/******************
	Entry Point
 ******************/

//// called in the html
// entry();
