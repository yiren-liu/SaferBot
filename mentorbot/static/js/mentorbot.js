/*
  Global Variables
*/
/*
 *  inlineDisqussions
 *  By Tsachi Shlidor ( @shlidor )
 *  Inspired by http://mystrd.at/articles/multiple-disqus-threads-on-one-page/
 *
 *  USAGE:
 *
 *       disqus_shortname = 'your_disqus_shortname';
 *       $(document).ready(function() {
 *         $("p").inlineDisqussions(options);
 *       });
 *
 *  See https://github.com/tsi/inlineDisqussions for more info.
 */

// Disqus global vars.
var disqus_shortname;
var disqus_identifier;
var disqus_url;

(function ($) {

  var settings = {};

  $.fn.extend({
    inlineDisqussions: function (options) {

      // Set up defaults
      var defaults = {
        identifier: 'disqussion',
        displayCount: true,
        highlighted: false,
        position: 'right',
        background: 'white',
        maxWidth: 9999
      };

      // Overwrite default options with user provided ones.
      settings = $.extend({}, defaults, options);

      // Append #disqus_thread to body if it doesn't exist yet.
      if ($('#disqussions_wrapper').length === 0) {
        $('<div id="disqussions_wrapper"></div>').appendTo($('body'));
      }
      if ($('#disqus_thread').length === 0) {
        $('<div id="disqus_thread"></div>').appendTo('#disqussions_wrapper');
      }
      else {
        mainThreadHandler();
      }
      if (settings.highlighted) {
        $('<div id="disqussions_overlay"></div>').appendTo($('body'));
      }

      // Attach a discussion to each paragraph.
      $(this).each(function (i) {
        disqussionNotesHandler(i, $(this));
      });

      // Display comments count.
      if (settings.displayCount) {
        loadDisqusCounter();
      }

      // Hide the discussion.
      $('html').click(function (event) {
        if ($(event.target).parents('#disqussions_wrapper, .main-disqussion-link-wrp').length === 0) {
          hideDisqussion();
        }
      });

    },
    whatever: function () {
      alert('yeah');
    }
  });

  var disqussionNotesHandler = function (i, node) {

    var identifier;
    // You can force a specific identifier by adding an attribute to the paragraph.
    if (node.attr('data-disqus-identifier')) {
      identifier = node.attr('data-disqus-identifier');
    }
    else {
      while ($('[data-disqus-identifier="' + window.location.pathname + settings.identifier + '-' + i + '"]').length > 0) {
        i++;
      }
      identifier = window.location.pathname + settings.identifier + '-' + i;
    }

    // Create the discussion note.
    var cls = settings.highlighted ? 'disqussion-link disqussion-highlight' : 'disqussion-link';
    var a = $('<a class="' + cls + '" />')
      .attr('href', window.location.pathname + settings.identifier + '-' + i + '#disqus_thread')
      .attr('data-disqus-identifier', identifier)
      .attr('data-disqus-url', window.location.href + settings.identifier + '-' + i)
      .attr('data-disqus-position', settings.position)
      .text('+')
      .wrap('<div class="disqussion" />')
      .parent()
      .appendTo('#disqussions_wrapper');
    a.css({
      'top': node.offset().top,
      'left': settings.position == 'right' ? node.offset().left + node.outerWidth() : node.offset().left - a.outerWidth()
    });

    node.attr('data-disqus-identifier', identifier).mouseover(function () {
      a.addClass("hovered");
    }).mouseout(function () {
      a.removeClass("hovered");
    });

    // Load the relative discussion.
    a.delegate('a.disqussion-link', "click", function (e) {
      e.preventDefault();

      if ($(this).is('.active')) {
        e.stopPropagation();
        hideDisqussion();
      }
      else {
        loadDisqus($(this), function (source) {
          relocateDisqussion(source);
        });
      }

    });

  };

  var mainThreadHandler = function () {

    // Create the discussion note.
    if ($('a.main-disqussion-link').length === 0) {

      var a = $('<a class="main-disqussion-link" />')
        .attr('href', window.location.pathname + '#disqus_thread')
        .text('Comments')
        .wrap('<h2 class="main-disqussion-link-wrp" />')
        .parent()
        .insertBefore('#disqus_thread');

      // Load the relative discussion.
      a.delegate('a.main-disqussion-link', "click", function (e) {
        e.preventDefault();

        if ($(this).is('.active')) {
          e.stopPropagation();
        }
        else {
          loadDisqus($(this), function (source) {
            relocateDisqussion(source, true);
          });
        }

      });

    }

  };

  var loadDisqus = function (source, callback) {

    disqus_identifier = source.attr('data-disqus-identifier');
    disqus_url = source.attr('data-disqus-url');

    if (window.DISQUS) {
      // If Disqus exists, call it's reset method with new parameters.
      DISQUS.reset({
        reload: true,
        config: function () {
          this.page.identifier = disqus_identifier;
          this.page.url = disqus_url;
        }
      });

    } else {

      // Append the Disqus embed script to <head>.
      var s = document.createElement('script');
      s.type = 'text/javascript';
      s.async = true;
      s.src = '//' + disqus_shortname + '.disqus.com/embed.js';
      $('head').append(s);

    }

    // Add 'active' class.
    $('a.disqussion-link, a.main-disqussion-link').removeClass('active').filter(source).addClass('active');

    // Highlight
    if (source.is('.disqussion-highlight')) {
      highlightDisqussion(disqus_identifier);
    }

    callback(source);

  };

  var loadDisqusCounter = function () {

    // Append the Disqus count script to <head>.
    if (!$('script[src*="disqus.com/count.js"]').length) {
      var s = document.createElement('script');
      s.type = 'text/javascript';
      s.async = true;
      s.src = '//' + disqus_shortname + '.disqus.com/count.js';

      $('head').append(s);

      var limit = 0;
      var timer = setInterval(function () {
        limit++;
        // After script is loaded, show bubles with numbers.
        if (typeof (DISQUSWIDGETS) === 'object') {
          $('.disqussion-link').filter(function () {
            return $(this).text().match(/[1-9]/g);
          }).addClass("has-comments");
          clearInterval(timer);
        }
        // Don't run forever.
        if (limit > 10) {
          clearInterval(timer);
        }
      }, 1000)

    }

  };

  var relocateDisqussion = function (el, main) {

    // Move the discussion to the right position.
    var css = {};
    if (main === true) {
      $('#disqus_thread').removeClass("positioned");
      css = {
        'position': 'static',
        'width': 'auto'
      };
    }
    else {
      $('#disqus_thread').addClass("positioned");
      css = {
        'position': 'absolute'
      };
    }
    css.backgroundColor = settings.background;

    var animate = {};
    if (el.attr('data-disqus-position') == 'right') {
      animate = {
        "top": el.offset().top,
        "left": el.offset().left + el.outerWidth(),
        "width": Math.min(parseInt($(window).width() - (el.offset().left + el.outerWidth()), 10), settings.maxWidth)
      };
    }
    else if (el.attr('data-disqus-position') == 'left') {
      animate = {
        "top": el.offset().top,
        "left": el.offset().left - Math.min(parseInt(el.offset().left, 10), settings.maxWidth),
        "width": Math.min(parseInt(el.offset().left, 10), settings.maxWidth)
      };
    }

    $('#disqus_thread').stop().fadeIn('fast').animate(animate, "fast").css(css);

  };

  var hideDisqussion = function () {

    $('#disqus_thread').stop().fadeOut('fast');
    $('a.disqussion-link').removeClass('active');

    // settings.highlighted
    $('#disqussions_overlay').fadeOut('fast');
    $('body').removeClass('disqussion-highlight');
    $('[data-disqus-identifier]').removeClass('disqussion-highlighted');

  };

  var highlightDisqussion = function (identifier) {

    $('body').addClass('disqussion-highlight');
    $('#disqussions_overlay').fadeIn('fast');
    $('[data-disqus-identifier]')
      .removeClass('disqussion-highlighted')
      .filter('[data-disqus-identifier="' + identifier + '"]:not(".disqussion-link")')
      .addClass('disqussion-highlighted');

  };

})(jQuery);


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

// df_project_id = "mentorbot-day2-cquq";
df_project_id = "mentorbot-lab-qcnm";

var editor;

// var system_options = {
// 	'crowd_intelligence': 'diagram', // 'diagram' or 'hint'
// }

// First Function
function entry() {
  // // getting predefined task configurations
  // configs.data = task_configs[configs.context];

  // start session 1;
  // curr_session = "1";
  // df_session_id = ;

  // add editor instance
  ClassicEditor
    .create(document.querySelector('#editor'))
    .then(newEditor => {
      editor = newEditor;
    })
    .catch(error => {
      console.error(error);
    });

  // add hamburger
  


  let $essay_col = $('.essay-col');
  // let $sys_container = $('.system-container');

  if (configs.session == 'essay_writing') {
    $essay_col.find(".essay-display-panel").html(topic_html);
    // next session button
    let $next_session_btn = $('#next_session');
    $next_session_btn.click(function () {
      // log editor content
      let editorData = editor.getData();
      saveLog('SUBMIT_TEXT_AUTO', {
        "editor_data": editorData,
        "session": configs.session,
        "context": configs.context,
      });

      // redirect to next session
      window.location = '/mentorbot_' + configs.context;
    });

  }
  // $essay_col.find(".essay-display-panel").append('text').text(AllEssays[0]);

  all_essays = new EssayManager(AllEssays_test);
  tutorial_essays = new EssayManager(Essays_tutorial);

  // add buttons

  // todo: if there's submit button, set callback function
  let $submit_btn = $('#submit_text');
  $submit_btn.click(function () {
    // log editor content
    let editorData = editor.getData();
    saveLog('SUBMIT_TEXT', {
      "editor_data": editorData,
      "session": configs.session,
      "context": configs.context
    }, 'button_pressed', configs.session, editorData, 'Y');

    if (configs.session == 'essay_writing') {
      alert('Thank you for writing your essay. Let’s give some comments to others’ essays!');

      // add a sleep here, otherwise too fast to see the alert
      setTimeout(function () { }, 6000);
      window.location = '/mentorbot';
    }
    else if (configs.session == 'mentorbot') {
      alert('Thank you for helping your peers! Your feedback has been saved.');

      // change redirect on button to redirect on chatbot end_session message
      // alert('Thank you for helping your peers! Let’s review your previous essay, please feel free to improve your action items and resubmit.');
      // setTimeout(function () {}, 6000);
      // window.location = '/user_study_mentorbot_day_2';
    }
  });


  let $experience_btn = $('#experience');
  let $opinion_btn = $('#opinion');
  let $hypothesis_btn = $('#hypothesis');
  let $action_item_btn = $('#action_item');
  let $clear_btn = $('#clear');

  $experience_btn.click(function () {
    //var userSelection = window.getSelection().getRangeAt(0);
    //highlightRange(userSelection);
    var userSelection = window.getSelection();
    for (var i = 0; i < userSelection.rangeCount; i++) {
      highlightRange(userSelection.getRangeAt(i), 'experience');
    }
  });

  $opinion_btn.click(function () {
    //var userSelection = window.getSelection().getRangeAt(0);
    //highlightRange(userSelection);
    var userSelection = window.getSelection();
    for (var i = 0; i < userSelection.rangeCount; i++) {
      highlightRange(userSelection.getRangeAt(i), 'opinion');
    }
  });

  $hypothesis_btn.click(function () {
    //var userSelection = window.getSelection().getRangeAt(0);
    //highlightRange(userSelection);
    var userSelection = window.getSelection();
    for (var i = 0; i < userSelection.rangeCount; i++) {
      highlightRange(userSelection.getRangeAt(i), 'hypothesis');
    }
  });

  $action_item_btn.click(function () {
    //var userSelection = window.getSelection().getRangeAt(0);
    //highlightRange(userSelection);
    var userSelection = window.getSelection();
    for (var i = 0; i < userSelection.rangeCount; i++) {
      highlightRange(userSelection.getRangeAt(i), 'action_item');
    }
  });

  $clear_btn.click(function () {
    //var userSelection = window.getSelection().getRangeAt(0);
    //highlightRange(userSelection);
    var userSelection = window.getSelection();
    for (var i = 0; i < userSelection.rangeCount; i++) {
      highlightRange(userSelection.getRangeAt(i), 'clear', userSelection.toString());
    }
  });



  window.setInterval(function () {
    let editorData = editor.getData();

    saveLog('AUTO_SAVE_TEXT', {
      "editor_data": editorData,
      "session": configs.session,
      "context": configs.context
    }, 'auto_save', configs.session, editorData, 'N');

    document.getElementById("last_saved_time").innerHTML = new Date().toString();
    //alert('saved');
  }, 5000);

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
  // todo: set curr_essay
  // try {
  // 	disqus_shortname = 'co-roots';
  // 	$(document).on('submit', function($) {
  // 		alert('done');
  // 		$(".each").inlineDisqussions();
  // 		alert('reallydone');

  // 	});
  // } catch(err) {
  // 	alert('abc');
  // 	alert(err);

  // }

  // clean up editor content
  // jQuery(function($){
  // 	try {
  // 		$(".each").inlineDisqussions();
  // 	} catch (err) {
  // 		alert(err);
  // 	}

  // });	

  //document.trigger('myCustomeEvent');
  // alert('triggered');
  // try{
  // 	$('.essay-col').on('myCustomEvent', function($) {
  // 		alert('abc');
  // 		$(".each").inlineDisqussions();
  // 	});

  // } catch (err) {
  // 	alert(err);
  // }
  // alert('done');

  editor.setData('');
}


// display comparison
function display_comparison() {
  let $comparison_col = $('.comparison-col');
  let upward_text = `
	Student A set clear goals and action plans compared to the reflection given above. “I think a way I can try reducing this is organizing how I do my homework so that I can go to sleep around the same time everyday, preferably before 3 AM. The other aspect is exercise. I don't have exercise equipment in my dorm room, and obviously I don't feel too good about going to the gym because of COVID. However, I think I could use one of my breaks from homework to do some simple exercises such as push ups, sit ups, planks, etc.”
	`;
  let downward_text = `
	This person is in fact also very struggling. Student B seemed to have more severe stress and health problems compared to reflection given above. “I have severe GERD and any food I eat causes stomach acid to reach my esophagus and cause bad burning. My GERD is also triggered by stress, causing horrible burns when I am trying to take a test or even when I was on the start line for a race.”
	`;

  $comparison_col.find(".upward-panel").append('text').text(upward_text);
  $comparison_col.find(".downward-panel").append('text').text(downward_text);
}

// clear comparison
function clear_comparison() {
  let $essay_col = $('.comparison-col');

  $essay_col.find(".upward-panel").append('text').text("");
  $essay_col.find(".downward-panel").append('text').text("");
}

// add new paragraph to editor content

function editor_setup_text(text) {
  let model = editor.model;
  model.change(writer => {
    // writer.setSelection( writer.createPositionAt( editorInstance.model.document.getRoot(), 'end' ));
    writer.insertText(text, model.document.selection.getFirstPosition());
  });
}

function editor_add_text(text) {
  let model = editor.model;

  editor.execute('shiftEnter');
  model.change(writer => {
    // writer.setSelection( writer.createPositionAt( editorInstance.model.document.getRoot(), 'end' ));
    writer.insertText(text, model.document.selection.getFirstPosition());
  });
}


// Second Function
function loadData(csvFile, callback) {
  return d3.csv(csvFile, configs.data.row_conversion)
    .then(function (data) {
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


// sync function
async function autosave_user_diagram() {
  var tid = setInterval(autosave_variable_diagram, 1000);

  // func for sync user with wizard
  function autosave_variable_diagram(label = 'sync') {
    let variable_diagram = mainCR._GraphUI.export_variable_diagram();
    let fields = {
      'command': 'autosave_variable_diagram',
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

  function abortTimer() { // to be called when you want to stop the timer
    clearInterval(tid);
  }
}

/******************
  Debug
 ******************/

/******************
  Entry Point
 ******************/

//// called in the html
// entry();
