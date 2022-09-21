/*
	A general class of setting for drawing a chart
*/

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
		let unit = ' (' + this.x_vars[0]['unit'] + ')';
		if (unit === ' ()') unit = ''
		return this.x_vars[0]['name'] + unit;
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