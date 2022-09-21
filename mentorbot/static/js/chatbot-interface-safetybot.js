// define prototype utils
Array.prototype.random = function () {
	return this[Math.floor((Math.random() * this.length))];
}

// configs var
var HIDE_REPORT_FIRST = true;
var ENABLE_AUTO_SCROLLING = false;

// global var
var curr_intent = "";
var checkbox_selected = [];

var last_response = {};

var user_uttr_history = [];
var event_uttr_history = [];
var pred_event_args = {
	// 'suspect': [],
	// 'location': [],
	// 'time': [],
};
var input_locked = {
	// 'suspect': false,
	// 'location': false,
	// 'time': false,
}; // for checking if need to update the form input
var event_select_locked = false; // lock the event select, if user has selected an event

var is_collect_event = false;
var is_mental_check = false;

var arg2question = {
	'location': 'Where did this take place?',
	'time': 'How long ago did this happen?',
	'suspect': 'Can you describe the suspect?',
	'suspect-age': 'Do you know how old is the suspect?',
	'suspect-race': 'Can you tell me what race the person is?',
	'suspect-clothing': 'Can you describe what they are wearing?',
	'suspect-sex': 'Do you know the gender of the suspect?',
	'suspect-movement': 'Can you still see the suspect or what direction the person was last seen?',
	'instrument': 'Does the person have anything with him that may present a danger to himself or others?',
	'victim-name': 'Do you know the name of the victim?',
	'victim-phone': 'Is there a name and telephone number you can provide (for the victim)?',
	'vehicle-plate': 'Can you tell me the plate number of the vehicle?',
	'vehicle-color': 'What is the color of the vehicle?',
	'vehicle-make': 'What is the make of the vehicle?',
	'vehicle-model': 'What is the model of the vehicle?',
	'item-stolen': 'What did the suspect take?',
	'item-price': 'What is the value of this item?',
};
var arg2count = {};
Object.entries(arg2question).forEach(([k, v]) => {
	arg2count[k] = 0;
})
var thank_texts = [
	"Thank you for providing the information!",
	"Thank you!",
	"I appreciate your patience!",
	"Thanks!",
];

var event2fields = {
	'attack': ['suspect', 'victim', 'general'],
	'gunshot': ['suspect', 'victim', 'general'],
	'assault': ['suspect', 'victim', 'general'],
	'abuse': ['suspect', 'victim', 'general'],
	'drug': ['suspect', 'general'],
	'carjacking': ['suspect', 'general', 'item', 'vehicle'],
	'theft': ['suspect', 'general', 'item'],
	'noise': ['suspect', 'general'],
}




// init form inputs 
document.querySelectorAll("[id^='input-']").forEach(input => {
	input_locked[input.getAttribute('aria-label')] = false;

	input.onfocusout = function () {
		if (input.value != "") {
			input_locked[input.getAttribute('aria-label')] = true;
			input.style.backgroundColor = 'gainsboro';
		}
	};

	input.onchange = function () {
		if (input.value != "") {
			let text_highlighted = event_uttr_history.join(", ");
			let patterns = [];
			document.querySelectorAll("[id^='input-']").forEach(e => {
				text_highlighted = highlight_pattern(text_highlighted,
					e.value);
			})
			display_html(text_highlighted);
		}

	};

})

// init event_system_status
axios.defaults.headers.common = {
	'Content-Type': 'application/x-www-form-urlencoded'
}
var status_element = document.querySelector("#event_system_status");
if (status_element != null) {
	function update_event_system_status() {
		console.log("checking event system status...");

		let form = new FormData();
		form.append('command', 'check_event_system_status')
		axios.post('/ajax/', form)
			.then(function (response) {
				let status = response['data']['system_status'];
				status_element.innerHTML = status;
				if (status == 'Offline') {
					status_element.style.color = "#ff0000";
				} else if (status == 'Online') {
					status_element.style.color = "#32aa13";
				}
			})
			.catch(function (error) {
				console.log(error);
			});
	}
	$(document).ready(function () {
		setInterval(update_event_system_status, 5000);
	});
}

// init dropdown selectors
$(document).ready(function () {
	$("#event-dropdown-items a").click(function () {
		// reflect choice on button text
		$("#event-dropdown-button").text($(this).text());
		// change form input fields according to event type
		let show_fields = event2fields[$(this).attr("id")];
		$("div[id^='fields-']").each(function (i) {
			if (show_fields.includes($(this).attr("id").split('-')[1])) {
				$(this).fadeIn();
			} else {
				$(this).fadeOut();
			}
		})
		// log the event
		saveLog("SELECT_EVENT_TYPE", {
			'context': configs.context,
			'session': configs.session,
			'event_type': $('#event-dropdown-button').text(),
			'report_fields': get_report_fields(),
			'visible_args': get_visible_args(),
		});
	});
	// init the fields once;
	// let show_fields = event2fields[$("#event-dropdown-items a").attr("id")];
	// $("div[id^='fields-']").each(function(i) {
	// 	if (show_fields.includes($(this).attr("id").split('-')[1])) {
	// 		$(this).fadeIn();
	// 	} else {
	// 		$(this).fadeOut();
	// 	}
	// })
});

// init dropdown buttons
$(document).ready(function () {
	$('.event-button').on('click', function () {
		event_select_locked = true; // lock event selection, if user click on event button

		$('.event-button').removeClass('selected');
		$(this).addClass('selected');
		// move this button to the top
		$(this).parent().prepend($(this));
		// change form input fields according to event type
		let show_fields = event2fields[$(this).attr("id")];
		$("div[id^='fields-']").each(function (i) {
			if (show_fields.includes($(this).attr("id").split('-')[1])) {
				$(this).fadeIn();
			} else {
				$(this).fadeOut();
			}
		})
		// log the event
		saveLog("SELECT_EVENT_TYPE", {
			'context': configs.context,
			'session': configs.session,
			'event_type': $('.event-button.selected').text(),
			'report_fields': get_report_fields(),
			'visible_args': get_visible_args(),
			'visible_options': $("#event-button-list").children().slice(1, 4).map(function () {
				return this.id;
			}).toArray(),
		});
	});
	// only show the top three event type
	$("#event-button-list").children().slice(3).hide();

	// init the expand button
	$('.event-button-expand').on('click', function () {
		$('.event-button').show();
		$(this).hide();
	});
	// collapse when click outside
	$(document).click(function (event) {
		if (!$(event.target).is('.dropdown *')) {
			$("#event-button-list").children().slice(3).hide();
			$('.event-button-expand').show();
		}
	});
});


// show initial modal popup
$(document).ready(function () {
	let card = $('#popup_card');
	card.fadeIn();
	$('#tutorial-close-btn').click(function () {
		card.fadeOut();
	});
	$(window).click(function (e) {
		if (e.target == card[0]) {
			card.fadeOut();
		}
	});


	// hide all elements exept first one
	$('.modal-page:not(:first)').hide();

	// add class last and first to last and fist modal-content divs
	$('.modal-page:first').addClass('first');
	$('.modal-page:last').addClass('last');

	// click on go back
	$('#tutorial-back-btn').click(function () {
		// check if its not the first div modal-content
		if (!$('.modal-page:visible').is('.first')) {
			var currentModalContent = $('.modal-page:visible');
			var prevModalContent = $(currentModalContent).prev('.modal-page');
			$(currentModalContent).hide();
			$(prevModalContent).fadeIn();
		}
	});

	// click on go next 
	$('#tutorial-next-btn').click(function () {
		// check if its not the last div modal-content 
		if (!$('.modal-page:visible').is('.last')) {
			var currentModalContent = $(this).parents('.modal-page');
			$(currentModalContent).hide();
			$(currentModalContent).next('.modal-page').fadeIn();
		}
	});

	// let's go button
	$('#end-tutorial-btn').click(function () {
		card.fadeOut();
	});

})

// hide report if needed
$(document).ready(function () {
	if (!HIDE_REPORT_FIRST) {
		$('#report-col').fadeIn();
	}
})

// make report panel draggable
$(document).ready(function () {
	$('#report-col').draggable({
		handle: ".title-header",
		containment: "body",
		scroll: false,
		// axis: "x",
		stop: function (event, ui) {
			saveLog("DRAG_REPORT_PANEL", {
				'context': configs.context,
				'session': configs.session,
				'x': ui.position.left,
				'y': ui.position.top,
				'report_fields': get_report_fields(),
				'visible_args': get_visible_args(),
			});
		}
	});
});

// get user geo location
$(document).ready(function () {
	let map, infoWindow;
	function initMap() {
		let mapholder = document.getElementById("mapholder");
		mapholder.style.display= 'none';
		map = new google.maps.Map(mapholder, {
			center: { lat: -34.397, lng: 150.644 },
			zoom: 6,
		});
		geocoder = new google.maps.Geocoder();
		infoWindow = new google.maps.InfoWindow();

		const locationButton = document.getElementById("report-locate");
		locationButton.addEventListener("click", () => {
			mapholder.style.height = '250px';
			mapholder.style.width = '100%';
			// mapholder.style.display= 'block';
			$('#mapholder').slideDown('slow');

			// Try HTML5 geolocation.
			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(
					(position) => {
						const pos = {
							lat: position.coords.latitude,
							lng: position.coords.longitude,
						};
						saveLog("GET_GEO_LOCATION", {
							'status': 'success',
							'context': configs.context,
							'session': configs.session,
							'lat': position.coords.latitude,
							'lng': position.coords.longitude,
							'report_fields': get_report_fields(),
							'visible_args': get_visible_args(),
						});
						infoWindow.setPosition(pos);
						infoWindow.setContent("Location found.");
						infoWindow.open(map);
						map.setCenter(pos);

						// reverse geocoding
						geocoder.geocode({ 'location': pos }, function (results, status) {
							if (status === 'OK') {
								if (results[0]) {
									document.getElementById("input-location").value = results[0].formatted_address;
								} else {
									document.getElementById("input-location").value = "";
								}
							}
						})
					},
					() => {
						handleLocationError(true, infoWindow, map.getCenter());
					}
				);
			} else {
				// Browser doesn't support Geolocation
				handleLocationError(false, infoWindow, map.getCenter());
			}
		});
	}

	function handleLocationError(browserHasGeolocation, infoWindow, pos) {
		infoWindow.setPosition(pos);
		infoWindow.setContent(
			browserHasGeolocation
				? "Error: The Geolocation service failed."
				: "Error: Your browser doesn't support geolocation."
		);
		infoWindow.open(map);
		saveLog("GET_GEO_LOCATION", {
			'status': 'failure',
			'context': configs.context,
			'session': configs.session,
			'report_fields': get_report_fields(),
			'visible_args': get_visible_args(),
			'error': browserHasGeolocation
				? "Error: The Geolocation service failed."
				: "Error: Your browser doesn't support geolocation.",
		});
	}

	initMap();
});






// How to show browser alert:
// util.showAlert({'text': action})

var chatWindow = new Bubbles(document.getElementById("chat"), "chatWindow", {
	animationTime: 300,
	inputCallbackFn: async function userInputCallback(o) {
		// add error conversation block & recall it if no answer matched
		var miss = function () {
			chatWindow.talk(
				{
					"i-dont-get-it": {
						says: [
							"Sorry, I don't get it 😕. Pls repeat? Or you can just click below 👇"
						],
						reply: o.convo[o.standingAnswer].reply
					}
				},
				"i-dont-get-it"
			)
		}

		// sanitize text for search function
		var strip = function (text) {
			// return text.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, "")
			return text
		}

		// send user input to server
		var user_text = strip(o.input)

		// log user utter along with editor test
		saveLog("USER_UTTERANCE", {
			'text': user_text,
			'context': configs.context,
			'session': configs.session,
			'event_type': $('#event-dropdown-button').text(),
			'report_fields': get_report_fields(),
			'visible_args': get_visible_args(),
		});

		if (o.input.length > 0) {
			let chat_fields = {
				'command': 'post_chat',
				'message': user_text,
				'user': configs.user,
				'dialogflow_projectid': df_project_id,
				'dialogflow_sessionid': df_session_id,
				'event': '',
			}

			// post chat msg to backend
			post_chatbot_ajax(chat_fields);

		}
	}
})

function infer_eventType(fields) {
	return $.ajax({
		type: "POST",
		url: "/ajax/",
		data: fields,
		success: function (response) {
			let eventType = response['inferred_eventType'];
			let ranked_eventTypes = response['ranked_eventTypes'];
			let ranked_probs = response['ranked_probs'];
			// logging
			saveLog("INFER_EVENTTYPE", {
				'text': fields['message'],
				'context': configs.context,
				'session': configs.session,
				'event_type': $('#event-dropdown-button').text(),
				'report_fields': get_report_fields(),
				'visible_args': get_visible_args(),
				'inferred_eventType': eventType,
				'ranked_eventTypes': ranked_eventTypes,
				'ranked_probs': ranked_probs,
			});

			// select the predicted event type
			if (eventType != '' && !event_select_locked) {
				$('#' + eventType).click();
			}

			// rank the event buttons
			let event_button_unselected = $('.event-button').not('.selected');
			for (let i = 0; i < ranked_eventTypes.length; i++) {
				let eventType = ranked_eventTypes[i];
				let event_button = event_button_unselected.filter(function () {
					return $(this).attr('id') == eventType;
				});
				$('#event-button-list').append(event_button);
			};
			$("#event-button-list").children().slice(0, 3).fadeIn();
			$("#event-button-list").children().slice(3).hide();

		}
	})
}

function extract_args(fields) {
	return $.ajax({
		type: "POST",
		url: "/ajax/",
		data: fields,
		success: function (response) {

			console.log("Event args extracted!");
			// logging
			saveLog("EXTRACT_ARGS", {
				'text': fields['message'],
				'context': configs.context,
				'session': configs.session,
				'event_type': $('#event-dropdown-button').text(),
				'report_fields': get_report_fields(),
				'visible_args': get_visible_args(),
			});

			// display event args
			Object.entries(response['answers']).forEach(([k, v]) => {
				pred_event_args[k] = v;
			})

			// check if error, if so, display error msg
			if (response['error'] != null) {
				util.showAlert({
					'text': response['error']
						+ '<br>'
						+ 'Service not started. Try starting the event detection service.'
				});
			}

			// update results in the input forms
			let scrollTopLowest = 1e12;
			let heightLowest = 0;
			Object.entries(pred_event_args).forEach(([k, v]) => {
				if (!input_locked[k]) {
					let element = $("#input-" + k);
					element.val(v);

					element.closest('[id^=collapse-]').collapse('show');

					element.fadeOut(200).fadeIn(200).fadeOut(200).fadeIn(200);

					if (element.is(':visible')) {
						if (element.offset().top < scrollTopLowest) {
							scrollTopLowest = element.offset().top;
							heightLowest = element.height();
						}
					}

				}
			});
			if (ENABLE_AUTO_SCROLLING) {
				// scroll to show the fields
				let parent = $('#report-panel');
				parent.animate({
					scrollTop: parent.scrollTop()
						+ scrollTopLowest
					// - parent.height() / 2 
					// + heightLowest / 2
				});
			};


			// highlight by offset
			let text_highlighted = event_uttr_history.join(", ");
			let offset_patterns = [];
			Object.entries(response['offsets']).forEach(([k, v]) => {
				offset_patterns.push(text_highlighted.substring(v[0], v[1]));
			});
			Object.entries(offset_patterns).forEach(([k, v]) => {
				text_highlighted = highlight_pattern(text_highlighted, v);
			});
			// display_html(event_uttr_history.join("\n"));
			display_html(text_highlighted);


			// chatbot response: what additional information can you provide?
			question = get_followup_question(pred_event_args);
			// chatbot_utter([thank_texts.random(), question]);
			chatbot_utter([question]);

		}
	})
}

function mental_check(fields) {
	return $.ajax({
		type: "POST",
		url: "/ajax/",
		data: fields,
		success: function (response) {
			console.log("Mental check succeeded!");
			// logging
			saveLog("MENTAL_CHECK", {
				'text': fields['message'],
				'context': configs.context,
				'session': configs.session,
				'mental_check_pass': response['mental_check_pass'],
				'polarity': response['polarity'],
				'event_type': $('#event-dropdown-button').text(),
				'report_fields': get_report_fields(),
				'visible_args': get_visible_args(),
			});
			let mental_check_pass = response['mental_check_pass'];

			if (mental_check_pass) {
				chatbot_utter([
					"Thank you for your information!",
					// "Let's get back to the report.",
				]);
			} else {
				chatbot_utter([
					"I am sorry to hear that. Here are more resources on campus that might help you to contact for professional help.",
					"Campus counseling center: <a href='http://counselingcenter.illinois.edu/counseling'> http://counselingcenter.illinois.edu/counseling <a>",
					"Trauma response team: <a href='http://counselingcenter.illinois.edu/emergency/trauma-response-team'> http://counselingcenter.illinois.edu/emergency/trauma-response-team <a>",
					// "Let's get back to the report.",
				]);
			}

			setTimeout(function () {
				let fields = {
					'command': 'post_chat',
					'message': '',
					'user': configs.user,
					'dialogflow_projectid': df_project_id,
					'dialogflow_sessionid': df_session_id,
					'event': 'collect_event_end',
				}
				response = post_chatbot_ajax(fields);
			}, 6000);

		}
	})
}

function get_report_fields() {
	let report_fields = {};
	document.querySelectorAll("[id^='input-']").forEach(input => {
		report_fields[input.getAttribute('aria-label')] = input.value;
	})
	report_fields['notes'] = document.querySelector("#notes").value;
	return report_fields;
}

function get_followup_question(pred_event_args) {
	let visible_args = get_visible_args();
	for (let i = 0, len = visible_args.length; i < len; i++) {
		let arg = visible_args[i];
		if (pred_event_args[arg] == "") {
			if (arg2count[arg] == 0) {
				arg2count[arg]++;
				return arg2question[arg];
			} else {
				continue;
			}
		}
	}
	return "Is there any other information you can provide? Any information could help us better resolve your issue. Or you can type 'Done' if you are finished.";
}

// returns all args that are visible at the moment (e.g. 'suspect', 'suspect-age'...)
function get_visible_args() {
	return $("[id^='fields-']").filter(function () {
		return $(this).css('display') != 'none';
	}).find("[id^='input-']").map((i, v) => { return v.id.replace('input-', '') }).get();
}
// returns all args, regardless of visibility
function get_all_args() {
	return $("[id^='input-']").map((i, v) => { return v.id.replace('input-', '') }).get();
}



function post_chatbot_ajax(fields) {
	return $.ajax({
		type: "POST",
		url: "/ajax/",
		data: fields,
		success: function (response) {
			// response = JSON.parse(response);

			// update current intent
			curr_intent = response['intent'];
			console.log("current intent: " + curr_intent);

			if (is_collect_event && !response['actions'].includes("collect_event_end")) {
				// display event dialogue history
				event_uttr_history.push(fields['message']);

				// request event argument extraction
				let text = event_uttr_history.join(", ");

				let infer_fields = {
					'command': 'infer_event_type',
					'message': text,
					'user': configs.user,
					'args': get_visible_args(),
				};
				infer_eventType(infer_fields);

				let event_fields = {
					'command': 'extract_event_args',
					'message': text,
					'user': configs.user,
					'args': get_visible_args(),
				};
				extract_args(event_fields);

				// mental check
			} else if (is_mental_check) {
				// call mental check ajax
				let mental_fields = {
					'command': 'check_mental_negativity',
					'message': fields['message'],
					'user': configs.user,
				};
				mental_check(mental_fields);
				is_mental_check = false;
			} else {
				// display chatbot response
				chatbot_utter(response['replies'], response['clickables']);
			}

			// handle backend actions
			response['actions'].forEach(item => handle_action(item));

			// memorize last replies if not fallback intent
			if (curr_intent != 'Default Fallback Intent') {
				last_response = response;
			}

		}
	})
}



// easy wrapper to speak once
function chatbot_utter(text, clickables = []) {
	// log chatbot utter
	saveLog("CHATBOT_UTTERANCE", {
		'text': text,
		'context': configs.context,
		'session': configs.session,
		'event_type': $('#event-dropdown-button').text(),
		'report_fields': get_report_fields(),
		'visible_args': get_visible_args(),
	});

	let utterance = {
		ice: {
			says: text,
			reply: clickables,
		},
	}

	chatWindow.talk(utterance);

	// TODO: complete highlighting
	// let $essay_col = $('.essay-col');
	// $essay_col.find(".essay-display-panel").html(`<p><mark>Please use 15~20 mins to read these materials on&nbsp;<strong>intentional learning</strong>:</p><ul><li>Read about understanding your learning style from the University of Waterloo:&nbsp;<a href='https://uwaterloo.ca/centre-for-teaching-excellence/teaching-resources/teaching-tips/tips-students/self-knowledge/understanding-your-learning-style#:~:text=Active%20Active%20learners%20learn%20by,and%20understand%20things%20before%20acting.'>https://uwaterloo.ca/centre-for-teaching-excellence/teaching-resources/teaching-tips/tips-students/self-knowledge/understanding-your-learning-style#:~:text=Active%20Active%20learners%20learn%20by,and%20understand%20things%20before%20acting.</a></li><li>Read about how to make the most of your university experience from The World University Rankings:&nbsp;
	// <a href='https://www.timeshighereducation.com/student/advice/student-blog-five-tips-make-most-your-university-experience'>https://www.timeshighereducation.com/student/advice/student-blog-five-tips-make-most-your-university-experience</a></li></ul><p>Reflection time! Think about what parts of this material resonated most with you and reflect on your personal experience: What are some of the strategies you use to make the most of your classes? What works for you to best learn the material? Share some of the mistakes you may have made, or that you try to avoid making(150~200 words). This section will take around 15~30 mins to finish.</p><p><br>&nbsp;</mark></p>`);
}

// modify web content according to conversation
function handle_action(action) {
	// todo: log the action
	saveLog("ACTION", action);

	// todo: implement webpage action Here
	let action_list = [
		"collect_event",
		"collect_event_end",
		"utter_report",
		"session_over",
		"mental_check",
	];

	//util.showAlert({'text': action});

	if (action == "collect_event") {
		is_collect_event = true;
		$('#report-col').slideDown('slow');
	} else if (action == "collect_event_end") {
		is_collect_event = false;
	} else if (action == "utter_report") {
		// if no information is provided, ask user to provide more information
		if (Object.values(get_report_fields()).every(item => item == "")) {
			is_collect_event = true;
			chatbot_utter([
				"Please provide details of the incident, such that the safety department can take corresponding actions.",
			]);
			return;
		}

		// expand all report sections
		$('[id^=collapse-]').collapse('show');

		chatbot_utter([
			// "Thank you for sharing the information with me!",
			// "Here's some important information I captured:",
			// args2html(pred_event_args),
			// "Is this information correct? If not, you can edit the report on the web page.",
			"You can review and edit the report on the webpage, and click “submit” to finalize the report.",
			"Oh right, just one last thing",
			"Do you want to share this information with other students in this community?",
			// "Any identifiable information in your report will be anonymized.",
		]);
	} else if (action == "session_over") {
		document.getElementsByClassName('input-wrap')[0].remove();
	} else if (action == "mental_check") {
		is_collect_event = false;
		is_mental_check = true;
		chatbot_utter([
			"I'm very sorry that you had to go through such an incident.",
			"Having a bad or traumatic experience is usually very hard for most people.",
			// "Such experience might bring stress, but sometimes people won't realize they are under such negative influence.",
			"It is okay to not talk about it, but it might help you if you share with me about your feelings after the incident.",
			"How do you feel right now?",
		]);
	}
}

function args2html(pred_event_args) {
	let text = '';
	Object.entries(pred_event_args).forEach(([k, v]) => {
		text += '<b>' + k + '</b>' + ': ' + v + '<br>';
	}
	)
	return text
}

function highlight_pattern(text, pattern) {
	text = text.replace(pattern,
		'<code style="margin: 0.1em;background-color: #EFE7DF;">'
		+ pattern
		+ '</code>');
	return text;
}



function insertAfter(newElement, referenceElement) {
	referenceElement.parentNode.insertBefore(newElement, referenceElement.nextSibling);
}


function get_checkbox_html(options, callbackFn = function () { }) {
	let html = "";
	options.forEach(function (option, idx) {
		html = html + "<input class='messageCheckbox' type='checkbox' id=" + idx + " name=" + idx + " value=" + idx + ">";
		html = html + "<label for=" + option + "> " + option + "</label><br>";
	})
	return html;
}

function get_thumb_up_down_html() {
	let html = `
	<div class="row mb-2 mt-2 justify-content-end">
		<div class="col-md-2"> 
		<span class="thumb thumbs-up" style="text-align: center;">
		<i class="far fa-thumbs-up"></i>
		</span>
		</div>
		<div class="col-md-2"> 
		<span class="thumb thumbs-down" style="text-align: center;">
		<i class="far fa-thumbs-down"></i>
		</span>
		</div>
	</div>
	`
	return html;
}

function get_skip_button_html() {
	let html =
		'<span class="bubble-button" style="animation-delay: ' +
		100 +
		'ms; background: rgb(113 154 233)\">' +
		'No, skip tutorial.' +
		"</span>";

	return html;
}

function get_continue_button_html() {
	let html =
		'<span class="bubble-button" style="animation-delay: ' +
		100 +
		'ms; background: rgb(113 154 233)\">' +
		'Yes, continue.' +
		"</span>";

	return html;
}



// var greeting = {
// 	ice: {
// 		says: [
// 			"Hello! I am LiveSafe bot. I can help you to report any safety-related incidents or suspicious activities.",
// 			"All your messages sent to the chatbot will be anonymized by default.",
// 			"What can I help you with?",
// 		],
// 		reply: ["I want to report an incident."],
// 	},
// }
// chatWindow.talk(greeting);

// last_response['replies'] = greeting['ice']['says']
// last_response['clickables'] = greeting['ice']['reply']



// only initialize chatbot upon first click
var element = $('.floating-chat');
setTimeout(function () {
	element.addClass('enter');
}, 1000);
element.click(openElementFirstChat);
function openElementFirstChat() {
	element.find('>i').hide();
	element.addClass('expand');
	element.find('.chat').addClass('enter');
	element.off('click', openElementFirstChat);
	element.find('.header button').click(closeElement);

	var greeting = {
		ice: {
			says: [
				"Hello! I am Safety Reporting chatbot.",
				"If you are currently <a style='color:yellow;'> in an emergency or facing immediate threat</a>, please dial 911 or your local emergency number immediately.",
				// "All your messages sent to the chatbot will be anonymized by default.",
				"Would you like to report a safety incident as a witness or victim?",
			],
			reply: ["victim"],
		},
	}
	chatWindow.talk(greeting);

	last_response['replies'] = greeting['ice']['says']
	last_response['clickables'] = greeting['ice']['reply']
}
function openElement() {
	element.find('>i').hide();
	element.addClass('expand');
	element.find('.chat').addClass('enter');
	element.off('click', openElement);
	element.find('.header button').click(closeElement);
}
function closeElement() {
	element.find('.chat').removeClass('enter').hide();
	element.find('>i').show();
	element.removeClass('expand');
	element.find('.header button').off('click', closeElement);
	setTimeout(function () {
		element.find('.chat').removeClass('enter').show()
		element.click(openElement);
	}, 500);
}
setTimeout(function () {
	element.click();
}, 1500);

// make resizable
element.find('.chat').resizable({ handles: 'n,w' });

