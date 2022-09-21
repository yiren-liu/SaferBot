// return an array for visualizing, based on the input visual_setting
function covertDataWithVisualSetting(data, visual_setting) {
	var arr = []
	if (visual_setting.chart_type == 'scatterplot') {
		if ( visual_setting.additional_vars.length == 0) {
			return toScatterData(data, visual_setting.x_vars[0], visual_setting.y_vars[0])
		}

		else {
			var arr = [], _x = visual_setting.x_vars[0], _y = visual_setting.y_vars[0], _z = visual_setting.additional_vars[0];
			

			
			if (_z["visual_type"] == "categorical") {
				// special case: success rate
				if (_z["key"] == "success") {
					arr.push( [_x["name"], "fail", "success"] );
				}
				else {
					arr.push( [_x["name"], ..._z["labels"]] );	
				}
				
				// var color = d3.scaleOrdinal(d3.schemeCategory10);
				var map_func = function (d) {
					return [d[_x["key"]]].concat(_z["labels"].map(function(l) {
						if (l == d[_z["key"]]) return d[_y["key"]];
						else return undefined;
					}));
					// return [d[_x["key"]], d[_y["key"]], 'fill-color: ' + color(d[_z["key"]]) + ''];
				}
			}
			else {
				arr.push([_x["name"], _y["name"], {'type': 'string', 'role': 'style'}]);
				var size = d3.scaleLinear().range([1,10]).domain(_z["extent"]);
				var map_func = function (d) {
					return [d[_x["key"]], d[_y["key"]], 'point { size: ' + size(d[_z["key"]]) + ';}'];
				}
			}
			arr = arr.concat(data.map(map_func));

			return arr;
		}
	}
	else if (visual_setting.chart_type == 'bar') {
		if (visual_setting.x_vars.length == 1) {
			return toBarData(data, visual_setting.x_vars[0], visual_setting.y_vars[0]);
		}

		if (visual_setting.x_vars.length >= 2) {
			return toBarDataGeneral(data, visual_setting.x_vars, visual_setting.y_vars[0]);
		}
		// return toStackBarData(data, visual_setting.x_vars[0], visual_setting.x_vars[1], visual_setting.y_vars[0]);
	}
}

// return an array for visualizing scatterplot, the two attributes contains the key to a numerical column
function toScatterData(data, x_attribute, y_attribute) {
	var arr = [];
	arr.push([x_attribute["name"], y_attribute["name"]]);
	// same thing as below
	// arr = arr.concat(data.map(function(p){
	// 	return [ p[x_attribute["key"]], p[y_attribute["key"]] ];
	// }))
	for(var i = 0; i < data.length; i++) {
		arr.push([data[i][x_attribute["key"]], data[i][y_attribute["key"]]]);
	}
	return arr;
}

// a  general function for categorizing data with x attribute and y function, and return an array for visualizaing
function toBarData(data, x_attribute, y_attribute) {
	var groups = groupByAttribute(data, x_attribute);

	var arr = [];
	arr.push([x_attribute["name"], y_attribute["name"]]);
	arr.push( ...groups.map( function (group) {
		var row = ["" + group.label, y_attribute["function"](group)];
		row.numberOfRecords = group.length;
		return row;
	}));
	return arr;


	// if (x_attribute["type"] == "categorical") {
	// 	var map = {};
	// 	for (var i = 0; i < data.length; i++) {
	// 		var project = data[i], value = project[x_attribute["key"]];
	// 		if( !(value in map) ) {
	// 			map[value] = []; // initialize
	// 		}
	// 		map[value].push(project);
	// 	};

	// 	var arr = [];
	// 	arr.push([x_attribute["name"], y_attribute["name"]])
	// 	for( key in map ) {
	// 		arr.push([key, y_attribute["function"](map[key])]);
	// 	}

	// 	return arr;
	// }
	// else {
	// 	// type is NOT categorical, but visual_type should be categorical -> Histogram
	// 	var histogram = d3.histogram()
	// 	                  .value(function(d){return d[x_attribute["key"]]})
	// 	                  .thresholds(5);
	// 	var bins = histogram(data);
	// 	var arr = [];
	// 	arr.push([x_attribute["name"], y_attribute["name"]])
	// 	for( var i = 0; i < bins.length; i++) {
	// 		arr.push([bins[i].x0 + "-" + bins[i].x1, y_attribute["function"](bins[i])])
	// 	}
	// 	return arr;

	// }


	
}

// a  general function for categorizing data with x attribute and y attribute, using z attribute as the aggregation function (can be 'count')
// return an array for visualizaing StackBar chart
function toStackBarData(data, x_attribute, y_attribute, z_attribute) {
	var groups = groupByAttribute(data, x_attribute);
	groups.forEach(function (group) {
		group.subgroups = groupByAttribute(group, y_attribute);
	})

	var arr = [];
	// ASSUME each subgroups has identical labels
	arr.push([x_attribute["name"], ...groups[0].subgroups.map(function (g) { return "" + g.label; } ) ] );
	arr.push( ...groups.map( function (group) {
		return ["" + group.label, ...group.subgroups.map(function (subgroup) {
			return z_attribute["function"](subgroup);
		})] ;
	}));
	return arr;
}

// an even more general function that takes any number (>1) of x attributes, and use y attribute as the aggregation function (can be 'count')
// return an array for visualizaing Bar chart by Google Chart
function toBarDataGeneral(data, x_attributes, y_attribute) {
	 groups = data;

	function recursive_group(group, x_attribute_index) {
		// termination
		if (x_attribute_index >= x_attributes.length) return;

		group.subgroups = groupByAttribute(group, x_attributes[x_attribute_index]);
		group.subgroups.forEach(subgroup => recursive_group(subgroup, x_attribute_index + 1))
	}
	recursive_group(groups, 0);

	var arr = [];
	// ASSUME each subgroups has identical labels
	// concate all x variables except the taling one
	arr.push([ x_attributes.slice(0,-1).map(x => x['name']).join(' | '), ...x_attributes[x_attributes.length-1].labels ]);

	// assume there are at least two x variables
	function recursive_trace(group, cascade_labels) {
		if (group.subgroups[0].subgroups === undefined) {
			var row = [cascade_labels.join(' | '), ...group.subgroups.map(projects => y_attribute["function"](projects))];
			row.numberOfRecordsArray = group.subgroups.map(projects => projects.length);
			arr.push(row);
		}
		else {
			group.subgroups.forEach(subgroup => recursive_trace(subgroup, [...cascade_labels, subgroup.label]));
		}
	}
	recursive_trace(groups, []);
	return arr;
}

// // (array type data) a  general function for categorizing data with x attribute and y function, and return an array for visualizaing
// function toLineData(data, x_attribute, y_attribute) {
// 	var map = {};
// 	for (var i = 0; i < data.length; i++) {
// 		var project = data[i], value = project[x_attribute["key"]];
// 		if( !(value in map) ) {
// 			map[value] = []; // initialize
// 		}
// 		map[value].push(project);
// 	};

// 	// X-axis is Day 1-30
// 	for( key in map) {
// 		map[key] = y_attribute["function"](map[key]);
// 	}

// 	var arr = [];
// 	var header = ["Day"];
// 	for( key in map) {
// 		header.push(key);
// 	}
// 	arr.push(header);
// 	for(var i = 0; i < 30; i++) {
// 		var row = [i+1];
// 		for( key in map) {
// 			row.push(map[key][i]);
// 		}
// 		arr.push(row);
// 	}
// 	return arr;
// }

// group data based on Attribute. input: data, attribute. output: arrays of bins with label name
// Categorical attribute: based on attribute.labels
// Numerical attribute: based on d3 histogram
function groupByAttribute(data, attribute) {
	if (attribute["type"] == "categorical" || attribute["type"] == "binary") {
		var groups = attribute.labels.map( function (l) { var a = []; a.label = l; return a; } );
		data.forEach(function(item) {
			groups[attribute.labels.indexOf(item[attribute.key])].push(item);
		})
		return groups;
	}
	else {
		var histogram = d3.histogram()
		                  .value(function(d){return d[attribute.key]})
		                  .domain(attribute.extent) // set to the whole possible range (otherwise subgroups may have different extents, which results in different bins even providing same thresholds!)
		                  .thresholds(attribute.thresholds); // hardcode currently
		var bins = histogram(data);
		bins.forEach(function(item){
			item.label = item.x0 + "-" + item.x1;
		})
		return bins;
	}
}

// // count numbers on this attribute
// function oneAttribute(data, attribute) {
// 	var map = {};
// 	for( var i = 0; i < data.length; i++) {
// 		var item = data[i], value = item[attribute];
// 		if( !(value in map) ) {
// 			map[value] = 1;
// 		}
// 		else {
// 			map[value]++;
// 		}
// 	}

// 	var arr = [];
// 	arr.push([attribute, "Number"]);
// 	for( key in map ) {
// 		arr.push([key, map[key]]);
// 	}

// 	return arr;
// }

// function twoAttributes(data, attribute1, attribute2) {
// 	var map = {}, attribute2_list = [];
// 	for( var i = 0; i < data.length; i++) {
// 		var item = data[i], value = item[attribute2];
// 		if( attribute2_list.indexOf(value) == -1 ) attribute2_list.push(value);
// 	}

// 	for( var i = 0; i < data.length; i++) {
// 		var item = data[i], key = item[attribute1], value = item[attribute2];

// 		if( !(key in map) ) {
// 			map[key] = {};
// 			for( var j = 0; j < attribute2_list.length; j++ ) {
// 				map[key][attribute2_list[j]] = 0;
// 			}
// 		}

// 		map[key][value]++;
// 	}

// 	var arr = [];
// 	var titles = [attribute1];
// 	for( var i = 0; i < attribute2_list.length; i++) titles.push(attribute2_list[i]);
// 	arr.push(titles);
// 	for( key in map ) {
// 		var values = [key];
// 		for( var i = 0; i < attribute2_list.length; i++) values.push(map[key][attribute2_list[i]]);
// 		arr.push(values);
// 	}

// 	return arr;
// }


var projectMap = {
	"Art":			["Ceramics",	"Conceptual Art",	"Digital Art",	"Illustration",	"Installations",	"Mixed Media",	"Painting",	"Performance Art",	"Public Art",	"Sculpture",	"Textiles",	"Video Art", "Art", "Art Book"],							
	"Comics":		[/*"Anthologies",*/	"Comic Books",	/*Events*/	"Graphic Novels",	"Webcomics", "Comics"],														
	"Crafts":		["Candles",	"Crochet",	"DIY",	"Embroidery",	"Glass",	"Knitting",	"Letterpress",	"Pottery",	"Printing",	"Quilts",	"Stationery",	"Taxidermy",	"Weaving",	"Woodworking", "Crafts"],					
	"Dance":		["Performances",	"Residencies",	/*Spaces*/	"Workshops", "Dance"],															
	"Design":		["Architecture",	"Civic Design",	"Graphic Design",	"Interactive Design",	"Product Design",	"Typography", "Design"],													
	"Fashion":		["Accessories",	"Apparel",	"Childrenswear",	"Couture",	"Footwear",	"Jewelry",	"Pet Fashion",	"Ready-to-wear", "Fashion"],											
	"File & Video":	["Action",	"Animation",	"Comedy",	"Documentary",	"Drama",	/*Experimental*/	"Family",	"Fantasy",	/*Festivals*/	"Horror",	"Movie Theaters",	"Music Videos",	"Narrative Film",	"Romance",	"Science Fiction",	"Shorts",	"Television",	"Thrillers",	"Webseries", "Film & Video"],
	"Food":			["Bacon",	"Community Gardens",	"Cookbooks",	"Drinks",	"Events",	"Farmer's Markets",	"Farms",	"Food Trucks",	"Restaurants",	"Small Batch",	/*Spaces*/	"Vegan", "Food"],							
	"Games":		["Gaming Hardware",	"Live Games",	"Mobile Games",	"Playing Cards",	"Puzzles",	"Tabletop Games",	"Video Games", "Games"],												
	"Journalism":	["Audio",	"Photo",	"Print",	"Video"	/*"Web"*/, "Radio & Podcast", "Journalism"],														
	"Music":		["Blues",	"Chiptune",	"Classical Music",	"Country & Folk",	"Electronic Music",	"Faith",	"Hip-Hop",	"Indie Rock",	"Jazz",	"Kids",	"Latin",	"Metal",	"Pop",	"Punk",	"R&B",	"Rock",	"World Music", "Music"],	
	"Photography":	["Animals",	"Fine Art",	"Nature",	"People",	"Photobooks",	"Places", "Photography"],													
	"Publishing":	["Academic",	"Anthologies",	"Art Books",	"Calendars",	"Children's Books",	"Fiction",	"Literary Journals",	"Nonfiction",	"Periodical",	"Poetry",	"Radio & Podcasts",	"Translations",	"Young Adult",	"Zines", "Children's Book", "Publishing"],					
	"Technology":	["3D Printing",	"Apps",	"Camera Equipment",	"DIY Electronics",	"Fabrication Tools",	"Flight",	"Gadgets",	"Hardware",	"Makerspaces",	"Robots",	"Software",	"Sound",	"Space Exploration",	"Wearables",	"Web", "Technology"],				
	"Theater":		["Experimental",	"Festivals",	"Immersive",	"Musical",	"Plays",	"Spaces", "Theater"]													
}

var topicMap = {};
initTopicMap();

function initTopicMap() {
	for(key in projectMap) {
		var topics = projectMap[key];
		for (var i = 0; i < topics.length; i++) {
			if(topics[i] in topicMap) { console.log(topics[i] + "is repeated!"); }
			topicMap[topics[i]] = key;
		};
	}
}

function toCategory(topic) {
	for(key in projectMap) {
		var topics = projectMap[key];
		for(var i = 0 ; i < topics.length; i++) {
			if(topics[i] === topic) {
				return key;
			}
		}
	}
}

// preprocess data
function preprocess(raw_data, preprocessProject) {

	// filter out certain rows
	function filterFunction(d) {
		// if ( d["state"] === "not found" || d["state"] === "suspended" || d["state"] === "live") {
		// 	return false;
		// }
		// else
		// 	return true;
		return true;
	}
	filtered_data = raw_data.filter(filterFunction);

	// preprocess each row
	return filtered_data.map(preprocessProject);
	
}

function preprocessProject(){}

// preprocess a project
function preprocessCrowdfundingProject(p) {
	var launch_date = new Date(p["launched_at"]);
	var close_date = new Date(p["deadline"]);

	p["duration"] = daysBetween(launch_date, close_date);
	p["success"] = + p["success"];
	p["social_media_share"] = +p["facebook_count"] + p["tweets_count"];
	p["goal"] = +p["goal(USD)"];
	p["facebook_count"] = +p["facebook_count"];
	p["description_word_count"] = +p["description_word_count"];
	p["reward_max"] = +p["reward_max"];
	p["reward_min"] = +p["reward_min"];
	p["launch_day"] = launch_date.toString().substr(0,3);
	p["_dummy_"] = 1;
	p["month"] = +p["month"];


	// p["launch_day"] = launch_date.toString().substr(0,3);
	// p["category"] = topicMap[p["category.name"]];
	// p["success"] = (p["state"] == "successful")? 1 : 0;
	// p["goal"] = parseInt(p["goal"]);
	// p["goal_range"] = goalRange(p["goal"]);
	// p["pledged"] = parseInt(p["pledged"]);
	// p["funded_percent"] = Math.max((p["pledged"] / p["goal"])) * 100;

	// p["backers_logs"] = JSON.parse(p["backers_logs"]);
	// p["pledged_logs"] = JSON.parse(p["pledged_logs"]);
	// p["pledged_perday"] = JSON.parse(p["normalized_pledged_perday"])
	// p["backers_time"] = JSON.parse(p["normalized_backers"])
	// p["rewards"] = JSON.parse(p["rewards"]);
	
	return p;
}

function preprocessApply(d) {
	d["admission"] = +d["admission"];
	d["_dummy_"] = "All";
	d.GPA = +d.GPA;
	return d;
}

function preprocessCampaign(d) {
	// d["month"]	= +d["month"];
	d["goal"]			= parseInt(d["goal"]);
	d["shares"]			= parseInt(d["shares"]);
	d["success"]		= (d["success"] == "True")? 1 : 0;
	d["category"]		= parseInt(d["category"]);
	d["category_name"]	= d["category"] == 1? "Food" : "Art";
	d["country"]		= parseInt(d["country"]);
	d["country_name"]	= d["country"] == 1? "US" : "CANADA";
	d["length"]			= parseInt(d["length"]);
	d["duration"]		= parseInt(d["duration"]);
	d["_dummy_"] = "All";

	return d;
}

// to calculate days between two dates
function daysBetween(first, second) {

    // Copy date parts of the timestamps, discarding the time parts.
    var one = new Date(first.getFullYear(), first.getMonth(), first.getDate());
    var two = new Date(second.getFullYear(), second.getMonth(), second.getDate());

    // Do the math.
    var millisecondsPerDay = 1000 * 60 * 60 * 24;
    var millisBetween = two.getTime() - one.getTime();
    var days = millisBetween / millisecondsPerDay;

    // Round down.
    return Math.floor(days);
}

// convert funding goal to ranges
function goalRange(goal) {
	var bins = [0, 1000, 5000, 10000, 20000, 50000];
	for(var i = 0; i < bins.length; i++) {
		if(bins[i] > goal) break;
	}
	if(i == 1) return "< " + bins[1];
	else if(i == bins.length) return "> " + bins[i-1];
	else return bins[i-1] + " - " + (bins[i]-1);

}


function fillArray(item, size) {
	var arr = [];
	for (var i = 0; i < size; i++) {
		arr.push(item);
	};
	return arr;
}

function count(data) {
	return data.length;
}

function average(data, key) {
	var avg = 0.0, l = data.length;
	for(var i = 0; i < data.length; i++) {
		avg += data[i][key] / l;
	}
	return avg;
}

function averageArray(data, key) {
	var avgArray = data[0][key].slice(0), l = data.length;
	for(var i = 1; i < data.length; i++) {
		for(var j = 0; j < avgArray.length; j++) {
			avgArray[j] += data[i][key][j] / l;
		}
	}
	return avgArray;
}

function log(d) {
	DEBUG = true;
	if( DEBUG )
		console.log(d);
}
