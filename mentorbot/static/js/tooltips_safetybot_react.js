const { useState } = React;
const { ChangeEvent, useEffect } = React;
const e = React.createElement;
const { css, keyframes } = styled;
const styledComp = styled;

const { Button, Tooltip, styled, tooltipClasses, ClickAwayListener } = MaterialUI;


const HtmlTooltip = styled(({ className, ...props }) => (
  <Tooltip disableFocusListener
    disableHoverListener
    disableTouchListener
    arrow
    {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    // backgroundColor: '#f5f5f9',
    // color: 'rgba(0, 0, 0, 0.87)',
    maxWidth: 350,
    fontSize: 20,
    border: '1px solid #dadde9',
    fontFamily: "Montserrat, sans-serif",
  },
}));




// // chatbot tooltips
// const chatbotArrowTooltips = () => {
//   const [open, setOpen] = React.useState(false);
//   const handleTooltipClose = () => {
//     setOpen(false);
//   };
//   const handleTooltipOpen = () => {
//     setOpen(true);
//   };

//   useEffect(() => {
//     setTimeout(function () { //Start the timer
//       handleTooltipOpen(); //After 1 second, set render to true
//       // console.log("use effect");
//     }.bind(this), 2000)
//     // handleTooltipOpen();
//   }, []);

//   return (
//     <ClickAwayListener onClickAway={handleTooltipClose}>
//       <div>
//         <HtmlTooltip
//           open={open}
//           placement="left"
//           // onClick={handleTooltipOpen}
//           title="Feeling lost? Use the chatbot to fill out the incident report!">
//           <p></p>
//         </HtmlTooltip>
//       </div>
//     </ClickAwayListener>
//   );
// };
// var domContainer = document.querySelector('#tooltip-chatbot');
// ReactDOM.render(e(chatbotArrowTooltips), domContainer);




// // report editing tooltips
// const reportArrowTooltips = () => {
//   const [open, setOpen] = React.useState(false);
//   const handleTooltipClose = () => {
//     setOpen(false);
//   };
//   const handleTooltipOpen = () => {
//     setOpen(true);
//   };

//   useEffect(() => {
//     setTimeout(function () { //Start the timer
//       handleTooltipOpen(); //After 1 second, set render to true
//       // console.log("use effect");
//     }.bind(this), 4000)
//     // handleTooltipOpen();
//   }, []);

//   return (
//     <ClickAwayListener onClickAway={handleTooltipClose}>
//       <div>
//         <HtmlTooltip
//           open={open}
//           placement="left"
//           // onClick={handleTooltipOpen}
//           title="You can also manually edit the report here. 
//           The chatbot will guide you through the report filing steps.">
//           <p></p>
//         </HtmlTooltip>
//       </div>
//     </ClickAwayListener>
//   );
// };
// var domContainer = document.querySelector('#tooltip-report');
// ReactDOM.render(e(reportArrowTooltips), domContainer);




// // chatbot input tooltip
// const inputArrowTooltips = () => {
//   const [open, setOpen] = React.useState(false);
//   const handleTooltipClose = () => {
//     setOpen(false);
//   };
//   const handleTooltipOpen = () => {
//     setOpen(true);
//   };

//   useEffect(() => {
//     setTimeout(function () { //Start the timer
//       handleTooltipOpen(); //After 1 second, set render to true
//       // console.log("use effect");
//     }.bind(this), 3000)
//     // handleTooltipOpen();
//   }, []);

//   return (
//     <ClickAwayListener onClickAway={handleTooltipClose}>
//       <div>
//         <HtmlTooltip
//           open={open}
//           placement="left"
//           // onClick={handleTooltipOpen}
//           title="Press 'Enter' to send out the message.">
//           <p style={{marginBottom: 0}}></p>
//         </HtmlTooltip>
//       </div>
//     </ClickAwayListener>
//   );
// };
// var domContainer = document.querySelector('.input-wrap');
// domContainer = domContainer.appendChild(document.createElement("div"));
// ReactDOM.render(e(inputArrowTooltips), domContainer);





// submit button element
const StyledButton = styledComp.button`
  background: transparent;
  border-radius: 3px;
  border: 2px solid ${props => (props.disabled ? 'gray' : 'rgb(231, 100, 67)')};
  color: rgb(231, 100, 67);
  margin: 0.5em 1em;
  padding: 0.25em 1em;
  transition: background 0.5s ease;

  ${props => props.primary && css`
    background: ${props => (props.disabled ? 'gray' : 'rgb(231, 100, 67)')};
    color: white;
  `}
  
  &:hover {
    background: ${props => (props.disabled ? 'gray' : 'rebeccapurple')};
    ${props => props.disabled && css`
    color: white;
    `
  }
`;
const Container = styledComp.div`
  text-align: center;
`
const ButtonSubmit = () => {
  const [disable, setDisable] = useState(false)
  return (
    <React.Fragment>
      <StyledButton primary disabled={disable} onClick={() => {
        // util.showAlert({
        //   'text': "Your incident report has been submitted!"
        // })

        // if no information is provided, show alert
        if (Object.values(get_report_fields()).every(item => item == "")) {
          util.showAlert({
            'text': "Please provide at least one information."
          })
          return;
        }

        // chatbot says "Your report has been submitted!"
        chatbot_utter([
          "Your report has been submitted!",
        ]);
        setDisable(true);

        // todo: change report panel to a big check mark
        $('#report-panel #content').toggle();
        $('#report-panel #checkmark').toggle();
      }
      }>
        Submit
      </StyledButton>
    </React.Fragment>
  )
}
var domContainer = document.querySelector('#submit_text_styled');
if (domContainer != null) {
  ReactDOM.render(e(ButtonSubmit), domContainer);
  let $submit_btn = $('#submit_text_styled button');
  $submit_btn.click(function () {
    saveLog('SUBMIT_REPORT', {
      "session": configs.session,
      "context": configs.context,
      "report_fields": get_report_fields(),
    }, 'button_pressed', configs.session, '', 'Y');
  });
}




// toggle switch
const Label = styledComp.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
`;

const Switch = styledComp.div`
  position: relative;
  width: 60px;
  height: 28px;
  background: #b3b3b3;
  border-radius: 32px;
  padding: 4px;
  transition: 300ms all;

  &:before {
    transition: 300ms all;
    content: "";
    position: absolute;
    width: 28px;
    height: 28px;
    border-radius: 35px;
    top: 50%;
    left: 4px;
    background: white;
    transform: translate(-4px, -50%);
  }
`;

const Input = styledComp.input`
  opacity: 0;
  position: absolute;

  &:checked + ${Switch} {
    background: green;

    &:before {
      transform: translate(32px, -50%);
    }
  }
`;

const ToggleSwitch = () => {
  const [checked, setChecked] = useState(false);

  const handleChange = (event) => {
    setChecked(event.target.checked);

    // if checked, start the endpoint
    // if unchecked, terminate the endpoint
    // TODO
    let form = new FormData();
    if (checked == false) {
      form.append('command', 'start_endpoint')
      axios.post('/ajax/', form)
        .then(function (response) { })
        .catch(function (error) {
          console.log(error);
        });
    } else if (checked == true) {
      form.append('command', 'delete_endpoint')
      axios.post('/ajax/', form)
        .then(function (response) { })
        .catch(function (error) {
          console.log(error);
        });
    }
  };

  return (
    <Label>
      {/* <span>{checked ? "on" : "off"}</span> */}
      <Input checked={checked} type="checkbox" onChange={handleChange} />
      <Switch />
    </Label>
  );
};
var domContainer = document.querySelector('#event_system_toggle');
if (domContainer != null) {
  ReactDOM.render(e(ToggleSwitch), domContainer);
}



// loading icon
const rotate360 = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;
const Spinner = styledComp.div`
  animation: ${rotate360} 1s linear infinite;
  transform: translateZ(0);
  
  border-top: 2px solid grey;
  border-right: 2px solid grey;
  border-bottom: 2px solid grey;
  border-left: 4px solid orange;
  background: transparent;
  width: 16px;
  height: 16px;
  border-radius: 50%;
`;
var domContainer = document.querySelector('#loading_icon');
if (domContainer != null) {
  ReactDOM.render(e(Spinner), domContainer);
}