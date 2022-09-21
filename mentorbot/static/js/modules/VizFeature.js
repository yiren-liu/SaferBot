/*
	This module handles data visualization

	Requires: d3, google (Google Chart API), datalib.js
*/

'use strict';
;var VizFeature = function() {
	// This module do not modify these objects below
	let _DATA;
	let _VICA;
	let _$DIV;
	let _COMPONENT_ID;

	let _visual_setting;  // the current visual setting
	let _visual_raw_data; // the current visual raw data

	// Helping variables
	let _NumberVariable = {	'name': 'Number of Records', 'type': 'numerical',    'function': function(d) { return count(d); }, 'dummy': true};
	let _DummyVariable = {	'name': '',    'type': 'categorical',  'key': '_dummy_', 'labels': ['All'], 'dummy': true};

	// 
	function sort_by_func(func) { 
		return function(v1, v2) {
			return func(v1) - func(v2);
		}
	}

	/////////////////////////////////////////////////////////////////////
	///// Private Functions /////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////

	//
	function _drawViz(variables, $div) {
		let visual_setting = _autoVisualSet(variables);
		_drawVizWithVisualSetting(visual_setting, $div);
	}

	function _drawVizWithVisualSetting(visual_setting, $div) {
		_visual_setting = visual_setting;
		if ($div === undefined) {
			$div = _$DIV;
		}
		
		let _d3_div = d3.select($div[0]);
		_visual_raw_data = covertDataWithVisualSetting(_DATA, visual_setting);
		// AddTooltip(visual_raw_data, visual_setting);
		let visual_data = new google.visualization.arrayToDataTable(_visual_raw_data);

		var options = {
				width: _$DIV.width(), // using the width and height of the parent .chart div (.visual is kinda dummy currently)
				height: _$DIV.height(),
				bar: { groupWidth: "35%" },
				// chartArea: {left:100, top:120, width: 570, height:400},
				chartArea: {left: "15%", top: "20%", width: "80%", height: "67%"},
				hAxis: {title: visual_setting.getHAxisTitle()},
				// hAxis: {title: _visual_raw_data[0][0]},
				vAxis: {title: visual_setting.getVAxisTitle(), viewWindow: {min: 0}},
				legend: (visual_setting.showLegend())? { position: 'top', maxLines: 3 } : 'none',
				// tooltip: {isHtml: true},
				// hAxis: { textPosition: 'none' }
				// trendlines: {
				// 	1: {
				// 		type: 'linear',
				// 		color: 'green',
				// 		lineWidth: 3,
				// 		visibleInLegend: true
				// 	}
				// },
			}

		let chart_div;
		if (visual_setting.chart_type == 'scatterplot') {
			// chart_div = new google.charts.Scatter(chart.select("div.visual").node());
			// chart_div.draw(visual_data, google.charts.Scatter.convertOptions(options));
			chart_div = new google.visualization.ScatterChart($('div.visual', _$DIV)[0]);
		}
		else if (visual_setting.chart_type == 'bar') {
			// options["isStacked"] = "percent";
			chart_div = new google.visualization.ColumnChart($('div.visual', _$DIV)[0]);
		}

		function chartOnReady () {
			var title = visual_setting.getLegendTitle();
			// chart.select("div.chart_legend").html(title);
			// hack Google chart
			// assume the second g in svg[aria-label="A chart."] is the legend g group
			var legend_g = _d3_div.select('svg[aria-label="A chart."] > g');
			legend_g.append("text")
					.attr("x", legend_g.select("rect").attr("x"))
					.attr("y", legend_g.select("rect").attr("y") - 10)
					.html(title);
		}

		google.visualization.events.addListener(chart_div, 'ready', chartOnReady);
		chart_div.draw(visual_data, options);
	}

	// input:  array of variable
	// output: VisualSetting
	function _autoVisualSet(variables) {
		// adjust the variable order to make the plot consistent (hardcoded)
		// variables.sort(variable_sort_func(v => visual_order[v.name])); // needs improvements
		// filter out variables without data associated, then sort by id.
		variables.sort(sort_by_func(v => v.id));

		// decide visual_type based on variable type first
		_changeType(variables);

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
				visual_setting.x_vars.push(_DummyVariable);
				visual_setting.y_vars.push(numerical_vars[0]);
			}
			else if (categorical_vars.length) {
				visual_setting.chart_type = 'bar';
				visual_setting.x_vars.push(categorical_vars[0]);
				visual_setting.y_vars.push(_NumberVariable);
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
				visual_setting.y_vars.push(_NumberVariable);
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
					visual_setting.y_vars.push(_NumberVariable);
				}
			}
		}
		return visual_setting;
	}

	// Assumption: at most one binary variable 
	function _changeType(vars) {
		for (var i = vars.length - 1; i >= 0; i--) {
			vars[i]['visual_type'] = vars[i]['type'];
		};

		// separate variables by type
		var nominal_vars = [], ratio_vars = [], binary_vars = [];
		for (var i = 0; i < vars.length; i++) {
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

		let var_case = "" + nominal_vars.map(()=>"N") + binary_vars.map(()=>"B") + ratio_vars.map(()=>"R");
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
				// if there are more binary variables, set them to categorical to make bar graphs
				binary_vars.splice(1).forEach( v => v['visual_type'] = 'categorical');
			}
			else {
				// set all binary variables to be categorical
				binary_vars.forEach(v => v['visual_type'] = 'categorical');
			}
		}

		// switch (var_case) {
		// 	case 'NR':
		// 		ratio_vars[0]['visual_type'] = 'categorical';
		// 		break;
		// }
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
					if (typeof(col) === "string" && col !== _NumberVariable.name) {
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

	

	/////////////////////////////////////////////////////////////////////
	///// Public Functions //////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////

	// The init function that sets references to other modules
	function init(DATA, VICA, $DIV, COMPONENT_ID) {
		// set references
		_DATA = DATA;
		_VICA = VICA;
		_$DIV = $DIV;
		_COMPONENT_ID = COMPONENT_ID;

		// append a div.visual inside the _$DIV
		_$DIV.append($('<div class="visual">'));
	}

	

	return {
		init: init,
		drawViz: _drawViz,
	}
}