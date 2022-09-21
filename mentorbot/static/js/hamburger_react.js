const { useState } = React;
const { ChangeEvent } = React;
const e = React.createElement;
const { css, keyframes } = styled;

// hamburger element
const Ul = window.styled.ul`
  list-style: none;
  display: flex;
  flex-flow: row nowrap;
  li {
    padding: 18px 10px;
  }
  a {
    color: #ccc;
    background-color: transparent;
    text-decoration: none;
  }
  a:hover {
    color: #333;
  }
  @media {
    flex-flow: column nowrap;
    background-color: #0D2538;
    position: fixed;
    transform: ${({ open }) => open ? 'translateX(0)' : 'translateX(-100%)'};
    top: 0;
    left: 0;
    height: 100vh;
    width: 300px;
    padding-top: 3.5rem;
    transition: transform 0.3s ease-in-out;
    li {
      color: #fff;
    }
  }
`;

const RightNav = ({ open }) => {
  return (
    <Ul open={open}>
      <li><a href="/user_study_mentorbot_day_2">Peer Mentoring Bot</a></li>
      <li><a href="/safetybot">Safety Incident Reporting Bot</a></li>
    </Ul>
  )
}

const StyledBurger = window.styled.div`
  width: 2rem;
  height: 2rem;
  position: fixed;
  top: 15px;
  left: 20px;
  z-index: 20;
  display: none;

  @media {
    display: flex;
    justify-content: space-around;
    flex-flow: column nowrap;
  }

  div {
    width: 2rem;
    height: 0.25rem;
    background-color: ${({ open }) => open ? '#ccc' : '#ccc'};
    border-radius: 10px;
    transform-origin: 1px;
    transition: all 0.3s linear;

    &:nth-child(1) {
      transform: ${({ open }) => open ? 'rotate(45deg)' : 'rotate(0)'};
    }

    &:nth-child(2) {
      transform: ${({ open }) => open ? 'translateX(100%)' : 'translateX(0)'};
      opacity: ${({ open }) => open ? 0 : 1};
    }

    &:nth-child(3) {
      transform: ${({ open }) => open ? 'rotate(-45deg)' : 'rotate(0)'};
    }
  }
`;

const Burger = () => {
  const [open, setOpen] = useState(false)

  return (
    <React.Fragment>
      <StyledBurger open={open} onClick={() => setOpen(!open)}>
        <div />
        <div />
        <div />
      </StyledBurger>
      <RightNav open={open} />
    </React.Fragment>
  )
}
var domContainer = document.querySelector('#hamburger');
if (domContainer != null) {
  ReactDOM.render(e(Burger), domContainer);
}


