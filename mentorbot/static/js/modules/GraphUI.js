/*
	Controller for the Graph UI

	This controller has a linked CausalDiagram entity. The high level functions will update the causal diagram
	automatically to sync the states. However, it doesn't touch other parts of the system (hypothesis feature,
	data visualizations, etc.). It will call VICA functions if needed to propogate the changes to other features.


	Needed global objects: utils,
	Still global:

*/

'use strict';
;var GraphUI = (function(){
	// variables
	let _component_id; // will be given by VICA
	let _graph_id;
	let _svg_graph; // the d3 svg object this GraphUI is working on
	let _Variables; // the variables on the graph. Note that not necessary all variables are in the causal graph
	let _CausalDiagram = new CausalDiagram(); // the associated causal diagram
	let _VICA;
	let _configs;

	// let _default_variable_position = JSON.parse('[{"name":"Replied","id":0,"x":233.99999237060547,"y":484.0000343322754},{"name":"Category","id":1,"x":298.99999237060547,"y":15.000001907348633},{"name":"Month","id":2,"x":119.99999237060547,"y":125},{"name":"Hour","id":3,"x":200.00000762939453,"y":239.99998474121094},{"name":"Has Location","id":4,"x":446.99999237060547,"y":331},{"name":"Text Length","id":5,"x":513.0000228881836,"y":146},{"name":"Anonymous","id":6,"x":444.99999237060547,"y":34.00000762939453}]');
	let _default_variable_position = JSON.parse('[{"name":"Wear Level","id":0,"x":283,"y":323},{"name":"Year Built","id":1,"x":134,"y":258},{"name":"Size","id":2,"x":142,"y":118},{"name":"Price","id":3,"x":363,"y":205},{"name":"Neighborhood Safety","id":4,"x":293.4727280291532,"y":51.361656672384925},{"name":"Community Safety","id":0,"x":80.01226699373626,"y":66.31912322558293},{"name":"Physical Activity","id":1,"x":204.57348431004675,"y":42.486270565777204},{"name":"Face Mask Usage","id":11,"x":334.8579631695222,"y":41.392335172741014},{"name":"Risk of Getting COVID-19","id":7,"x":394.5678826882829,"y":143.10833768038793},{"name":"Frequency of Group Gatherings","id":10,"x":386.11339922245804,"y":268.4776844726049},{"name":"Mental Health","id":3,"x":278.91979226461206,"y":366.46167750117945},{"name":"Replied by Police","id":0,"x":183.99999364217123,"y":364.3333619435628},{"name":"Report Category","id":1,"x":249.1666603088379,"y":22.50000158945719},{"name":"Report Month","id":2,"x":99.99999364217122,"y":104.16666666666667},{"name":"Report Hour","id":3,"x":166.66667302449545,"y":199.99998728434244},{"name":"Provide GPS","id":4,"x":372.4999936421712,"y":275.8333333333333},{"name":"Report Length","id":5,"x":427.5000190734863,"y":121.66666666666667},{"name":"Is Anonymous","id":6,"x":370.8333269755046,"y":28.33333969116211}]')

	let _graph_ui_config = {
		'editable': true,
		'variable_shape': 'circle',
		'default_edge_width': 3,
		'variable_click_select': true,
		//// layout
		// 'none': There is no variable panel. A variable dragged out of the graph will be moved back to
		//         to the svg. A dialog can be triggered to ask if the user wants to remove the variable.
		// 'left': A variable panel is created on the left. When a variable is dragged back to the shelf,
		//         the variable will be removed from the diagram.
		'variable_panel': 'none',
		'graph_width': 500,
		'graph_height': 450,
		// 'nearest': When a user move a variable out of panel, move it to the nearest position in the panel.
		// 'delete': Remove the variable from the diagram
		'out_of_panel': 'nearest', // 'remove'
		////
		// 'variable_circle_r': 65/2,
		'variable_circle_r': 30/2,
		// 'variable_text_font_size': '0.75rem'; // not used yet
		// edge
		'get_edge_width': _edge_width_popularity, // or _edge_width_default, // a function that returns the edge based on the edge information
		'get_edge_color': {
			'default': '#5d4c46', // grey
			'highlighted': '#f99157', //'#d11800' red
			'selected': '#f99157',
			'difference_new': '#007bff', // or 'green',
			'difference_reverse': 'crimson',
			'supported': 'green',
			'not_supported': '#6c757d', // or 'crimson',
		}
	}

	let graph_mouse_mode = 'NORMAL' || 'DRAWLINE';
	let graph_edgehovered_variable = -1;
	let prev_edgehovered_variable = -1;
	let graph_hovered_variable = -1; // used for drawing a line to a new hovered variable
	let max_selected_nodes = 3;
	let prev_hovered_variable = -1;

	// layout parameters
	// Currently, all variables are default to circles
	let variable_margin = 5;
	// let variable_width = 65;
	// let variable_height = 65;
	let variable_width = _graph_ui_config.variable_circle_r * 2;
	let variable_height = _graph_ui_config.variable_circle_r * 2;
	let variable_radius = variable_width / 2;
	let working_line = variable_width + 2 * variable_margin + 1;

	//
	let _variable_text_margin = 10;

	var drag = d3.drag()
		.on('start', dragstart)
		.on('drag', dragging)
		.on('end', dragend);

	/////////////////////////////////////////////////////////////////////////////
	////////////////////////// Private Functions ////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////

	// a helper function that applies _graph_ui_config to local settings
	// function _applyGraphUIConfig() {
	// 	switch(_graph_ui_config.variable_panel) {
	// 		case 'left':

	// 			break;
	// 	}
	// }

	// update the variable settings. This function does not change actual UI so call this before anything
	// was drawn.
	function _changeVariableRadius(r) {
		variable_radius = r;
		variable_height = variable_width = r * 2;
		working_line = variable_width + 2 * variable_margin + 1;
	}


	////////////////////////// Pure UI Functions ////////////////////////////////

	// d3.select(this) is the 'g' associated with the variable.
	// This is because this function is called after .append('g'), for the purpose of having a global variable variable_gs
	// In the future if we don't need variable_gs, then it's possible to create 'g' in this function instead
	function ui_create_variable(d, i) {
		let g_d3 = d3.select(this);

		g_d3.attr('transform', function(d){ return 'translate(' + d.x + ',' + d.y + ')'})
			.classed('g-variable', true)
			.attr('selected', false)
			.attr('highlighted', false)
			.on('mouseenter', variable_mouseenter)
			.on('mouseleave', variable_mouseleave);

		if (_graph_ui_config.editable) {
			g_d3.call(drag)
				.on('click', variable_click);
		}

		// if (_graph_ui_config.variable_shape === 'rect') {
		if (d.variable_shape === 'rectangle') {
			g_d3.append('rect')
				.classed('rect-variable', true)
				.attr('width', variable_width)
				.attr('height', variable_height);
		}
		// else if (_graph_ui_config.variable_shape === 'circle') {
		else if (d.variable_shape === 'circle') {
			g_d3.append('circle')
				.classed('circle-variable', true)
				.attr('cx', variable_height/2)
				.attr('cy', variable_height/2)
				.attr('r', variable_height/2)
				.style('fill', function(d) {
					if (_graph_ui_config.visualize_stakeholder === true) {
						return _VICA.stakeholder_scale?.(d.stakeholder);
					}
					else return undefined;
				});
		}

		let text = g_d3.append('text')
			.attr('x', .5 * variable_width)
			// .attr('y', .5 * variable_height)
			.attr('y', -_variable_text_margin)
			.attr('alignment-baseline', 'middle')
			.attr('text-anchor', 'middle')
			.text(function(d) {return d.name;});
		// make_editable(text, d, 'name');
		// text.each(make_editable, 'name')

		// add background color
		let text_rect = g_d3.append('rect')
			.attr('x', text.node().getBBox().x)
			.attr('y', text.node().getBBox().y)
			.attr('width', text.node().getBBox().width)
			.attr('height', text.node().getBBox().height)
			.style('fill', 'rgba(256,255,255,0.5)');

		g_d3.insert(() => text_rect.remove().node(), 'text');

		// make text editable
		make_editable(g_d3, d, 'name');
	}

	// // to create single variable UI
	// function ui_create_variable_single(d, g_d3) {
	// 	g_d3.attr('transform', function(d){ return 'translate(' + d.x + ',' + d.y + ')'})
	// 		.classed('g-variable', true)
	// 		.attr('selected', false)
	// 		.attr('highlighted', false)
	// 		.on('mouseenter', variable_mouseenter)
	// 		.on('mouseleave', variable_mouseleave);
	//
	// 	if (_graph_ui_config.editable) {
	// 		g_d3.call(drag)
	// 			.on('click', variable_click);
	// 	}
	//
	// 	if (_graph_ui_config.variable_shape === 'rect') {
	// 		g_d3.append('rect')
	// 			.classed('rect-variable', true)
	// 			.attr('width', variable_width)
	// 			.attr('height', variable_height);
	// 	}
	// 	else if (_graph_ui_config.variable_shape === 'circle') {
	// 		g_d3.append('circle')
	// 			.classed('circle-variable', true)
	// 			.attr('cx', variable_height/2)
	// 			.attr('cy', variable_height/2)
	// 			.attr('r', variable_height/2)
	// 			.style('fill', function(d) {
	// 				if (_graph_ui_config.visualize_stakeholder === true) {
	// 					return _VICA.stakeholder_scale?.(d.stakeholder);
	// 				}
	// 				else return undefined;
	// 			});
	// 	}
	//
	// 	let text = g_d3.append('text')
	// 		.attr('x', .5 * variable_width)
	// 		// .attr('y', .5 * variable_height)
	// 		.attr('y', -_variable_text_margin)
	// 		.attr('alignment-baseline', 'middle')
	// 		.attr('text-anchor', 'middle')
	// 		.text(function(d) {return d.name});
	//
	// 	// add background color
	// 	let text_rect = g_d3.append('rect')
	// 		.attr('x', text.node().getBBox().x)
	// 		.attr('y', text.node().getBBox().y)
	// 		.attr('width', text.node().getBBox().width)
	// 		.attr('height', text.node().getBBox().height)
	// 		.style('fill', 'rgba(256,255,255,0.5)');
	//
	// 	g_d3.insert(() => text_rect.remove().node(), 'text');
	// }

// call to make variable title text editable
function make_editable(g_d3, d, field) {
  console.log("make_editable", arguments);
  g_d3.selectAll('text')
    .on("click", function(d) {
      var p = this.parentNode;
      console.log(this, arguments);

      // inject a HTML form to edit the content here...

      // bug in the getBBox logic here, but don't know what I've done wrong here;
      // anyhow, the coordinates are completely off & wrong. :-((
      var xy = this.getBBox();
      var p_xy = p.getBBox();

      xy.x -= p_xy.x;
      xy.y -= p_xy.y;

      var el = d3.select(this);
      var p_el = d3.select(p);

      var frm = p_el.append("foreignObject");

      var inp = frm
        .attr("x", xy.x)
        .attr("y", xy.y)
        .attr("width", 300)
        .attr("height", 25)
        .append("xhtml:form")
        .append("input")
        .attr("value", function() {
          // nasty spot to place this call, but here we are sure that the <input> tag is available
          // and is handily pointed at by 'this':
          this.focus();

          return d[field];
        })
        .attr("style", "width: 294px;")
        // make the form go away when you jump out (form looses focus) or hit ENTER:
        .on("blur", function() {
          console.log("blur", this, arguments);

          var txt = inp.node().value;

          d[field] = txt;
          el
            .text(function(d) {
              return d[field];
            });

          // Note to self: frm.remove() will remove the entire <g> group! Remember the D3 selection logic!
          p_el.select("foreignObject").remove();
        })
        .on("keypress", function() {
          console.log("keypress", this, arguments);

          // IE fix
          if (!d3.event)
            d3.event = window.event;

          var e = d3.event;
          if (e.keyCode == 13) {
            if (typeof(e.cancelBubble) !== 'undefined') // IE
              e.cancelBubble = true;
            if (e.stopPropagation)
              e.stopPropagation();
            e.preventDefault();

            var txt = inp.node().value;

            d[field] = txt;
            el
              .text(function(d) {
                return d[field];
              });

            // odd. Should work in Safari, but the debugger crashes on this instead.
            // Anyway, it SHOULD be here and it doesn't hurt otherwise.
            p_el.select("foreignObject").remove();
          }
        });
    });
}


	function _get_default_variable_position(variable) {
		for (var i = 0; i < _default_variable_position.length; i++) {
			let v = _default_variable_position[i];
			if (v.name === variable.name) {
				return {
					x: v.x,
					y: v.y,
				}
			}
		}

		// user-defined variables
		let graph_width = _graph_ui_config.graph_width,
			graph_height = _graph_ui_config.graph_height;

		// calculate the positions of the two variables
		// function noise(){
		// 	return Math.random() * variable_width * 2 - variable_width;
		// }
		// let from_position = {
		// 	x: (graph_width/2) - variable_width + noise(),
		// 	y: (150 + noise()) || (graph_height/2),
		// };
		// let to_position = {
		// 	x: from_position.x + 3 * variable_width + noise(),
		// 	y: from_position.y + noise(),
		// };
		return {
			x: Math.random() * (graph_width/2) + (graph_width/4),
			y: Math.random() * (graph_height/2) + (graph_height/4),
		}
	}

	function _defineMarkerEnd(marker_id, color) {
		let defs = _svg_graph.select('defs');
		defs.append('marker')
				.attr('id', marker_id)
				.attr('refX', 3)
				.attr('refY', 2)
				.attr('markerWidth', 4)
				.attr('markerHeight', 4)
				.attr('orient', 'auto')
			.append('polygon')
				.attr('points', '0 0, 4 2, 0 4')
				.attr('fill', color);
	}

	function _ui_set_link_color(link, color = 'black', temporary = false) {
		let marker_id = 'arrowend_' + _graph_id + '_' + color;

		// remove leading '#' in color
		if (color[0] === '#') {
			marker_id = 'arrowend_' + _graph_id + '_' + color.slice(1);
		}

		// if this is the first time having this color, add the marker of this color
		// defs is shared across multiple svg by ids, search for the entire page
		// NOTE: if the referenced marker is not displayed (display: none), the marker will not be shown
		// https://stackoverflow.com/questions/41137750/inline-svg-is-not-rendered-correctly-in-firefox-after-display-none-why
		// workaround: prepend graph_id in the marker id
		// another workaround is to create a shared and non-hidden svg across graphs, but that would require more maintenance
		if (_svg_graph.select('defs marker#' + marker_id).empty()) {
			_defineMarkerEnd(marker_id, color);
		}

		// apply color on the arrow and the marker-head
		link.style('stroke', color)
		    .attr('marker-end', 'url(#' + marker_id + ')');

		if (temporary === false) {
		    link.attr('_edge_color', color); // save a record
		}
	}

	// Each link has two attributes: 'selected' and 'highlighted'. When showing the UI, 'highlighted' has higher priority than 'selected'
	// example: ui_set_link(line_d3, 'selected', true), ui_set_link(line_d3, 'highlighted', false)
	function ui_set_link(link, attribute, status) {
		link.attr(attribute, status.toString());

		// update UI
		if (link.attr('highlighted') === 'true') {
			link.classed("highlight", true)
				.classed("selected", false);
			_ui_set_link_color(link, _graph_ui_config['get_edge_color']['highlighted'], true);
			// ^ set 'temporary' to true so this color will not be "memorized"
		}
		else if (link.attr('selected') === 'true') {
			link.classed("highlight", false)
				.classed("selected", true);
			_ui_set_link_color(link, _graph_ui_config['get_edge_color']['selected'], true);
			// ^ set 'temporary' to true so this color will not be "memorized"
		}
		else {
			link.classed("highlight", false)
				.classed("selected", false);
			_ui_set_link_color(link, link.attr('_edge_color') || _graph_ui_config.get_edge_color.default);
		}
	}

	// Each node has two attributes: 'selected' and 'highlighted'. When showing the UI, 'highlighted' has higher priority than 'selected'
	// example: ui_set_node(circle_d3, 'selected', true), ui_set_link(circle_d3, 'highlighted', false)
	// This is a low-level function that only manipulates a single element. If you need the logic to select a node and unselect else, use
	// ui_select_nodes()
	function ui_set_node(g_variable, attribute, status) {
		// also set the status in the data and g_variable attributes
		g_variable.attr(attribute, status.toString());
		g_variable.datum()[attribute] = status;

		// update UI
		if (g_variable.attr('highlighted') === 'true') {
			g_variable.select('circle.circle-variable')
				.classed("highlight", true)
				.classed("selected", false);
		}
		else if (g_variable.attr('selected') === 'true') {
			g_variable.select('circle.circle-variable')
				.classed("highlight", false)
				.classed("selected", true);
		}
		else {
			g_variable.select('circle.circle-variable')
				.classed("highlight", false)
				.classed("selected", false);
		}
	}

	// A utility function based on ui_set_link and ui_set_node
	// It 'select' the link and the two variables, while 'unselect' other links and variables.
	// This can be re-written to use ui_select_nodes under the hood
	function ui_select_link(link) {
		// update line color
		_svg_graph.selectAll("line.line-relation").each(function() {
			let this_line = d3.select(this);
			if (this_line.attr('id') === link.attr('id')) {
				ui_set_link(this_line, 'selected', true);
			}
			else {
				ui_set_link(this_line, 'selected', false);
			}
		});


		// update UI (highlight the two variables and update d['selected'] )
		_svg_graph.selectAll("g.g-variable").each(function(d) {
			if (d.id == link.attr('lid') || d.id == link.attr('rid')) {
				ui_set_node(d3.select(this), 'selected', true);
			}
			else {
				ui_set_node(d3.select(this), 'selected', false);
			}
		});
	}

	// A utility function based on ui_set_link and ui_set_node
	// A user can selects multiple nodes, up to a predefined threshold
	function ui_select_nodes(nodes) {
		// check if # of nodes is valid
		if (nodes.length > max_selected_nodes) {
			console.warn('select more than ' + max_selected_nodes + ' nodes');
			util.showAlert({
				text: `You cannot select more than ${max_selected_nodes} variables.`,
				classes: 'alert-warning',
			})
			return;
		}

		let selected_vids = (nodes.length === 0) ? [] : nodes.data().map(d => d.id);

		// when you select nodes, you also selects all the links among them and unselect everything else
		// update links
		_svg_graph.selectAll("line.line-relation").each(function() {
			let this_line = d3.select(this);
			let lid = parseInt(this_line.attr('lid')),
				rid = parseInt(this_line.attr('rid'));
			if (selected_vids.includes(lid) && selected_vids.includes(rid)) {
				ui_set_link(this_line, 'selected', true);
			}
			else {
				ui_set_link(this_line, 'selected', false);
			}
		});

		// update nodes
		_svg_graph.selectAll("g.g-variable").each(function(d) {
			if (selected_vids.includes(d.id)) {
				ui_set_node(d3.select(this), 'selected', true);
			}
			else {
				ui_set_node(d3.select(this), 'selected', false);
			}
		});

		// LOG
		saveLog("SELECT_VARS", {
			var_names: selected_vids.map(id => _Variables[id].name),
			var_ids: selected_vids,
			CR_ID: _VICA?._ID,
		})
	}

	// drag start callback for variable g
	function dragstart(d, i) {

	}

	// dragging callback for variable g
	function dragging(d, i) {
		// move variable g
		d.x += d3.event.dx
		d.y += d3.event.dy
		d3.select(this).attr('transform', function(d){ return 'translate(' + d.x + ',' + d.y + ')'})

		// update lines if active (active means the variable is in graph component)
		if (d.active) {
			updateLineOfVariable(d);
		}
	}

	// Based on the x, y, and the layout, determine whether the variable should be kept active (in the diagram).
	// If not active, it also returns the nearest position to make it active (to animate it back).
	function _isVariableActive(x, y) {
		// this logic currently supports only two variable_panel types: 'none' and 'left'
		let left = _graph_ui_config.variable_panel === 'none'? 0 : working_line,
			top = 0,
			right = _graph_ui_config.graph_width,
			bottom = _graph_ui_config.graph_height;

		if (x > left && x < right && y > top && y < bottom) {
			return {
				'is_active': true,
			}
		}
		else {
			let margin = 1;
			let new_x = (x < left)? (left + margin) :
			            (x > right)? (right - variable_radius*2 - margin) : x;
			let new_y = (y < top)? (top + _variable_text_margin + 5 + margin) :
			            (y > bottom)? (bottom - variable_radius*2 - margin) : y;

			return {
				'is_active': false,
				'nearest_pos': {
					'x': new_x,
					'y': new_y,
				}
			}
		}
	}

	// drag end callback for variable g, // d: data, i: index of the variable
	function dragend(d, i) {
		// let is_active =  _graph_ui_config.variable_panel === 'none' (d.x > working_line)
		let condition = _isVariableActive(d.x, d.y);

		if (condition.is_active) {
			d.active = true;

			if (_configs.position_fixed) {
				// move to the nearest default position
				var pos = findNearestPosition(graph_default_positions, d);
				pos.occupied = d;
				// d.position = pos.id;
				d.x = pos.x;
				d.y = pos.y;
			}
			else {
				// TODO move back into the panel if a variable is out of reach

				// d.position = {
				// 	x: d.x,
				// 	y: d.y,
				// }
			}

			d3.select(this).transition()
			  .attr('transform', function(d){ return 'translate(' + d.x + ',' + d.y + ')'})
			  .on('end', function(){
				// the variable was not active before dragging
				if (!d.active) {
					// disable auto connecting
					// // draw lines to other working variables
					// _Variables.forEach(function(d2, i2) {
					// 	if (d2.x > working_line && i2 != i) {
					// 		drawline(d, d2);
					// 	}
					// })

				}
			})

			_CausalDiagram.update_diagram('set', 'node', {'name': d.name, 'vid': d.id, 'x': d.x, 'y': d.y});
			_VICA.updateDiagram?.('set', 'node', {'name': d.name, 'vid': d.id, 'x': d.x, 'y': d.y}, _component_id);

			// transit lines
			updateLineOfVariable(d);
		}
		else {
			if (_graph_ui_config.out_of_panel === 'nearest') {
				// move the node back to the nearest position
				move_node(d.id, condition.nearest_pos, 100);
			}
			else { // _graph_ui_config.out_of_panel === 'remove'

				// unselect the variable if it is selected
				if (d.selected) {
					// toggle rect (UI)
					// d3.select(this).select('rect').classed('selected', false);
					d3.select(this).select('circle').classed('selected', false);
					d.selected = false;

					// update visual
					// selected_vars = d3.selectAll('rect.selected').data();
					let selected_vars = _svg_graph.selectAll('circle.selected').data().filter(d => d.key !== '');
					if (selected_vars.length == 0) return;

					// if (_configs.data_visualization === true) {
					// 	let visual_setting = autoVisualSet(selected_vars);
					// 	updateChartVisualSetting('chart1', visual_setting);
					// }
					_VICA.selectVariables?.(selected_vars, _component_id);
				}

				// remove the node from _CausalDiagram
				if (_CausalDiagram.find_node(d.id)) {
					_CausalDiagram.update_diagram('delete', 'node', {"vid": d.id});
					_VICA.updateDiagram?.('delete', 'node', {'vid': d.id}, _component_id)
				}

				// remove the associated lines
				_svg_graph.selectAll("line[lid='" + d.id + "']").each(function(){
					let line_d3 = d3.select(this);
					let lid = line_d3.attr('lid');
					let rid = line_d3.attr('rid')
					_deleteEdge(lid, rid); // UI and _CausalDiagram
					_VICA.updateDiagram?.('delete', 'edge', {vid_from: lid, vid_to: rid}, _component_id); // VICA update
				});
				_svg_graph.selectAll("line[rid='" + d.id + "']").each(function(){
					let line_d3 = d3.select(this);
					let lid = line_d3.attr('lid');
					let rid = line_d3.attr('rid')
					_deleteEdge(lid, rid); // UI and _CausalDiagram
					_VICA.updateDiagram?.('delete', 'edge', {vid_from: lid, vid_to: rid}, _component_id); // VICA update
				});

				// move back to original position
				d3.select(this).transition().attr('transform', function(d){ d.x = 5; d.y = d['default_y']; return 'translate(' + d.x + ',' + d.y + ')'})
				d.active = false;

			}

		}

		// after setting the final position
		// d.position = {x: d.x, y: d.y};
	}

	// the lines are drawn from center to center
	function updateLineOfVariable_center(d) {
		_svg_graph.selectAll("line[lid='" + d.id + "']").each(function(){
			d3.select(this)
				.attr("x1", d.x + .5 * variable_width)
				.attr("y1", d.y + .5 * variable_height)
		})
		_svg_graph.selectAll("line[rid='" + d.id + "']").each(function(){
			d3.select(this)
				.attr("x2", d.x + .5 * variable_width)
				.attr("y2", d.y + .5 * variable_height)
		})
	}

	// the lines are drawn from edge to edge
	function updateLineOfVariable(d) {
		_svg_graph.selectAll("line[lid='" + d.id + "' ], line[rid='" + d.id + "' ]").each(function(){
			var this_line = d3.select(this);
			_update_edge_points(this_line);
		})
	}

	function _update_edge_points(edge_d3) {
		var this_line = edge_d3;
		var id1 = this_line.attr("lid");
		var id2 = this_line.attr("rid");

		var r = variable_width/2, d1 = _Variables[id1], d2 = _Variables[id2];
		// let points = util.circleCentersToEdges({x: d1.x + r, y: d1.y + r}, {x: d2.x + r, y: d2.y + r},r);
		let points = _get_arrow_between_nodes(d1, d2);

		// do not use transition here; otherwise when variables are dragged the update would be too slow
		this_line
			.attr("x1", points.p1.x)
			.attr("y1", points.p1.y)
			.attr("x2", points.p2.x)
			.attr("y2", points.p2.y);
	}

	function variable_click(d) {
		d3.event.stopPropagation(); // stop propagation; otherwise, graph_click will be called and unselect arrows

		// if (_configs.variable_click_select === true) {
		if (_graph_ui_config.variable_click_select) {
			// do nothing if the variable is not active (in treatment group)
			// if (_configs.condition !== 'control' && !d.active) { return }

			// use the 'selected' attribute in data to check the count
			let selected_vars = _svg_graph.selectAll("g.g-variable").data().filter(d=>d.selected);
			let is_selecting = d.selected === false;

			// do nothing if there are already three selected variables when adding another one
			if (selected_vars.length >= max_selected_nodes && is_selecting) { return }

			let new_selected_vars = [];
			if (is_selecting) {
				new_selected_vars = [...selected_vars, d];
			}
			else {
				new_selected_vars = selected_vars.filter(v => v.id !== d.id);
			}
			let new_selected_nodes = _svg_graph.selectAll("g.g-variable").filter(v => new_selected_vars.map(d => d.id).includes(v.id));

			ui_select_nodes(new_selected_nodes);

			// // toggle rect (UI)
			// var variable_g = d3.select(this);
			// d['selected'] = !d['selected'];
			// // variable_g.select("rect").classed("selected", d['selected']);
			// variable_g.select("circle").classed("selected", d['selected']);

			// // toggle line (UI)
			// d3.selectAll("line.line-relation").classed("selected", function(){
			// 	var this_line = d3.select(this);
			// 	var id1 = this_line.attr("lid");
			// 	var id2 = this_line.attr("rid");
			// 	return ( _Variables[id1].selected && _Variables[id2].selected );
			// })

			// log
			if( is_selecting ) {
				// saveLog("SELECT_VAR", d.name);
			}
			else {
				// saveLog("UNSELECT_VAR", d.name);
			}

			// update visualization if at least one variable is selected
			// selected_vars = d3.selectAll("rect.selected").data();
			selected_vars = _svg_graph.selectAll("circle.selected").data().filter(d => d.key !== '');
			if (selected_vars.length == 0) return;

			_VICA.selectVariables?.(selected_vars, _component_id);
		}


	}

	// click callback for relation line
	function relationClick() {
		// handling the case that the click handler function is invoked programmatically
		// In the long run, this should be handled by separating click handler and pure UI function
		if (d3.event !== null) {
			// Actually, no idea why we need to stop propagation here
			d3.event.stopPropagation();
		}

		let line_d3 = d3.select(this);

		var id1 = line_d3.attr("lid");
		var id2 = line_d3.attr("rid");

		// log
		// let msg = {"var1": _Variables[id1].name, "var2": _Variables[id2].name}
		// saveLog("SELECT_LINE", msg);

		// update line color
		ui_select_link(line_d3);

		// set hypothesis list highlight
		_VICA.selectArrow?.(id1, id2, _component_id);

		// update chart
		// selected_vars = d3.selectAll("rect.selected").data();
		// let selected_vars = _svg_graph.selectAll("circle.selected").data().filter(d => d.key !== '');

		// if (_configs.data_visualization === true) {
		// 	let visual_setting = autoVisualSet(selected_vars);
		// 	updateChartVisualSetting("chart1", visual_setting);
		// }

		// if (_configs.data_regression) {
		// 	mainRegressionFeature.autoRegressions(selected_vars);
		// }

		let v1 = _Variables[id1], v2 = _Variables[id2];
		saveLog("CLICK_ARROW", {
			name_from: v1.name,
			name_to: v2.name,
			id_from: v1.id,
			id_to: v2.id,
			CR_ID: _VICA?._ID,
		})
	}

	function finish_drawing_edge() {
		// console.log(graph_mouse_mode);
		if (graph_mouse_mode === 'DRAWLINE') {
			// NOTE: do not reset graph_mouse_mode here. 'click' event will be triggered after 'mouseup' event.
			//       reset the mode there; otherwise, it will trigger an click event on the background (unselect arrows).
			// graph_mouse_mode = 'NORMAL';

			// if the mouse is hovering over another variable, set the actual line
			if (graph_hovered_variable !== -1) {
				var r = variable_width/2;
				let d1 = _Variables[graph_edgehovered_variable], d2 = _Variables[graph_hovered_variable];
				let points = _get_arrow_between_nodes(d1, d2);

				let duplicated = !_svg_graph.select('line#V' + d1.id + 'toV' + d2.id).empty();

				_svg_graph.select("line#drawingline")
					.call(function(line, vid_to) {
						// // Move the element to be right before of the end variable
						// // This solves the order at arrow end; however, not the arrow head.
						// // It is impossible to address both the order issue at arrow head and end
						// // (considering v1 -> v3, v2 is covered by v3 so should be covered by the line;
						// //  but it also covers v1 so it should cover the line.)
						// _svg_graph.insert(() => line.remove().node(), 'g.g-variable#v' + vid_to);

						// the above issues doesn't exist as now the arrows are coming out from edges
						// insert before the nodes to make sure node text can be read
						_svg_graph.insert(() => line.remove().node(), 'g.g-variable');
					}, d2.id)
					.attr('id', 'V' + d1.id + 'toV' + d2.id)
					.attr("lid", d1.id)
					.attr("rid", d2.id)
					.attr('selected', 'false')
					.attr('highlighted', 'false')
					.classed("line-relation", true)
					.on("click", relationClick)
					.transition()
					.ease(d3.easeLinear)
					.on('start', function() {
						// save the new edge to causal diagram
						_CausalDiagram.update_diagram('set', 'edge',
							{
								"vid_from": d1.id,
								"vid_to": d2.id,
								"info": {
									"own": {
										"narrative": "",
										"magnitude": 3,
									}
								}
							});
						_VICA.updateDiagram?.('set', 'edge',
							{
								"vid_from": d1.id,
								"vid_to": d2.id,
								"info": {
									"own": {
										"narrative": "",
										"magnitude": 3,
									}
								}
							}, _component_id);

						// update the reversed edge if needed
						// _update_edge_points() has to be called after the _CausalDiagram is updated
						if (link_exists(d2.id, d1.id)) {
							_update_edge_points(get_link(d2.id, d1.id));
						}

						// highlight the line
						ui_select_link(d3.select(this));

						// LOG
						saveLog('ADD_ARROW', {
							name_from: d1.name,
							name_to: d2.name,
							id_from: d1.id,
							id_to: d2.id,
							CR_ID: _VICA?._ID,
						})

					})
					.attr("x1", points.p1.x)
					.attr("y1", points.p1.y)
					.attr("x2", points.p2.x)
					.attr("y2", points.p2.y)
					.on('end', function(){
						// console.log('ENDENDENDENDENDENDENDENDENDEND')
						if (duplicated) {
							// remove if there is a duplicate arrow
							d3.select(this).remove();
						}

						// do this after _VICA.updateDiagram() as that function needs to generate the hypothesis item first
						// do not put this in the 'start' event because the this function is heavy and will cause big delay
						// in the UI (the arrow will be colored after a delay)
						_VICA.selectArrow?.(d1.id, d2.id, _component_id);
					})

				dehighlightEdgeHoveredVariable(graph_hovered_variable);
				dehighlightEdgeHoveredVariable(graph_edgehovered_variable);

				graph_hovered_variable = -1; // reset
			}
			else {
				_svg_graph.select('line#drawingline').remove();
			}
		}
	}





	function graph_mousedown_callback() {
		// console.log('graph_mousedown_callback');

		// start drawing line while mouse is hovering on edge of a avariable
		if (graph_edgehovered_variable !== -1) {
			// if the line is being drawn, skip the drawing action (this may happen when the mouse leaves the graph
			// while drawing and release (mouseup), then move back into the graph. The drawing behavior should continue.)
			if (_svg_graph.select('line#drawingline').size()) return;

			let mouse_p = {};
			[mouse_p.x, mouse_p.y] = d3.mouse(this);
			let points = {p1: mouse_p, p2: mouse_p};
			let variable_id = graph_edgehovered_variable;

			// enter 'DRAWLINE' mode, leave after mouseup
			graph_mouse_mode = 'DRAWLINE';
			_svg_graph.append("line") // don't insert before variables, otherwise the arrow will be blocked by variables when dragging
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


	function graph_mousemove_callback() {
		var mouse_p = {};
		[mouse_p.x, mouse_p.y] = d3.mouse(this);

		if (mouse_p.x < working_line) {
			// return
		}

		if (graph_mouse_mode === 'NORMAL') {

			if (_graph_ui_config.editable) {
				// check if the mouse is hovering on the edge of a variable, find the variable id
				var edge_threshold = 10, min_distance = 9999, min_id = -1;
				// do not allow drawing lines when any variable is hovered
				if ( true) {
					// _svg_graph.selectAll('circle.circle-variable').each(function(d, i) {
					_svg_graph.selectAll('circle.circle-variable,rect.rect-variable').each(function(d, i) {
						var r = variable_width/2;
						// console.log(d3.select(this).data()[0]);
						var v = d3.select(this).data()[0]; // the x, y saved in variable is the top left corner
						var dist = util.distanceP2P(mouse_p, {x: v.x+r, y: v.y+r}) - r; // this assumes that the circle is placed top left in the 'g'
						// console.log(dist);

						// the mouse should be out of the circle within a distance
						if (v.active && dist > 0 && dist <= edge_threshold && dist < min_distance) {
							// if a variable is "hovered" (the mouse is right on the edge and can trigger dragging function), return
							min_distance = dist;
							min_id = i;
						}
					})
				}
				// if (min_id !== -1) console.log(_Variables[min_id].name)

				// found edge-hovered variable
				prev_edgehovered_variable = graph_edgehovered_variable
				graph_edgehovered_variable = min_id;
				if (min_id !== -1) {

					// console.log(_Variables[min_id].name);
					// de-highlight everything
					_svg_graph.selectAll("line.line-relation.highlight").each(function() {
						ui_set_link(d3.select(this), 'highlighted', false);
					});
					// d3.selectAll("rect.highlight").each(function() { d3.select(this).classed("highlight", false); });
					_svg_graph.selectAll("circle.highlight").each(function() { d3.select(this).classed("highlight", false); });

					// highlight the variable edge
					// DO NOT directly make the variable stroke-width wider:
					// 		this messes up with variable dragging feature (the 'wider' stroke makes the mouse 're-enter' the circle and enable hovering dragging behavior when the mouse is still near the edge)
					// INSTEAD, draw a separate stroke on top of the chart and remove it when the drawing is done
					if (prev_edgehovered_variable !== -1 && prev_edgehovered_variable !== min_id) {
						dehighlightEdgeHoveredVariable(prev_edgehovered_variable);
					}
					highlightEdgeHoveredVariable(min_id);


					_svg_graph.style('cursor', 'ne-resize');
					// return
					return
				}
				else {
					if (prev_edgehovered_variable !== -1) {
						dehighlightEdgeHoveredVariable(prev_edgehovered_variable);
					}
				}

			}


			// if the mouse is hovering on a variable, de-highlight lines and return
			if (!_svg_graph.select("g.g-variable[hovered=true]").empty()) {

				_svg_graph.selectAll("line.line-relation.highlight").each(function() {
					ui_set_link(d3.select(this), 'highlighted', false);
				});

				// d3.selectAll("rect.highlight").each(function() { d3.select(this).classed("highlight", false); });
				_svg_graph.selectAll("circle.highlight").each(function() { d3.select(this).classed("highlight", false); });
				_svg_graph.style('cursor', 'default');
				return
			}

			// calculate the distances of all relation lines
			var threshold = 20, closest_dist = 9999, closest_line_i = -1;
			_svg_graph.selectAll("line.line-relation").each(function(d, i) {
				var dist = util.distanceP2Line(mouse_p, d3.select(this));
				if (dist < threshold && dist < closest_dist) {
					closest_dist = dist;
					closest_line_i = i;
				}
			})
			_svg_graph.selectAll("line.line-relation").each(function(d, i) {
				let this_line = d3.select(this);

				if ( i == closest_line_i ) {
					if (this_line.attr("highlighted") == "false") {
						ui_set_link(this_line, 'highlighted', true);

						// update rect color
						var id1 = this_line.attr("lid");
						var id2 = this_line.attr("rid");
						// d3.selectAll("rect.rect-variable").classed("highlight", function(d){
						_svg_graph.selectAll("circle.circle-variable").classed("highlight", function(d){
							return (d.id == id1 || d.id == id2)? true : false;
						});
					}
				}
				else {
					if ( this_line.attr("highlighted") == "true") {
						ui_set_link(this_line, 'highlighted', false);

						// update rect color
						var id1 = this_line.attr("lid");
						var id2 = this_line.attr("rid");
						// d3.selectAll("rect.rect-variable").classed("highlight", false);
						_svg_graph.selectAll("circle.circle-variable").classed("highlight", false);
					}
				}
			})
			_svg_graph.style('cursor',  (closest_line_i == -1)? 'default' : 'pointer');
		}
		else if (graph_mouse_mode === 'DRAWLINE') {
			// update the line
			_svg_graph.select("line#drawingline")
				.attr("x2", mouse_p.x)
				.attr("y2", mouse_p.y);

			// check whether mouse is hovering over (near) some variable
			var hover_threshold = 5, min_distance = 9999, min_id = -1;
			// _svg_graph.selectAll('circle.circle-variable').each(function(d, i) {
			_svg_graph.selectAll('circle.circle-variable,rect.rect-variable').each(function(d, i) {
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

	// only one of 'mouseup' and 'click' event needs to be registered, as click() is always fired after 'mouseup'
	function graph_mouseup_callback() {
		// console.log('graph_mouseup_callback', graph_mouse_mode);

		// // finishing drawing line
		// if (graph_mouse_mode === 'DRAWLINE') {
		// 	finish_drawing_edge();
		// }
	}

	function graph_click() {
		// console.log("graph clicked", graph_mouse_mode);

		// Finishing drawing line
		// This happens when the mouse moved out of the canvas and release, but then move back to continue drawing.
		// In that case, only graph_click() will be fired but no graph_mouseup()
		if (graph_mouse_mode === 'DRAWLINE') {
			finish_drawing_edge();
			graph_mouse_mode = 'NORMAL';
		}

		else {
			// click the line that is 'hovered'
			let highlighted_line = _svg_graph.select("line.line-relation.highlight")
			if (highlighted_line.size()) {
				highlighted_line.each(relationClick);
			}
			else {
				// unselect all edges
				_svg_graph.selectAll("line.line-relation").each(function() {
					ui_set_link(d3.select(this), 'selected', false);
				});

				// unselect all nodes
				_svg_graph.selectAll("g.g-variable").each(function() {
					ui_set_node(d3.select(this), 'selected', false);
				});
				_VICA.selectArrow?.(undefined, undefined, _component_id);
			}
		}
	}

	// UI: creates a link from vid_from to vid_to
	//
	// v_from: []
	// note it uses the the x and y attributes of the variables so if the nodes are moving, the position might be wrong.
	// In the above case, use callback function to make sure it's correct.
	async function create_link(v_from, v_to, duration, e) {
		// no animation
		if (duration === undefined) { duration = 0; }

		// accept 1, '1', Variables[1]
		let d1 = (typeof(v_from) === 'object') ? v_from : _Variables[v_from];
		let d2 = (typeof(v_to)   === 'object') ? v_to   : _Variables[v_to];

		let r = variable_width/2;
		// let points = util.circleCentersToEdges({x: d1.x + r, y: d1.y + r}, {x: d2.x + r, y: d2.y + r},r);
		let points = _get_arrow_between_nodes(d1, d2);

		return _svg_graph.append("line")
			// // don't insert before variables, otherwise the arrow will be blocked by variables when dragging
			// insert before variables, so that the text of the variables can be seen
			.call(function(line) {
				_svg_graph.insert(() => line.remove().node(), 'g.g-variable');
			})
			.attr('id', 'V' + d1.id + 'toV' + d2.id)
			.attr("x1", points.p1.x)
			.attr("y1", points.p1.y)
			.attr("x2", points.p1.x)
			.attr("y2", points.p1.y)
			.attr("lid", d1.id)
			.attr("rid", d2.id)
			.style("stroke", _graph_ui_config['get_edge_color']['default'])
			.attr("marker-end", "url(#arrowend)")
			.classed("line-relation", true)
			.attr('selected', 'false')
			.attr('highlighted', 'false')
			.on("click", relationClick)
			.transition()
			.duration(duration)
			.attr("x2", points.p2.x)
			.attr("y2", points.p2.y)
			.style("stroke-width", _graph_ui_config['get_edge_width'](e) + 'px')
			.on('end', function(){
				// save the new edge to causal diagram

			})
			.end();
	}

	function get_link(vid_from, vid_to) {
		return _svg_graph.select('line[lid="' + vid_from + '"][rid="' + vid_to + '"]');
	}

	function link_exists(vid_from, vid_to) {
		return !(get_link(vid_from, vid_to).empty());
	}

	function debug_color_link(vname_from, vname_to, color) {

	}



	function variable_mouseenter() {
		d3.select(this).attr('hovered', true);
		let variable = d3.select(this).datum();
		_VICA.showVariableDetail?.(variable);
	}

	function variable_mouseleave() {
		d3.select(this).attr('hovered', false);
	}

	// Update the starting and ending point of all edges
	function _refresh_all_edge_points() {
		_svg_graph.selectAll('line.line-relation').each(function(d) {
			_update_edge_points(d3.select(this));
		})
	}


	function _refresh_all_edge_width() {
		_CausalDiagram.causal_diagram.edges.forEach(function(e) {
			get_link(e.id_from, e.id_to).style("stroke-width", _graph_ui_config['get_edge_width'](e) + 'px');
		})
	}


	// append a hollow circle on the variable to highlight it
	// the reason not to adjust stroke-width of original circle is to avoid mouse-entering issue
	// note: if we add another circle in the variable g, that circle will become 'draggable' as well
	function highlightEdgeHoveredVariable(v_id) {
		// graph.select('g.g-variable').filter(function(d){ return d.id === v_id})
		// 	.select('circle')
		// 	.style('stroke-width', '4px');

		// _svg_graph.select('g.g-variable').filter(function(d){ return d.id == v_id})
		_svg_graph.insert('circle', 'g.g-variable#v' + v_id + ' + *') // 'g + *' means select the next sibling of g
			// .insert('circle')
			.attr('id', 'v'+v_id)
			.attr('cx', _Variables[v_id].x + variable_radius)
			.attr('cy', _Variables[v_id].y + variable_radius)
			// .attr("cx", variable_height/2)
			// .attr("cy", variable_height/2)
			.attr('r', variable_radius)
			.classed('edge-hovered', true);
	}

	function dehighlightEdgeHoveredVariable(v_id) {
		_svg_graph.selectAll('circle.edge-hovered#v'+v_id).remove();

		// graph.select('g.g-variable').filter(function(d){ return d.id === v_id})
		// 	.select('circle')
		// 	.style('stroke-width', undefined);

	}

	// Update UI and _CausalDiagram
	function _deleteEdge(vid_from, vid_to) {
		_CausalDiagram.update_diagram('delete', 'edge', {vid_from: vid_from, vid_to: vid_to});

		// update UI
		let line_d3 = get_link(vid_from, vid_to);
		if (line_d3.empty()) {
			console.warn('[GraphUI] delete an edge that is not found.');
			return;
		}

		if (line_d3.attr('selected') === 'true') {
			_svg_graph.selectAll('g.g-variable').each(function(d) {
				if (d.id == vid_from || d.id == vid_to) {
					ui_set_node(d3.select(this), 'selected', false);
				}
			});
		}
		line_d3.remove();

		// update reversed edge
		let reversed_edge = get_link(vid_to, vid_from);
		if (!reversed_edge.empty()) {
			_update_edge_points(reversed_edge);
		}
	}

	// draw a line from dvariable 1 to variable 2 (center to center)
	function drawline_center(d1, d2) {
		_svg_graph.insert("line", "g.g-variable")
			.attr("x1", d1.x + .5 * variable_width)
			.attr("y1", d1.y + .5 * variable_height)
			.attr("x2", d2.x + .5 * variable_width)
			.attr("y2", d2.y + .5 * variable_height)
			.attr("lid", d1.id)
			.attr("rid", d2.id)
			.attr('selected', 'false')
			.attr('highlighted', 'false')
			.classed("line-relation", true)
			.on("click", relationClick)
	}

	// draw a line from dvariable 1 to variable 2 (edge to edge
	function drawline(d1, d2) {
		var r = variable_width/2;
		// points = util.circleCentersToEdges({x: d1.x + r, y: d1.y + r}, {x: d2.x + r, y: d2.y + r},r);
		let points = _get_arrow_between_nodes(d1, d2);

		_svg_graph.insert("line", "g.g-variable")
			.attr('id', 'V' + d1.id + 'toV' + d2.id)
			.attr("x1", points.p1.x)
			.attr("y1", points.p1.y)
			.attr("x2", points.p2.x)
			.attr("y2", points.p2.y)
			.attr("lid", d1.id)
			.attr("rid", d2.id)
			.attr("marker-end", "url(#arrowend)")
			.attr('selected', 'false')
			.attr('highlighted', 'false')
			.classed("line-relation", true)
			.on("click", relationClick)
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
		shadow_rects = _svg_graph.selectAll("rect.rect-shadow").data(graph_default_positions).enter()
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



	function _edge_width_default(e) {
		return _graph_ui_config['default_edge_width'];
	}

	function _edge_width_popularity(e) {
		if (e.info) {
			if (e.info.crowd) {
				let peer_count = e.info.crowd.peer_count;
				let peer_total = e.info.crowd.peer_total;
				return Math.max((peer_count / peer_total * 8), 1.5);
			}
			else {
				// fall back to _edge_width_default
				return _edge_width_default(e);
			}

		}
		else {
			console.log('error: no popularity information');
			return _edge_width_default(e);
		}
	}


	/////////////////////////////////////////////////////////////////////////////
	////////////////////////// Public Functions /////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////

	// This function initializes the svg based on Variables with parameters in configs
	// It resets the id, x, y, and all other attributes of the variables in place.
	// VICA serves as the communication point from GraphUI to outside world. GraphUI calls VICA functions
	// when certain actions are done.
	//
	// graph_id: a unique id across graphs
	function init(graph_id, svg_graph, Variables, VICA, configs, component_id) {
		// set references
		_component_id = component_id;
		_graph_id = graph_id; // this is used to create UI elements that have different IDs with other graphs.
		_svg_graph = svg_graph; // assume that the id of the svg_graph is already set

		// The following variables are actually global, so it doesn't make lots of sense to copy the references here.
		// However, in case that the status of these variables are going to be deviated from the global ones, then we
		// should be able to simply deep copy these variables to achieve so.
		_Variables = Variables;
		// _Variables = JSON.parse(JSON.stringify(Variables)); // deep copy the variables
		_VICA = VICA;
		_configs = configs;
		if (VICA.mainCausalDiagram !== undefined) {
			_CausalDiagram = VICA.mainCausalDiagram;
		}

		if (configs.graph_ui_configs) {
			if (configs.graph_ui_configs.variable_circle_r) {
				_changeVariableRadius(configs.graph_ui_configs.variable_circle_r);
			}
		}

		let sl = _configs.systemLayout;
		_graph_ui_config.graph_width = sl?.graph_width ?? _graph_ui_config.graph_width;
		_graph_ui_config.graph_height = sl?.graph_height ?? _graph_ui_config.graph_height;


		// set up graph_container graph width, height (attribute list and graph component)
		// set it to 100% width and height
		_svg_graph
			.attr('width', '100%')
			.attr('height', '100%')
			.on('click', graph_click)
			.on('mousemove', graph_mousemove_callback)
			.on('mousedown', graph_mousedown_callback)
			// .on('mouseup', graph_mouseup_callback)

		// find and set the actual width and size
		let actual_width = +(_svg_graph.style('width').replace("px", "")),
			actual_height = +(_svg_graph.style('height').replace("px", ""));

		if (isNaN(actual_width) || actual_width === 0) {
			// this happens when the interface is not shown on the screen (hidden)
			// try other things to handle this
		}
		else {
			_graph_ui_config.graph_width = actual_width;
			_graph_ui_config.graph_height = actual_height;
		}




		// draw dividing line
		if (_graph_ui_config.variable_panel === 'left') {
			let graph_dividing_line = _svg_graph.append('line')
				.attr('id', 'dividing_line')
				.attr('x1', working_line)
				.attr('y1', 0)
				.attr('x2', working_line)
				.attr('y2', _graph_ui_config.graph_height)
				.style('stroke-width', 2)
				.style('stroke', 'black');

			// expand middle panel
			// not a good coding practice, but works for now
			let height_needed = variable_margin + (variable_height+variable_margin) * _Variables.length;
			if (height_needed > _graph_ui_config.graph_height) {
				_svg_graph.attr("height", height_needed);
				graph_dividing_line.attr("y2", height_needed);
				_VICA.setMiddlePanelHeight?.(height_needed);
			}
		}

		// update x, y position for each Variables
		if (_graph_ui_config.variable_panel === 'none') {
			// trick: place the variables far away from the panel so they are not seen.
			//        Otherwise, even when they are set invisible, some features needs to be fixed (edge hovering a variable)
			_Variables.forEach(function(e,i){
				e['id'] = i;
				e['x'] = e['default_x'] = -300;
				e['y'] = e['default_y'] = variable_margin + (variable_height+variable_margin)*(_configs.variable_order?.[i] || i);
				// e['position'] = {x: e['x'], y: e['y']};
				e['selected'] = false; // selected to visualize
				e['active'] = false;   // in graph area
			})
		}
		else {
			// _graph_ui_config.variable_panel === 'left'
			_Variables.forEach(function(e,i){
				e['id'] = i;
				e['x'] = e['default_x'] = variable_margin;
				e['y'] = e['default_y'] = variable_margin + (variable_height+variable_margin)*(_configs.variable_order?.[i] || i);
				// e['position'] = {x: e['x'], y: e['y']};
				e['selected'] = false; // selected to visualize
				e['active'] = false;   // in graph area
			})
		}


		let variable_gs = _svg_graph.selectAll('g.g-variable').data(_Variables)
						.enter()
							.append('g')
							.attr('id', (d, i) => 'v' + i) // so that this g can be found using a string selector
							.each()

		if (_configs.position_fixed) {
			// draw graph default positions
			drawDefaultPositions()
		}

		// define arrow head and arrow end in svg
		// ref: http://bl.ocks.org/tomgp/d59de83f771ca2b6f1d4, http://thenewcode.com/1068/Making-Arrows-in-SVG
		let defs = _svg_graph.append('defs');
		defs.append('marker')
				.attr('id', 'arrowstart')
				.attr('refX', 1)
				.attr('refY', 2)
				.attr('markerWidth', 4)
				.attr('markerHeight', 4)
				.attr('orient', 'auto')
			.append('polygon')
				.attr('points', '4 0, 4 4, 0 2')
				// .attr('fill','red');

		// append the default arrowend
		_defineMarkerEnd('arrowend', _graph_ui_config.get_edge_color.default);

	}

	function setVariables(Variables) {
		_Variables = Variables;

		// update x, y position for each Variables
		if (_graph_ui_config.variable_panel === 'none') {
			// trick: place the variables far away from the panel so they are not seen.
			//        Otherwise, even when they are set invisible, some features needs to be fixed (edge hovering a variable)
			_Variables.forEach(function(e,i){
				e['id'] = i;
				e['x'] = e['default_x'] = -300;
				e['y'] = e['default_y'] = variable_margin + (variable_height+variable_margin)*(_configs.variable_order?.[i] || i);
				// e['position'] = {x: e['x'], y: e['y']};
				e['selected'] = false; // selected to visualize
				e['active'] = false;   // in graph area
			})
		}
		else {
			// _graph_ui_config.variable_panel === 'left'
			_Variables.forEach(function(e,i){
				e['id'] = i;
				e['x'] = e['default_x'] = variable_margin;
				e['y'] = e['default_y'] = variable_margin + (variable_height+variable_margin)*(_configs.variable_order?.[i] || i);
				// e['position'] = {x: e['x'], y: e['y']};
				e['selected'] = false; // selected to visualize
				e['active'] = false;   // in graph area
			})
		}

		_svg_graph.selectAll('g.g-variable').data(_Variables)
			.enter()
				.append('g')
				.attr('id', (d, i) => 'v' + i) // so that this g can be found using a string selector
				.each(ui_create_variable)

	}

	function setSingleVariable(v) {
		// update x, y position for each Variables
		if (_graph_ui_config.variable_panel === 'none') {
			// trick: place the variables far away from the panel so they are not seen.
			//        Otherwise, even when they are set invisible, some features needs to be fixed (edge hovering a variable)
			v['x'] = v['default_x'] = -300;
			v['y'] = v['default_y'] = variable_margin + (variable_height+variable_margin)*(_configs.variable_order?.[v.id] || v.id);
			// e['position'] = {x: e['x'], y: e['y']};
			v['selected'] = false; // selected to visualize
			v['active'] = false;   // in graph area
		}
		else {
			// _graph_ui_config.variable_panel === 'left'
			v['x'] = v['default_x'] = variable_margin;
			v['y'] = v['default_y'] = variable_margin + (variable_height+variable_margin)*(_configs.variable_order?.[v.id] || v.id);
			// e['position'] = {x: e['x'], y: e['y']};
			v['selected'] = false; // selected to visualize
			v['active'] = false;   // in graph area
		}

		// d3.selectAll('svg').append('g').attr('id', 'v' + v.id);
		// ui_create_variable_single(v, g_d3);

		_svg_graph.selectAll('g.g-variable').filter(function() {
    return d3.select(this).attr("id") == 'v' + v.id; // filter by single attribute
	}).data([v])
			.enter()
				.append('g')
				.attr('id', (d, i) => 'v' + d.id) // so that this g can be found using a string selector
				.each(ui_create_variable)

	}



	// vid: int
	// position: {x: number, y: number}
	// whenever a node is moved, update its x, y, active attributes
	async function move_node(vid, position, duration, callback) {
		// no animation
		if (duration === undefined) { duration = 0; }
		// position is "default"
		if (position === undefined) {
			position = _get_default_variable_position(_Variables[vid]);
		}

		return _svg_graph.selectAll("g.g-variable").filter(d => d.id === vid)
			.transition()
			.duration(duration)
			// move the associated along with the animation
			.tween('link.move', function(d) {
				return function(t) {
					let pos = {
						// getting the actual x and y value
						'x': this.transform.baseVal[0].matrix.e,
						'y': this.transform.baseVal[0].matrix.f,
					}
					// update d.x & d.y before updateLineOfVariable()
					d.x = pos.x;
					d.y = pos.y;

					updateLineOfVariable(d);
				}
			})
			.attr("transform", "translate(" + position.x + "," + position.y + ")")
			.on("end", function(d){
				d.x = position.x;
				d.y = position.y;
				updateLineOfVariable(d);
				// d.active = d.x > working_line;
				d.active = _isVariableActive(d.x, d.y).is_active;
				if (d.active) {
					_CausalDiagram.update_diagram('set', 'node', {"name": d.name, "vid": d.id, "x": d.x, "y": d.y});
					_VICA.updateDiagram?.('set', 'node', {"name": d.name, "vid": d.id, "x": d.x, "y": d.y}, _component_id);
				}
				else {
					_CausalDiagram.update_diagram('delete', 'node', {"vid": d.id});
					_VICA.updateDiagram?.('delete', 'node', {"vid": d.id}, _component_id);
				}

				if (typeof(callback) === 'function') {callback();}
			})
			.end();
	}

	// vid: int
	// rename the node to vname_new
	function rename_node(vid, vname_new) {
	  _svg_graph.selectAll("g.g-variable").filter(d => d.id === vid)
	    .select('text').text(function(d) {
				d['name'] = vname_new; // also change the v name in the g data
				return vname_new;
	    })
	}

	// v: the v node obj
	// move the node to default position so we don't have to actually detele it
	async function delete_node(v) {
	  move_node(v.id, {
	    x: v.default_x,
	    y: v.default_y
	  });
	}

	// link_info = edge format
	//         {
	//             "id_from": integer,
	//             "id_to": integer,
	//             "info": {
	//                 "own": { (their own knowledge)
	//                     "narrative": string,
	//                     "magnitude": integer,
	//                 }
	//                 "crowd": {
	//                     "peer_count": integer,
	//                     "peer_magnitude_total": integer,
	//                     "peer_magnitude_avg": float,
	//                     "peer_info": [ (peers' knowledge)
	//                         {
	//                             "username": string,
	//                             "narrative": string,
	//                             "magnitude": integer,
	//                         },
	//                         ...
	//                     ]
	//                 }
	//             }
	//	       },
	async function addLink(link_info) {
		if (link_exists(link_info.id_from, link_info.id_to)) {
			console.warn('link already exists');
			return;
		}

		let v_from = _Variables[link_info.id_from],
			v_to = _Variables[link_info.id_to];

		// move the variables if they are not in the graph
		if (v_from.active === false) {
			let from_position = _get_default_variable_position(v_from);
			await move_node(v_from.id, from_position, 500);
		}

		if (v_to.active === false) {
			let to_position = _get_default_variable_position(v_to);
			await move_node(v_to.id, to_position, 500);
		}

		await create_link(v_from.id, v_to.id, 500, link_info);



		_CausalDiagram.update_diagram('set', 'edge', {
			'vid_from': v_from.id,
			'vid_to': v_to.id,
			'info': JSON.parse(JSON.stringify(link_info.info)),
		});

		_VICA.updateDiagram?.('set', 'edge', {
			'vid_from': v_from.id,
			'vid_to': v_to.id,
			'info': JSON.parse(JSON.stringify(link_info.info)),
		}, _component_id);

		let link = get_link(v_from.id, v_to.id);

		// link.on('click').call(link.node(), link.datum());
		// do not call the click handler like above, it makes saving logs different
		// (cannot differentiate whether it is called by clicked or this function)
		ui_select_link(link);
		_VICA.selectArrow?.(v_from.id, v_to.id, _component_id);

	}

	// expect variables to be a 2-item array, [DataVariable, DataVariable]
	// will call VICA.updateDiagram()
	async function graph_add_link(variables) {
		// input check
		if (variables.length != 2) {
			console.warn('Input array does not contain two variables');
			return;
		}
		if (link_exists(variables[0].id, variables[1].id)) {
			console.warn('link already exists');
			return;
		}

		let v_from = variables[0], v_to = variables[1];

		// let graph_width = parseFloat(_svg_graph.attr('width')),
		// 	graph_height = parseFloat(_svg_graph.attr('height'));

		// // calculate the positions of the two variables
		// function noise(){
		// 	return Math.random() * variable_width * 2 - variable_width;
		// }
		// let from_position = {
		// 	x: (graph_width/2) - variable_width + noise(),
		// 	y: (150 + noise()) || (graph_height/2),
		// };
		// let to_position = {
		// 	x: from_position.x + 3 * variable_width + noise(),
		// 	y: from_position.y + noise(),
		// };

		// using "crowd" positions
		let from_position = _get_default_variable_position(v_from);
		let to_position = _get_default_variable_position(v_to);

		// move the variables if they are not in the graph
		if (v_from.active === false) {
			await move_node(v_from.id, from_position, 500);
		}

		if (v_to.active === false) {
			await move_node(v_to.id, to_position, 500);
		}

		await create_link(v_from.id, v_to.id, 500);

		_CausalDiagram.update_diagram('set', 'edge', {'vid_from': v_from.id, 'vid_to': v_to.id, 'info': {'own': {}}});

		_VICA.updateDiagram?.('set', 'edge', {"vid_from": v_from.id, "vid_to": v_to.id, 'info': {'own': {}}}, _component_id);

		let link = get_link(v_from.id, v_to.id);
		link.on('click').call(link.node(), link.datum());

	}

	// set the UI to be the causal diagram
	// assume all variables are already on the causal_diagram
	// (1) set UI
	// (2) set
	async function set_graph(causal_diagram, duration) {
		_CausalDiagram.set_causal_diagam(causal_diagram);

		// nodes
		// move the nodes to the position specified in the causal_diagram
		_Variables.forEach(function(v) {
			// if it is specified in the causal_diagram (active)
			if (causal_diagram.nodes.find(n => n.id == v.id)) {
				move_node(v.id, causal_diagram.nodes.find(n => n.id == v.id), duration);

				// rename the Variables as well
				let vname_new = causal_diagram.nodes.find(n => n.id == v.id).name
				rename_node(v.id, vname_new);

			}
			// if not, move it to its default place
			else {
				move_node(v.id, {x: v.default_x, y: v.default_y});
			}
		})

		// edges
		// (case 1) update - move the edges to the position specified in the causal_diagram, update hypotheses
		// (case 2) exit - if edges are not found in the causal_diagram, remove them
		_svg_graph.selectAll('line.line-relation').each(function(d) {

			let this_line = d3.select(this);
			let id_from = parseInt(this_line.attr("lid"));
			let id_to = parseInt(this_line.attr("rid"));

			let edge = causal_diagram.edges.find(e => e.id_from == id_from && e.id_to == id_to);

			// (case 1) update - move the edges to the position specified in the causal_diagram
			if (edge) {
				let r = variable_width / 2;

				// note that the variables may not be moved yet, so you should not access Variables for the newest position.
				let v1 = causal_diagram.nodes.find(n => n.id == id_from),
					v2 = causal_diagram.nodes.find(n => n.id == id_to);
				// let points = util.circleCentersToEdges({x: v1.x + r, y: v1.y + r}, {x: v2.x + r, y: v2.y + r},r);
				let points = _get_arrow_between_nodes(v1, v2);

				this_line
					.transition()
					.duration(duration)
					.attr("x1", points.p1.x)
					.attr("y1", points.p1.y)
					.attr("x2", points.p2.x)
					.attr("y2", points.p2.y)
					.style("stroke-width", _graph_ui_config['get_edge_width'](edge) + 'px');

				// update_causal_diagram('set', 'edge', {vid_from: edge.id_from, vid_to: edge.id_to, hypothesis: edge.hypothesis});
			}
			// exit - if edges are not found in the causal_diagram, remove them
			else {
				// update_causal_diagram('delete', 'edge', {vid_from: id_from, vid_to: id_to});
				this_line.remove();
			}
		})

		// (case 3) enter - add edges that is in causal_diagram but not existing in the graph
		causal_diagram.edges.forEach(function(e) {
			let n_from = causal_diagram.nodes.find(n => n.id == e.id_from);
			let n_to = causal_diagram.nodes.find(n => n.id == e.id_to);
			if (!link_exists(e.id_from, e.id_to)) {
				create_link(n_from, n_to, duration, e);

				_VICA.updateDiagram?.('set', 'edge', {
					vid_from: e.id_from,
					vid_to: e.id_to,
					parameters: e.parameters,
					info: e.info,
				}, _component_id);
			}
		})
	}


	// return the starting (p1) and ending point (p2) of the arrow between two variables
	// The function uses _CausalDiagram to determine graph connections
	function _get_arrow_between_nodes(n1, n2) {
		let r = variable_width / 2;
		let points = util.circleCentersToEdges({x: n1.x + r, y: n1.y + r}, {x: n2.x + r, y: n2.y + r},r);

		// if there is a reversed edge (double-headed arrow), scale the vector
		let reversed_edge = _CausalDiagram.find_edge(n2.id, n1.id)
		if (reversed_edge) {
			let reversed_edge_width = _graph_ui_config['get_edge_width'](reversed_edge);

			let this_edge = _CausalDiagram.find_edge(n1.id, n2.id);
			let this_edge_width = 0;

			if (this_edge === undefined) {
				// creating a new arrow;
				this_edge_width = _edge_width_default();
			}
			else {
				this_edge_width = _graph_ui_config['get_edge_width'](this_edge);
			}

			if (this_edge_width > reversed_edge_width) {
				points = util.scaleVector(points.p1, points.p2, 0.3);
			}
			else if (this_edge_width < reversed_edge_width) {
				points = util.scaleVector(points.p1, points.p2, 0.7);
			}
			else {
				points = util.scaleVector(points.p1, points.p2, 0.5);
			}

		}

		return points;
	}

	// export two things for database save: Variables and the causal diagram
	function export_variable_diagram() {
		return {
			variables: _Variables.map(v => ({
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
			causal_diagram: _CausalDiagram.causal_diagram,
		}
	}


	function get_causal_diagram() {
		return _CausalDiagram;
	}

	function get_variables() {
		return _Variables;
	}


	// called by VICA, simply select the edge
	function selectEdge(vid_from, vid_to) {
		let line_d3 = _svg_graph.select('line[lid="' + vid_from + '"][rid="' + vid_to + '"]');

		if (line_d3.empty()) {
			// console.warn('edge not found');

			// unselect all edges
			_svg_graph.selectAll("line.line-relation").each(function() {
				ui_set_link(d3.select(this), 'selected', false);
			});

			// unselect all nodes
			_svg_graph.selectAll("g.g-variable").each(function() {
				ui_set_node(d3.select(this), 'selected', false);
			});

			return;
		}

		ui_select_link(line_d3);
	}

	// called by VICA, simply update UI
	function selectVariables(variables) {
		let selected_nodes = _svg_graph
			.selectAll("g.g-variable")
			.filter(v => variables.map(v => v.id).includes(v.id));
		ui_select_nodes(selected_nodes);
	}

	// Called by VICA.hypothesisUpdated()
	// Simply update the hypothesis in _CausalDiagram, no need to update UI for now
	function updateHypothesis(vid_from, vid_to, hypothesis, magnitude) {
		_CausalDiagram.update_diagram('set', 'edge', {
			'vid_from': vid_from,
			'vid_to': vid_to,
			'hypothesis': hypothesis,
			'magnitude': magnitude,
		})
	}



	// Called by VICA, _Variables has been updated already by VICA, just draw it
	function drawNewVariable(variable) {
		let sl = _configs.systemLayout;

		variable['x'] = variable_margin;
		variable['y'] = variable['default_y'] =
			variable_margin + (variable_height + variable_margin) * _configs.variable_order[variable['id']];
		variable['selected'] = false; // selected to visualize
		variable['active'] = false;   // in graph area

		let variable_gs = _svg_graph.selectAll('g.g-variable').data(_Variables)
							.enter()
								.append('g')
								.each(ui_create_variable)

		// expand middle panel
		// not a good coding practice, but works for now
		let height_needed = variable_margin + (variable_height+variable_margin) * _Variables.length;
		if (height_needed > sl.graph_height) {
			_svg_graph.attr('height', height_needed);
			_svg_graph.select('line#dividing_line').attr('y2', height_needed);
			_VICA.setMiddlePanelHeight?.(height_needed);
		}
	}

	// debug, todo
	function verify_graph_debug() {
		// randomly visualize the arrow's color
		// update line color
		_svg_graph.selectAll("line.line-relation").each(function() {
			let this_line = d3.select(this);
			if (Math.random() < 0.5) {
				this_line.style('stroke', 'red');
			}
			else {
				this_line.style('stroke', 'green');
			}
		});
	}

	function set_config(new_config) {
		for (let key in new_config) {
			if (key === 'edge_width') {
				if (new_config[key] === 'fixed') {
					_graph_ui_config['get_edge_width'] = _edge_width_default;
				}
				else if (new_config[key] === 'popularity') {
					_graph_ui_config['get_edge_width'] = _edge_width_popularity;
				}
				// refresh edge
				_refresh_all_edge_width();

				// when the width is changed the points of the edges might be changed
				_refresh_all_edge_points();
			}
		}
	}

	function showEdgeDifferences(CausalDiagram) {
		_CausalDiagram.causal_diagram.edges.forEach( e => {
			if (CausalDiagram.find_edge(e.id_from, e.id_to)) {
				_ui_set_link_color(
					get_link(e.id_from, e.id_to),
					_graph_ui_config['get_edge_color']['default']
				);
			}
			else if (CausalDiagram.find_edge(e.id_to, e.id_from)) {
				_ui_set_link_color(
					get_link(e.id_from, e.id_to),
					_graph_ui_config['get_edge_color']['difference_reverse']
				);
			}
			else {
				_ui_set_link_color(
					get_link(e.id_from, e.id_to),
					_graph_ui_config['get_edge_color']['difference_new']
				);
			}
		})
	}

	// This updates _CausalDiagram and UI
	function updateDiagram(action, type, parameters) {
		_CausalDiagram.update_diagram(action, type, parameters);

		if (action === 'delete' && type === 'edge') {
			// update UI and _CausalDiagram
			_deleteEdge(parameters.vid_from, parameters.vid_to);

			saveLog("DELETE_ARROW", {
				name_from: _Variables[parameters.vid_from].name,
				name_to: _Variables[parameters.vid_to].name,
				id_from: parameters.vid_from,
				id_to: parameters.vid_to,
				CR_ID: _VICA?._ID,
			})
		}
	}

	// color the arrows based on regression results
	// arrow_status: [(vid_from, vid_to, is_significant)]
	function colorArrowStatus(arrow_status) {
		arrow_status.forEach(arrow => {
			let vid_from = arrow[0],
				vid_to = arrow[1],
				supported = arrow[2],
				link = get_link(vid_from, vid_to);
			let color = supported ?
			            _graph_ui_config.get_edge_color.supported :
			            _graph_ui_config.get_edge_color.not_supported;

			_ui_set_link_color(link, color);

			if (supported) {
				link.style('stroke-dasharray', 'none');
			}
			else {
				link.style('stroke-dasharray', '5, 5');
			}
		})

		// ui: unselect variables
		_svg_graph.selectAll("g.g-variable").each(function() {
			ui_set_node(d3.select(this), 'selected', false);
		});
	}

	function colorArrows(color) {
		_svg_graph.selectAll('line.line-relation').each(function() {
			if (typeof(color) === 'string') {
				_ui_set_link_color(
					d3.select(this),
					_graph_ui_config.get_edge_color[color] ?? color,
				)
			}
		});
	}

	function resetArrows() {
		// back to default color
		colorArrows('default');

		// remove dashed visual
		_svg_graph.selectAll('line.line-relation').each(function() {
			d3.select(this).style('stroke-dasharray', 'none');
		});

		// ui: unselect variables
		_svg_graph.selectAll("g.g-variable").each(function() {
			ui_set_node(d3.select(this), 'selected', false);
		});
	}

	// a debug function to set link color
	function _DEBUG_ui_set_link_color(id_from, id_to, color) {
		_ui_set_link_color(get_link(id_from, id_to), color);
	}

	return {
		init: init,
		move_node: move_node,
		graph_add_link: graph_add_link, // being deprecated
		addLink: addLink, // replace graph_add_link() function
		set_graph: set_graph, // only use when all variables are created
		setVariables: setVariables, //
		setSingleVariable: setSingleVariable,
		setGraph: set_graph,
		export_variable_diagram: export_variable_diagram,
		get_causal_diagram: get_causal_diagram,
		get_variables: get_variables,
		selectEdge: selectEdge,
		selectVariables: selectVariables,
		updateHypothesis: updateHypothesis,
		drawNewVariable: drawNewVariable,
		verify_graph_debug: verify_graph_debug,
		set_config: set_config,
		showEdgeDifferences: showEdgeDifferences,
		updateDiagram: updateDiagram,
		colorArrowStatus: colorArrowStatus,
		colorArrows: colorArrows,
		resetArrows: resetArrows,
		_DEBUG_ui_set_link_color: _DEBUG_ui_set_link_color,
	}

});
