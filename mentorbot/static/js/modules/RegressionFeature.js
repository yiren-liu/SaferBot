/*
	This module handles background regression analysis
*/

'use strict';
;var RegressionFeature = function() {
	// This module do not modify these objects below
	let _Variables;
	let _CausalDiagram;
	let _VICA;
	let _data_path;

	// This module maintain the UI on this reference
	let _$div;

	// Private variables
	let _sig_threshold = .05;
	let _cache_regression_response = {};

	/////////////////////////////////////////////////////////////////////
	///// Private Functions /////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////

	// convert from variable key to variable name
	function keyToName(key) {
		for (var i = _Variables.length - 1; i >= 0; i--) {
			if (_Variables[i].key === key) return _Variables[i].name;
		}
		return '(not found)';
	}

	function _keyToId(key) {
		// IE does not support this...
		return _Variables.find(v => v.key === key)?.id;
	}

	// convert a regression result returned from backend to text
	function resultToText(result) {
		// console.log(result);
		var text = keyToName(result.Yname) + ' ~ ';
		var Xs = []
		for(var key in result.output) {
			if (key === 'const') continue; // hide the const parameter
			let p = result.output[key];
			let p_str = p.toFixed(3);
			let x_html = keyToName(key);
			// var x = name + '(' + result.output[name].toFixed(3) + ')';
			if (p <= _sig_threshold) {
				x_html = '<strong>' + x_html + ' (*)</strong>';
			}
			Xs.push(x_html);
		}
		return text + Xs.join(' + ');
	}

	function _showResponse(response, $regression_div) {
		// cache save
		if (!(response.cache_key in _cache_regression_response)) {
			// console.log('save cache for ' + response.cache_key);
			_cache_regression_response[response.cache_key] = response;
		}

		// insert the template (.loaded)
		$regression_div.html($($('template#regression_result_template').html()).filter('.loaded').html());

		// insert response data
		$regression_div.find('.result-text').html(resultToText(response.results));
		$regression_div.find('pre').html(response.regression_info.summary);

		// set the data-target and id of the associated collapse components
		let rand_regression_id = Math.random().toString().substr(2); // this is a good enough random number
		$regression_div.find('.btn-statistics').attr('data-target', '#regression_' + rand_regression_id);
		$regression_div.find('.collapse-statistics').attr('id', 'regression_' + rand_regression_id);
	}

	/////////////////////////////////////////////////////////////////////
	///// Public Functions //////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////

	// The init function that sets references to other modules
	function init(Variables, CausalDiagram, VICA, data_path, $div) {
		// set references
		_Variables = Variables;
		_CausalDiagram = CausalDiagram;
		_VICA = VICA;
		_data_path = data_path;
		_$div = $div;

		// UI
		_$div.append($($('#regression_feature_template').html()));
		$('[data-toggle="tooltip"]').tooltip()
	}

	// The highest-level function for running regressions on the selected variables
	function autoRegressions(selected_variables) {
		// it should be already be sorted (because GraphUI filters on all nodes to find selected variables)
		// But to make sure the order is fixed, sort() again.
		let selected_ids = selected_variables.map(v => v.id).sort(); 


		// reset UI. This will remove the previous regression_div, and thus the previous regression
		// result will not be shown. This behavior is intended (to not mess up the new batch of regressions)
		$('.card-body', _$div).html('');
		
		// // run regressions for each variable
		// selected_ids.forEach(id => {
		// 	let parents = _CausalDiagram.get_parent_ids(id).sort();
		// 	if (parents.length !== 0) {
		// 		let $card = _$div.find('#collapse_each_variable .card-body');

		// 		// create a loading entry
		// 		let $regression_div = $($('template#regression_result_template').html()).filter('.loading');
		// 		$('.result-text', $regression_div).html(keyToName(_Variables[id].key));
		// 		$card.append($regression_div);
				

		// 		runRegression(_Variables[id].key, parents.map(id => _Variables[id].key))
		// 			.then(response => {
		// 				_showResponse(response, $regression_div);
		// 			})
		// 	}
		// })

		// run regressions among the selected variables
		selected_ids.forEach(id => {
			let ancestors = _CausalDiagram.get_ancestor_ids(id);
			let selected_ancestors = selected_ids.filter(_id => _id != id && ancestors.includes(_id));
			if (selected_ancestors.length) {
				let $card = _$div.find('#collapse_selected .card-body');

				// create a loading entry
				let $regression_div = $($('template#regression_result_template').html()).filter('.loading');
				$('.result-text', $regression_div).html(keyToName(_Variables[id].key));
				$card.append($regression_div);

				runRegression(_Variables[id].key, selected_ancestors.map(id => _Variables[id].key))
					.then(response => {
						_showResponse(response, $regression_div);
					})
			}
		});

		// run regressions for each variable on the graph, with selected variables in the front
		let all_nodes = _CausalDiagram.causal_diagram.nodes.slice();
		all_nodes.sort((n1, n2) => selected_ids.includes(n2.id) - selected_ids.includes(n1.id));
		all_nodes.forEach(node => {
			let id = node.id;
			// sort() to make sure the variable order is the same (to improve caching)
			let parents = _CausalDiagram.get_parent_ids(id).sort();
			if (parents.length !== 0) {
				let $card = _$div.find('#collapse_path_analysis .card-body');

				// create a loading entry
				let $regression_div = $($('template#regression_result_template').html()).filter('.loading');
				$('.result-text', $regression_div).html(keyToName(_Variables[id].key));
				$card.append($regression_div);

				runRegression(_Variables[id].key, parents.map(id => _Variables[id].key))
					.then(response => {
						_showResponse(response, $regression_div);
						// console.log(response);
					})
			}
		})
	}

	async function getPathAnalysisResults() {
		let promises = [];
		// run regressions for each variable on the graph, with selected variables in the front
		_CausalDiagram.causal_diagram.nodes.forEach(node => {
			let id = node.id;
			// sort() to make sure the variable order is the same (to improve caching)
			let parents = _CausalDiagram.get_parent_ids(id).sort();
			if (parents.length !== 0) {
				promises.push(runRegression(_Variables[id].key, parents.map(id => _Variables[id].key)));
			}
		})
		return Promise.all(promises).then(responses => {
			let arrow_status = [];
			responses.forEach(response => {
				if (response.status === 'success') {
					for (let v_from in response.results.output) {
						arrow_status.push([
							_keyToId(v_from), 
							_keyToId(response.results.Yname), 
							response.results.output[v_from] < _sig_threshold
						]);
					}
				}
			})
			return arrow_status;
		})
	}

	// A simple regression API
	// Xnames should be an array
	// always make Xnames an array (it should be, but just to be safe) 
	// (the backend can handle an X string, but just to make the format consistent)
	async function runRegression(Yname, Xnames) {
		if (typeof(Xnames) === 'string') {
			Xnames = [Xnames];
		}

		var msg = {
			'command': 'regression', 
			'datafilename': _data_path, 
			'Yname': Yname,
			'Xnames': JSON.stringify(Xnames)};

		// cache
		let cache_key = JSON.stringify([Yname, Xnames, _data_path]);
		// console.log(cache_key);
		if (cache_key in _cache_regression_response) {
			// console.log('get cache for ' + cache_key);
			return _cache_regression_response[cache_key];
		}

	    return $.ajax({
	        type: "POST",
	        url: "/ajax/",
	        data: msg
	    });
	}

	return {
		init: init,
		autoRegressions: autoRegressions,
		runRegression: runRegression,
		getPathAnalysisResults: getPathAnalysisResults,
	}

}