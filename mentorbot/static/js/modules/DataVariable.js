/*
	For each variables live in VICA. Used to render the UI, connect to the dataset.
*/

class DataVariable {
	constructor({
			name,
			type,
			key = '',
			description = '',
			term_in_sentence = '', // this is used when using this variable in a natural sentence.
			long_description = '',
			stakeholder = '',
			unit = '',
			id = '',
			variable_shape = 'circle',
		}) {
		this.name = name;
		this.type = type;
		this.key = key;
		this.description = description;
		this.term_in_sentence = term_in_sentence;
		this.long_description = long_description;
		this.unit = unit;
		this.stakeholder = stakeholder;

		this.position = {}; // initial position is always in the left shelf

		this.default_aggregate = function(d){ return average(d, this.key)};
		// need to define after all data is loaded
		this.extent = null;
		this.thresholds = null;
		// TODO: change it to be more general
		this.original_key = this.key.split('_')[0];

		this.id = id;
		this.variable_shape = variable_shape;
	}

	get function() {
		return this.default_aggregate;
	}

}
