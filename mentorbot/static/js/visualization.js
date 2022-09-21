// global variables
var graph;
var variable_gs;
// settings
var graph_width = 600, 
	graph_height = 700, 
	variable_width = 120, 
	variable_height = 40,
	working_line = variable_width + 11;

var graph_default_positions = [];
var Variables, NumberVariable, DummyVariable;

// graph_mouse_mode
//
// default to 'NORMAL': click variables/lines, 
//                      drag variables
//            'DRAWLINE': draw line from node to node
var graph_mouse_mode = 'NORMAL' || 'DRAWLINE';
var graph_edgehovered_variable = -1;
var graph_hovered_variable = -1; // used for drawing a line to a new hovered variable

class DataVariable {
	constructor(name, type, key, description) {
		this.name = name;
		this.type = type;
		this.key = key;
		this.description = description;
		this.position = -1; // initial position is always in the left shelf
		
		this.default_aggregate = function(d){ return average(d, this.key)};
		// need to define after all data is loaded
		this.extent = null;
		this.thresholds = null;
		// TODO: change it to be more general
		this.original_key = this.key.split('_')[0];
	}

	get function() {
		return this.default_aggregate;
	}

}

var CampaignVariables = [
	new DataVariable("Success", 		"binary", 		"success",          ""),
	new DataVariable("Goal",			"numerical", 	"goal",             "dollar"),
	new DataVariable("Media", 	"numerical", 	"shares",           "# of shares on Facebook"),
	new DataVariable("Category", 		"categorical", 	"category_name",    ""),
	new DataVariable("Country", 		"categorical", 	"country_name",     ""),
	new DataVariable("Essay", 	"numerical", 	"length",           "# of words"),
	new DataVariable("Duration", 		"numerical", 	"duration",         "day"),
	new DataVariable("Month", 			"categorical", 	"month",            ""),
]

var Campaign3Variables = [
	new DataVariable("Success",			"binary",		"success",			""),
	new DataVariable("Goal",			"numerical",	"goal",				"dollar"),
	new DataVariable("Category",		"categorical",	"category",			"")
]

var ApplyVariables = [
	// new DataVariable("SAT",             "numerical",    "GPA",              ""),
	// new DataVariable("Age",             "numerical",    "GPA",              ""),
	// new DataVariable("Race",             "numerical",    "GPA",              ""),
	// new DataVariable("GPA",             "numerical",    "GPA",              ""),
	new DataVariable("Admission",       "binary",       "admission",        ""),
	new DataVariable("Gender",          "categorical",  "gender",           ""),
	new DataVariable("Depart.",     "categorical",  "department",       ""),
]

// set helping attributes of variables
function preprocessVariable(data, variables) {
	for (var i = variables.length - 1; i >= 0; i--) {
		if (variables[i].type === "numerical") {
			values = data.map(function(d){return d[variables[i].key]});
			variables[i].extent = d3.extent(values);
			variables[i].thresholds = d3.ticks(...variables[i].extent, 5); // 6 bins, hardcode
			// create 'labels' for histogram
			var histogram = d3.histogram()
							  .domain(variables[i].extent)
							  .thresholds(variables[i].thresholds); // hardcode currently
			var bins = histogram(values);
			variables[i].labels = bins.map(bin => bin.x0 + '-' + bin.x1);
		}
		else if (variables[i].type === "categorical") {
			var labels = new Set(data.map(function (d) { return d[variables[i].key]; } ) );
			variables[i].labels = [...labels].sort();
		}
		else if (variables[i].type === "binary") {
			variables[i].labels = [0, 1];
		}
	};
}

var task_configs = {
	"tutorial": {
		// TODO: convert the hardcode path to Django static generated path
		"path": "/static/data/apply_data_gender.csv",
		"Variables": ApplyVariables,
		"preprocess": preprocessApply,
		"question": "",
		"next_link": '/practice',
		"object_name": 'Applicants'

	},
	"application": {
		// TODO: convert the hardcode path to Django static generated path
		"path": "/static/data/apply_data.csv",
		"Variables": ApplyVariables,
		"preprocess": preprocessApply,
		"question": "Given the data, please determine whether the admission result is affected by gender or department the applicant applied.",
		"next_link": '/presurvey',
		"object_name": 'Applicants'
	},
	"campaign": {
		"path": "/static/data/campaigns_data.csv",
		"Variables": CampaignVariables,
		"preprocess": preprocessCampaign,
		"question": "Based on the data, which variable(s) is the most plausible reason that explains <b>why the “success rate” of the projects launched in “the third month” is much lower?</b> (success rate means the percentage of successful projects in all projects)",
		"next_link": '/postsurvey',
		"object_name": 'Campaigns'
	},
	"campaign(-)": {
		"path": "/static/data/-_10000_campaigns_data.csv",
		"Variables": Campaign3Variables,
		"preprocess": preprocess3Campaign,
		"question": "",
		"object_name": 'Campaigns'
	},
	"campaign(X-Y)": {
		"path": "/static/data/X-Y_10000_campaigns_data.csv",
		"Variables": Campaign3Variables,
		"preprocess": preprocess3Campaign,
		"question": "",
		"object_name": 'Campaigns'
	},
	"campaign(X-MY)": {
		"path": "/static/data/X-MY_10000_campaigns_data.csv",
		"Variables": Campaign3Variables,
		"preprocess": preprocess3Campaign,
		"question": "",
		"object_name": 'Campaigns'
	},
	"campaign(XM-Y)": {
		"path": "/static/data/XM-Y_10000_campaigns_data.csv",
		"Variables": Campaign3Variables,
		"preprocess": preprocess3Campaign,
		"question": "",
		"object_name": 'Campaigns'
	},
	"campaign(X-M-Y)": {
		"path": "/static/data/X-M-Y_10000_campaigns_data.csv",
		"Variables": Campaign3Variables,
		"preprocess": preprocess3Campaign,
		"question": "",
		"object_name": 'Campaigns'
	},
	"campaign(X-(M-Y))": {
		"path": "/static/data/X-(M-Y)_10000_campaigns_data.csv",
		"Variables": Campaign3Variables,
		"preprocess": preprocess3Campaign,
		"question": "",
		"object_name": 'Campaigns'
	}
}

/*** 
		Configure global settings 
***/
var ASSISTING = false;
// var ASSISTING = true;

// An map that indicates the "causal order" of each variable. Now is hard-coded, but in the future this might be specified by users
// used for auto-statistical check for Simpson's Paradox
var causal_order = {
	"Category": 1,
	"Goal": 2,
	"Success": 3
}

var visual_order = {
	"Category": 2,
	"Goal": 1,
	"Success": 3
}

function variable_causal_sort(v1, v2) { return causal_order[v1.name] - causal_order[v2.name]; }

function variable_sort_func(func) { 
	return function(v1, v2) {
		return func(v1) - func(v2);
	}
}


// configs global variable is first initialized in va-interface.html
var visualized_relations, tested_relations = [];



function setTask(task_name) {
	// console.log(task_name);

	configs.task = task_name;
	configs.data = task_configs[task_name];

	// update UI
	$("#dataset_name").html(task_name);
	clean_tested_relations();

	// update campaign data path from config
	if (configs.task === 'campaign') {
		// configs.data.path = '/media/' + configs.campaigns_data_path;	
	}
	else {
		configs.variable_order = [0,1,2,3,4,5,6,7,8];
	}

	// enable/disable fixed variable positions
	configs.position_fixed = false;
	configs.variable_shape = 'circle' || 'rect';


	if (configs.variable_shape === 'circle') {
		variable_width = 80;
		variable_height = 80;
		variable_radius = variable_width / 2;
		working_line = variable_width + 11;
	}

	// update next step button href
	$('a#next').attr('href', configs.data.next_link);
	NumberVariable = {	"name": "Number of " + configs.data.object_name, "type": "numerical",    "function": function(d) { return count(d); }, "dummy": true};
	DummyVariable = {	"name": "",    "type": "categorical",  "key": "_dummy_", "labels": ["All"], "dummy": true};

	initializePageWithData();
}

// special helping variables

// var DummyVariable = new DataVariable("",   "categorical",   "_dummy_");

// set global variables
var CONDITION = configs.condition; // 'control' or others
// var Variables = configs.data.Variables;
var raw_data;

function loadData(csvFile, callback) {
	d3.csv(csvFile, function(error, data) {
		if(error) { console.log(error); return; }
		
		raw_data = preprocess(data, configs.data.preprocess);
		Variables = configs.data.Variables;
		preprocessVariable(raw_data, Variables);
		filtered_data = raw_data; // for future extension

		callback();
	});
}

function initializePageWithData() {
	// init page
	$("#task_question").html(configs.data.question);

	loadData(configs.data.path, function() {

		// CONDITION = 'graph'; // debug
		// CONDITION = 'control'; // debug
		if (CONDITION == 'control') {
			initGraph_Control();
			// move chart block next to variable view
			d3.select("#chart_container").style("left", working_line+3 + "px");
		}
		else {
			initGraph();	
		}
		initChart();
	});

	// hide assisting features
	if (ASSISTING === false) {
		$('#suggestion_container').hide();
		// $('button[data-target="#detailPanel"]').hide();
	};
}

// getting the basic configurations
setTask(configs.task);
// load google chart package, starting point, entry point
google.charts.load('current', {packages: ['corechart', 'scatter', 'bar']});
google.charts.setOnLoadCallback(function(){
	initializePageWithData();
});

// currently is the same with raw_data (the whole dataset)
var filtered_data;

var drag = d3.drag()
			.on("start", dragstart)
			.on("drag", dragging)
			.on("end", dragend);

// drag start callback for variable g
function dragstart(d, i) {

}

// dragging callback for variable g
function dragging(d, i) {
	// move variable g
	d.x += d3.event.dx
	d.y += d3.event.dy
	d3.select(this).attr("transform", function(d){ return "translate(" + d.x + "," + d.y + ")"})
	// console.log("drag");

	// update lines if active (active means the variable is in graph component)
	if (d.active) {
		updateLineOfVariable(d);
	}
}

// the lines are drawn from center to center
function updateLineOfVariable_center(d) {
	graph.selectAll("line[lid='" + d.id + "']").each(function(){
		d3.select(this)
			.attr("x1", d.x + .5 * variable_width)
			.attr("y1", d.y + .5 * variable_height)
	})
	graph.selectAll("line[rid='" + d.id + "']").each(function(){
		d3.select(this)
			.attr("x2", d.x + .5 * variable_width)
			.attr("y2", d.y + .5 * variable_height)
	})
}

// the lines are drawn from edge to edge
function updateLineOfVariable(d) {
	graph.selectAll("line[lid='" + d.id + "' ], line[rid='" + d.id + "' ]").each(function(){
		var this_line = d3.select(this);
		var id1 = this_line.attr("lid");
		var id2 = this_line.attr("rid");

		var r = variable_width/2, d1 = Variables[id1], d2 = Variables[id2];
		points = util.circleCentersToEdges({x: d1.x + r, y: d1.y + r}, {x: d2.x + r, y: d2.y + r},r);

		this_line
			.attr("x1", points.p1.x)
			.attr("y1", points.p1.y)
			.attr("x2", points.p2.x)
			.attr("y2", points.p2.y);
	})
}

// drag end callback for variable g
function dragend(d, i) {
	// d: data, i: index of the variable
	d.prev_position = d.position;
	
	if (d.x > working_line) {
		if (configs.position_fixed) {
			// move to the nearest default position
			var pos = findNearestPosition(graph_default_positions, d);
			pos.occupied = d;
			d.position = pos.id;
			d.x = pos.x;
			d.y = pos.y;
		}
		
		d3.select(this).transition()
		  .attr("transform", function(d){ return "translate(" + d.x + "," + d.y + ")"})
		  .on("end", function(){
			// the variable was not active before dragging
			if (!d.active) {
				// disable auto connecting
				// // draw lines to other working variables
				// Variables.forEach(function(d2, i2) {
				// 	if (d2.x > working_line && i2 != i) {
				// 		drawline(d, d2);
				// 	}
				// })
				d.active = true;
			}
		  })
		// transit lines
		if (d.active) {
				updateLineOfVariable(d);
		}
	}
	else {
		// unselect the variable if it is selected
		if (d.selected) {
			// toggle rect (UI)	
			// d3.select(this).select("rect").classed('selected', false);
			d3.select(this).select("circle").classed('selected', false);
			d.selected = false;

			// update visual
			// selected_vars = d3.selectAll("rect.selected").data();
			selected_vars = d3.selectAll("circle.selected").data();
			if (selected_vars.length == 0) return;

			visual_setting = autoVisualSet(selected_vars);
			updateChartVisualSetting("chart1", visual_setting);

		}
		

		// remove the associated lines
		graph.selectAll("line[lid='" + d.id + "']").remove();
		graph.selectAll("line[rid='" + d.id + "']").remove();

		
		// move back to original position
		d3.select(this).transition().attr("transform", function(d){ d.x = 5; d.y = d['default_y']; return "translate(" + d.x + "," + d.y + ")"})
		d.active = false;
		d.position = -1;
	}

	// save action to log
	if ( d.prev_position !== d.position ) {
		var msg = {"variable": d.name, "prev_pos": d.prev_position, "now_pos": d.position};
		saveLog("DRAG", msg);
	}
}



function variable_click(d) {
	d3.event.stopPropagation();

	// var count = d3.selectAll("rect.rect-variable.selected").size();
	var count = d3.selectAll("circle.circle-variable.selected").size();

	// do nothing if the variable is not active (in treatment group)
	if (CONDITION !== 'control' && !d.active) { return }

	// do nothing if there are already three selected variables when adding another one
	if (count >= 3 && d['selected'] == false) { return }

	// toggle rect (UI)	
	var variable_g = d3.select(this);
	d['selected'] = !d['selected'];
	// variable_g.select("rect").classed("selected", d['selected']);
	variable_g.select("circle").classed("selected", d['selected']);

	// toggle line (UI)
	d3.selectAll("line.line-relation").classed("selected", function(){
		var this_line = d3.select(this);
		var id1 = this_line.attr("lid");
		var id2 = this_line.attr("rid");
		return ( Variables[id1].selected && Variables[id2].selected );
	})

	// log
	if( d.selected ) {
		saveLog("SELECT_VAR", d.name);
	}
	else {
		saveLog("UNSELECT_VAR", d.name);
	}

	// update visualization if at least one variable is selected
	// selected_vars = d3.selectAll("rect.selected").data();
	selected_vars = d3.selectAll("circle.selected").data();
	if (selected_vars.length == 0) return;

	visual_setting = autoVisualSet(selected_vars);
	updateChartVisualSetting("chart1", visual_setting);

	if (ASSISTING) {
		clean_tested_relations();
		run_regressions_based_on_variables(selected_vars);		
	}
}

function run_regressions_based_on_variables(selected_vars) {
	// perform auto consistent/inconsistent detection analysis
	// only when there are >= 2 variables selected
	if (selected_vars.length == 2) {
		var [y,x] = selected_vars.sort(variable_causal_sort).reverse(); // from highest (DV) to lowest (IV)

		// multiple regression
		var regression_queue = d3.queue();
		regression_queue.defer(backendRegression, y.original_key, [x.original_key]);

		for (var vid in Variables) {
			var v = Variables[vid];
			console.log(v.name, x.name, y.name, causal_order[v.name], causal_order[y.name]);
			if ((v.name != y.name) && (v.name != x.name) && (causal_order[v.name] < causal_order[y.name])) {
				regression_queue.defer(backendRegression, y.original_key, [x.original_key,v.original_key]);
			}
		}

		// the following code is pretty messy. Need to restructure.
		regression_queue.awaitAll(function(error, results) {
			console.log(results);
			$("div#detail").html(results.map(result => resultToText(result)).join('<br>'));

			tested_relations = [];
			results.forEach(function(result) {
				if (result[1].length === 1) {
					visualized_relations = {
						y: y,
						result: result[2]
					}
				}
				else {
					tested_relations.push(result[2]);
				}
			})
			show_tested_relations();
		})
	} 
	else if (selected_vars.length == 3) {
		var [y,x1, x2] = selected_vars.sort(variable_causal_sort).reverse(); // from highest (DV) to lowest (IV)

		// multiple regression
		var regression_queue = d3.queue();
		regression_queue.defer(backendRegression, y.original_key, [x1.original_key, x2.original_key]);
		regression_queue.defer(backendRegression, y.original_key, [x1.original_key]);
		regression_queue.defer(backendRegression, y.original_key, [x2.original_key]);

		regression_queue.awaitAll(function(error, results) {
			console.log(results);
			$("div#detail").html(results.map(result => resultToText(result)).join('<br>'));

			tested_relations = [];
			results.forEach(function(result) {
				if (result[1].length === 2) {
					visualized_relations = {
						y: y,
						result: result[2]
					}
				}
				else {
					tested_relations.push(result[2]);
				}
			})
			show_tested_relations();
		})
	}
	else {
		clean_tested_relations();
	}
}

function clean_tested_relations() {
	$("#chart_container .detail").html("");
	$("#suggestion_container").html("");
	$(".trend-center, .trend-left, .trend-right, .trend-center-bottom").rotate(0).css({'opacity': 0, 'color': 'black'});
}

function show_tested_relations() {
	clean_tested_relations();
	var y = visualized_relations.y;
	for (var x_name in visualized_relations.result) {
		if (x_name !== "const") {
			var x = Variables[nameToId(x_name)];
			var sig = visualized_relations.result[x_name].sig
			if (sig) { 
				$("#chart_container .detail").html( $("#chart_container .detail").html() + `The relation between <span class="variable">${visualized_relations.y.name}</span> and 
					<span class="variable">${x.name}</span> is <span class="sig">significant</span> in this chart.<br>`)
			}
			else {
				$("#chart_container .detail").html( $("#chart_container .detail").html() + `The relation between <span class="variable">${visualized_relations.y.name}</span> and 
					<span class="variable">${x.name}</span> is <span class="insig">not significant</span> in this chart<br>`)
			}
			// show trend arrows, HARDCODED, in the future we need to return coefficents from the regression results
			main_chart = $('#chart1');
			if (x_name === 'goal') {
				if (selected_vars.length == 2) {
					// show the arrow in the center
					if (sig) {
						// we know it's descending trend for goal
						$('.trend-center', main_chart).rotate(30).css({'opacity': 1, 'color': 'green'});
					}
					else {
						$('.trend-center', main_chart).css('opacity', 1);	
					}
				}
				else if (selected_vars.length == 3) {
					// we know the goal is the second nested variable
					if (sig) {
						// we know it's descending trend for goal
						$('.trend-left, .trend-right', main_chart).rotate(30).css({'opacity': 1, 'color': 'green'});
					}
					else {
						$('.trend-left, .trend-right', main_chart).css('opacity', 1);	
					}
				}
			}
			else if (x_name === 'category') {
				if (selected_vars.length == 2) {
					// show the arrow in the center
					if (sig) {
						// we know it's descending trend for category
						$('.trend-center', main_chart).rotate(30).css({'opacity': 1, 'color': 'green'});
					}
					else {
						$('.trend-center', main_chart).css('opacity', 1);	
					}
				}
				else if (selected_vars.length == 3) {
					// we know the category is the first nested variable
					if (sig) {
						// we know it's descending trend for goal
						$('.trend-center-bottom', main_chart).rotate(30).css('opacity', 1);
					}
					else {
						$('#chart_container .trend-center-bottom').css('opacity', 1);	
					}
				}
			}
		}
	}
	$("#suggestion_container").html("");
	tested_relations.forEach(function(result, i) {
		var model_variables_keys = [y.original_key, ...Object.keys(result).filter(name => name !== "const")];
		// plot the visualizations for these variables
		var model_variables_array = model_variables_keys.map(key => Variables[nameToId(key)]);

		// generate the chart and append to the suggestion container
		var block = $($("template#suggestion_block_template").html());
		var block_id = "suggest-" + i;
		$(".detail span.description", block).html(visual_description);
		$(".chart", block).attr("id", block_id);
		$("button", block).click(function(){
			updateChartWithVariables(model_variables_array);
		})
		$("#suggestion_container").append(block);
		var visual_setting = autoVisualSet(model_variables_array);
		updateChartVisualSetting(block_id, visual_setting);


		// collect all the data variables (except const) from the 'result' dict
		// var model_variables_keys = [y.original_key, ...Object.keys(result).filter(name => name !== "const")];
		var visual_description = "", visual_inconsistent = false;
		for(var x_name in result) {
			if (x_name !== "const") {
				var sig = result[x_name].sig;
				if (x_name in visualized_relations.result) {
					if (result[x_name].sig != visualized_relations.result[x_name].sig) {
						// $("#chart_container .detail").html( $("#chart_container .detail").html() + `The relation to ${x_name} is <span class="insig">inconsitent</span> if you plot ${model_variables_keys}!<br>`);
						visual_inconsistent = true;
						visual_description = `The pattern of <span class="variable">${x_name}</span> is <span class="insig">different</span> here`;
					}
					else {
						// $("#chart_container .detail").html( $("#chart_container .detail").html() + `The relation to ${x_name} is consistent.<br>`);
						if (visual_inconsistent === true) {
							// if there is something inconsistent, do not override the description
						}
						else {
							visual_description = `The trend of <span class="variable">${x_name}</span> is similar<span class="sig"></span> here`;
						}
					}
				}
				$(".detail span.description", block).html(visual_description);
				// show trend arrows, HARDCODED, in the future we need to return coefficents from the regression results
				main_chart = block;
				if (x_name === 'goal') {
					if (model_variables_keys.length == 2) {
						// show the arrow in the center
						if (sig) {
							// we know it's descending trend for goal
							$('.trend-center', main_chart).rotate(30).css({'opacity': 1, 'color': 'green'});
						}
						else {
							$('.trend-center', main_chart).css('opacity', 1);	
						}
					}
					else if (model_variables_keys.length == 3) {
						// we know the goal is the second nested variable
						if (sig) {
							// we know it's descending trend for goal
							$('.trend-left, .trend-right', main_chart).rotate(30).css({'opacity': 1, 'color': 'green'});
						}
						else {
							$('.trend-left, .trend-right', main_chart).css('opacity', 1);	
						}
					}
				}
				else if (x_name === 'category') {
					if (model_variables_keys.length == 2) {
						// show the arrow in the center
						if (sig) {
							// we know it's descending trend for category
							$('.trend-center', main_chart).rotate(30).css({'opacity': 1, 'color': 'green'});
						}
						else {
							$('.trend-center', main_chart).css('opacity', 1);	
						}
					}
					else if (model_variables_keys.length == 3) {
						// we know the category is the first nested variable
						if (sig) {
							// we know it's descending trend for goal
							$('.trend-center-bottom', main_chart).rotate(30).css('opacity', 1);
						}
						else {
							$('#chart_container .trend-center-bottom').css('opacity', 1);	
						}
					}
				}

			}
		}
		

	})


}

// reset the UI and draw the visualized variables on the main chart container
function updateChartWithVariables(visualized_variables) {
	// update UI
	// ** only works under 'control' condition (not handling graph links yet)

	var variable_names = visualized_variables.map(v => v.name);
	// toggle rect (UI)	
	d3.selectAll("g.g-variable")
		.each(function(d,i) {
			console.log(d);
			console.log(variable_names);
			var selected = variable_names.includes(d.name);
			d["selected"] = selected;
			d3.select(this).select("circle").classed("selected", selected);
		})

	// update chart
	var visual_setting = autoVisualSet(visualized_variables);
	updateChartVisualSetting("chart1", visual_setting);	

	// update suggestions
	run_regressions_based_on_variables(visualized_variables);	
}

// click callback for relation line
function relationClick() {
	d3.event.stopPropagation();
	this_line = d3.select(this);

	var id1 = this_line.attr("lid");
	var id2 = this_line.attr("rid");

	// log
	msg = {"var1": Variables[id1].name, "var2": Variables[id2].name}
	saveLog("SELECT_LINE", msg);

	// update line color
	d3.selectAll("line.line-relation").classed("selected", false);
	this_line.classed("selected", true);

	// update UI (highlight the two variables and update d['selected'] )
	// d3.selectAll("rect.rect-variable").classed("selected", function(d){
	d3.selectAll("circle.circle-variable").classed("selected", function(d){
		return (d.id == id1 || d.id == id2)? d.selected = true : d.selected = false;
	})

	// update chart
	// selected_vars = d3.selectAll("rect.selected").data();
	selected_vars = d3.selectAll("circle.selected").data();
	visual_setting = autoVisualSet(selected_vars);
	updateChartVisualSetting("chart1", visual_setting);	
}

function variable_mouseenter() {
	d3.select(this).attr('hovered', true);
}

function variable_mouseleave() {
	d3.select(this).attr('hovered', false);
}

function graph_click() {
	// console.log("graph clicked");
	// click the line that is 'hovered'
	d3.select("line.line-relation.highlight").each(relationClick);
}

function graph_mousemove_callback() {
	var mouse_p = {};
	[mouse_p.x, mouse_p.y] = d3.mouse(this);

	if (mouse_p.x < working_line) {
		return
	}

	if (graph_mouse_mode === 'NORMAL') {

		// check if the mouse is hovering on the edge of a variable, find the variable id
		var edge_threshold = 10, min_distance = 9999, min_id = -1;
		// do not allow drawing lines when any variable is hovered
		if ( true) {
			d3.selectAll('circle.circle-variable').each(function(d, i) {
				var r = variable_width/2;
				// console.log(d3.select(this).data()[0]);
				var v = d3.select(this).data()[0]; // the x, y saved in variable is the top left corner
				var dist = util.distanceP2P(mouse_p, {x: v.x+r, y: v.y+r}) - r;
				// console.log(dist);

				// the mouse should be out of the circle within a distance
				if (v.active && dist > 0 && dist <= edge_threshold && dist < min_distance) {
					// if a variable is "hovered" (the mouse is right on the edge and can trigger dragging function), return
					min_distance = dist;
					min_id = i;
				}
			})
		}
		// if (min_id !== -1) console.log(Variables[min_id].name)

		// found edge-hovered variable
		prev_edgehovered_variable = graph_edgehovered_variable
		graph_edgehovered_variable = min_id;
		if (min_id !== -1) {

			// console.log(Variables[min_id].name);
			// de-highlight everything
			d3.selectAll("line.line-relation.highlight").each(function() { d3.select(this).classed("highlight", false).attr("hovered", "false"); });
			// d3.selectAll("rect.highlight").each(function() { d3.select(this).classed("highlight", false); });
			d3.selectAll("circle.highlight").each(function() { d3.select(this).classed("highlight", false); });

			// highlight the variable edge
			// DO NOT directly make the variable stroke-width wider: 
			// 		this messes up with variable dragging feature (the 'wider' stroke makes the mouse 're-enter' the circle and enable hovering dragging behavior when the mouse is still near the edge)
			// INSTEAD, draw a separate stroke on top of the chart and remove it when the drawing is done
			if (prev_edgehovered_variable === -1) {
				highlightEdgeHoveredVariable(min_id);
			}
				
			graph.style('cursor', 'ne-resize');


			// return 
			return
		}
		else {
			
			if (prev_edgehovered_variable !== -1) {
				dehighlightEdgeHoveredVariable(prev_edgehovered_variable);	
			}
		}

		// if the mouse is hovering on a variable, de-highlight lines and return
		if (!d3.select("g.g-variable[hovered=true]").empty()) {
			d3.selectAll("line.line-relation.highlight").each(function() { d3.select(this).classed("highlight", false).attr("hovered", "false"); });
			// d3.selectAll("rect.highlight").each(function() { d3.select(this).classed("highlight", false); });
			d3.selectAll("circle.highlight").each(function() { d3.select(this).classed("highlight", false); });
			graph.style('cursor', 'default');
			return
		}

		// calculate the distances of all relation lines 
		var threshold = 20, closest_dist = 9999, closest_line_i = -1;
		d3.selectAll("line.line-relation").each(function(d, i) {
			var dist = util.distanceP2Line(mouse_p, d3.select(this));
			if (dist < threshold && dist < closest_dist) {
				closest_dist = dist;
				closest_line_i = i;
			}
		})
		d3.selectAll("line.line-relation").each(function(d, i) {
			var this_line = d3.select(this);
			if ( i == closest_line_i ) {
				if (this_line.attr("hovered") == "false") {
					// update line color
					this_line.classed("highlight", true).attr('hovered', "true");
					// update rect color
					var id1 = this_line.attr("lid");
					var id2 = this_line.attr("rid");
					// d3.selectAll("rect.rect-variable").classed("highlight", function(d){
					d3.selectAll("circle.circle-variable").classed("highlight", function(d){
						return (d.id == id1 || d.id == id2)? true : false;
					});	
				}
			}
			else {
				if ( this_line.attr("hovered") == "true") {
					d3.select(this).classed("highlight", false).attr('hovered', "false");
					// update rect color
					var id1 = this_line.attr("lid");
					var id2 = this_line.attr("rid");
					// d3.selectAll("rect.rect-variable").classed("highlight", false);	
					d3.selectAll("circle.circle-variable").classed("highlight", false);	
				}
			}
		})
		graph.style('cursor',  (closest_line_i == -1)? 'default' : 'pointer');
	}
	else if (graph_mouse_mode === 'DRAWLINE') {
		// update the line
		d3.select("line#drawingline")
			.attr("x2", mouse_p.x)
			.attr("y2", mouse_p.y);

		// check whether mouse is hovering over (near) some variable
		var hover_threshold = 5, min_distance = 9999, min_id = -1;
		d3.selectAll('circle.circle-variable').each(function(d, i) {
			// important: skip the original node, otherwise it will be detected as 'hovered' and be de-highlighted after moving out
			if (d.id === graph_edgehovered_variable) { return }
			var r = variable_width/2;
			var v = d3.select(this).data()[0]; // the x, y saved in variable is the top left corner
			var dist = util.distanceP2P(mouse_p, {x: v.x+r, y: v.y+r});

			// the mouse can also be out of the circle within a distance
			if (dist < r + hover_threshold && dist < min_distance) {
				min_distance = dist;
				min_id = i;
			}
		})
		prev_hovered_variable = graph_hovered_variable;
		graph_hovered_variable = min_id;
		if (min_id !== -1 && prev_hovered_variable === -1) {
			highlightEdgeHoveredVariable(min_id);
		}
		else if (min_id === -1 && prev_hovered_variable !== -1) {
			dehighlightEdgeHoveredVariable(prev_hovered_variable);	
		}

	}

	

}

// append a hollow circle on the variable to highlight it
// the reason not to adjust stroke-width of original circle is to avoid mouse-entering issue
function highlightEdgeHoveredVariable(v_id) {
	graph.insert('circle', 'line#drawingline')
		.attr('id', 'v'+v_id)
		.attr('cx', Variables[v_id].x + variable_radius)
		.attr('cy', Variables[v_id].y + variable_radius)
		.attr('r', variable_radius)
		.classed('edge-hovered', true);
}

function dehighlightEdgeHoveredVariable(v_id) {
	graph.selectAll('circle.edge-hovered#v'+v_id).remove();
}

function graph_mousedown_callback() {
	// console.log('graph_mousedown_callback');

	// start drawing line while mouse is hovering on edge of a avariable
	if (graph_edgehovered_variable !== -1) {
		let mouse_p = {};
		[mouse_p.x, mouse_p.y] = d3.mouse(this);
		let points = {p1: mouse_p, p2: mouse_p};
		let variable_id = graph_edgehovered_variable;
		
		// enter 'DRAWLINE' mode, leave after mouseup
		graph_mouse_mode = 'DRAWLINE';
		graph.append("line") // don't insert before variables, otherwise the arrow will be blocked by variables when dragging
			.attr("id", 'drawingline')
			.attr("x1", points.p1.x)
			.attr("y1", points.p1.y)
			.attr("x2", points.p2.x)
			.attr("y2", points.p2.y)
			.attr("lid", variable_id)
			.attr("rid", variable_id)
			.attr("marker-end", "url(#arrowend)")
			.classed("line-relation", true)

	}

}

function graph_mouseup_callback() {
	// console.log('graph_mouseup_callback');

	// finishing drawing line
	if (graph_mouse_mode === 'DRAWLINE') {
		graph_mouse_mode = 'NORMAL';

		// if the mouse is hover over another variable, set the actual line
		if (graph_hovered_variable !== -1) {
			var r = variable_width/2;
			let d1 = Variables[graph_edgehovered_variable], d2 = Variables[graph_hovered_variable];
			points = util.circleCentersToEdges({x: d1.x + r, y: d1.y + r}, {x: d2.x + r, y: d2.y + r},r);

			var duplicated = !graph.select('line#V' + d1.id + 'toV' + d2.id).empty();

			graph.select("line#drawingline")
				.attr('id', 'V' + d1.id + 'toV' + d2.id)
				.attr("lid", d1.id)
				.attr("rid", d2.id)
				.attr("hovered", false) // flag for whether the mouse is hovering nearby
				.classed("line-relation", true)
				.on("click", relationClick)
				.transition()
				.attr("x1", points.p1.x)
				.attr("y1", points.p1.y)
				.attr("x2", points.p2.x)
				.attr("y2", points.p2.y)
				.on('end', function(){
					// remove if there is a duplicate arrow
					if (duplicated) d3.select(this).remove();
				})
				
			dehighlightEdgeHoveredVariable(graph_hovered_variable);
			dehighlightEdgeHoveredVariable(graph_edgehovered_variable);
		}
		else {
			graph.select('line#drawingline').remove();
		}
	}
}

// a general class of setting for drawing a chart
class VisualSetting {
	constructor(){
		this.chart_type = ''
		this.x_vars = []
		this.y_vars = []
		this.additional_vars = []
	}

	getVAxisTitle() {
		if (this.chart_type == 'scatterplot') {
			var d = this.y_vars[0]['description'];
			if (d == undefined || d == '') d = '';
			else d = ' (' + d + ')';
			return this.y_vars[0]['name'] + d;
		}
		else {
			if (this.y_vars[0]['name'] == 'Success') {
				return 'Success Rate';
			}
			else if (this.y_vars[0].dummy === true) {
				return this.y_vars[0].name;
			}
			else{
				return this.y_vars[0]['name'] + ' (avg.)';
			}
		}
	}

	getHAxisTitle() {
		var d = this.x_vars[0]['description'];
		if (d == undefined || d == '') d = '';
		else d = ' (' + d + ')';
		return this.x_vars[0]['name'] + d;
	}

	getLegendTitle() {
		if (this.x_vars.length + this.y_vars.length + this.additional_vars.length < 3) return '';

		if (this.additional_vars.length) {
			if (this.additional_vars[0]['visual_type'] == 'categorical')
				return this.additional_vars[0]['name'];
			else
				return "size: " + this.additional_vars[0]['name'];
		}

		if (this.x_vars.length >= 2) {
			var d = this.x_vars[this.x_vars.length-1]['description'];
			if (d == undefined || d == '') d = '';
			else d = ' (' + d + ')';
			return this.x_vars[this.x_vars.length-1]['name'] + d;
		}

		return 'unexpected';
	}

	getVariableNames() {
		var all_variables = [...this.x_vars, ...this.y_vars, ...this.additional_vars].filter(v => !v.dummy);
		return all_variables.map(v => v.name);
	}

	showLegend() {
		if (this.additional_vars.length && this.additional_vars[0]['visual_type'] === 'numerical') return false;
		var var_num = this.x_vars.length + this.y_vars.length + this.additional_vars.length;
		return var_num >= 3;
	}
}

// input:  array of variable
// output: VisualSetting
function autoVisualSet(variables) {
	// adjust the variable order to make the plot consistent (hardcoded)
	variables.sort(variable_sort_func(v => visual_order[v.name])); // needs improvements

	// decide visual_type based on variable type first
	changeType(variables);

	// separate variables by type
	var categorical_vars = [], numerical_vars = [];
	for (var i = variables.length - 1; i >= 0; i--) {
		// assume there are only two types
		if (variables[i]['visual_type'] == 'categorical') {
			categorical_vars.push(variables[i])
		}
		else if (variables[i]['visual_type'] == 'numerical') {
			numerical_vars.push(variables[i])
		}
		else {
			console.log("should not be here!");
		}
	};

	// make visual setting based on visual_type
	var visual_setting = new VisualSetting();
	if (variables.length == 1) {
		if (numerical_vars.length) {
			visual_setting.chart_type = 'bar';
			visual_setting.x_vars.push(DummyVariable);
			visual_setting.y_vars.push(numerical_vars[0]);
		}
		else if (categorical_vars.length) {
			visual_setting.chart_type = 'bar';
			visual_setting.x_vars.push(categorical_vars[0]);
			visual_setting.y_vars.push(NumberVariable);
		}
	}
	else if (variables.length == 2) {
		visual_setting.chart_type = 'bar';
		if (categorical_vars.length == 0) {
			visual_setting.chart_type = 'scatterplot';
			visual_setting.x_vars.push(numerical_vars[0]);
			visual_setting.y_vars.push(numerical_vars[1]);
		}
		if (categorical_vars.length == 1) {
			visual_setting.x_vars.push(categorical_vars[0]);
			visual_setting.y_vars.push(numerical_vars[0]);	
		}
		else if (categorical_vars.length == 2) {
			visual_setting.x_vars = categorical_vars;
			visual_setting.y_vars.push(NumberVariable);
		} 
		else {
			// TODO (TOTHINK)
		}
	}
	else if (variables.length >= 2) {
		if (numerical_vars.length >= 2) {
			// scatterplot
			visual_setting.chart_type = 'scatterplot';
			visual_setting.x_vars.push(numerical_vars[0]);
			visual_setting.y_vars.push(numerical_vars[1]);

			if (numerical_vars.length >= 3) {
				// numerical_vars[2]['visual_role'] = 'size';
				visual_setting.additional_vars.push(numerical_vars[2]);
			}
			else {
				// categorical_vars[0]['visual_role'] = 'color';
				visual_setting.additional_vars.push(categorical_vars[0]);
			}
			// console.log(visual_setting);
		}
		else {
			if (numerical_vars.length >= 1) {
				// bar chart
				visual_setting.chart_type = 'bar';
				visual_setting.x_vars = categorical_vars.slice(0,2);
				visual_setting.y_vars.push(numerical_vars[0]);
			}
			else {
				// bar chart
				visual_setting.chart_type = 'bar';
				visual_setting.x_vars = categorical_vars;
				visual_setting.y_vars.push(NumberVariable);
			}
		}
	}
	return visual_setting;
}

// draw a line from dvariable 1 to variable 2 (center to center)
function drawline_center(d1, d2) {
	graph.insert("line", "g.g-variable")
		.attr("x1", d1.x + .5 * variable_width)
		.attr("y1", d1.y + .5 * variable_height)
		.attr("x2", d2.x + .5 * variable_width)
		.attr("y2", d2.y + .5 * variable_height)
		.attr("lid", d1.id)
		.attr("rid", d2.id)
		.attr("hovered", false) // flag for whether the mouse is hovering nearby
		.classed("line-relation", true)
		.on("click", relationClick)
}

// draw a line from dvariable 1 to variable 2 (edge to edge
function drawline(d1, d2) {
	var r = variable_width/2;
	points = util.circleCentersToEdges({x: d1.x + r, y: d1.y + r}, {x: d2.x + r, y: d2.y + r},r);

	graph.insert("line", "g.g-variable")
		.attr('id', 'V' + d1.id + 'toV' + d2.id)
		.attr("x1", points.p1.x)
		.attr("y1", points.p1.y)
		.attr("x2", points.p2.x)
		.attr("y2", points.p2.y)
		.attr("lid", d1.id)
		.attr("rid", d2.id)
		.attr("marker-end", "url(#arrowend)")
		.attr("hovered", false) // flag for whether the mouse is hovering nearby
		.classed("line-relation", true)
		.on("click", relationClick)
}




function initGraph_Control() {
	// set up graph width, height (attribute list and graph component)
	graph = d3.select("#graph_container")
				.html("") // reset the graph
				.style("width", working_line + "px")
				.style("height", graph_height + "px")
			  .append("svg")
				.attr("id", "graph_svg")
				.attr("width", working_line)
				.attr("height", graph_height);

	// update x, y position for each Variables
	Variables.forEach(function(e,i){
		e['id'] = i;
		e['x'] = 5;
		e['y'] = e['default_y'] = 5 + (variable_height+5)*configs.variable_order[i];
		e['selected'] = false; // selected to visualize
		e['active'] = false;   // in graph area
	})

	variable_gs = graph.selectAll("g.g-variable").data(Variables).enter()
						.append("g")
						  .attr("transform", function(d){ return "translate(" + d.x + "," + d.y + ")"})
						  .classed("g-variable", true)
						  .on("click", variable_click);

	if (configs.variable_shape === 'rect') {
		variable_gs.append("rect")
					.classed("rect-variable", true)
					.attr("width", variable_width)
					.attr("height", variable_height)
	}
	else if (configs.variable_shape === 'circle') {
		variable_gs.append("circle")
		           .classed("circle-variable", true)
		           .attr("cx", variable_height/2)
		           .attr("cy", variable_height/2)
		           .attr("r", variable_height/2);
	}

	variable_gs.append("text")
				  .attr("x", .5 * variable_width)
				  .attr("y", .5 * variable_height)
				  .attr("alignment-baseline", "middle")
				  .attr("text-anchor", "middle")
				  // .style("font-weight", "bold")
				  .text(function(d) {return d.name})
}

function initGraph() {
	
	// set up graph width, height (attribute list and graph component)
	graph = d3.select("#graph_container")
				.html("") // reset the graph
				.style("width", graph_width + "px")
				.style("height", graph_height + "px")
			  .append("svg")
				.attr("id", "graph_svg")
				.attr("width", graph_width)
				.attr("height", graph_height)
				.on('click', graph_click)
				.on("mousemove", graph_mousemove_callback)
				.on('mousedown', graph_mousedown_callback)
				.on('mouseup', graph_mouseup_callback)

	// draw dividing line
	graph.append("line")
			.attr("x1", working_line)
			.attr("y1", 0)
			.attr("x2", working_line)
			.attr("y2", graph_height)
			.style("stroke-width", 2)
			.style("stroke", "black")

	// update x, y position for each Variables
	Variables.forEach(function(e,i){
		e['id'] = i;
		e['x'] = 5;
		e['y'] = e['default_y'] = 5 + (variable_height+5)*configs.variable_order[i];
		e['selected'] = false; // selected to visualize
		e['active'] = false;   // in graph area
	})

	variable_gs = graph.selectAll("g.g-variable").data(Variables).enter()
						.append("g")
						  .attr("transform", function(d){ return "translate(" + d.x + "," + d.y + ")"})
						  .classed("g-variable", true)
						  .call(drag)
						  .on("click", variable_click)
						  .on("mouseenter", variable_mouseenter)
						  .on("mouseleave", variable_mouseleave);

	if (configs.variable_shape === 'rect') {
		variable_gs.append("rect")
					.classed("rect-variable", true)
					.attr("width", variable_width)
					.attr("height", variable_height)
	}
	else if (configs.variable_shape === 'circle') {
		variable_gs.append("circle")
		           .classed("circle-variable", true)
		           .attr("cx", variable_height/2)
		           .attr("cy", variable_height/2)
		           .attr("r", variable_height/2);
	}
	
	variable_gs.append("text")
				  .attr("x", .5 * variable_width)
				  .attr("y", .5 * variable_height)
				  .attr("alignment-baseline", "middle")
				  .attr("text-anchor", "middle")
				  // .style("font-weight", "bold")
				  .text(function(d) {return d.name})

	if (configs.position_fixed) {
		// draw graph default positions
		drawDefaultPositions()	
	}
	
	// define arrow head and arrow end in svg
	// ref: http://bl.ocks.org/tomgp/d59de83f771ca2b6f1d4, http://thenewcode.com/1068/Making-Arrows-in-SVG
	defs = graph.append("defs");
	defs.append("marker")
			.attr("id", "arrowstart")
			.attr("refX", 1)
			.attr("refY", 2)
			.attr("markerWidth", 4)
			.attr("markerHeight", 4)
			.attr("orient", "auto")
		.append("polygon")
			.attr("points", "4 0, 4 4, 0 2")
			// .attr("fill","red");

	defs.append("marker")
			.attr("id", "arrowend")
			.attr("refX", 3)
			.attr("refY", 2)
			.attr("markerWidth", 4)
			.attr("markerHeight", 4)
			.attr("orient", "auto")
		.append("polygon")
			.attr("points", "0 0, 4 2, 0 4")
			// .attr("fill","red");
}

function drawDefaultPositions() {
	// eight default positions
	var h0 = 160, v0 = 240, h1 = 150, v1 = 150;
	var offsets = [[-h0,0], [-h1, -v1], [0, -v0], [+h1, -v1], [+h0, 0], [+h1, +v1], [0, +v0], [-h1, +v1]];

	// // oval equation seems not work very well
	// var radius = 160;
	// var theta = [0, 40, 90, 140, 180, 220, 270, 320];
	graph_default_positions = offsets.map(function(e,i) {
		var pos = {}
		// pos.x = working_line + 15 + radius + Math.cos(e * Math.PI / 180) * radius;
		// pos.y = 100 + radius - Math.sin(e * Math.PI / 180) * radius * Math.sqrt(2);
		pos.x = working_line + 15 + h0 + e[0];
		pos.y = 10 + v0 + e[1];
		pos.id = i;
		switch (i) {
			case 0:
			case 1:
				pos.fill = '#ccc';
				break;
			case 2:
			case 3:
				pos.fill = '#ccc';
				break;
			default:
				pos.fill = '#f5f5f5';
				pos.fill = '#ccc';
		}
		pos.occupied = false;
		return pos;
	})

	// draw shadows
	shadow_rects = graph.selectAll("rect.rect-shadow").data(graph_default_positions).enter()
					  .insert("g", ":first-child");

	shadow_rects.append("rect")
						.attr("x", function(d) { return d.x; })
						.attr("y", function(d) { return d.y; })
						.attr("width", variable_width)
						.attr("height", variable_height)
						.style("fill", function(d) { return d.fill; })
						.style("fill", "#ddd")
						.style("stroke", "#aaa")
						.style("stroke-width", 2)
	shadow_rects.append("text")
						.attr("x", function(d) { return d.x + variable_width / 2; })
						.attr("y", function(d) { return d.y + variable_height / 2 + 2; })
						.attr("text-anchor", "middle")
						.attr("font-style", "italic")
						.style("fill", "#888")
						.html("drag here")
}

function findNearestPosition(positions, d) {
	var distances = positions.map(function(pos) {
		return Math.pow(pos.x - d.x, 2) + Math.pow(pos.y - d.y, 2);
	})
	return positions[d3.scan(distances)];
}

function initChart() {
	var charts = d3.selectAll("div.chart")
				   .html("") // reset charts
				   .attr("id", function(d,i){ return "chart" + (i+1); });
	
	// init data
	// charts.data( fillArray({x: xMenu[0], y: yMenu[0]}, charts.size()) );
	for(var i = 0; i < d3.selectAll("div.chart").size(); i++) {
		configs["chart" + (i+1)] = {
			data: 			raw_data,
			axes: 			{x: null, y: null}
		};
	}

	// draw Visual
	charts.append("div")
		  .attr("class", "visual")
		  .attr("id", function(d,i) { return "visual" + (i+1); });

	// draw Legend Title
	charts.append("div")
		  .classed("chart_legend", true);

	// draw Legend Title
	charts.append("div")
		  .classed("trend-center", true)
		  .html("&#10230;");
	charts.append("div")
		  .classed("trend-center-bottom", true)
		  .html("&#10230;");
	charts.append("div")
		  .classed("trend-left", true)
		  .html("&#10230;");
	charts.append("div")
		  .classed("trend-right", true)
		  .html("&#10230;");
	// // draw Y Menu
	// charts.append("div")
	//       .attr("class", "y_title");

	// // draw X Menu
	// charts.append("div")
	//       .attr("class", "x_title");

}



// // draw visual based on axes_variables: {x: Variable, y: Variable}
// function updateChart(chartId, axes_variables) {
// 	var chart = d3.select("div#" + chartId);
// 	configs[chartId]["axes"] = axes_variables;
// 	redrawChart(chartId);
// }

function updateChartVisualSetting(chartId, visual_setting) {
	var chart = d3.select("div#" + chartId);
	if ( !(chartId in configs) ) { configs[chartId] = {} }
	configs[chartId]["visual_setting"] = visual_setting;
	redrawChartVisualSetting(chartId);

	// log
	msg = {"visual_setting": visual_setting, "vars": visual_setting.getVariableNames()}
	saveLog("VISUALIZE", msg);
}

// Assumption: at most one binary variable 
function changeType(vars) {
	for (var i = vars.length - 1; i >= 0; i--) {
		vars[i]['visual_type'] = vars[i]['type'];
	};

	// separate variables by type
	var nominal_vars = [], ratio_vars = [], binary_vars = [];
	for (var i = vars.length - 1; i >= 0; i--) {
		// assume there are only three types
		if (vars[i]['type'] == 'categorical') {
			nominal_vars.push(vars[i]);
		}
		else if (vars[i]['type'] == 'numerical') {
			ratio_vars.push(vars[i]);
		}
		else if (vars[i]['type'] == 'binary'){
			binary_vars.push(vars[i]);
		}
		else {
			console.log("undefined variable type: " + vars[i]['type']);
		}
	}

	 var_case = "" + nominal_vars.map(()=>"N") + binary_vars.map(()=>"B") + ratio_vars.map(()=>"R");
	 // console.log(var_case);

	// 1 numerical data -> histogram
	if (vars.length == 1 && ratio_vars.length == 1) {
		ratio_vars[0]["visual_type"] = 'categorical';
	}

	// success vs. numerical data -> histogram
	else if ( binary_vars.length == 1 && ratio_vars.length == 1) {
		binary_vars[0]['visual_type'] = 'numerical';
		ratio_vars[0]['visual_type'] = 'categorical';
	}

	else if (binary_vars.length){
		if (ratio_vars.length == 0) {
			binary_vars[0]['visual_type'] = 'numerical';
		}
		else {
			binary_vars[0]['visual_type'] = 'categorical';
		}
	}

	// switch (var_case) {
	// 	case 'NR':
	// 		ratio_vars[0]['visual_type'] = 'categorical';
	// 		break;
	// }
}

function redrawChartVisualSetting(chartId) {
	console.log('redrawChartVisualSetting');
	var chart = d3.select("div#" + chartId);
	var visual_setting = configs[chartId]["visual_setting"];
	

	visual_raw_data = covertDataWithVisualSetting(raw_data, visual_setting);
	// AddTooltip(visual_raw_data, visual_setting);
	visual_data = new google.visualization.arrayToDataTable(visual_raw_data);

	var options = {
			width: $("#"+chartId).width(), // using the width and height of the parent .chart div (.visual is kinda dummy currently)
			height: $("#"+chartId).height(),
			// chartArea: {left:100, top:120, width: 570, height:400},
			chartArea: {left: "15%", top: "20%", width: "80%", height: "67%"},
			// hAxis: {title: visual_setting.getHAxisTitle()},
			hAxis: {title: visual_raw_data[0][0]},
			vAxis: {title: visual_setting.getVAxisTitle(), viewWindow: {min: 0}},
			legend: (visual_setting.showLegend())? { position: 'top', maxLines: 3 } : 'none',
			// tooltip: {isHtml: true},
			// hAxis: { textPosition: 'none' }
			trendlines: {
				1: {
					type: 'linear',
					color: 'green',
					lineWidth: 3,
					visibleInLegend: true
				}
			},
		}

	if (visual_setting.chart_type == 'scatterplot') {
		// chart_div = new google.charts.Scatter(chart.select("div.visual").node());
		// chart_div.draw(visual_data, google.charts.Scatter.convertOptions(options));
		chart_div = new google.visualization.ScatterChart(chart.select("div.visual").node());
	}
	else if (visual_setting.chart_type == 'bar') {
		// options["isStacked"] = "percent";
		chart_div = new google.visualization.ColumnChart(chart.select("div.visual").node());
	}

	function chartOnReady () {
		var title = visual_setting.getLegendTitle();
		// chart.select("div.chart_legend").html(title);
		// hack Google chart
		// assume the second g in svg[aria-label="A chart."] is the legend g group
		var legend_g = chart.select('svg[aria-label="A chart."] > g');
		legend_g.append("text")
				.attr("x", legend_g.select("rect").attr("x"))
				.attr("y", legend_g.select("rect").attr("y") - 10)
				.html(title);
	}


	google.visualization.events.addListener(chart_div, 'ready', chartOnReady);
	chart_div.draw(visual_data, options);
}

function AddTooltip(visual_raw_data, visual_setting) {
	if (visual_setting.chart_type === 'scatterplot') {

	}
	// bar charts
	else if (visual_raw_data[1].numberOfRecordsArray !== undefined) {
		var tooltip_header = {type: 'string', role: 'tooltip', 'p': {'html': true}};
		// interleave 'tooltip' columns in the header (append a tooltip_header to each col except the first one)
		visual_raw_data[0] = $.map(visual_raw_data[0], function(col, i) { return i? [col, tooltip_header] : col } )
		// interleave 'tooltip' content in each data row
		visual_raw_data.slice(1).forEach(function(row, row_index){

			visual_raw_data[row_index+1] = $.map(row, function(col, i) {
				if (i === 0) return col;

				var tooltip_content = '<div class="bar-tooltip">';
				tooltip_content += '# of Records: <b>' + row.numberOfRecordsArray[i-1] + '</b><br>';
				tooltip_content += '</div>';

				return [col, tooltip_content];
			})
			
		})
	}
	else {
		visual_raw_data[0].push({type: 'string', role: 'tooltip', 'p': {'html': true}});
		visual_raw_data.slice(1).forEach(function(row){
			var text = '<div class="bar-tooltip">';
			visual_raw_data[0].forEach(function(col,i){
				if (typeof(col) === "string" && col !== NumberVariable.name) {
					var value = typeof(row[i]) === 'number'? row[i].toFixed(2) : row[i];
					text += col + ': <b>' + value + '</b><br>';
				}
			})
			text += '# of Records: <b>' + row.numberOfRecords + '</b><br>';
			text += '</div>'
			row.push(text);
		})
	}
	
}

// reset all graph
function clearGraph() {
	clearGraphEdges();

	graph.selectAll('g.g-variable').each(function(d){

		// unselect the variable if it is selected
		if (d.selected) {
			// toggle rect (UI)	
			// d3.select(this).select("rect").classed('selected', false);
			d3.select(this).select("circle").classed('selected', false);
			d.selected = false;
		}
		
		// move back to original position
		d3.select(this).transition().attr("transform", function(d){ d.x = 5; d.y = d['default_y']; return "translate(" + d.x + "," + d.y + ")"})
		d.active = false;
		d.position = -1;
	})
}

// remove all the edges shown on the graph
function clearGraphEdges() {
	graph.selectAll('line.line-relation').remove();
}

// a helper function to invoke callback after all transitions are done
// https://stackoverflow.com/questions/10692100/invoke-a-callback-at-the-end-of-a-transition
function endall(transition, callback) { 
	if (typeof callback !== "function") throw new Error("Wrong callback in endall");
	if (transition.size() === 0) { callback() }
	var n = 0; 
	transition 
		.each(function() { ++n; }) 
		.on("end", function() { if (!--n) callback.apply(this, arguments); }); 
} 

// move all variables into the working area
function enterAllVariables(callback) {
	graph.selectAll('g.g-variable')
		.transition()
		.attr("transform", function(d){ 
			if (!d.active) {
				d.x = working_line + 10;
				d.active = true;
				return "translate(" + d.x + "," + d.y + ")";
			}
			else {
				return d3.select(this).attr("transform");
			}
		})
		.call(endall, callback) // https://stackoverflow.com/questions/10692100/invoke-a-callback-at-the-end-of-a-transition
		
}

/****************** 
	For Graph Analysis
 ******************/
var test;
// construct a graph from the working area
var workingGraph; // global graph variable, stores all the nodes
function constructCurrentGraph() {
	workingGraph = {};
	for (var i = Variables.length - 1; i >= 0; i--) {
		if (Variables[i].active) {
			workingGraph[Variables[i].id] = {
				id: Variables[i].id,
				name: Variables[i].name,
				variable: Variables[i],
				childs: [],
				parents: [],
				descendants: [],
				root: true,
				leaf: true,
				getDescendants: function () {
					if (this.leaf) {
						return [];
					}
					else {
						var descendants = [];
						for (var id in this.childs) {
							// console.log(this.childs[id]);
							descendants.push(this.childs[id]);
							// console.log()
							descendants = descendants.concat(this.childs[id].getDescendants());
						}
						// remove duplicate
						descendants = descendants.filter(function(elem, index, self) {
							return index === self.indexOf(elem);
						})
						return descendants;
					}
				}
			}
		}
	}
	graph.selectAll('line.line-relation').each(function() {
		var this_line = d3.select(this);
		var beginNode = workingGraph[this_line.attr('lid')];
		var endNode = workingGraph[this_line.attr('rid')];
		beginNode.childs.push(endNode);
		endNode.parents.push(beginNode);
		beginNode.leaf = false;
		endNode.root = false;
	})

	// find all descendants of each variable
	for (var id in workingGraph) {
		var node = workingGraph[id];
		node.descendants = node.getDescendants();
	}
}

// take global workingGraph and suggest multiple regressions that are needed to perform
function verifyGraph() {
	// first round: verify each variable by: V ~ All other variables in the graph except its descendants
	var variable_idx = Object.keys( workingGraph );
	var all_names = variable_idx.map(id => workingGraph[id].variable.original_key);

	// multiple regression
	var regression_queue = d3.queue();
	for (var id in variable_idx) {
		var vid = variable_idx[id];
		Yname = workingGraph[vid].variable.original_key;
		Xnames = all_names.slice(0);
		Xnames.splice(Xnames.indexOf(Yname),1);
		workingGraph[vid].descendants.map(node => node.variable.original_key).forEach(function (descendant) {
			var remove_id = Xnames.indexOf(descendant);
			if (remove_id >= 0) {
				Xnames.splice(remove_id, 1);
			}
		});
		if (Xnames.length) {
			regression_queue.defer(backendRegression, Yname, Xnames);	
		}
	}
	regression_queue.awaitAll(function(error, results) {
		console.log(results);
		results.forEach(result => updateGraphFromAnalysis(result))
		$("div#detail").html(results.map(result => resultToText(result)).join('<br>'))
	});
}

// take global workingGraph and suggest multiple regressions that are needed to perform
function extendGraph() {
	enterAllVariables(function(){
		// second round: verify each variable by: V ~ All other variables except its descendants
		var variable_idx = Object.keys( workingGraph );
		var all_names = Variables.map(variable => variable.original_key);

		// multiple regression
		var regression_queue = d3.queue();
		for (var id in variable_idx) {
			var vid = variable_idx[id];
			Yname = workingGraph[vid].variable.original_key;
			Xnames = all_names.slice(0);
			Xnames.splice(Xnames.indexOf(Yname),1);
			workingGraph[vid].descendants.map(node => node.variable.original_key).forEach(function (descendant) {
				var remove_id = Xnames.indexOf(descendant);
				if (remove_id >= 0) {
					Xnames.splice(remove_id, 1);
				}
			});
			if (Xnames.length) {
				regression_queue.defer(backendRegression, Yname, Xnames);	
			}
		}
		regression_queue.awaitAll(function(error, results) {
			console.log(results);
			results.forEach(result => updateGraphFromAnalysis(result));
			$("div#detail").html(results.map(result => resultToText(result)).join('<br>'));
		})
	})
}

// take in an analysis result (from regression model) and update the graph
function updateGraphFromAnalysis(result) {
	var Yname = result[0], Xnames = result[1], pvalues = result[2];
	for (var name in pvalues) {
		if (name === 'const') continue; // not shown

		var rid = nameToId(Yname), lid = nameToId(name);
		var edge = graph.select('line.line-relation#V'+lid+'toV'+rid);
		// the edge is significant 
		if (pvalues[name].sig) {
			// line is not drawn
			if (edge.empty()) {
				
				// check if there is a opposite arrow
				var edge = graph.select('line.line-relation#V'+rid+'toV'+lid);
				if (!edge.empty()) {
					edge.attr("marker-start", "url(#arrowstart)")
				}
				else {
					// blue new line
					drawline(Variables[lid], Variables[rid]);
					graph.select('line.line-relation#V'+lid+'toV'+rid)
						.transition(1000)
						.style('stroke', 'deepskyblue')	
				}
			}
			else {
				var edge = graph.select('line.line-relation#V'+lid+'toV'+rid);
				edge.transition(1000)
					.style('stroke', 'limegreen')
			}
		}
		else {
			// line is not drawn
			if (edge.empty()) {
				// do nothing
			}
			else {
				var edge = graph.select('line.line-relation#V'+lid+'toV'+rid);
				edge.transition(1000)
					.style('stroke', 'lightgray')
			}
		}
		


	}

}

// a debugging function that convert a regression result to text
function resultToText(result) {
	console.log(result);
	var text = result[0] + ' ~ ';
	var Xs = []
	for(var name in result[2]) {
		var x = name + '(' + result[2][name].pvalue.toFixed(3) + ')';
		if (result[2][name].sig) {
			x = '<strong>' + x + '</strong>';
		}
		Xs.push(x);
	}
	return text + Xs.join(' + ');

}

// a helper function to find the variable id given its name (original_key)
// a temporary function that might be removed once code structure is improved
function nameToId(name) {
	for (var i = Variables.length - 1; i >= 0; i--) {
		if (Variables[i].original_key === name) return i;
	};
}

/****************** 
	For Backend Data Analysis
 ******************/

// 
function backendRegression( Yname, Xnames, callback ) {
	var datafilename = configs.data.path;

    var msg = {"command": 'regression', "datafilename": datafilename, "Yname": Yname, "Xnames": JSON.stringify(Xnames)};

    $.ajax({
        type: "POST",
        url: "/ajax/",
        data: msg,
        success: function(response) {
            
            console.log('regression response: ' + response.status);
            if (response.status === 'fail') {
            	callback('fail');
            }
            else {
            	var result = JSON.parse(response.analysis);
            	for (var key in result) {
            		result[key] = {
            			pvalue: result[key],
            			sig: result[key] < 0.05
            		}
            	}
            	callback(null, [Yname, Xnames, result]);	
            }
        },
    });
}

