import React, {useState, useEffect,useContext, useRef} from 'react';
import io from 'socket.io-client'

import './ChatScreen.css';

import SingleMessage from './SingleMessage';
import OnlineUsersList from './OnlineUsersList';

import LoginContext from '../../contexts/LoginContext';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';


const socket = io(`${process.env.REACT_APP_SERVER_URL}`);
const NotificationSound = new Audio(process.env.PUBLIC_URL+ "/notification.mp3")
export default function ChatScreen(props){

  const Context = useContext(LoginContext);
  const username = Context.username;

  const handleLogout = props.handleLogout;

  const messagesEndRef = useRef(null);
  const messageTextboxRef = useRef(null);

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [conversation, setConversation] = useState({});
  const [unreadMessagesCount, setUnreadMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [sendingTo, setSendingTo] = useState("conference");


  const [showOnlineUsersModal, setShowOnlineUsersModal] = useState(false);
  const closeOnlineUsersModal = () => setShowOnlineUsersModal(false);
  const openOnlineUsersModal = () => setShowOnlineUsersModal(true);


  useEffect(()=>{
    socket.open();
    socket.emit('login', username);
    const hist = JSON.parse(sessionStorage.getItem('conversation'));
    if(hist){
      setConversation(hist);
    }
    return () => {
      socket.disconnect();
    }
  }, [username])

  useEffect(()=>{
    messagesEndRef.current.scrollIntoView({block: "end"});
    //messageTextboxRef.current.focus();
    updateUnreadOnFocusChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendingTo,conversation]);

  useEffect(()=>{
    sessionStorage.setItem('conversation', JSON.stringify(conversation));
  }, [conversation]);

  useEffect(()=>{
    socket.removeAllListeners('broadcast-to-clients');
    socket.removeAllListeners('online-users-list');
    socket.removeAllListeners('personal_message');
    socket.removeAllListeners('disconnect');

    socket.on('broadcast-to-clients', (envelope)=>{
      console.log('message from server')
      NotificationSound.play();
      updateUnreadOnMessageReceive(envelope);
      updateConversation('incoming', envelope);
      console.log(unreadMessagesCount);
    })
    socket.on('online-users-list', (userList)=>{
      setOnlineUsers(userList.filter(uname => (uname !== username)));
    })
    socket.on('personal_message', (envelope)=>{
      NotificationSound.play();
      updateUnreadOnMessageReceive(envelope);
      updateConversation('incoming', envelope);
    })
    socket.on('disconnect', (reason) =>{
      if(!(reason === 'io client disconnect')){
        handleLogout();
        alert("Disconnected from server");
        socket.connect();
      }
    })
  });

  function sendMessage(e){
    e.preventDefault();
    if(newMessage === ""){
      alert("Cant send blank")
    }
    else{
      const envelope = {
        sender: username,
        to: sendingTo,
        message: newMessage,
        isBroadcast: sendingTo === 'conference'
      }
      if(sendingTo === "conference"){
        socket.emit('broadcast-to-server', envelope);
      } else {
        socket.emit('personal_message', envelope)
      }
      envelope.sender="Me";
      updateConversation('outgoing', envelope);
      setNewMessage("");
    }
  }

  function updateConversation(type, envelope){
    var channel;
    if(type === 'outgoing'){
      channel = envelope.to;
    } else {
      if (envelope.isBroadcast){
        channel = "conference";
      } else{
        channel = envelope.sender;
      }
    }
    if( (channel in conversation) && (conversation[channel].length>0) ){
      const updatedSingleConversation = [...conversation[channel], envelope];
      const conversationCopy = {...conversation};
      conversationCopy[channel] = updatedSingleConversation;
      setConversation(conversationCopy);
    } else {
      const updatedSingleConversation = [envelope];
      const conversationCopy = {...conversation};
      conversationCopy[channel] = updatedSingleConversation;
      setConversation(conversationCopy);
    }
  }

  function updateUnreadOnMessageReceive(envelope){
    var channel;
    if (envelope.isBroadcast){
      channel = "conference";
    } else{
      channel = envelope.sender;
    }
    if(channel !== sendingTo){
      if(channel in unreadMessagesCount){
        const unreadMessages_copy = unreadMessagesCount;
        unreadMessages_copy[channel] = unreadMessages_copy[channel]+1;
        setUnreadMessages(unreadMessages_copy);
      } else{
        const unreadMessages_copy = unreadMessagesCount;
        unreadMessages_copy[channel] = 1;
        setUnreadMessages(unreadMessages_copy);
      }
    }
  }

  function updateUnreadOnFocusChange(){
    const unreadMessages_copy = unreadMessagesCount;
    unreadMessages_copy[sendingTo] = 0;
    setUnreadMessages(unreadMessages_copy);
  }

  return (
    <Container fluid id="chat-screen">
        <Row id="chat-screen__msg-area">
          <Col xs="3" sm="3" id="chat-screen__msg-area__online-users">
            <OnlineUsersList onlineUsers={onlineUsers} unreadMessagesCount={unreadMessagesCount}
                             sendingTo={sendingTo} setSendingTo={setSendingTo} closeOnlineUsersModal={closeOnlineUsersModal}/>
          </Col>
          <Col xs="12" sm="9" id="chat-screen__msg-area__main">
              <div id="chat-screen__msg-area__header">
                <span id="chat-screen__msg-area__header__normal">{sendingTo}</span>
                <span id="chat-screen__msg-area__header__xs" onClick={openOnlineUsersModal}>{sendingTo}</span>
                <Modal show={showOnlineUsersModal} onHide={closeOnlineUsersModal} centered>
                        <Modal.Header closeButton>
                          <Modal.Title>Online Users</Modal.Title>
                        </Modal.Header>
                        <OnlineUsersList onlineUsers={onlineUsers} unreadMessagesCount={unreadMessagesCount}
                                         sendingTo={sendingTo} setSendingTo={setSendingTo}
                                         closeOnlineUsersModal={closeOnlineUsersModal}/>
                </Modal>
              </div>
              <div className="chat-screen__msg-area__conversation">
                  {(sendingTo in conversation && conversation[sendingTo].length>0)?
                      conversation[sendingTo].map((envelope)=> (<SingleMessage envelope={envelope}/>)) :
                      null
                  }
                  <Row className = "dummy-message" ref={messagesEndRef}>
                  </Row>
              </div>
              <div className="chat-screen__actions">
                <Form onSubmit={(e)=> sendMessage(e)}>
                    <Form.Group as={Col} sm="12" controlId="send_message">
                          <Form.Control id="chat-screen__actions__message" ref={messageTextboxRef} size="md" type="text" placeholder="Type a message and press enter" value={newMessage}
                          onChange={(e)=> setNewMessage(e.target.value)} autocomplete="off" autoFocus/>
                    </Form.Group>
                </Form>
              </div>
          </Col>
        </Row>
    </Container>
  );
}
