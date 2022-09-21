var FilterHelper = function() {
	this.must_filter = {};
	this.exclude_filter = {};
}

FilterHelper.prototype.add_must = function(key, value) {
	this.add_filter(key, value, this.must_filter);
}

FilterHelper.prototype.remove_must = function(key, value) {
	this.remove_filter(key, value, this.must_filter);
}

FilterHelper.prototype.add_exclude = function(key, value) {
	this.add_filter(key, value, this.exclude_filter);
}

FilterHelper.prototype.remove_exclude = function(key, value) {
	this.remove_filter(key, value, this.exclude_filter);
}
FilterHelper.prototype.add_filter = function(key, value, filter) {
	if(!(key in filter)) filter[key] = [value];
	else filter[key].push(value);
}

FilterHelper.prototype.remove_filter = function(key, value, filter) {
	if(!(key in filter)) return;
	else {
		filter[key] = filter[key].filter(function(d){return d != value;});
		if(filter[key].length == 0) delete filter[key];
	}
}

FilterHelper.prototype.filter_data = function(data) {
	var valid = [];
	for (var i = 0; i < data.length; i++) {
		if( this.filter(data[i])) valid.push(data[i]);
	};
	return valid;
}

FilterHelper.prototype.filter = function(d) {
	// Test if d has must have attributes
	for(var key in this.must_filter) {
		if( -1 == this.must_filter[key].indexOf(d[key])) return false;
	}

	// Test if d has excludeing attributes 
	for(var key in this.exclude_filter) {
		if( -1 != this.exclude_filter[key].indexOf(d[key])) return false;
	}

	return true;
}

