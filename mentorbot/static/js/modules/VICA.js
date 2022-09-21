/*
	The main VIsual Causality Analysis system-wise controller
*/

var VICA = (function(){
	// private variables
	let configs = {};
	let _$container;

	function init(_configs, $container) {
		configs = _configs;
		_$container = $container;
	}

	function show_hint(hint_body, hint_setting) {
		// use the general modal to set the hint title, body, and close button text
		let $modal = $('div.modal#general_modal');
		$('.modal-title', $modal).html('<i>Hint</i>');
		$('.modal-body', $modal).text(hint_body);
		$('#close_button', $modal).text('Got it!');

		let $btn = $('div.modal#general_modal button#secondary_button');
		if (hint_setting && hint_setting.secondary_button) {
			$btn.text(hint_setting.secondary_button.text);
			$btn.click(hint_setting.secondary_button.onclick);
			$btn.show();
		}
		else {
			$btn.hide();
		}

		$modal.modal('show');
	}

	function showModal({
			title = 'Title',
			body = 'Modal Body',
			buttons = {
				primary: {
					text: 'Close',
				}
			}
		}) {

		let $modal = $('div.modal#general_modal');
		$('.modal-title', $modal).html(title);
		$('.modal-body', $modal).text(body);
		$('#close_button', $modal)
			.text(buttons.primary.text)
			.unbind()
			.click(buttons.primary.onclick);

		let $btn = $('div.modal#general_modal button#secondary_button');
		if (buttons.secondary) {
			$btn.text(buttons.secondary.text)
				.unbind()
				.click(buttons.secondary.onclick)
				.show();
		}
		else {
			$btn.hide();
		}

		$modal.modal('show');

	}

	function show_alert({
			text = 'no message',
			classes = ['alert-secondary'],
			duration = 5000,
		}) {

		let $alert = $('#main_alert_container .alert');
		// reset the alert
		$alert.attr('class', ['alert alert-dismissible'].concat(classes).join(' '))
		      .css({top: '50px', display: 'none'});

		$('span.alert-text', $alert).html(text);

		$alert.fadeIn({queue: false}) // set queue to false so that the animation below will begin simultaneously
		      .animate({top: '0px'});

		// TODO: for better animation control, I should record this animation id and cancel it if a second show_alert is called before
		// the alert is hidden.
		setTimeout(hide_alert, duration);
	}


	// this function will be called by GraphUI after it adjusts its own height
	function setMiddlePanelHeight(height) {
		$('#middle_panel', _$container)
			.css('height', height + 'px');
		// set up right panel
		$('#middle_right_panel', _$container)
			.css('height', height + 'px');
		$("#graph_container", _$container)
			.css("height", height + "px");
	}

	function add_top_panel_button({
			id = '',
			classes = ['btn-outline-secondary'],
			text = '',
			onclick = () => {},
		}) {

		let $button = $('<button>')
			.attr('id', id)
			.attr('class', ['btn btn-sm'].concat(classes).join(' '))
			.attr('type', 'button')
			.text(text)
			.click(onclick);

		$('#top_panel_buttons').append([$button, ' ']); // append a tailing space so the next buttons will be separated
	}

	

	function hide_alert() {
		let $alert = $('#main_alert_container .alert');
		$alert.fadeOut();
	}

	function test() {
		console.log(x);
	}

	function createHypothesis(variables) {
		mainGraphUI.graph_add_link(variables);
	}

	function showVariableDetail(variable) {
		let $panel = $('.variable-detail-panel', _$container);
		$('span.name', $panel).text(variable.name);
		$('span.type', $panel).text(variable.type);
		$('span.long-description', $panel).text(variable.long_description);
	}
	
	return {
		init: init,
		showModal: showModal,
		show_hint: show_hint,
		createHypothesis: createHypothesis,
		test: test,
		add_top_panel_button: add_top_panel_button,
		setMiddlePanelHeight: setMiddlePanelHeight,
		showVariableDetail: showVariableDetail,
		show_alert: show_alert,
		hide_alert: hide_alert,
	};

})();