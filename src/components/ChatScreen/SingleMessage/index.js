import React from 'react';

import './SingleMessage.css';

import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'

export default function SingleMessage(props){

  const envelope = props.envelope;
  const sender = envelope.sender;
  const message = envelope.message;

  return(
    <Row>
      {sender === "Me"? (<Col xs="2"></Col>) : null}
      <Col xs="10" className={envelope.sender === 'Me'? 'single-message__self' : 'single-message__other'}>
        <small><strong>{sender}</strong></small>
        <div className="single-message__content">{message}</div>

      </Col>
    </Row>
  )
}
