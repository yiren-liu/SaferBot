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

	let $self_diagram_col = $('.self-diagram-col');

	// getting predefined task configurations
	configs.data = task_configs[configs.context];

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

	// mainCR.addVariableMenu($self_diagram_col.find('.button-list'));
	mainCR.addVariableMenuCanvas($self_diagram_col.find('.button-list'));

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

	// sync diagram
	autosave_user_diagram();

	// add sse connection for wizard pushed diagram update
	const diagramSSE = new EventSource("stream_diagram/");
	diagramSSE.addEventListener("message", function(response) {
	      console.log("received diagram msg from server!")

	      try {
					let data = JSON.parse(response.data);
	        let variable_diagram = data.variable_diagram;
					if (variable_diagram) {
						mainCR.setDiagram(JSON.parse(variable_diagram.causal_diagram), 500);
					}
	      } catch (err) {
	        console.error(err);
	      }
	})

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


// sync function
async function autosave_user_diagram() {
  var tid = setInterval(autosave_variable_diagram, 1000);

	// func for sync user with wizard
	function autosave_variable_diagram(label = 'sync') {
		let variable_diagram = mainCR._GraphUI.export_variable_diagram();
		let fields = {
			'command': 'autosave_variable_diagram',
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

  function abortTimer() { // to be called when you want to stop the timer
    clearInterval(tid);
  }
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

	// // if there is new stakeholder
	// if (configs.visualize_stakeholder === true) {
	// 	if (!stakeholder_scale.domain().includes(v_info.stakeholder)) {
	// 		let color = stakeholder_scale(v_info.stakeholder); // this will implicitly add the value in the domain
	// 		add_stakeholder_legend(v_info.stakeholder, $('#stakeholder_legend'));
	//
	// 		let $stakeholder_option = $('<a>').addClass('dropdown-item').text(v_info.stakeholder);
	// 		$('#add_variable_modal [aria-labelledby="variable_stakeholder"]').prepend($stakeholder_option);
	// 	}
	// }

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
