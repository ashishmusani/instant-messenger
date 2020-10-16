import React from 'react';

import UserView from './UserView';
import './OnlineUsersList.css';

export default function OnlineUsersList(props){
  const sendingTo = props.sendingTo;
  const setSendingTo = props.setSendingTo;
  var onlineUsers =  props.onlineUsers;
  onlineUsers = [{username: "conference"}, ...onlineUsers];
  var unreadMessagesCount =  props.unreadMessagesCount;
  const closeOnlineUsersModal = props.closeOnlineUsersModal;

  return (
    <div className="online-users-list">
      {onlineUsers.map(user => (<UserView user={user} unreads={unreadMessagesCount[user.username]} sendingTo={sendingTo} setSendingTo={setSendingTo} closeOnlineUsersModal={closeOnlineUsersModal}/>))}
    </div>
  )
}
