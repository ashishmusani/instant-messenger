import React, {useState} from 'react';
import io from 'socket.io-client';

import ChatScreen from './components/ChatScreen';
import LoginScreen from './components/LoginScreen';
import './App.css';

import LoginContext from './contexts/LoginContext';

import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Button from 'react-bootstrap/Button';

const socket = io(`${process.env.REACT_APP_SERVER_URL}`);
function App() {

  const [username, setUsername] = useState( JSON.parse(sessionStorage.getItem('username')) || "");
  const [loggedIn, setLoggedIn] = useState( JSON.parse(sessionStorage.getItem('loggedIn')) || false);

  const LoginContextValue={
    username,
    loggedIn,
    setUsername,
    setLoggedIn
  }

  const handleLogout = () =>{
    setUsername("");
    setLoggedIn(false);
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('loggedIn');
  }


  return (
    <LoginContext.Provider value={LoginContextValue}>
    <Navbar className="header" expand="lg" sticky="top">
      <Navbar.Brand>Instant Messenger</Navbar.Brand>
        {loggedIn === true? (
          <>
          <Nav className="ml-auto">
            <Button variant="outline-secondary" size="sm" onClick={handleLogout}>Logout</Button>
          </Nav>
          </>
        ) : null}
    </Navbar>
        {loggedIn === true? (<ChatScreen handleLogout={handleLogout} socket={socket}/>) : (<LoginScreen />)}
    </LoginContext.Provider>
  );
}

export default App;
