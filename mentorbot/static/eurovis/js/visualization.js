

// var CrowdfundingVariables = [
// 	{"name": "Goal", 			"type": "numerical",	"key": "goal",						"function": function(d){ return average(d, "goal"); }},
// 	{"name": "Category", 		"type": "categorical",	"key": "category"},
// 	{"name": "Facebook Share", 	"type": "numerical",	"key": "facebook_count",			"function": function(d){ return average(d, "facebook_count"); }},
// 	{"name": "Essay Length", 	"type": "numerical",	"key": "description_word_count",	"function": function(d){ return average(d, "description_word_count"); }},
// 	{"name": "Min. Reward", 	"type": "numerical",	"key": "reward_min",				"function": function(d){ return average(d, "reward_min"); }},
// 	{"name": "Max. Reward", 	"type": "numerical",	"key": "reward_max",				"function": function(d){ return average(d, "reward_max"); }},
// 	{"name": "Launch Day", 		"type": "categorical",	"key": "launch_day"},
// 	// {"name": "Ended Time", 		"type": "categorical",	"key": "ended_time"}
// ]


// var CampaignVariables = [
// 	{"name": "Success", 	"_type": "binary",		"type": "numerical",	"key": "success",				"num_key": "success",	"function": function(d){ return average(d, "success"); },	"range": [0,1]},
// 	{"name": "Goal", 		"_type": "numerical",	"type": "numerical",	"key": "goal",					"function": function(d){ return average(d, "goal"); },		"range": [1500, 8000]},
// 	{"name": "Shares", 		"_type": "numerical",	"type": "numerical",	"key": "shares",				"function": function(d){ return average(d, "shares"); },	"range": [0, 750]},
// 	{"name": "Category", 	"_type": "categorical",	"type": "categorical",	"key": "category_name",			"num_key":  "category"},
// 	{"name": "Country", 	"_type": "categorical",	"type": "categorical",	"key": "country_name",			"num_key": "country"},
// 	{"name": "Length", 		"_type": "numerical",	"type": "numerical",	"key": "length",				"function": function(d){ return average(d, "length"); },	"range": [10,1500]},
// 	{"name": "Duration", 	"_type": "numerical",	"type": "numerical",	"key": "duration",				"function": function(d){ return average(d, "duration"); },	"range": [1,150]},
// 	{"name": "Month", 		"_type": "categorical",	"type": "categorical",	"key": "month",					"num_key": "month"},
	
// ]

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
	}

	get function() {
		return this.default_aggregate;
	}

}

var CampaignVariables = [
	new DataVariable("Success", 		"binary", 		"success",          ""),
	new DataVariable("Goal",			"numerical", 	"goal",             "dollar"),
	new DataVariable("Media Shares", 	"numerical", 	"shares",           "# of shares on Facebook"),
	new DataVariable("Category", 		"categorical", 	"category_name",    ""),
	new DataVariable("Country", 		"categorical", 	"country_name",     ""),
	new DataVariable("Essay Length", 	"numerical", 	"length",           "# of words"),
	new DataVariable("Duration", 		"numerical", 	"duration",         "day"),
	new DataVariable("Month", 			"categorical", 	"month",            ""),
]

var ApplyVariables = [
	new DataVariable("Admission",       "binary",       "admission",        ""),
	new DataVariable("Gender",          "categorical",  "gender",           ""),
	new DataVariable("Apply Department",     "categorical",  "department",       ""),
	new DataVariable("GPA",             "numerical",    "GPA",              ""),
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
		"path": "/static/data/apply_data.csv",
		"Variables": ApplyVariables,
		"preprocess": preprocessApply,
		"question": "",
		"next_link": '/practice',
	},
	"application": {
		// TODO: convert the hardcode path to Django static generated path
		"path": "/static/data/apply_data.csv",
		"Variables": ApplyVariables,
		"preprocess": preprocessApply,
		"question": "Given the data, please determine whether the admission result is affected by gender or department the applicant applied.",
		next_link: '/presurvey',
	},
	"campaign": {
		"path": "/static/data/campaigns_data.csv",
		"Variables": CampaignVariables,
		"preprocess": preprocessCampaign,
		"question": "Based on the data, which variable(s) is the most plausible reason that explains <b>why the “success rate” of the projects launched in “the third month” is much lower?</b> (success rate means the percentage of successful projects in all projects)",
		next_link: '/postsurvey',
	}
}

// configs global variable is first initialized in va-interface.html
configs.data = task_configs[configs.task];
// update campaign data path from config
if (configs.task === 'campaign') {
	configs.data.path = '/media/' + configs.campaigns_data_path;	
}
else {
	configs.variable_order = [0,1,2,3];
}
// update next step button href
$('a#next').attr('href', configs.data.next_link);


// special helping variables
if (configs.task === 'campaign')
	var NumberVariable = {	"name": "Number of Projects", "type": "numerical",    "function": function(d) { return count(d); }, "dummy": true};
else
	var NumberVariable = {	"name": "Number of Applicants", "type": "numerical",    "function": function(d) { return count(d); }, "dummy": true};
var DummyVariable = {	"name": "",    "type": "categorical",  "key": "_dummy_", "labels": ["All"], "dummy": true};
// var DummyVariable = new DataVariable("",   "categorical",   "_dummy_");

// set global variables
var CONDITION = configs.condition; // 'control' or others
var Variables = configs.data.Variables;
var raw_data;

function loadData(csvFile, callback) {
	d3.csv(csvFile, function(error, data) {
		if(error) { console.log(error); return; }
		
		raw_data = preprocess(data, configs.data.preprocess);
		preprocessVariable(raw_data, Variables);
		filtered_data = raw_data; // for future extension

		callback();
	});
}

// load google chart package, starting point
google.charts.load('current', {packages: ['corechart', 'scatter', 'bar']});
google.charts.setOnLoadCallback(function(){
	// init page
	$("#task_question").html(configs.data.question);

	loadData(configs.data.path, function() {
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

function updateLineOfVariable(d) {
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

// drag end callback for variable g
function dragend(d, i) {
	// d: data, i: index of the variable
	d.prev_position = d.position;
	
	if (d.x > working_line) {
		// move to the nearest default position
		var pos = findNearestPosition(graph_default_positions, d);
		pos.occupied = d;
		d.position = pos.id;
		d.x = pos.x;
		d.y = pos.y;
		d3.select(this).transition()
		  .attr("transform", function(d){ return "translate(" + d.x + "," + d.y + ")"})
		  .on("end", function(){
			// the variable was not active before dragging
			if (!d.active) {
				// draw lines to other working variables
				Variables.forEach(function(d2, i2) {
					if (d2.x > working_line && i2 != i) {
						drawline(d, d2);
					}
				})
				d.active = true;
			}
		  })
		// transit lines
		if (d.active) {
				graph.selectAll("line[lid='" + d.id + "']").each(function(){
					d3.select(this).transition()
						.attr("x1", d.x + .5 * variable_width)
						.attr("y1", d.y + .5 * variable_height)
				})
				graph.selectAll("line[rid='" + d.id + "']").each(function(){
					d3.select(this).transition()
						.attr("x2", d.x + .5 * variable_width)
						.attr("y2", d.y + .5 * variable_height)
				})
		}
		d.position = pos.id;
	}
	else {
		// unselect the variable if it is selected
		if (d.selected) {
			// toggle rect (UI)	
			d3.select(this).select("rect").classed('selected', false);
			d.selected = false;

			// update visual
			selected_vars = d3.selectAll("rect.selected").data();
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
	var count = d3.selectAll("rect.rect-variable.selected").size();

	// do nothing if the variable is not active (in treatment group)
	if (CONDITION !== 'control' && !d.active) { return }

	// do nothing if there are already three selected variables when adding another one
	if (count >= 3 && d['selected'] == false) { return }

	// toggle rect (UI)	
	var variable_g = d3.select(this);
	d['selected'] = !d['selected'];
	variable_g.select("rect").classed("selected", d['selected']);

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
	selected_vars = d3.selectAll("rect.selected").data();
	if (selected_vars.length == 0) return;

	visual_setting = autoVisualSet(selected_vars);
	updateChartVisualSetting("chart1", visual_setting);
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
	d3.selectAll("rect.rect-variable").classed("selected", function(d){
		return (d.id == id1 || d.id == id2)? d.selected = true : d.selected = false;
	})

	// update chart
	selected_vars = d3.selectAll("rect.selected").data();
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

	// if the mouse is hovering on a variable, de-highlight lines and return
	if (!d3.select("g.g-variable[hovered=true]").empty()) {
		d3.selectAll("line.line-relation.highlight").each(function() { d3.select(this).classed("highlight", false).attr("hovered", "false"); });
		d3.selectAll("rect.highlight").each(function() { d3.select(this).classed("highlight", false); });
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
				d3.selectAll("rect.rect-variable").classed("highlight", function(d){
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
				d3.selectAll("rect.rect-variable").classed("highlight", false);	
			}
		}
	})
	graph.style('cursor',  (closest_line_i == -1)? 'default' : 'pointer');

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

// draw a line from dvariable 1 to variable 2
function drawline(d1, d2) {
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


// global variables
var graph;
var variable_gs;
// settings
var graph_width = 600, 
	graph_height = 600, 
	variable_width = 120, 
	variable_height = 40,
	working_line = variable_width + 11;
var graph_default_positions = [];

function initGraph_Control() {
	// set up graph width, height (attribute list and graph component)
	graph = d3.select("#graph_container")
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

	variable_gs.append("rect")
				.classed("rect-variable", true)
				.attr("width", variable_width)
				.attr("height", variable_height)

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
				.style("width", graph_width + "px")
				.style("height", graph_height + "px")
			  .append("svg")
				.attr("id", "graph_svg")
				.attr("width", graph_width)
				.attr("height", graph_height)
				.on('click', graph_click)
				.on("mousemove", graph_mousemove_callback)

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

	variable_gs.append("rect")
				.classed("rect-variable", true)
				.attr("width", variable_width)
				.attr("height", variable_height)

	variable_gs.append("text")
				  .attr("x", .5 * variable_width)
				  .attr("y", .5 * variable_height)
				  .attr("alignment-baseline", "middle")
				  .attr("text-anchor", "middle")
				  // .style("font-weight", "bold")
				  .text(function(d) {return d.name})

	// draw graph default positions
	drawDefaultPositions()
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
	var chart = d3.select("div#" + chartId);
	var visual_setting = configs[chartId]["visual_setting"];
	

	visual_raw_data = covertDataWithVisualSetting(raw_data, visual_setting);
	AddTooltip(visual_raw_data, visual_setting);
	visual_data = new google.visualization.arrayToDataTable(visual_raw_data);

	var options = {
			width: 700,
			height: 600,
			chartArea: {left:100, top:120, width: 570, height:400},
			// hAxis: {title: visual_setting.getHAxisTitle()},
			hAxis: {title: visual_raw_data[0][0]},
			vAxis: {title: visual_setting.getVAxisTitle(), viewWindow: {min: 0}},
			legend: (visual_setting.showLegend())? { position: 'top', maxLines: 3 } : 'none',
			tooltip: {isHtml: true},
			// hAxis: { textPosition: 'none' }
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


// function redrawChart(chartId) {
// 	var chart = d3.select("div#" + chartId);
// 	var axes_variables = configs[chartId]["axes"]
// 	var options = {
// 			width: 650,
// 			height: 550,
// 			hAxis: {title: axes_variables['x']['name']},
// 			vAxis: {title: axes_variables['y']['name'], viewWindow: {min: 0}},
// 			// chartArea: {left:10, top:10, width:'90%', height:'90%'},
// 			// legend: { position: 'top' },
// 			// hAxis: { textPosition: 'none' }
// 		}
// 	// 
// 	// variable type can be 'numerical' or 'categorical'
// 	// axes_variables['x']['_type'] = axes_variables['x']['type'];
	


// 	// Numerical x Numerical
// 	if('z' in axes_variables) {
// 		// three variables
// 		// draw scatter plot
// 		visual_raw_data = toStackBarData(raw_data, axes_variables["x"], axes_variables["z"], axes_variables["y"]);
// 		options["isStacked"] = false;
// 		// console.log(visual_raw_data);
// 		visual_data = new google.visualization.arrayToDataTable(visual_raw_data);

// 		chart_div = new google.visualization.ColumnChart(chart.select("div.visual").node());
// 		chart_div.draw(visual_data, options);
// 		// chart_div = new google.charts.Bar(chart.select("div.visual").node());
// 		// options['bars'] = 'vertical';
// 		// options['isStacked'] = true;
// 		// chart_div.draw(visual_data, google.charts.Bar.convertOptions(options));

// 		google.visualization.events.addListener(chart_div, 'select', selectHandler);	
// 	}
// 	else if(axes_variables['x']['type'] == 'numerical' && axes_variables['y']['type'] == 'numerical' ) {
		
// 		// draw scatter plot
// 		visual_raw_data = toScatterData(raw_data, axes_variables['x'], axes_variables['y']);
// 		// console.log(visual_raw_data);
// 		visual_data = new google.visualization.arrayToDataTable(visual_raw_data);

// 		// chart_div = new google.charts.Scatter(chart.select("div.visual").node());
// 		// chart_div.draw(visual_data, google.charts.Scatter.convertOptions(options));
// 		chart_div = new google.visualization.ScatterChart(chart.select("div.visual").node());
// 		chart_div.draw(visual_data, options);

// 		google.visualization.events.addListener(chart_div, 'select', selectHandler);	
// 	}
// 	// Numerical x Categorical
// 	else if(axes_variables['x']['type'] != axes_variables['y']['type']) {

// 		// draw bar chart
// 		if (axes_variables['x']['type'] == 'categorical'){
// 			visual_raw_data = toBarData(raw_data, axes_variables["x"], axes_variables["y"]);
// 		}
// 		else {
// 			visual_raw_data = toBarData(raw_data, axes_variables["y"], axes_variables["x"]);
// 			// options['']
// 		}
		
// 		visual_data = new google.visualization.arrayToDataTable(visual_raw_data);

		
// 		// draw bar chart
// 		if (axes_variables['x']['type'] == 'categorical'){
// 			chart_div = new google.visualization.ColumnChart(chart.select("div.visual").node());
// 			chart_div.draw(visual_data, options);
// 			// chart_div = new google.charts.Bar(chart.select("div.visual").node());
// 			// options['bars'] = 'vertical';
// 			// chart_div.draw(visual_data, google.charts.Bar.convertOptions(options));
// 		}
// 		else {
// 			chart_div = new google.visualization.BarChart(chart.select("div.visual").node());
// 			chart_div.draw(visual_data, options);
// 			// chart_div = new google.charts.Bar(chart.select("div.visual").node());
// 			// options['bars'] = 'horizontal';
// 			// chart_div.draw(visual_data, google.charts.Bar.convertOptions(options));
// 		}
		

// 		google.visualization.events.addListener(chart_div, 'select', selectHandler);		
// 	}
// 	// Categorical x Categorical
// 	else {
// 		// draw scatter plot
// 		visual_raw_data = toStackBarData(raw_data, axes_variables["x"], axes_variables["y"], NumberVariable);
// 		options["isStacked"] = "percent";
// 		// console.log(visual_raw_data);
// 		visual_data = new google.visualization.arrayToDataTable(visual_raw_data);

// 		chart_div = new google.visualization.ColumnChart(chart.select("div.visual").node());
// 		chart_div.draw(visual_data, options);
// 		// chart_div = new google.charts.Bar(chart.select("div.visual").node());
// 		// options['bars'] = 'vertical';
// 		// options['isStacked'] = true;
// 		// chart_div.draw(visual_data, google.charts.Bar.convertOptions(options));

// 		google.visualization.events.addListener(chart_div, 'select', selectHandler);	
// 	}	
// }


////////////// CODE FOR FILTERING THINGS OR OTHER PREVIOUS FEATURES
// function sideTitleClick(d, i) {

// }

// function sideTitleDrag(d, i) {
// 	d.x += d3.event.dx
//     d.y += d3.event.dy
//     d3.select(this).attr("transform", function(d,i){
//     	return "translate(" + [ d.x,d.y ] + ")"})
// }

// function facetClick(d, i) {
// 	var clicked = d3.select(this);
// 	clicked.style("background-color", "#555555");
// }


// function selectHandler(e) {
// 	if(chart_div.getSelection().length == 0) {
// 		$(".filter-control").fadeOut();
// 		return;
// 	}

// 	$(".filter-control").fadeIn();
// }

// function filterControl(must) {

// 	var chartId = "chart1"; // TODO chartId is now hardcoded
// 	var value_idx = chart_div.getSelection()[0].row;
// 	var value = (visual_data.getValue(value_idx, 0));
// 	var key = configs[chartId]["attrs"]["x"];

// 	if(must) {
// 		configs[chartId]["data_filter"].add_must(key["key"], value);
// 		filtered_data = configs[chartId]["data_filter"].filter_data(raw_data);
// 		redrawChart(chartId);
// 		d3.select("div#filter-list").append("div")
// 		  .attr("class", "alert alert-success alert-dismissible")
// 		  .data([{"key": key, "value": value, "must": must}])
// 		  .html('<strong>Must:</strong> ' + key["name"] + " is " + value)
// 		  .append("button")
// 		  .attr("type", "button")
// 		  .attr("class", "close")
// 		  .html('<span aria-hidden="true">&times;</span></button>')
// 		  .on("click", closeFilter)
// 		  .data([{"key": key, "value": value, "must": must}]);
// 	}
// 	else {
// 		configs[chartId]["data_filter"].add_exclude(key["key"], value);
// 		filtered_data = configs[chartId]["data_filter"].filter_data(raw_data);
// 		redrawChart(chartId);
// 		d3.select("div#filter-list").append("div")
// 		  .attr("class", "alert alert-danger alert-dismissible")
// 		  .data([{"key": key, "value": value, "must": must}])
// 		  .html('<strong>Exclude:</strong> ' + key["name"] + " is " + value)
// 		  .append("button")
// 		  .attr("type", "button")
// 		  .attr("class", "close")
// 		  .html('<span aria-hidden="true">&times;</span></button>')
// 		  .on("click", closeFilter)
// 		  .data([{"key": key, "value": value, "must": must}]);	}
// }



// function closeFilter(d) {
// 	if(d["must"]){
// 		configs["chart1"]["data_filter"].remove_must(d["key"]["key"], d["value"]);
// 	}
// 	else {
// 		configs["chart1"]["data_filter"].remove_exclude(d["key"]["key"], d["value"]);
// 	}

// 	d3.selectAll("div#filter-list > div.alert").data([d], function(d){return d["key"]+"|"+d["value"]+d["must"];}).remove();
// 	filtered_data = configs["chart1"]["data_filter"].filter_data(raw_data);
// 	redrawChart("chart1");
// }

// /* */

// var attributesList = [
// 	{"name" : "Category", "key" : "category.name"}, 
// 	{"name" : "Status",   "key" : "state"}, 
// 	{"name" : "Launch Date", "key" : "launch_day"},
// 	{"name" : "Period", "key" : "period"}
// ];

// function drawBar(data) {
// 	var data = new google.visualization.arrayToDataTable(data);

// 	var options = {
// 		width: 1300,
// 		height: 600
// 	};

// 	var chart = new google.charts.Bar(document.getElementById('googlechart'));
// 	chart.draw(data, options);
// }

// function drawStackBar(data) {
// 	var data = new google.visualization.arrayToDataTable(data);

// 	var options = {
// 		width: 1300,
// 		height: 600,
// 		isStacked: true
// 	};

// 	var chart = new google.charts.Bar(document.getElementById('googlechart'));
// 	chart.draw(data, options);
// }



// // draw a horizontal list in 'g' element with 'data' (string array)
// function drawList(g, data, clickCallback) {
// 	var buttonWidth = 100, buttonHeight = 50;

// 	var buttons = g.selectAll("g.button_g").data(data).enter()
// 	               .append("g")
// 	               .attr("class", "button_g")
// 	               .attr("transform", function(d,i) { return "translate(" + (buttonWidth * i) + ", 0)"; } )
// 	               .on("click", clickCallback);
	
// 	buttons.append("rect")
// 	       .attr("width", buttonWidth)
// 	       .attr("height", buttonHeight);

// 	buttons.append("text")
// 	       .attr("x", buttonWidth / 2)
// 	       .attr("y", buttonHeight / 2)
// 	       .attr("dy", ".3em")
// 	       .attr("text-anchor", "middle")
// 	       .attr("class", "button_text")
// 	       .text( function(d) { return d.name; });

// }

// var selected_attributes = [];

// // click function of attribute
// function attributeClick() {
// 	var clicked = d3.select(this), clicked_attr = clicked.data()[0].key;
// 	var set = (clicked.select("rect").classed("button_rect_selected"))? 0 : 1;

// 	if( set ) {
// 		if( selected_attributes.length == 2 ) return 0;

// 		selected_attributes.push(clicked_attr);
// 		clicked.select("rect").classed("button_rect_selected", 1);

// 		if( selected_attributes.length == 1 ) {
// 			drawOneAttribute(selected_attributes[0]);
// 		}
// 		else if( selected_attributes.length == 2 ) {
// 			drawTwoAttribute(selected_attributes[0], selected_attributes[1]);
// 		}
// 	}
// 	else {
// 		clicked.select("rect").classed("button_rect_selected", 0);

// 		selected_attributes = selected_attributes.filter(function(d){ return d != clicked_attr; });

// 	}
// }

// function drawOneAttribute(attribute) {
// 	data = oneAttribute(raw_data, attribute);
// 	drawBar(data);
// }

// function drawTwoAttribute(attribute1, attribute2) {
// 	data = twoAttributes(raw_data, attribute1, attribute2);
// 	drawStackBar(data);
// }

// PREVIOUS CODE FOR X-MENU / Y-MENU & FACET FILTERING FEATURE
// MAY NOT WORKING EVEN UNCOMMENTED, REFER TO 'BACKUP' BRANCH FOR PRIOR WORKING VERSION, THE CODE BELOW IS JUST FOR REFERENCING
// var yMenu = [
// 	{"name": "Number", "function": count},
// 	{"name": "Success Rate", "function": function(d){ return average(d, "success"); } },
// 	{"name": "Goal", "function": function(d){ return average(d, "goal"); } },
// 	{"name": "Duration", "function": function(d){ return average(d, "duration"); } },
// 	{"name": "Pledged", "function": function(d){ return average(d, "pledged"); } },
// 	{"name": "# of Backers", "function": function(d){ return average(d, "backers_count"); } },

// 	{"name": "Pledged (Day)", "type": "array", "function": function(d){ return averageArray(d, "pledged_perday"); } },
// 	{"name": "# of Backers (vs. Time)", "type": "array", "function": function(d){ return averageArray(d, "backers_time"); } }
// ];

// var xMenu = [
// 	{"name": "Category", "key": "category"},
// 	{"name": "Duration", "key": "duration"},
// 	{"name": "Launch Day", "key": "launch_day"},
// 	{"name": "Goal", "key": "goal_range"},
// 	{"name": "Status", "key": "state"}
// ];


/*
function sideTitleClick(d, i) {
	var open = d3.select(this).attr("data-list") == "open";
	var clicked_facet = d3.select(this.parentNode);
	if(!open) {
		clicked_facet.transition().style("height", d[1].length * 30 + 50 + "px");
		d3.select(this).attr("data-list", "open");
	}
	else {
		clicked_facet.transition().style("height", "50px");
		d3.select(this).attr("data-list", "close");
	}

}
*/


/*
function sideCategoryClick(d) {
	var clicked = d3.select(this), key = d3.select(this.parentNode).data()[0][0], value = d, chartId = "chart1", must = true;
	console.log(key);
	console.log(d);
	if(clicked.attr("selected") == 1) {
		clicked.style("background-color", "#555555");
		clicked.attr("selected", 0);
		configs[chartId]["data_filter"].remove_must(key["key"], value);
		d3.selectAll("div#filter-list > div.alert").data([{"key": key, "value": value, "must": must}], function(d){return d["key"]+"|"+d["value"]+d["must"];}).remove();
		filtered_data = configs["chart1"]["data_filter"].filter_data(raw_data);
		redrawChart("chart1");
	}
	else {
		clicked.style("background-color", "#5cb85c");
		clicked.attr("selected", 1);
		configs[chartId]["data_filter"].add_must(key["key"], value);
		filtered_data = configs[chartId]["data_filter"].filter_data(raw_data);
		redrawChart(chartId);
		d3.select("div#filter-list").append("div")
		  .attr("class", "alert alert-success alert-dismissible")
		  .data([{"key": key, "value": value, "must": must}])
		  .html('<strong>Must:</strong> ' + key["name"] + " is " + value)
		  .append("button")
		  .attr("type", "button")
		  .attr("class", "close")
		  .html('<span aria-hidden="true">&times;</span></button>')
		  .on("click", closeFilter)
		  .data([{"key": key, "value": value, "must": must}]);
	}
}
*/

// function initChart() {
// 	var charts = d3.selectAll("div.chart")
// 	               .attr("id", function(d,i){ return "chart" + (i+1); });
	
// 	// init data
// 	charts.data( fillArray({x: xMenu[0], y: yMenu[0]}, charts.size()) );
// 	for(var i = 0; i < d3.selectAll("div.chart").size(); i++) {
// 		configs["chart" + (i+1)] = {
// 			data_filter: 	new FilterHelper,
// 			data: 			raw_data,
// 			attrs: 			{x: xMenu[0], y: yMenu[0]}
// 		};
// 	}

// 	// draw Visual
// 	charts.append("div")
// 	      .attr("class", "visual")
// 	      .attr("id", function(d,i) { return "visual" + (i+1); });

// 	// draw Y Menu
// 	charts.append("div")
// 	      .attr("class", "yMenu")
// 	      .call(drawMenu, yMenu, "yMenu", menuClickCallback);

// 	// draw X Menu
// 	charts.append("div")
// 	      .attr("class", "xMenu")
// 	      .call(drawMenu, xMenu, "xMenu", menuClickCallback);

// }

// function drawMenu(divs, items, id, callback) {
// 	divs.classed("dropdown", true)
// 	  .append("button")
// 	    .attr("class", "btn btn-default dropdown-toggle")
// 	    .attr("type", "button")
// 	    .attr("data-toggle", "dropdown")
// 	    .attr("aria-expanded", "true")
// 	    .attr("id", function(d,i) { return id + (i+1); })
// 	    .html("(Choose One) <span class=\"caret\"></span>");

// 	divs.append("ul")
// 	    .attr("class", "dropdown-menu")
// 	    .attr("role", "menu")
// 	    .attr("aria-labelledby", function(d,i) { return id + (i+1); })
// 	    .attr("chartId", function(d,i) { return "chart" + (i+1); })
// 	    .selectAll("li").data(items).enter()
// 	  .append("li")
// 	    .attr("role", "presentation")
// 	  .append("a")
// 	    .attr("role", "menuitem")
// 	    .attr("href", "#")
// 	    .html(function(d) { return d.name; })
// 	    .on("click", callback);

// }


// function menuClickCallback(d) {
// 	var chartId = this.parentNode.parentNode.getAttribute("chartId");
// 	var menuId = this.parentNode.parentNode.getAttribute("aria-labelledby"), axis = menuId[0];
// 	var clicked = d;

// 	d3.select("button#" + menuId).html(clicked.name + " <span class=\"caret\"></span>");

// 	updateChart(chartId, axis, clicked);
// }

/*function initSide() {
	var facets_div = d3.select("#variable_container").selectAll("div.facet").data(facets).enter()
					   .append("div")
					   .classed("facet", true)
					   .style("height", "50px");

	facets_div.append("div")
			  .classed("side_title", true)
			  .html(function(d){return d[0]["name"]})
			  .attr("data-list", "closed")
			  .on("click", sideTitleClick);

	facets_div.selectAll("div.side_category").data(function(d){return d[1];}).enter()
			  .append("div")
			  .classed("side_category", true)
			  .html(function(d){return d;})
			  .attr("selected", 0)
			  .on("click", sideCategoryClick);

}*/
// function initSide() {
// 	var facets_div = d3.select("#variable_container").selectAll("div.facet").data(Variables).enter()
// 					   .append("div")
// 					   .classed("side_title", true)
// 					   .html(function(d){return d["name"]})
// 					   .attr("data-list", "closed")
// 					   .on("click", sideTitleClick)
// 					   .on("drag", sideTitleDrag)
// 					   .style("height", "50px")
// 					   .call(drag)
// }



// var facets = [
// 	[xMenu[0], ["Art", "Comics", "Crafts", "Dance", "Design", "Fashion", "File & Video", "Food", "Games", "Journalism", "Music", "Photography", "Publishing", "Technology", "Theater"]],
// 	[xMenu[2], ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]],
// 	[xMenu[3], ["< 1000", "1000 - 4999", "5000 - 9999", "10000 - 19999", "20000 - 49999", "> 50000"]],
// 	[xMenu[4], ["successful", "canceled", "failed"]]
// ];


/* PREVIOUS CODE FOR ADDING NEW LISTS
// click function of attribute
function attributeClick() { newList(d3.select(this)); }

// Control the attribute selection
var selected = [], selected_g = [];
var listNum = 1;
var listGap = 100;

function newList(clicked) {
	// update selected attributes
	var clicked_attr = clicked.data()[0];
	selected.push(clicked_attr);
	if ( selected.length > 2) {
		selected.shift();
	}

	// update clicked UI
	clicked.select("rect").classed("button_rect_selected", true);
	selected_g.push(clicked);
	if ( selected_g.length > 2) {
		selected_g[1].append("line")

		selected_g[0].select("rect").attr("class", "button_rect_history");

		selected_g.shift();
	}

	listNum++;
	var nextList = attributesSelectG.append("g").attr("transform", "translate(0, " + (listNum - 1) * listGap + ")");

	var newAttributesList = attributesList.filter(function(d) { return d != clicked_attr;})
	drawList(nextList, newAttributesList, attributeClick);

}

// click function of criteria
function criteriaClick() { showCriteria(d3.select(this)); }


var criterias;
function initializeCriteria(g) {
	criterias = {};
	for(var i in criteriaList) {
		criterias[criteriaList[i]] = false;
	}

	var criteria_y = 100;
	var status = g.append("g")
				  .attr("transform", "translate(0, " + criteria_y + ")")
				  .attr("id", "criteria_status");

	drawList(status, ["Success", "Fail", "Live", "Canceled"], null);
	var close = status.append("g")
					  .attr("transform", "translate(380,-30)")
					  .classed("button_g", true)
					  .on("click", function() { d3.select(this.parentNode).transition().attr("opacity", 0)});

	close.append("rect")
		 .attr("width", 20)
		 .attr("height", 20);

	close.append("text")
		  .attr("x", 10)
		  .attr("y", 10)
		  .attr("dy", ".3em")
		  .attr("text-anchor", "middle")
		  .text("x");


	status.attr("opacity", 0);
}


function showCriteria(clicked) {
	var clicked_crit = clicked.data()[0];

	if( criterias[clicked_crit] == false) {
		clicked.select("rect").classed("criteria_button_selected", true);
		criterias[clicked_crit] = true;

		// show setting window
		switch(clicked_crit) {
			case "Status":
				criteriaSelectG.select("#criteria_status").transition().attr("opacity", 1);
				break;
			default:
		}

	}
	else {
		clicked.select("rect").classed("criteria_button_selected", false);
		criterias[clicked_crit] = false;
	}
	


}

*/

// // drag container initialization 
// //Make an SVG Container
// var svgContainer = d3.select("body").append("svg")
//                                     .attr("id", "chart_container_left");

// //Draw the Rectangle
// var rectangle = svgContainer.append("rect")
//                             .attr("x", 50)
//                             .attr("y", 50)
//                             .attr("width", 500)
//                             .attr("height", 450)
//                             .attr("stroke", "#000")
// 			                .attr("stroke-width", 3)
// 			                .attr("fill", "none");


