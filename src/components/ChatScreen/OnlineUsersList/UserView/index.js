import React from 'react';

import './UserView.css'

export default function UserView(props){

  const user =  props.user;
  const setSendingTo = props.setSendingTo;
  const sendingTo = props.sendingTo;
  const unreads = props.unreads;
  const closeOnlineUsersModal =  props.closeOnlineUsersModal;

  const changeConversationWindow = () =>{
    setSendingTo(user);
    closeOnlineUsersModal();
  }

  //console.log(user + ": ", unreads)

  return (
    <div className={sendingTo === user? "online-user-selected" : "online-user"} onClick={changeConversationWindow}>
      <div className="online-user__icon">
      </div>
      <div className="online-user__details">
      <strong>{user} </strong>
      </div>
      {unreads>0? (<div className="online-user__details__unreads">{unreads}</div>) : null}
    </div>
  )
}
