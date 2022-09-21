/*
	Global Variables
*/

// var mainCR;     // the one thing that rules everything
var wizardCR;     // wizard copy of the wizardCR, syncs on interval
var editCR;     // wizard edit copy of the wizardCR, syncs on demand
// var raw_data;   // the loaded data
// var system_options = {
// 	'crowd_intelligence': 'diagram', // 'diagram' or 'hint'
// }

// First Function
function entry() {

	let $self_diagram_col = $('.self-diagram-col');
	let $edit_diagram_col = $('.edit-diagram-col');

	// getting predefined task configurations
	configs.data = task_configs[configs.context];

	let CR_options = {
		'layout': null,
	}

	// init main CausalReasoning controller
	wizardCR = new CR('self_diagram');
	wizardCR.initSystem($('.self-CR'), CR_options);
	wizardCR.setScenario(configs.data.Variables, new CausalDiagram().causal_diagram);
	// wizardCR.initRegression($('.regression-feature'), configs.data.path);

	editCR = new CR('edit_diagram');
	editCR.initSystem($('.edit-CR'), CR_options);
	let vars = JSON.parse(JSON.stringify(configs.data.Variables)); // deep copy
	editCR.setScenario(vars, new CausalDiagram().causal_diagram);

	// wizardCR.addVariableMenu($self_diagram_col.find('.button-list'));
	wizardCR.addVariableMenuCanvas($self_diagram_col.find('.button-list'));
	// editCR.addVariableMenu($edit_diagram_col.find('.button-list'));
	editCR.addVariableMenuCanvas($edit_diagram_col.find('.button-list'));

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
			configs.saved_diagram.variable_diagram = JSON.parse(JSON.stringify(wizardCR._GraphUI.export_variable_diagram()));

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
				wizardCR.setDiagram(variable_diagram.causal_diagram, 500);

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
			wizardCR._GraphUI.resetArrows();
			// crowdCR?._GraphUI.resetArrows();
		}
	})

	util.addButtonTo($edit_diagram_col.find('.button-list'), {
		text: 'Copy User Diagram',
		// classes: 'btn-secondary',
		onclick: () => {
			// clone current wizard diagram
			let variable_diagram = wizardCR._GraphUI.export_variable_diagram();
			// variable_diagram = JSON.parse(JSON.stringify(variable_diagram)); // deep clone
			editCR.setDiagram(variable_diagram.causal_diagram, 500);
		}
	})

	util.addButtonTo($edit_diagram_col.find('.button-list'), {
		text: 'Push Diagram to User',
		// classes: 'btn-secondary',
		onclick: () => {
			// todo: push current edit diagram to user
			push_variable_diagram()
			.then(response => {
				if (response.status === 'success') {
					util.showAlert({
						text: 'Diagram pushed to user.',
						classes: 'alert-success',
						duration: 1000,
					})
				}
				else {
					util.showAlert({
						text: 'Error: push failed',
						classes: 'alert-danger',
						duration: 2000,
					})
				}
			})

		}
	})

	// load data
	google.charts.load('current', {packages: ['corechart', 'scatter', 'bar']});
	google.charts.setOnLoadCallback(function(){
		loadData(configs.data.path)
			.then(() => {
				wizardCR.initVizFeature($('.viz-feature .chart'), raw_data)
			});
	});

	// todo: load the graph from wizardCR periodically
	sync_wizard_diagram()
}

// push edit diagram to user
async function push_variable_diagram(label = 'push') {
	let variable_diagram = editCR._GraphUI.export_variable_diagram();
	let fields = {
		'command': 'push_variable_diagram',
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
async function sync_wizard_diagram() {
    var tid = setInterval(autoload_variable_diagram, 1000);

    // func for sync wizard with user
    function autoload_variable_diagram() {
      send_load_request()
        .then(response => {
          if (response.status === 'success') {
            let variable_diagram = response.data.variable_diagram;
            if (variable_diagram) {
              wizardCR.setDiagram(variable_diagram.causal_diagram, 500);
            }
          }
        })

      function send_load_request(label = 'sync') {
        let fields = {
          'command': 'get_variable_diagram',
          'context': configs.context,
          'label': label,
        };

        return $.ajax({
          type: "POST",
          url: "/ajax/",
          data: fields,
        });
      }
    }

function abortTimer() { // to be called when you want to stop the timer
  clearInterval(tid);
}
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
	let variable_diagram = wizardCR._GraphUI.export_variable_diagram();
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
