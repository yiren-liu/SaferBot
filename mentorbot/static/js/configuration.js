/*
	Configuration settings for tasks

	Note: execute loadVariableSheet() after including the script to actually load the data

	Require the class definitions before loading this script.
	Eventually, most of these should be stored in the database.
	Require d3
*/

/******************
	Task-specific Variables
 ******************/

// read data from 'variable_sheet.csv'
async function loadVariableSheet() {
	return d3.csv('/static/data/variable_sheet.csv').then(data => {
		data.forEach(row => {
			row.long_description = row.description;

			if (row.context in VariableSheet) {
				VariableSheet[row.context].push(row);
			}
			else {
				VariableSheet[row.context] = [row];
			}
		});

		return "success";
	})
}

var SafetyVariables = [
	// new DataVariable({
	// 	'name': 'Staffing',
	// 	'type': 'numerical',
	// 	'key': '',
	// 	'term_in_sentence': "the number of police agents when the report is submitted",
	// 	'long_description': "The number of police agents when the report is submitted.",
	// 	'stakeholder': 'Police Agency',
	// }),
	new DataVariable({
		'name': 'Replied by Police',
		'type': 'binary',
		'key': 'replied',
		'term_in_sentence': "the police agency's response rate",
		'long_description': "Whether the police replied the safety report. Possible values are True and False.",
		'stakeholder': 'Police Agency',
	}),
	new DataVariable({
		'name': 'Report Category',
		'type': 'categorical',
		'key': 'event_category',
		'term_in_sentence': "the event category",
		'long_description': "The event type of the safety report. Possible values are 'Noise Disturbance' and 'Traffic/Accident'.'",
		'stakeholder': 'Reporter',
	}),
	new DataVariable({
		'name': 'Report Month',
		'type': 'categorical',
		'key': 'month',
		'term_in_sentence': "the month of the event",
		'long_description': "The month when the safety report was submitted. Possible values are '1', '2', ..., '12'.",
		'stakeholder': 'Reporter',
	}),
	new DataVariable({
		'name': 'Report Hour',
		'type': 'categorical',
		'key': 'hour',
		'term_in_sentence': "the hour of the event",
		'long_description': "The hour in a day when the safety report was submitted. Possible values are '0', '1', '2', ..., '23'.",
		'stakeholder': 'Reporter',
	}),
	new DataVariable({
		'name': 'Provide GPS',
		'type': 'binary',
		'key': 'has_location',
		'term_in_sentence': "whether the reporter shared the GPS location",
		'long_description': "Whether the reporter shared the GPS location to the police. Possible values are True and False.",
		'stakeholder': 'Reporter',
	}),
	// new DataVariable({
	// 	'name': 'Chat Count',
	// 	'type': 'numerical',
	// 	'long_description': "How many chat messages were sent between the reporter and the admin. Possible values are 0, 1, 2, ..., etc.",
	// 	'stakeholder': 'User',
	// }),
	new DataVariable({
		'name': 'Report Length',
		'type': 'numerical',
		'key': 'event_text_length',
		'term_in_sentence': "the length of the event text provided by the reporter",
		'long_description': "The safety report text length written by the reporter, measured in # of characters.",
		'stakeholder': 'Reporter',
	}),
	new DataVariable({
		'name': 'Is Anonymous',
		'type': 'binary',
		'key': 'is_anonymous',
		'term_in_sentence': "whether the reporter remained anonymous to the police agency",
		'long_description': "Whether the reporter chose to remain anonymous to the police.",
		'stakeholder': 'Reporter',
	}),
];

var AutoMPGVariables = [
	new DataVariable({
		'name': 'MPG',
		'type': 'numerical',
		'key': 'mpg',
		'long_description': "Mile per Gallon.",
	}),
	new DataVariable({
		'name': 'Cylinders',
		'type': 'numerical',
		'key': 'cylinders',
		'long_description': "# of cylinders.",
	}),
	new DataVariable({
		'name': 'Displacement',
		'type': 'numerical',
		'key': 'displacement',
		'long_description': "Displacement (cu. inches).",
	}),
	new DataVariable({
		'name': 'Horsepower',
		'type': 'numerical',
		'key': 'horsepower',
		'long_description': "Horsepower (hp).",
	}),
	new DataVariable({
		'name': 'Weight',
		'type': 'numerical',
		'key': 'weight',
		'long_description': "Weight (lbs.).",
	}),
	new DataVariable({
		'name': 'Acceleration',
		'type': 'numerical',
		'key': 'acceleration',
		'long_description': "Time from 0 to 60mph (in seconds).",
	}),
	new DataVariable({
		'name': 'Model Year',
		'type': 'categorical',
		'key': 'model_year',
		'long_description': "Year of the model.",
	}),
	new DataVariable({
		'name': 'Origin',
		'type': 'categorical',
		'key': 'origin',
		'long_description': "Origin country of the car brand.",
	}),
	// new DataVariable({
	// 	'name': 'Car Name',
	// 	'type': 'categorical',
	// 	'long_description': "Car model name.",
	// }),
];

var SalaryVariables = [
	new DataVariable({
		'name': 'Salary',
		'type': 'numerical',
		'stakeholder': 'Employer',
		'term_in_sentence': "The annual salary of a person",
		'long_description': 'Annual salary',
	}),
]

var ApplyVariables = [
	new DataVariable({
		'name': 'Gender',
		'type': 'categorical',
		'key': 'gender',
		'term_in_sentence': "the gender of the applicant",
		'long_description': "The gender of the applicant.",
		'stakeholder': 'Student',
	}),
	new DataVariable({
		'name': 'Department',
		'type': 'categorical',
		'key': 'department',
		'term_in_sentence': "the department the applicant applies to",
		'long_description': 'The department the applicant applies to.',
		'stakeholder': 'Student',
	}),
	new DataVariable({
		'name': 'Admission',
		'type': 'binary',
		'key': 'admission',
		'term_in_sentence': "whether the applicant is admitted",
		'long_description': 'Whether the applicant is admitted.',
		'stakeholder': 'Department',
	}),
]

var CampaignVariables = [
	new DataVariable({
		'name': 'Success',
		'type': 'binary',
		'key': 'success',
		'term_in_sentence': "whether the campaign succeeds",
		'long_description': 'Whether the campaign succeeds.',
	}),
	new DataVariable({
		'name': 'Goal',
		'type': 'numerical',
		'key': 'goal',
		'term_in_sentence': "the campaign fundraising goal",
		'long_description': 'The campaign fundraising goal (USD).',
	}),
	new DataVariable({
		'name': 'Media',
		'type': 'numerical',
		'key': 'shares',
		'term_in_sentence': "the number of social media shares of the campaign",
		'long_description': 'The number of social media shares of the campaign.',
	}),
	new DataVariable({
		'name': 'Category',
		'type': 'categorical',
		'key': 'category',
		// 'key': 'category_name',
		'term_in_sentence': "the campaign category",
		'long_description': "The campaign category.",
	}),
	new DataVariable({
		'name': 'Country',
		'type': 'categorical',
		'key': 'country',
		// 'key': 'country_name',
		'term_in_sentence': "the country the campaign is launched",
		'long_description': "The country the campaign is launched.",
	}),
	new DataVariable({
		'name': 'Essay',
		'type': 'numerical',
		'key': 'length',
		'term_in_sentence': "the essay length on the campaign webpage",
		'long_description': "The essay length on the campaign webpage. (# of words)",
	}),
	new DataVariable({
		'name': 'Duration',
		'type': 'numerical',
		'key': 'duration',
		'term_in_sentence': "the raising period length of the campaign",
		'long_description': "The raising period length of the campaign. (# of days)",
	}),
	new DataVariable({
		'name': 'Month',
		'type': 'categorical',
		'key': 'month',
		'term_in_sentence': "the month the campaign is launched",
		'long_description': "The month the campaign is launched.",
	}),
]

var HouseVariables = [
	new DataVariable({
		'name': 'Wear Level',
		'type': 'categorical',
		'key': 'wear_level',
		'term_in_sentence': "",
		'unit': '',
		'long_description': "The wear level of the house.",
		'stakeholder': '',
	}),
	new DataVariable({
		'name': 'Year Built',
		'type': 'categorical',
		'key': 'year_built',
		'term_in_sentence': "",
		'unit': '',
		'long_description': "The year when the house is built.",
		'stakeholder': '',
	}),
	new DataVariable({
		'name': 'Size',
		'type': 'numerical',
		'key': 'size',
		'term_in_sentence': "",
		'unit': 'sq-ft',
		'long_description': "The size of the house in square feet.",
		'stakeholder': '',
	}),
	new DataVariable({
		'name': 'Price',
		'type': 'numerical',
		'key': 'price',
		'unit': 'USD',
		'term_in_sentence': "",
		'long_description': "The price of the house.",
		'stakeholder': '',
	}),
	new DataVariable({
		'name': 'Neighborhood Safety',
		'type': 'categorical',
		'key': 'neighborhood_safety',
		'term_in_sentence': "",
		'unit': '',
		'long_description': "How safe is the neighborhood.",
		'stakeholder': '',
	}),
];

var LUCASVariables = [
	new DataVariable({
		'name': 'Neighborhood Safety',
		'type': 'numerical',
		'key': '',
		'term_in_sentence': "",
		'long_description': "How safe is the neighborhood.",
		'stakeholder': '',
	}),
	// Smoking
	// Yellow_Fingers
	// Anxiety
	// Peer_Pressure
	// Genetics
	// Attention_Disorder
	// Born_an_Even_Day
	// Car_Accident
	// Fatigue
	// Allergy
	// Coughing
	// Lung_cancer
];

var CanvasVariables = [
	new DataVariable({
		'name': 'Triangle',
		'type': '',
		'key': 'triangle',
		'term_in_sentence': "",
		'long_description': "",
		'stakeholder': '',
	}),
	new DataVariable({
		'name': 'Rectangle',
		'type': '',
		'key': 'rectangle',
		'term_in_sentence': "",
		'long_description': "",
		'stakeholder': '',
	}),
];


var VariableSheet = {
	'safety_app': SafetyVariables,
	'house_price': HouseVariables,
	'diagram_canvas': [],
};


var task_configs = {
	// "tutorial": {
	// 	// TODO: convert the hardcode path to Django static generated path
	// 	"path": "/static/data/apply_data_gender.csv",
	// 	"Variables": ApplyVariables,
	// 	"preprocess": preprocessApply,
	// 	"question": "",
	// 	"next_link": '/practice',
	// 	"object_name": 'Applicants'
	// },
	// Draw a <em>complete</em> causal diagram based on your beliefs.
	"safety_real": {
		"path": '/static/data/events_sample_top_5.csv',
		"Variables": SafetyVariables,
		"question": "Please record all the possible causal relationships you can imagine within the data.",
		"next_link": '',
		"object_name": 'Safety Reports',
		"data_visualization": false,
		"row_conversion": row_conversion_safety_report_processed,
		"visualize_stakeholder": false,
	},
	"safety_app": {
		// "path": '/static/data/gen_safety_data_1.csv',
		"path": '/static/data/gen_safety_data_model1_1.csv',
		"Variables": SafetyVariables,
		"question": "Please draw a causal diagram using these variables based on your hypotheses.",
		"next_link": '',
		"object_name": 'Safety Reports',
		"data_visualization": true,
		"row_conversion": row_conversion_safety_report_simulated,
		"visualize_stakeholder": false,
	},
	"auto_mpg": {
		"path": null,
		"Variables": AutoMPGVariables,
		"question": "Please draw a causal diagram using these variables based on your hypotheses.",
		"next_link": '',
		"object_name": 'Car Models',
		"visualize_stakeholder": false,
	},
	"auto_mpg_viz": {
		"path": '/static/data/auto-mpg.data.clean.csv',
		"Variables": AutoMPGVariables,
		"row_conversion": row_conversion_autompg,
		"question": "Please draw a causal diagram using these variables based on your hypotheses.",
		"next_link": '',
		"object_name": 'Car Models',
		"visualize_stakeholder": false,
		"data_visualization": true,
	},
	"salary": {
		"path": null,
		"Variables": SalaryVariables,
		"question": "Please draw a causal diagram using these variables based on your hypotheses.",
		"next_link": '',
		"object_name": 'People',
	},
	// berkeley admission
	"admission": {
		"path": "/static/data/UCBAdmissions/applicants_berkeley_1973.csv",
		"Variables": ApplyVariables,
		"row_conversion": row_conversion_application,
	},
	"application": {
		"path": "/static/data/apply_data.csv",
		"Variables": ApplyVariables,
		"row_conversion": row_conversion_application,
		"question": "Please draw a causal diagram using these variables based on your hypotheses.",
		"next_link": '',
		"object_name": 'Applicants',
		"visualize_stakeholder": true,
		"data_visualization": false,
	},
	"application_viz": {
		"path": "/static/data/apply_data.csv",
		"Variables": ApplyVariables,
		"row_conversion": row_conversion_application,
		"question": "Please draw a causal diagram using these variables based on your hypotheses.",
		"next_link": '',
		"object_name": 'Applicants',
		"visualize_stakeholder": false,
		"data_visualization": true,
	},
	"campaign_viz": {
		"path": "/static/data/campaigns_data_converted.csv",
		"Variables": CampaignVariables,
		"row_conversion": row_conversion_campaign_converted,
		"question": "Based on the data, which variable(s) is the most plausible reason that explains <b>why the “success rate” of the projects launched in “the third month” is much lower?</b> (success rate means the percentage of successful projects in all projects)",
		"object_name": 'Campaigns',
		"visualize_stakeholder": false,
		"data_visualization": true,
	},
	"house_tutorial": {
		"path": "/static/data/gen_house_data_2_1.csv",
		"Variables": HouseVariables,
		"row_conversion": row_conversion_houses,
		"object_name": 'Houses',
		"visualize_stakeholder": false,
	},
	"house": {
		"path": "/static/data/gen_house_data_practice_1.csv",
		"Variables": HouseVariables,
		"row_conversion": row_conversion_houses,
		"object_name": 'Houses',
		"visualize_stakeholder": false,
	},
	// added variable for diagram_canvas
	"diagram_canvas": {
		"path": '',
		"Variables": [],
		"question": "Please draw a diagram illustraing your code.",
		"next_link": '',
		"object_name": 'Diagram Canvas',
		"data_visualization": false,
		// "row_conversion": row_conversion_safety_report_simulated,
		"visualize_stakeholder": false,
	},

	// "application": {
	// 	// TODO: convert the hardcode path to Django static generated path
	// 	"path": "/static/data/apply_data.csv",
	// 	"Variables": ApplyVariables,
	// 	"preprocess": preprocessApply,
	// 	"question": "Given the data, please determine whether the admission result is affected by gender or department the applicant applied.",
	// 	"next_link": '/presurvey',
	// 	"object_name": 'Applicants'
	// },
	// "campaign": {
	// 	"path": "/static/data/campaigns_data.csv",
	// 	"Variables": CampaignVariables,
	// 	"preprocess": preprocessCampaign,
	// 	"question": "Based on the data, which variable(s) is the most plausible reason that explains <b>why the “success rate” of the projects launched in “the third month” is much lower?</b> (success rate means the percentage of successful projects in all projects)",
	// 	"next_link": '/postsurvey',
	// 	"object_name": 'Campaigns'
	// },
	// "campaign(-)": {
	// 	"path": "/static/data/-_10000_campaigns_data.csv",
	// 	"Variables": Campaign3Variables,
	// 	"preprocess": preprocess3Campaign,
	// 	"question": "",
	// 	"object_name": 'Campaigns'
	// },
	// "campaign(X-Y)": {
	// 	"path": "/static/data/X-Y_10000_campaigns_data.csv",
	// 	"Variables": Campaign3Variables,
	// 	"preprocess": preprocess3Campaign,
	// 	"question": "",
	// 	"object_name": 'Campaigns'
	// },
	// "campaign(X-MY)": {
	// 	"path": "/static/data/X-MY_10000_campaigns_data.csv",
	// 	"Variables": Campaign3Variables,
	// 	"preprocess": preprocess3Campaign,
	// 	"question": "",
	// 	"object_name": 'Campaigns'
	// },
	// "campaign(XM-Y)": {
	// 	"path": "/static/data/XM-Y_10000_campaigns_data.csv",
	// 	"Variables": Campaign3Variables,
	// 	"preprocess": preprocess3Campaign,
	// 	"question": "",
	// 	"object_name": 'Campaigns'
	// },
	// "campaign(X-M-Y)": {
	// 	"path": "/static/data/X-M-Y_10000_campaigns_data.csv",
	// 	"Variables": Campaign3Variables,
	// 	"preprocess": preprocess3Campaign,
	// 	"question": "",
	// 	"object_name": 'Campaigns'
	// },
	// "campaign(X-(M-Y))": {
	// 	"path": "/static/data/X-(M-Y)_10000_campaigns_data.csv",
	// 	"Variables": Campaign3Variables,
	// 	"preprocess": preprocess3Campaign,
	// 	"question": "",
	// 	"object_name": 'Campaigns'
	// }
}

function getDefaultLayout({
	overall_width = 900, // this determines the overall vica-container width (graph + narrative)
	graph_width = 600,   // graph width
	graph_height = 600,  // graph height
}) {
	let outline_width = 3;              // this determines the outline among panels
	let working_width = overall_width;  // this determines the width of graph + hypothesis panels
	let graph_left = 0;
	// below should be deprecated
	let chart_width = 600;
	let chart_height = '50%';
	let regression_width = chart_width;
	let regression_height = '50%';
	let regression_top = '50%';
	return {
		// vica-container
		overall_width: overall_width,
		// top panel
		top_panel_width: working_width,
		// middle panel
		middle_panel_width: working_width,   // this actually doesn't matter much
		middle_panel_height: graph_height, // this matters. it bumps down the bottom panel
		// graph svg
		graph_width: graph_width,    // the specified graph width and height
		graph_height: graph_height,
		graph_left: graph_left,
		// middle right panel
		middle_right_panel_width: working_width - graph_width - outline_width,
		middle_right_panel_height: graph_height,
		// middle_right_panel_left: 0,
		middle_right_panel_left: graph_width + outline_width,
		// put chart on the right
		chart_width: chart_width,
		chart_height: chart_height,
		chart_left: working_width,
		// regression panel
		regression_width: regression_width,
		regression_height: regression_height,
		regression_left: working_width,
		regression_top: '50%',
	};
}
