import React from 'react';

import './SingleMessage.css';

import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'

export default function SingleMessage(props){

  const envelope = props.envelope;
  const sender = envelope.sender;
  const message = envelope.message;

  return(
    <Row>
      {sender === "Me"? (<Col xs="2"></Col>) : null}
      <Col xs="10" className={envelope.sender == 'Me'? 'single-message__self' : 'single-message__other'}>
        <small className="task-view__id"><strong>{envelope.sender}</strong></small><br/>
        {envelope.message}
      </Col>
    </Row>
  )
}
