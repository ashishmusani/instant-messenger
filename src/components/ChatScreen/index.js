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

const x = navigator.userAgent||navigator.vendor||window.opera;
const isMobileDevice = (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(x)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(x.substr(0,4)))
let callTimeout;

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
  const [onlineUsersInfo, setOnlineUsersInfo] = useState([]);
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
    socket.emit('login', username, isMobileDevice);
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
      setOnlineUsersInfo(userList);
      let onlineUsernames = userList.map(({username: uname}) => (uname))
                                    .filter(uname => (uname !== username));
      setOnlineUsers(onlineUsernames);
    })
    socket.on('personal_message', (envelope)=>{
      MessageNotificationSound.play();
      updateUnreadOnMessageReceive(envelope);
      updateConversation('incoming', envelope);
    })
    socket.on('disconnect', (reason) =>{
      if(!(reason === 'io client disconnect')){
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
      callTimeout = setTimeout(()=>{
        endCall(true)
      },30000)
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
    else if(onlineUsersInfo.find(user => (user.username === sendingTo)).isMobileDevice){
      alert(`Oops! Cannot call ${sendingTo} as the user is logged from mobile device !`)
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
    clearTimeout(callTimeout)
    resetNotificationSounds();
    if(callState.callType === 'outgoing') CallDropNotificationSound.play();
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
                          {isMobileDevice? null: (
                            <Button variant="secondary" onClick={()=> initiate_audio_call()}>
                              <Telephone />
                            </Button>
                          )}
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
