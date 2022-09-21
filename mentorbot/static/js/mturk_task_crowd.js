/*
	For MTurk Study
*/
var raw_data;
var core_layout = getDefaultLayout({
		overall_width: 900,
		graph_width: 500,
		graph_height: 450,
	});

// Global Variables
// Causal Analysis Manager
var CAM = {
	variables: SafetyVariables,
	stakeholder_scale: d3.scaleOrdinal(d3.schemePastel2),
	NarrativePanel: new NarrativePanel(),
	GraphUI: new GraphUI(),
	VizFeature: undefined,
	$core_interface: {},
	// functions
	addLink: async function (link) {
		await CAM.GraphUI.addLink(link);
		CAM.NarrativePanel.updateNarrative('set', {
			'vid_from': link.id_from,
			'vid_to': link.id_to,
			'info': link.info,
		})
	},
	updateDiagram: function(action, type, parameters, caller_id) {
		if (caller_id !== 'graph_ui') {
			// called by NarrativePanel
			CAM.GraphUI.updateDiagram(action, type, parameters);
		}
		if (caller_id !== 'narrative_panel') {
			// called by GraphUI
			if (type === 'edge') {
				CAM.NarrativePanel.updateNarrative(action, parameters);
			}
		}
		saveLog('UPDATE_DIAGRAM', {	
			action: action,
			type: type,
			parameters: parameters,
			caller_id: caller_id,
		});
	},
	showVariableDetail: function (variable) {
		let $panel = $('.variable-detail-panel', CAM.$core_interface);
		$('span.name', $panel).text(variable.name);
		$('span.type', $panel).text(variable.type);
		$('span.long-description', $panel).text(variable.long_description);
	},
	selectArrow: async function (vid_from, vid_to, caller_id = undefined) {
		if (caller_id !== 'graph_ui') {
			CAM.GraphUI.selectEdge(vid_from, vid_to);
		}
		if (caller_id !== 'narrative_panel') {
			// VICA.NarrativePanel.highlightNarrative(vid_from, vid_to);
			CAM.NarrativePanel.selectArrow(vid_from, vid_to);
		}
		if (caller_id !== 'viz_feature' && CAM.VizFeature) {
			CAM.VizFeature.drawViz([CAM.variables[vid_from], CAM.variables[vid_to]]);
		}
		if (caller_id !== 'CrowdController' && CAM.CrowdController) {
			CAM.CrowdController.selectArrow(vid_from, vid_to, 'CAM');	
		}
		// don't double save log when CrowdController.selectArrow() is called
		if (caller_id !== 'CrowdController') {
			await saveLog('SELECT_ARROW', {
				vid_from: vid_from,
				vid_to: vid_to,
				v_from: CAM.variables[vid_from].name,
				v_to: CAM.variables[vid_to].name,
				caller_id: caller_id,
				diagram: 'OWN',
			})
		}
	},
	// Currently called by GraphUI only. Not triggered when the edge is clicked, but will be triggered when
	// a variable is clicked. The variables are the final selected variables no matter the user is unselect 
	// or select a variable.
	selectVariables: function (selected_vars, caller_id = undefined) {
		if (caller_id !== 'viz_feature' && CAM.VizFeature) {
			// let visual_setting = autoVisualSet(variables);
			CAM.VizFeature.drawViz(selected_vars);
		}
	},
	unselectAllArrows: function (caller_id) {
		if (caller_id !== 'graph_ui') {
			CAM.GraphUI.selectEdge();
		}
		// NarrativePanel never calls this function (for now)
		CAM.NarrativePanel.selectArrow();
		if (caller_id !== 'CrowdController') {
			CAM.CrowdController.unselectAllArrows('CAM');
		}
	}
};

function loadData(csvFile, callback) {
	d3.csv(csvFile, configs.data.row_conversion)
		.then(function(data) {
			raw_data = data;
			preprocessVariable(raw_data, CAM.variables);
			// filtered_data = raw_data; // for future extension

			callback();
		});
}

function initPage() {
	let sl = core_layout;
	let graph_id = 'main';
	configs = Object.assign(configs, {
		'systemLayout': core_layout,
		'data': {
			"path": '/static/data/gen_safety_data_1.csv',
			"row_conversion": row_conversion_safety_report_2,
		},
	})

	// create core interface
	let $core_interface = $($('template#core_graph_interface_template').html())
		.attr('id', graph_id);
	
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

	let local_svg_graph = d3.select($('.graph-ui', $core_interface)[0])
					        .append('svg')
						    .attr('id', graph_id + '_graph_svg');
	
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

	// don't need to color the variables
	$stakeholder_panel.remove();

	// init graph
	// an causal analysis manager for handling the second graph
	// CAM = 

	// Narrative Panel initialization (this has to be done before GraphUI.set_Graph())
	CAM.$core_interface = $core_interface;
	CAM.NarrativePanel.init(graph_id, $hypothesis_panel, CAM, 'narrative_panel');
	CAM.GraphUI.init(graph_id, local_svg_graph, CAM.variables, CAM, JSON.parse(JSON.stringify(configs)), 'graph_ui');
	// directly draw the previous diagram
	CAM.GraphUI.set_graph(configs.own_diagram.causal_diagram);

	// load google chart package, starting point, entry point
	if (configs.data_feature === true) {
		CAM.VizFeature = new VizFeature();
		$("#data-feature").fadeIn();

		google.charts.load('current', {packages: ['corechart', 'scatter', 'bar']});
		google.charts.setOnLoadCallback(function(){
			loadData(configs.data.path, function() {
				let $viz_div = $('div.data-viz-container');
				CAM.VizFeature.init(raw_data, CAM, $viz_div, 'viz_feature');
			});
		});		
	}
	


	// CAM = Object.assign(CAM, {
		
	// });
	$('.vica-container').append($core_interface);

	$('#draw_button').prop("disabled", false);
	
	// setTimeout(()=>{
	// 	draw_survey_answers();
	// }, 500);
	

	// guiding_ui_init();
	// show_guiding(0);
	

	// Crowd graph
	showCrowdGraph(configs.crowd_diagram);

	// show difference
	if (configs.difference_arrow === '1') {
		CAM.GraphUI.showEdgeDifferences(CAM.CrowdController.GraphUI.get_causal_diagram())
		CAM.CrowdController.GraphUI.showEdgeDifferences(CAM.GraphUI.get_causal_diagram())
	}
	else {
		configs.difference_arrow === '0'
	}
	
	
}


async function save_variable_diagram() {
	let variable_diagram = CAM.GraphUI.export_variable_diagram();
	let fields = {
		'command': 'save_variable_diagram', 
		'context': 'safety_app',
		'label': 'before_crowd',
		'variables_json': JSON.stringify(variable_diagram.variables),
		'causal_diagram_json': JSON.stringify(variable_diagram.causal_diagram),
	};

    return $.ajax({
		type: "POST",
		url: "/ajax/",
		data: fields,
	});
}

function var_name2id(name) {
	for (var i = CAM.variables.length - 1; i >= 0; i--) {
		if (CAM.variables[i].name === name) return i;
	};
}

function showCrowdGraph(crowd_diagram) {
	let crowd_graph = generate_causal_diagram_interface(crowd_diagram.variable_diagram, {
		id: 'crowd_diagram',
		diagram_name: 'crowd_diagram',
	})

	CAM.CrowdController = crowd_graph.controller;
	
	$('div.crowd-diagram-container').append(crowd_graph.ui);
}

// let local_GraphUI;
function generate_causal_diagram_interface(variable_diagram, parameters) {
	'use strict';

	let sl = core_layout;

	let diagram_id = parameters.id;
	let $core_interface = $($('template#core_graph_interface_template').html())
		.attr('id', parameters.id);
	
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
		selectArrow: function (vid_from, vid_to, caller_id = undefined) {
			if (caller_id !== 'graph_ui') {
				local_graph.GraphUI.selectEdge(vid_from, vid_to);
			}
			if (caller_id !== 'narrative_panel') {
				// VICA.NarrativePanel.highlightNarrative(vid_from, vid_to);
				local_graph.NarrativePanel.selectArrow(vid_from, vid_to);
			}
			if (caller_id !== 'CAM') {
				CAM.selectArrow(vid_from, vid_to, 'CrowdController');	
			}
			// don't double save log when CAM.selectArrow() is called
			if (caller_id !== 'CAM') {
				saveLog('SELECT_ARROW', {
					vid_from: vid_from,
					vid_to: vid_to,
					v_from: CAM.variables[vid_from].name,
					v_to: CAM.variables[vid_to].name,
					caller_id: caller_id,
					diagram: 'CROWD',
				})	
			}
			
		},
		unselectAllArrows: function (caller_id) {
			if (caller_id !== 'graph_ui') {
				local_graph.GraphUI.selectEdge();
			}
			// NarrativePanel never calls this function (for now)
			local_graph.NarrativePanel.selectArrow();
			if (caller_id !== 'CAM') {
				CAM.unselectAllArrows('CrowdController');
			}
		}
	});

	let local_svg_graph = d3.select($('.graph-ui', $core_interface)[0])
					        .append('svg')
						    .attr('id', parameters.id + '_graph_svg');
	
	let local_GraphUI = new GraphUI();
	// let local_configs = JSON.parse(JSON.stringify(configs));
	let local_configs = JSON.parse(JSON.stringify(configs));
	local_configs = Object.assign(local_configs, {
		'graph_editable': false,
		'systemLayout': sl,
	});

	local_GraphUI.init(diagram_id, local_svg_graph, local_variables, local_graph, local_configs, 'graph_ui');
	// condition
	if (configs.edge_popularity === '0') {
		// do nothing
	}
	else {
		// 'edge_popularity' === '1'
		local_GraphUI.set_config({"edge_width": "popularity"});	
	}
	local_GraphUI.set_graph(variable_diagram.causal_diagram);
	local_graph.GraphUI = local_GraphUI;
	
	// don't show stakeholder legends
	$stakeholder_panel.remove();

	return {
		'ui': $core_interface,
		'controller': local_graph,
	}
}

function showModal({
		title = 'Title',
		body = 'Modal Body',
		buttons = {
			primary: {
				text: 'Close',
			}
		}
	}) {

	let $modal = $('div.modal#general_modal');
	$('.modal-title', $modal).html(title);
	$('.modal-body', $modal).text(body);
	$('#close_button', $modal)
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

async function start_task2() {
	$('#start_task_div').remove();
	await $('.crowd-part').fadeIn();
	$('.crowd-part')[0].scrollIntoView({'behavior': 'smooth'});

	await new Promise(r => setTimeout(r, 400));

	await $('.own-part').fadeIn();
	// $('.own-part')[0].scrollIntoView({'behavior': 'smooth'});
}

function end_task_confirm() {
	showModal({
		'title': 'Hint',
		'body': 'Are you sure you have finished revising your causal diagram and would like to end this task?',
		'buttons': {
			'primary': {
				'text': 'Yes',
				'onclick': end_task,
			},
			'secondary': {
				'text': 'No',
				'onclick': function() { $('div.modal#general_modal').modal('hide') },
			}
		}
	})
}

async function end_task() {
	await saveLog('TASK_END', {
		'causal_diagram': CAM.GraphUI.get_causal_diagram().causal_diagram,
	})
	// window.location.href = "/mturkstudy/complete";
	$('form#complete_form').submit();
}

// function guiding_ui_init() {

// 	$('#reject_reason textarea').on('input', function(){
// 		let char_count = $(this).val().length;
// 		$('#reject_reason .textarea-char-count-num').text(char_count);

// 		if (char_count >= 100) {
// 			$('#reject_next').prop('disabled', false);
// 		}
// 	});


// 	$('#response_yes').click(async function() {
// 		await CAM.GraphUI.graph_add_link([v_from, v_to]);
// 		$('#accept_next_footer').fadeIn();
// 	});

// 	$('#response_reverse').click(async function() {
// 		await CAM.GraphUI.graph_add_link([v_to, v_from]);
// 		$('#accept_next_footer').fadeIn();
// 	});

// 	$('#response_no').click(function() {
// 		$('#reject_reason').fadeIn();
// 		$('#normal_footer').hide();
// 		$('#reject_next_footer').fadeIn();
// 	})

// 	$('#reject_next, #accept_next').click(function() {
		
// 		$('#reject_reason').hide();
// 		$('#reject_reason textarea').val('');
// 		$('#reject_reason .textarea-char-count-num').text(0);
// 		$('#reject_next').prop('disabled', true);
// 		$('#reject_next_footer').hide();
// 		$('#accept_next_footer').hide();
// 		$('#normal_footer').fadeIn();

// 		current += 1;
// 		show_guiding(current);
// 	})
// }

// function show_guiding(current) {
// 	let total_num = causal_questions.length;
// 	let progress = current / total_num;

// 	if (current === total_num) {
// 		window.location.href = "/mturkstudy/complete/";
// 	}

// 	$('#q_num').text(current+1);
// 	$('.progress-bar').css('width', progress * 100 + '%')
// 		.text(progress * 100 + '%');

// 	v_from = CAM.variables[var_name2id(causal_questions[current][0])];
// 	v_to = CAM.variables[var_name2id(causal_questions[current][1])];

// 	let v_from_text = v1.name,
// 		v_to_text = v2.name;

// 	if (v_from.term_in_sentence) {
// 		v_from_text = v_from.term_in_sentence + ' (' + v_from.name + ')';
// 	}
// 	if (v_to.term_in_sentence) {
// 		v_to_text = v_to.term_in_sentence + ' (' + v_to.name + ')';	
// 	} 
// 	$('#two_variables_inspiration span.v_from').text(v_from_text);
// 	$('#two_variables_inspiration span.v_to').text(v_to_text);

// 	$('#causal_question_modal').modal('show');
// }



/****************** 
	Entry Point
 ******************/

$(function(){
	initPage();	
})


