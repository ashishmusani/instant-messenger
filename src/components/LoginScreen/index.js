import React, {useContext, useState} from 'react';
import axios from 'axios';
import './LoginScreen.css';

import LoginContext from '../../contexts/LoginContext';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

export default function LoginScreen(){

  const Context = useContext(LoginContext);

  const [formIsValidated, setFormIsValidated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setFormIsValidated(true)
    }
    else{
      const userCredentials = {
        "username": username,
        "password": password
      }
      axios.post(`${process.env.REACT_APP_SERVER_URL}/login`, userCredentials)
      .then(res =>{
        if(res.status === 201){
          sessionStorage.setItem('username', JSON.stringify(username));
          sessionStorage.setItem('loggedIn', JSON.stringify(true));
          Context.setUsername(username);
          Context.setLoggedIn(true)
        }
      })
      .catch(err =>{
        if(err){
          if(err.response && err.response.status === 401){
            alert(err.response.data)
          }
          else{
            alert(err);
          }
        }
      })
    }
  }

  return(
      <Form className="login-form" noValidate validated={formIsValidated} onSubmit={handleLogin}>
        <Form.Group as={Row} className="justify-content-center" controlId="validate_login_username">
          <Col sm="2" md="1">
            <Form.Label>Username</Form.Label>
          </Col>
          <Col sm="4" md="4">
            <Form.Control type="text" size="sm" value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required autocomplete="off">
            </Form.Control>
            <Form.Control.Feedback type="invalid">Please provide username</Form.Control.Feedback>
          </Col>
        </Form.Group>
        <Form.Group as={Row} className="justify-content-center" controlId="validate_login_password">
          <Col sm="2" md="1">
            <Form.Label>Password</Form.Label>
          </Col>
          <Col sm="4" md="4">
            <Form.Control type="password" size="sm" value={password}
            onChange={(e) => setPassword(e.target.value)} required>
            </Form.Control>
            <Form.Control.Feedback type="invalid">Please provide password</Form.Control.Feedback>
          </Col>
        </Form.Group>
        <Form.Group as={Row} className="justify-content-center">
          <Col sm="4" md="4">
          </Col>
          <Col sm="2" md="1">
          <Button className="btn-block" type="submit">Login</Button>
          </Col>
        </Form.Group>
      </Form>
  )
}
