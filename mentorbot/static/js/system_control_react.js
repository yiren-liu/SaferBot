const { useState } = React;
const { ChangeEvent, useEffect } = React;
const e = React.createElement;
const { css, keyframes } = styled;
const styledComp = styled;


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
if (domContainer != null){
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
if (domContainer != null){
  ReactDOM.render(e(Spinner), domContainer);
}