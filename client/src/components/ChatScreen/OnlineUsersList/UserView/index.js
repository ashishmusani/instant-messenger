import React from 'react';

import './UserView.css'

export default function UserView(props){
  const user =  props.user;
  const setSendingTo = props.setSendingTo;
  const sendingTo = props.sendingTo;
  const unreads = props.unreads;
  const closeOnlineUsersModal =  props.closeOnlineUsersModal;

  const formatTime = (date) => {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let ampm = hours>12 ? 'PM' : 'AM';
    hours %= 12;
    minutes = minutes < 10 ? '0'+minutes : minutes;
    let strTime=`${hours}:${minutes} ${ampm}`;
    return strTime;
  }

  let lastSeenString;
  if(user.lastSeen && !user.isOnline){
    lastSeenString = "last seen"
    let lastSeenDate = new Date(user.lastSeen)
    let timeDiffInSecs = (new Date() - lastSeenDate)/1000;
    if(timeDiffInSecs <= 24*60*60){
      lastSeenString += " today at "
    } else if (timeDiffInSecs <= 2*24*60*60) {
      lastSeenString += " yesterday at "
    } else {
      lastSeenString += ` on ${lastSeenDate.getDate()}/${lastSeenDate.getMonth()+1} at `
    }
    lastSeenString += formatTime(lastSeenDate);
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
                (user.lastSeen? lastSeenString : "Offline")
            ) : 
            null}
      </div>
      {unreads>0? (<div className="online-user__details__unreads">{unreads}</div>) : null}
    </div>
  )
}
