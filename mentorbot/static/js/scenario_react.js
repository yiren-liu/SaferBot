const { useState } = React;
const { ChangeEvent, useEffect } = React;
const e = React.createElement;
const { css, keyframes } = styled;
const styledComp = styled;

const { Button, Tooltip, styled, tooltipClasses, ClickAwayListener } = MaterialUI;

// submit button element
const StyledButton = styledComp.button`
  background: transparent;
  border-radius: 3px;
  border: 2px solid rgb(231, 100, 67);
  color: rgb(231, 100, 67);
  margin: 0.5em 1em;
  padding: 0.25em 1em;
  transition: background 0.5s ease;
  float: right;

  ${props => props.primary && css`
    background: rgb(231, 100, 67);
    color: white;
  `}
  
  &:hover {
    background: rebeccapurple;
  }
`;
const Container = styledComp.div`
  text-align: center;
`
const nextButton = () => {
  const [open, setOpen] = useState(false)
  return (
    <React.Fragment>
      <StyledButton primary onClick={() =>
        window.location.href='/safetybot'
      }>
        Next
      </StyledButton>
    </React.Fragment>
  )
}
var domContainer = document.querySelector('#submit_text_styled');
if (domContainer != null) {
  ReactDOM.render(e(nextButton), domContainer);
  let $submit_btn = $('#submit_text_styled button');
  $submit_btn.click(function () {
    saveLog('FINISH_SCENARIO', {
      "session": configs.session,
      "context": configs.context,
    }, 'button_pressed', configs.session, '', '');
  });
}


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




// next session button tooltips
const nextsessionArrowTooltips = () => {
  const [open, setOpen] = React.useState(false);
  const handleTooltipClose = () => {
    setOpen(false);
  };
  const handleTooltipOpen = () => {
    setOpen(true);
  };

  useEffect(() => {
    setTimeout(function () { //Start the timer
      handleTooltipOpen(); //After 1 second, set render to true
      // console.log("use effect");
    }.bind(this), 2000)
    // handleTooltipOpen();
  }, []);

  return (
    <ClickAwayListener onClickAway={handleTooltipClose}>
      <div>
        <HtmlTooltip
          open={open}
          placement="right"
          // onClick={handleTooltipOpen}
          title="Click to proceed after finishing watching the video!">
          <p></p>
        </HtmlTooltip>
      </div>
    </ClickAwayListener>
  );
};
var domContainer = document.querySelector('#submit_text_styled');
domContainer = domContainer.appendChild(document.createElement("div"));
ReactDOM.render(e(nextsessionArrowTooltips), domContainer);



// video tooltips
const videoArrowTooltips = () => {
  const [open, setOpen] = React.useState(false);
  const handleTooltipClose = () => {
    setOpen(false);
  };
  const handleTooltipOpen = () => {
    setOpen(true);
  };

  useEffect(() => {
    setTimeout(function () { //Start the timer
      handleTooltipOpen(); //After 1 second, set render to true
      // console.log("use effect");
    }.bind(this), 3000)
    // handleTooltipOpen();
  }, []);

  return (
    <ClickAwayListener onClickAway={handleTooltipClose}>
      <div>
        <HtmlTooltip
          open={open}
          placement="left"
          // onClick={handleTooltipOpen}
          title="Here's a video of a active shooting scenario. 
          Please watch this video once, 
          and then proceed to report this event using the tool on the next page.">
          <p></p>
        </HtmlTooltip>
      </div>
    </ClickAwayListener>
  );
};
var domContainer = document.querySelector('.panel-container');
var targetElement = document.createElement("div")
targetElement.style.height = '0px';
domContainer.insertBefore(targetElement, domContainer.firstChild);
ReactDOM.render(e(videoArrowTooltips), targetElement);