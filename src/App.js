import React, {useReducer} from 'react';
import io from 'socket.io-client';

import ChatScreen from './components/ChatScreen';
import LoginScreen from './components/LoginScreen';
import './App.css';

import LoginContext from './contexts/LoginContext';

import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Button from 'react-bootstrap/Button';

const socket = io(`${process.env.REACT_APP_SERVER_URL}`);

function loginReducer(state, action){
  switch (action.type) {
    case 'login':
      return {loggedIn: true, username: action.username};
    case 'logout':
      return {loggedIn: false, username: null};
    default:
      throw new Error();
  }
}

function App() {

  const [loginDetails, dispatch] = useReducer(loginReducer,{
    username: (JSON.parse(sessionStorage.getItem('username')) || ""),
    loggedIn: (JSON.parse(sessionStorage.getItem('loggedIn')) || false)
  })

  const handleLogout = () =>{
    sessionStorage.setItem('username', JSON.stringify(null));
    sessionStorage.setItem('loggedIn', JSON.stringify(false));
    if(socket.connected){
      socket.close();
    }
    dispatch({type: 'logout'});

  }

  const LoginContextValue={
    ...loginDetails,
    dispatch
  }

  return (
    <LoginContext.Provider value={LoginContextValue}>
    <Navbar className="header" expand="lg" sticky="top">
      <Navbar.Brand>Instant Messenger</Navbar.Brand>
        {loginDetails.loggedIn === true? (
          <>
          <Nav className="ml-auto">
            <Button variant="outline-secondary" size="sm" onClick={handleLogout}>Logout</Button>
          </Nav>
          </>
        ) : null}
    </Navbar>
        {loginDetails.loggedIn === true? (<ChatScreen handleLogout={handleLogout} socket={socket}/>) : (<LoginScreen />)}
    </LoginContext.Provider>
  );
}

export default App;
