import React from 'react';

import './UserView.css'

export default function UserView(props){
  const user =  props.user;
  const setSendingTo = props.setSendingTo;
  const sendingTo = props.sendingTo;
  const unreads = props.unreads;
  const closeOnlineUsersModal =  props.closeOnlineUsersModal;

  let lastSeenAt;
  if(user.lastSeen && !user.isOnline){
    let lastSeenDate = new Date(user.lastSeen)
    let currentDate = new Date()
    let timeDiff = currentDate - lastSeenDate;
    lastSeenAt = `${lastSeenDate.getDate()}/${lastSeenDate.getMonth()+1} ${lastSeenDate.getHours()}:${lastSeenDate.getMinutes()}`;
  }

  const changeConversationWindow = () =>{
    setSendingTo(user.username);
    closeOnlineUsersModal();
  }

  return (
    <div className={sendingTo === user.username? "online-user-selected" : "online-user"} 
        onClick={changeConversationWindow}>
      <div className="online-user__icon">
      </div>
      <div className="online-user__details">
      <strong>{user.username}</strong><br/>
      {user.username !== "conference"? 
            ((user.isOnline)? 
                "Online" : 
                (user.lastSeen? `Last seen ${lastSeenAt}` : "Offline")
            ) : 
            null}
      </div>
      {unreads>0? (<div className="online-user__details__unreads">{unreads}</div>) : null}
    </div>
  )
}
