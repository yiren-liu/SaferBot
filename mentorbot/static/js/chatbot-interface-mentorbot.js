// global var
var curr_intent = "";
var checkbox_selected = [];

var last_response = {};

const checkbox2event = {
	"0": "collect_experience",
	"1": "collect_belief",
	"2": "collect_hypothesis",
	"3": "collect_goal",
};

const intent_list = [
	"read_essay_1 - collect - experience - feedback",
	"read_essay_1 - collect - belief - feedback",
	"read_essay_1 - collect - hypothesis - feedback",
	"read_essay_1 - collect - goal - feedback",
	"read_essay_1 - collect - goal_comparison_upward - feedback",
	"read_essay_1 - collect - goal_comparison_downward - feedback",
];

var chatWindow = new Bubbles(document.getElementById("chat"), "chatWindow", {
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
			'editor_text': editor.getData(),
		});

		if (o.input.length > 0) {
			let fields = {
				'command': 'post_chat',
				'message': user_text,
				'user': configs.user,
				'dialogflow_projectid': df_project_id,
				// 'dialogflow_sessionid': df_session_id,
				'event': '',
			}

			// logic for day2
			if (
				(curr_intent == "read_essay_1 - select" && user_text == "Yes")
				// || (curr_intent == "read_essay_1 - collect - experience - example" && user_text == "Yes")
			) {
				if (configs.use_checkbox) {
					// get checkbox values
					checkbox_selected = $('.checkbox').last().find('.messageCheckbox:checked').map(function () {
						return this.getAttribute("value");
					}).get();
					checkbox_selected = checkbox_selected.reverse();

					// project checkbox value to intent name
					checkbox_selected = checkbox_selected.map(function (v) {
						if (v in checkbox2event) {
							return checkbox2event[v];
						}
					});
					checkbox_selected = checkbox_selected != undefined ? checkbox_selected : [];
				} else {
					// loop through all
					checkbox_selected = [
						"collect_experience",
						"collect_belief",
						"collect_hypothesis",
						"collect_goal",
					].reverse();
				}

				// next checkbox item
				if (checkbox_selected.length == 0 || checkbox_selected[0] == undefined) {
					fields['event'] = 'collect_general';
				} else {
					fields['event'] = checkbox_selected.pop();
				}

			} else if (intent_list.includes(curr_intent)) {
				// record user feedback
				log_feedback(curr_intent.split(" - ")[2], fields['message'], curr_intent, essay_num);

				if (
					curr_intent != "read_essay_1 - collect - goal_comparison_upward - feedback" &&
					curr_intent != "read_essay_1 - collect - goal_comparison_downward - feedback"
				) {
					if (curr_intent.split(" - ")[2] != undefined) {
						editor_add_text("Regarding " + curr_intent.split(" - ")[2] + ", ");
						
					}
					editor_add_text(fields['message']);
				}

				// what user provided is feedback, so just trigger the next event
				// if content is day 3, and intent is actionable item, show social comparison cases
				if (configs.context == "day_3" && curr_intent == "read_essay_1 - collect - goal - feedback") {
					fields['event'] = 'show_comparison';
				} else if (checkbox_selected.length == 0) {
					fields['event'] = 'collect_general';
				} else {
					fields['event'] = checkbox_selected.pop();
				}

				// follow up chatbot Comment
				if (
					curr_intent == "read_essay_1 - collect - goal_comparison_upward - feedback" ||
					curr_intent == "read_essay_1 - collect - goal_comparison_downward - feedback"
				) {
					// add the comparison option to the feedback
					let $comparison_col = $('.comparison-col');
					if (curr_intent == "read_essay_1 - collect - goal_comparison_upward - feedback") {
						// append to editor end
						editor_add_text("Here's an example from another student, I hope it could be of help to you: ");
						editor_add_text($comparison_col.find(".upward-panel").text());
					} else if (curr_intent == "read_essay_1 - collect - goal_comparison_downward - feedback") {
						// append to editor end
						editor_add_text("Here's an example from another student, I hope it could be of help to you: ");
						editor_add_text($comparison_col.find(".downward-panel").text());
					}

					chatbot_utter([`Sounds great! Thanks for sharing that with me. I’ve added this option to your feedback.
				Please feel free to edit it in a way that the person who receives it will perceive this more positively.`], [])
				}

			} else if (curr_intent == 'read_essay_1 - collect - general - feedback') {
				// record user feedback
				log_feedback(curr_intent.split(" - ")[2], fields['message'], curr_intent, essay_num);
				editor_add_text("Regarding other elements, ");
				editor_add_text(fields['message']);

				// clear comparison
				clear_comparison();

				// preceed to next essay
				essay_num = essay_num + 1;

				// ensure maximum essay is 4;
				if (essay_num >= 4) {
					fields['event'] = 'session_end';
				}

				if (essay_num == 1) {
					checkbox_selected = [];
					fields['event'] = 'read_essay_2';
				} else {
					checkbox_selected = [];
					fields['event'] = 'read_essay_more';
				}

			} else if (curr_intent.split(" ").slice(-1)[0] == "example" && user_text == "Yes") {
				// next checkbox item
				if (checkbox_selected.length == 0 || checkbox_selected[0] == undefined) {
					fields['event'] = 'collect_general';
				} else {
					fields['event'] = checkbox_selected.pop();
				}
			}


			// new logic for metorbot lab session
			// if (curr_intent.split("_").slice(-1)[0] == "feedback") {
			if (curr_intent == 'collect_action_item_feedback') {
				function getQuality(text) {
					let fields = {
						'command': 'get_feedback_quality',
						'message': text,
					}
					// 0 is bad, 1 is good
					return $.ajax({
						type: "POST",
						url: "/ajax/",
						data: fields,
					}).then(response => response.quality);
				};

				let iter_count = 0;
				let MAX_REVISE_ITER = 1;
				let feedback_quality = 0;
				while (iter_count < MAX_REVISE_ITER) {
					let text = fields['message'];
					iter_count += 1;
					feedback_quality = await getQuality(text);
					// log the quality and feedback
					saveLog("FEEDBACK_QUALITY_CHECK", {
						'text': text,
						'context': configs.context,
						'session': configs.session,
						'editor_text': editor.getData(),
						'quality': feedback_quality,
					});

					if (feedback_quality == 1) {
						saveLog("QUALITY_CHECK_PASS", {});
						chatbot_utter([
							"Thank you for your input. It’s saved for the authors. You can edit your comments any time by placing your cursor on the marked item.",
							'You are doing a great job providing feedback to your peers! You can enrich your feedback by adding comments from more than two perspectives.'
						], []);
					} else {
						saveLog("QUALITY_CHECK_FAIL", {});
						chatbot_utter([
							"Thank you for your input. It’s saved for the authors. You can edit your comments any time by placing your cursor on the marked item.",
							'Your replies lack of specifics because there are fewer inputs than average, your peer may not think your feedback as beneficial. Could you please elaborate on your feedback using the editing panel on the left side?'
						], []);
						setTimeout(function () {}, 5000);
					}
				}
			}
			if (curr_intent == "collect_action_item_feedback") {
				// if (curr_intent.split(" - ")[2] != undefined) {
				// 	editor_add_text("Regarding " + curr_intent.split(" - ")[2] + ", ");
					
				// }
				editor_add_text("Regarding your action items, your peer commented: ");
				editor_add_text(fields['message']);

				// fields['event'] = 'collect_action_item_feedback_complete';
				fields['event'] = 'collect_other_feedback';
			} else if (curr_intent == "collect_other_feedback") {
				editor_add_text("Regarding your other aspects, your peer commented: ");
				editor_add_text(fields['message']);

				// fields['event'] = 'collect_other_feedback_complete';
			}



			// day 4 select log
			// if (curr_intent == "day_4 - select" && user_text == "Done") {
			// 	// get checkbox values
			// 	checkbox_selected = $('.checkbox').last().find('.messageCheckbox:checked').map(function () {
			// 		return this.getAttribute("value");
			// 	}).get();
			// 	saveLog("DAY_4_CHECKBOX", checkbox_selected);
			// } else if (curr_intent == "day_4 - collect - revise - feedback") {
			// 	fields['event'] = 'day_4_select_2'
			// } else if (curr_intent == "day_4 - collect_2 - revise - feedback") {
			// 	fields['event'] = 'day_4_end';
			// }


			// clear all buttons
			let buttons = document.querySelectorAll( '.bubble-button:not(.bubble-pick)' );
			Array.from(buttons).forEach((el) => el.remove());

			if (curr_intent == 'collect_action_item_feedback') {
				setTimeout(function () {
					post_chatbot_ajax(fields);
				}, 5000);
			} else {
				response = post_chatbot_ajax(fields);
			}
		}
	}
})

function post_chatbot_ajax(fields) {
	return $.ajax({
		type: "POST",
		url: "/ajax/",
		data: fields,
		success: function (response) {
			// response = JSON.parse(response);

			// display chatbot response
			chatbot_utter(response['replies'], response['clickables']);

			// handle backend actions
			response['actions'].forEach(item => handle_action(item));

			// update current intent
			curr_intent = response['intent'];
			console.log("current intent: " + curr_intent);

			// memorize last replies if not fallback intent
			if (curr_intent != 'Default Fallback Intent') {
				last_response = response;
			}

			// trigger for checkboxes and also check if essay number is over 4;
			if (curr_intent == 'read_essay_1 - select') {
				if (configs.use_checkbox) {
					let options = [
						'Situation, activity or experience.',
						'Prior conceptions and beliefs.',
						'Inquiries or hypothesis.',
						'New learning goals and future action plans.',
						'No, this reflection is thorough and contains all elements. ',
					];

					checkbox_html = get_checkbox_html(options, callbackFn = function () { });
					// console.log(checkbox_html);
					content = '<span class="bubble-button bubble-pick">' + checkbox_html + "</span>";
					bubble = chatWindow.addBubble(content, function () { });
					bubble.classList.add("checkbox");
				} else {
					// if not use checkbox, just send 'Done' to chatbot backend
					// wait until the last convo has finished printing;
					// now we do sleep, need a better solution in the future;
					// setTimeout(function () {
					// 	userInputCallback({
					// 		'input': 'Done',
					// 	});
					// }, 5000);

					setTimeout(function () {
						chatbot_utter([], ['Yes']);
					}, 6000);


				}
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
		'editor_text': editor.getData(),
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
		"display_feedback_editor",
		"display_checkboxes",
		"collect_feedback",
		"display_feedback_preview",
		"highlight_editor",
		"display_comparison",
		"display_checkboxes_day_4",
		"session_over",
		"display_next_essay_tutorial",
		"display_skip_button",
		"display_next_essay_feedback",
		"guidance_per_element",
		"display_next_essay_peer",
		"display_select_rating",
		"repeat_last",
	];

	//util.showAlert({'text': action});

	if (action == "display_feedback_editor" || action == "display_next_essay_feedback") {

		let essay = all_essays.get_next_essay();

		// todo: handle essay run out
		if (essay != undefined) {
			display_essay(essay);

			// todo: highlight essay reader

			// 
		}

	} else if (action == "display_next_essay_tutorial") {
		let essay = tutorial_essays.get_next_essay();

		if (essay != undefined) {
			display_essay(essay);
		}
	} else if (action == "display_comparison" && essay_num == 0) {
		display_comparison();

	} else if (action == "display_checkboxes_day_4") {
		let options = [
			'I feel the student is doing better than me',
			'I feel the student is not doing as good as me',
			'I don’t feel any difference',
		];

		checkbox_html = get_checkbox_html(options, callbackFn = function () { });
		// console.log(checkbox_html);
		content = '<span class="bubble-button bubble-pick">' + checkbox_html + "</span>";
		bubble = chatWindow.addBubble(content, function () { });
		bubble.classList.add("checkbox");
	} else if (action == "highlight_editor") {
		let editorData = editor.getData();
		$('#preview_content').html(editorData);

		// trigger the pop up box
		$('#preview_btn')[0].click();
	} else if (action == "session_over") {
		document.getElementsByClassName('input-wrap')[0].remove();

		// redirect to revise and resubmit
		alert('Thank you for helping your peers! Let’s review your previous essay, please feel free to improve your action items and resubmit.');
		setTimeout(function () {}, 6000);
        window.location = '/user_study_mentorbot_day_2';

	} else if (action == "display_select_rating") {
		// display rating selection
		setTimeout(function () {
			let essay = tutorial_essays.get_next_essay();
			if (essay != undefined) {
				display_essay(essay);
			}
			// editor.setData('Please consider potential shortcomings of this plan. Instead of allocating a day on a particular subject, you may consider splitting one day to mini-days (6-hour a mini-day) during the exam week.');
			display_rating_buttons();

		}, 3000);
	} else if (action == "guidance_per_element") {
		// detect color mark-ups, and provide guidance according to elements mentioned


		// loop through all mentioned elements, and collect feedback
		// temporary: collect_action_item_feedback
		let fields = {
			'command': 'post_chat',
			'message': '',
			'user': configs.user,
			'dialogflow_projectid': df_project_id,
			// 'dialogflow_sessionid': df_session_id,
			'event': 'collect_action_item_feedback',
		}
		response = post_chatbot_ajax(fields);


		// temporary: trigger session end;
		// document.getElementsByClassName('input-wrap')[0].remove();
		// chatbot_utter(['Thank you! This is the end for today\'s session.'], []);

		// trigger event 'read_peer_comment'
		// let fields = {
		// 	'command': 'post_chat',
		// 	'message': '',
		// 	'user': configs.user,
		// 	'dialogflow_projectid': df_project_id,
		// 	// 'dialogflow_sessionid': df_session_id,
		// 	'event': 'read_peer_comment',
		// }
		// response = post_chatbot_ajax(fields);
	} else if (action == "display_next_essay_peer") {
		// TODO: display a peer essay
		let essay = tutorial_essays.get_next_essay();

		if (essay != undefined) {
			display_essay(essay);
		}
	} else if (action == "display_skip_button") {
		// put a skip toturial button under bubble
		setTimeout(function () {
			display_skip_button();
		}, 2000*3);
	} else if (action == 'repeat_last') {
		chatbot_utter(last_response['replies'], last_response['clickables']);
	}

}

function display_rating_buttons() {
	var thumb_element = document.createElement("div");
	thumb_element.innerHTML = get_thumb_up_down_html();
	thumb_element = thumb_element.firstElementChild;
	let elements = document.getElementsByClassName('bubble say');

	// align width with the previous element 
	thumb_element.style.width = elements[elements.length - 1].offsetWidth + 'px';

	insertAfter(thumb_element, elements[elements.length - 1]);

	// bind callback for the feedback buttons
	let up_buttons = document.getElementsByClassName('thumbs-up');
	up_buttons[up_buttons.length - 1].onclick = function () {
		// log feedback 
		saveLog('SAVE_PEER_RATING', {
			"editor_data": '',
			"session": configs.session,
			"context": configs.context,
			"rating": 1,
			"peer_comment_id": 1001, // the id of the target peer feedback
		});

		// go to next intent
		// trigger event 'read_peer_comment_rated'
		let fields = {
			'command': 'post_chat',
			'message': '',
			'user': configs.user,
			'dialogflow_projectid': df_project_id,
			// 'dialogflow_sessionid': df_session_id,
			'event': 'read_peer_comment_rated',
		}
		response = post_chatbot_ajax(fields);

		this.parentElement.parentElement.remove();
	};

	let down_buttons = document.getElementsByClassName('thumbs-down');
	down_buttons[down_buttons.length - 1].onclick = function () {
		// log feedback 
		saveLog('SAVE_PEER_RATING', {
			"editor_data": '',
			"session": configs.session,
			"context": configs.context,
			"rating": -1,
			"peer_comment_id": 1001,
		});

		// go to next intent
		// trigger event 'read_peer_comment_rated'
		let fields = {
			'command': 'post_chat',
			'message': '',
			'user': configs.user,
			'dialogflow_projectid': df_project_id,
			// 'dialogflow_sessionid': df_session_id,
			'event': 'read_peer_comment_rated',
		}
		response = post_chatbot_ajax(fields);

		this.parentElement.parentElement.remove();
	};
}


function display_skip_button() {
	let button_element = document.createElement("div");
	button_element.innerHTML = get_skip_button_html();

	// skip button and continue button
	chatWindow.addBubble(get_continue_button_html(), function () {}, "reply");
	chatWindow.addBubble(get_skip_button_html(), function () {}, "reply");
	
	// let buttons = document.getElementsByClassName('bubble-button');
	let buttons = document.querySelectorAll( '.bubble-button:not(.bubble-pick)' );
	let skip_button = buttons[buttons.length - 1];
	let continue_button = buttons[buttons.length - 2];
	skip_button.onclick = function () {
		// log click 
		saveLog('CLICK_TUTORIAL_SKIP', {
			"editor_data": '',
			"session": configs.session,
			"context": configs.context,
		});


		// trigger event 'read_essay_exercise'
		let fields = {
			'command': 'post_chat',
			'message': '',
			'user': configs.user,
			'dialogflow_projectid': df_project_id,
			// 'dialogflow_sessionid': df_session_id,
			'event': 'read_essay_exercise',
		}
		response = post_chatbot_ajax(fields);

		// console.log(fields);
		Array.from(buttons).forEach((el) => el.remove());
	};

	continue_button.onclick = function () {
		// log click 
		saveLog('CLICK_TUTORIAL_CONTINUE', {
			"editor_data": '',
			"session": configs.session,
			"context": configs.context,
		});

		// trigger event 'read_essay_exercise'
		let fields = {
			'command': 'post_chat',
			'message': 'sounds good!',
			'user': configs.user,
			'dialogflow_projectid': df_project_id,
			// 'dialogflow_sessionid': df_session_id,
			'event': null,
		}
		response = post_chatbot_ajax(fields);

		// console.log(fields);
		Array.from(buttons).forEach((el) => el.remove());
		
	};

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
	'No, skip tutorial.'+
	"</span>";
	
	return html;
}

function get_continue_button_html() {
	let html = 
	'<span class="bubble-button" style="animation-delay: ' +
	100 +
	'ms; background: rgb(113 154 233)\">' +
	'Yes, continue.'+
	"</span>";
	
	return html;
}

// log user feedback to DB
function log_feedback(element, text, intent, essay_id) {
	saveLog("ELEMENT_FEEDBACK", {
		'element': element,
		'text': text,
		'intent': intent,
		'essay_id': essay_id,
	});
}


var greeting = {
	ice: {
		says: [
			"Hello! My name is Kudo. Hello! I am here to help you practice peer commenting skills.",
			"All your comments provided to authors will be anonymized by default.",
			"Are you ready to start now?",
		],
		reply: ["I'm ready!"],
	},
}

// if (configs.context == "day_4") {
// 	var greeting = {
// 		ice: {
// 			says: [
// 				"Hi!",
// 				"This is MentorBot.",
// 				"You did a good job in reflecting on your personal experiences and thoughts in this four-day practice. As your AI-Mentor, I have analyzed your reflections and can provide you with some comments."
// 			],
// 			reply: ["Let us start"],
// 		},
// 	}
// }


// pass JSON to your function and you're done!
// chatWindow.talk(convo)
chatWindow.talk(greeting);

last_response['replies'] = greeting['ice']['says']
last_response['clickables'] = greeting['ice']['reply']


// // add sse connection for server pushed chat update
// const chatbotSSE = new EventSource("stream_chatbot/");
// chatbotSSE.addEventListener("message", function(response) {
// 			console.log("received chatbot msg from server!")
//
// 			let data, message, user;
// 			try {
// 				data = JSON.parse(response.data)
// 				message = [data.message];
// 				user = data.user;
//
// 				if (user != 'user') {	// check if the message is from self
// 					let convo = {
// 						ice: {
// 							says: message.length > 0 ? message : [],
// 						},
// 						reply: {}
// 					}
// 					chatWindow.talk(convo);
// 				}
// 			} catch (err) {
// 				console.error(err);
// 			}
// })
