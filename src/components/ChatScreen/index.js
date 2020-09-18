import React, {useState, useEffect,useContext, useRef} from 'react';
import './ChatScreen.css';

//////////
import Peer from 'peerjs';
/////////

import SingleMessage from './SingleMessage';
import OnlineUsersList from './OnlineUsersList';

import LoginContext from '../../contexts/LoginContext';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';


import InputGroup from 'react-bootstrap/InputGroup';
import Button from 'react-bootstrap/Button';
import { Camera, Telephone } from 'react-bootstrap-icons';

const NotificationSound = new Audio(process.env.PUBLIC_URL+ "/notification.mp3");

////////////////////

const myPeer = new Peer(undefined,{
  host: '/',
  port: 3001,
  path: '/chat'
})
////////////////////


export default function ChatScreen(props){

  const Context = useContext(LoginContext);
  const username = Context.username;

  const socket = props.socket;
  const handleLogout = props.handleLogout;

  const messagesEndRef = useRef(null);
  const messageTextboxRef = useRef(null);
  const sendFileDialogRef = useRef(null);

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
  }, [username, socket])

  useEffect(()=>{
    messagesEndRef.current.scrollIntoView({block: "end"});
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
      NotificationSound.play();
      updateUnreadOnMessageReceive(envelope);
      updateConversation('incoming', envelope);
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
    });

  });

  ///////////////////////////////////
  const videoRef = useRef(null);
  useEffect(()=>{
    //videoRef.current.muted = true;
      myPeer.on('call', call=>{
        console.log("call received from another user");
        navigator.mediaDevices.getUserMedia({
          audio:true,
          video:false
        }).then(stream =>{
          call.answer(stream);
          call.on('stream', userVideoStream =>{
            videoRef.current.srcObject = userVideoStream;
            console.log("Stream received from calling to user");
          })
        });
      });

      socket.on('incoming_call_request', peerId =>{
        console.log("initiating call to peerId: "+peerId);
        navigator.mediaDevices.getUserMedia({
          audio:true,
          video:false
        }).then(stream =>{
          const call = myPeer.call(peerId,stream);
          call.on('stream', userVideoStream =>{
            videoRef.current.srcObject = userVideoStream;
            console.log("stream received from call initiator user")
          })
        });
      });

      return () =>{
        socket.removeAllListeners('incoming_call');
        myPeer.destroy();
      }

    },[]);

  //////////////////////////////////

  function sendMessage(e){
    e.preventDefault();
    if(newMessage === ""){
      alert("Cant send blank")
    }
    else{
      const envelope = {
        sender: username,
        to: sendingTo,
        type:"text" ,
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

  function sendFile(event){
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      var dataURL = reader.result;
      const envelope = {
        sender: username,
        to: sendingTo,
        type:"image" ,
        message: dataURL,
        isBroadcast: sendingTo === 'conference'
      }
      if(sendingTo === "conference"){
        socket.emit('broadcast-to-server', envelope);
      } else {
        socket.emit('personal_message', envelope)
      }
      envelope.sender="Me";
      updateConversation('outgoing', envelope);
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

  ///////////////////////////////////////
  function audio_call(){
    console.log("placing call request");
    socket.emit('make_call_request', myPeer.id, sendingTo);
  }
  //////////////////////////////////////

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
                      <InputGroup>
                          <Form.Control id="chat-screen__actions__message" ref={messageTextboxRef} size="md" type="text"
                            placeholder="Type a message" value={newMessage}
                            onChange={(e)=> setNewMessage(e.target.value)} autocomplete="off" autoFocus/>
                        <InputGroup.Append>
                          <Button variant="secondary" onClick={()=> audio_call()}>
                            <Telephone />
                          </Button>
                          <Button variant="secondary" onClick={()=> {sendFileDialogRef.current.click()}}>
                            <Camera />
                          </Button>
                          <Form.File id="chat-screen__actions__file" accept="image/*"
                          ref={sendFileDialogRef} onChange={(e)=> sendFile(e)}/>
                        </InputGroup.Append>
                      </InputGroup>
                    </Form.Group>
                </Form>
              </div>

          </Col>
        </Row>
        <video className="chat-screen__mediastream" autoplay="true" id="videoElement" ref={videoRef} />
    </Container>
  );
}
