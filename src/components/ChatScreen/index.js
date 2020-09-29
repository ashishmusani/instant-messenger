import React, {useState, useEffect,useContext, useRef, useReducer} from 'react';
import Peer from 'peerjs';

import './ChatScreen.css';
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
import { Camera, Telephone, TelephoneInbound,TelephoneX } from 'react-bootstrap-icons';

const MessageNotificationSound = new Audio(process.env.PUBLIC_URL+ "/msg_notification.mp3");
const IncomingCallNotificationSound = new Audio(process.env.PUBLIC_URL+ "/call_notification.mp3");
const CallDropNotificationSound = new Audio(process.env.PUBLIC_URL+ "/call_drop_notification.mp3");
const OutgoingCallRingSound = new Audio(process.env.PUBLIC_URL+ "/ringing_tone.mp3");

IncomingCallNotificationSound.loop = true;
OutgoingCallRingSound.loop = true;


const myPeer = new Peer(undefined,{
  secure: true
})
var peer_call;
var local_stream;
var callRingingInterval;


const initialCallState = {
  isInCall: false,
  callType: null,
  callStatus: null,
  isInCallWith: null,
  peerIdToCall: null
}

function callStateReducer(state, action){
  switch (action.type) {
    case 'outgoing-call':
      return {
        isInCall: true,
        callType: 'outgoing',
        callStatus: 'ringing',
        isInCallWith: action.calling_to,
      };
    case 'outgoing-call__answered':
      return {...state, callStatus:'connected'};
    case 'outgoing-call__declined':
      return {};
    case 'incoming-call':
      return {
        isInCall: true,
        callType: 'incoming',
        callStatus: 'ringing',
        isInCallWith: action.call_from,
        peerIdToCall: action.callee_peerId
      };
    case 'incoming-call__answered':
      return {...state, callStatus:'connected'};
    case 'incoming-call__declined':
      return {};
    case 'call__ended':
      return {...initialCallState};
      default:
      throw new Error();
  }
}

export default function ChatScreen(props){

  const Context = useContext(LoginContext);
  const username = Context.username;

  const socket = props.socket;
  const handleLogout = props.handleLogout;

  const messagesEndRef = useRef(null);
  const messageTextboxRef = useRef(null);
  const sendFileDialogRef = useRef(null);
  const mediaDivRef = useRef(null);


  const [onlineUsers, setOnlineUsers] = useState([]);
  const [conversation, setConversation] = useState({});
  const [unreadMessagesCount, setUnreadMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [sendingTo, setSendingTo] = useState("conference");
  const [showOnlineUsersModal, setShowOnlineUsersModal] = useState(false);
  const closeOnlineUsersModal = () => setShowOnlineUsersModal(false);
  const openOnlineUsersModal = () => setShowOnlineUsersModal(true);

  const [callState, dispatch] = useReducer(callStateReducer, initialCallState)

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
      MessageNotificationSound.play();
      updateUnreadOnMessageReceive(envelope);
      updateConversation('incoming', envelope);
    })
    socket.on('online-users-list', (userList)=>{
      setOnlineUsers(userList.filter(uname => (uname !== username)));
    })
    socket.on('personal_message', (envelope)=>{
      MessageNotificationSound.play();
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

    socket.removeAllListeners('incoming_call_request');
    socket.on('incoming_call_request', (peerId, from_user) => {
      console.log("initiating call to peerId: "+peerId);
      IncomingCallNotificationSound.play();
      dispatch({type: 'incoming-call', call_from: from_user, callee_peerId: peerId});
    })

    socket.removeAllListeners('end_ongoing_call');
    socket.on('end_ongoing_call', () => {
      console.log("ending call due to socket event receipt");
      endCall();
    })

  });

  useEffect(()=>{
    if(callState.callType === 'outgoing' && callState.callStatus === 'ringing'){
      setTimeout(()=>{
        console.log("Outgoing call timeout");
        endCall(true)
      },5000)
    }
  }, [callState])


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

  function initiate_audio_call(){
    if(sendingTo === 'conference'){
      alert('Oops! Conference calls are not yet supported!')
    }
    else{
      console.log('Placing audio call request');
      OutgoingCallRingSound.play();
      socket.emit('make_call_request', myPeer.id, sendingTo, username);
      dispatch({type: 'outgoing-call', calling_to: sendingTo});

      myPeer.on('call', call=>{
        console.log("call received from another user");
        resetNotificationSounds();
        dispatch({type: 'outgoing-call__answered'});
        navigator.mediaDevices.getUserMedia({
          audio:true,
          video:false
        }).then(stream =>{
          local_stream = stream;
          peer_call=call;
          call.answer(stream);
          call.on('stream', userVideoStream =>{
            mediaDivRef.current.srcObject = userVideoStream;
            console.log("Stream received from calling to user");
          })
          peer_call.on('close', () =>{
            console.log("on close() called for " + callState.callType);
            clearEndedCallDetails();
          })
        });
      });

    }
  }

  function answerIncomingCall(){
    resetNotificationSounds();
    dispatch({type: 'incoming-call__answered'});
    navigator.mediaDevices.getUserMedia({
      audio:true,
      video:false
    }).then(stream => {
      local_stream = stream;
      peer_call = myPeer.call(callState.peerIdToCall,stream);
      peer_call.on('stream', userVideoStream =>{
        mediaDivRef.current.srcObject = userVideoStream;
        console.log("stream received from call initiator user")
      })
      peer_call.on('close', ()=>{
        console.log("on close() called for " + callState.callType);
        clearEndedCallDetails()
      })
    })
  }

  function endCall(fromSelf){
    resetNotificationSounds();
    CallDropNotificationSound.play();
    console.log("ending "+ callState.callType  + " call");
    myPeer.removeAllListeners();
    if(fromSelf){
      socket.emit('end_ongoing_call', callState.isInCallWith);
    }
    switch (callState.callStatus){
      case 'connected':
        peer_call.close();
        break;
      case 'ringing':
        clearEndedCallDetails();
        break;
    }
  }

  function clearEndedCallDetails(){
    mediaDivRef.current.srcObject = null;
    if(local_stream){
      local_stream.getTracks().forEach(track => track.stop())
    }
    dispatch({type: 'call__ended'})
  }

  function resetNotificationSounds(){
    IncomingCallNotificationSound.pause();
    IncomingCallNotificationSound.currentTime = 0;
    OutgoingCallRingSound.pause();
    OutgoingCallRingSound.currentTime = 0;
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
                      <InputGroup>
                          <Form.Control id="chat-screen__actions__message" ref={messageTextboxRef} size="md" type="text"
                            placeholder="Type a message" value={newMessage}
                            onChange={(e)=> setNewMessage(e.target.value)} autocomplete="off" autoFocus/>
                        <InputGroup.Append>
                          <Button variant="secondary" onClick={()=> initiate_audio_call()}>
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



        <video className="chat-screen__mediastream" autoplay="true" id="mediaDiv" ref={mediaDivRef} />
        <Modal id="call_modal" show={callState.isInCall} centered>
                <div className ="call_profile">
                  <div className="call_profile_photo"></div>
                  <div className="call_profile_name">{callState.isInCallWith}</div>
                </div>
                <div className ="call_actions">
                {(callState.callType === 'incoming' && callState.callStatus === 'ringing') ?
                ( <>
                    <TelephoneInbound id="call_answer_button" onClick={()=> answerIncomingCall()}/>
                    <TelephoneX id="call_end_button" onClick={()=> endCall(true)}/>
                  </>
                ) :
                (<TelephoneX id="call_end_button" onClick={()=> endCall(true)}/>)}
                </div>
        </Modal>




    </Container>
  );
}
