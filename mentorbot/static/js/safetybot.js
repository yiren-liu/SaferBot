/*
	Global Variables
*/
var all_essays;
var curr_essay;

var essay_num;
essay_num = 0;

// index to study session
var curr_session;
var curr_day;

// dialogflow state vars
var df_project_id;
var df_session_id;

if (configs.condition=='control') {
	df_project_id = "livesafe-ghis";
} else {
	df_project_id = "livesafe-emotional-xmyd";
}
df_session_id = Math.random().toString(36).slice(2, 9);

var editor;

// var system_options = {
// 	'crowd_intelligence': 'diagram', // 'diagram' or 'hint'
// }

// First Function
function entry() {
	// warn user before refresh
	// window.onbeforeunload = function() { return "Your work will be lost."; };

	configs.session = 'safetybot';

	// hide hamburger if needed
	if (!configs.show_hamburger) {
		document.querySelector('#hamburger').remove();
		document.querySelector('.navbar-brand').remove();
	}




	// window.setInterval(function() {
	// 	let editorData = editor.getData();
		
	// 	saveLog('AUTO_SAVE_TEXT', {
	// 		"editor_data": editorData,
  //           "session": configs.session,
  //           "context": configs.context
	// 	}, 'auto_save', configs.session, editorData, 'N');

	// 	document.getElementById("last_saved_time").innerHTML = new Date().toString();
	// 	//alert('saved');
	// }, 5000);

	// checking the editor every 5 seconds


	// button for next essay
	// var count = -1;
	// util.addButtonTo($essay_col.find('.button-list'), {
	// 	text: 'next essay',
	// 	// classes: ['btn-outline-secondary', 'advanced-feature'],
	// 	onclick: () => {
	// 		// switch to next essay here
	// 		// global: AllEssays
	// 		var next = AllEssays[++count % AllEssays.length];
	// 		$essay_col.find(".essay-display-panel").append('text').text(next)
	//
	// 		saveLog('CLICK_NEXT_ESSAY', {});
	// 	}
	// });

	// util.addButtonTo($essay_col.find('.button-list-next-session'), {
	// 	text: 'preceed to next session',
	// 	// classes: ['btn-outline-secondary', 'advanced-feature'],
	// 	onclick: () => {
	// 		next_session();
	// 	}
	// });

	// add sse connection for wizard pushed diagram update
// 	const diagramSSE = new EventSource("stream_diagram/");
// 	diagramSSE.addEventListener("message", function(response) {
// 	      console.log("received diagram msg from server!")
//
// 	      try {
// 					let data = JSON.parse(response.data);
// 	        let variable_diagram = data.variable_diagram;
// 					if (variable_diagram) {
// 						mainCR.setDiagram(JSON.parse(variable_diagram.causal_diagram), 500);
// 					}
// 	      } catch (err) {
// 	        console.error(err);
// 	      }
// 	})
//
}

function highlightSelection() {
	// var userSelection = window.getSelection();
	// alert(userSelection);
	// for(var i = 0; i < userSelection.rangeCount; i++) {
	// 	highlightRange(userSelection.getRangeAt(i));
	// }
	var userSelection = window.getSelection().getRangeAt(0);
    highlightRange(userSelection);

}

let $opinion_btn = $('#opinion');
	let $hypothesis_btn = $('#hyopthesis');
	let $action_item_btn = $('#action_item');

function highlightRange(range, category, userSelection) {
	var newNode = document.createElement("span");
	if (category == 'experience') {
		newNode.setAttribute(
			"style",
			"font-style:italic; display: inline;"
		 );
	} else if (category == 'opinion') {
		newNode.setAttribute(
			"style",
			"text-decoration: underline; display: inline;"
		 );
	} else if (category == 'hypothesis') {
		newNode.setAttribute(
			"style",
			"font-weight: bold; display: inline;"
		 );
	} else if (category == 'action_item') {
		newNode.setAttribute(
			"style",
			"background-color: #A3A300; display: inline;"
		 );
	} else if (category == 'clear') {
		// var frags = range.cloneContents();
		// alert(frags[0].innerHTML);
		// frags.forEach(frag => {
		// 	alert('abc');
		// 	alert(frag.innerHTML);
		// });
		
		// var stuff = range.innerHTML;
		// //alert(stuff);
		range.deleteContents();
		node = document.createElement('span');
		node.appendChild(document.createTextNode(userSelection));
		range.insertNode(node);
		// newNode.removeAttribute(
		// 	"style"
		// 	//"font-style: normal; text-decoration: none; font-weight: normal; background-color: transparent; display: inline;"
		//  );
	}	
  newNode.appendChild(range.extractContents());
  range.insertNode(newNode);
	//range.surroundContents(newNode);

  // log the highlight
  let $essay_col = $('.essay-col');
  let essay_text = $essay_col.find(".essay-display-panel")[0].innerHTML;
  saveLog(
    'HIGHLIGHT_TEXT', {
    "selected_text": range.cloneContents().textContent,
    "element": category,
    "session": configs.session,
    "context": configs.context,
    "essay_text": essay_text,
    }
  )
}

// display essay
function display_essay(essay) {
	let $essay_col = $('.essay-col');
	// $essay_col.find(".essay-display-panel").append('text').text(essay['text']);
	$essay_col.find(".essay-display-panel")[0].innerHTML = essay['text'];
}

function display_html(html) {
	let $essay_col = $('.essay-col');
	$essay_col.find(".essay-display-panel")[0].innerHTML = html;
}



// Second Function
function loadData(csvFile, callback) {
	return d3.csv(csvFile, configs.data.row_conversion)
		.then(function(data) {
			raw_data = data;
			preprocessVariable(raw_data, configs.data.Variables);
		});
}

async function save_variable_diagram(label = 'analysis') {
	let variable_diagram = mainCR._GraphUI.export_variable_diagram();
	let fields = {
		'command': 'save_variable_diagram',
		'context': configs.context,
		'label': label,
		'variables_json': JSON.stringify(variable_diagram.variables),
		'causal_diagram_json': JSON.stringify(variable_diagram.causal_diagram),
	};

    return $.ajax({
		type: "POST",
		url: "/ajax/",
		data: fields,
	});
}


/******************
	Debug
 ******************/

/******************
	Entry Point
 ******************/

//// called in the html
// entry();
