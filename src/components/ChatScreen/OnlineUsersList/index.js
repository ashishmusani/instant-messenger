import React from 'react';

import UserView from './UserView';

export default function OnlineUsersList(props){
  const sendingTo = props.sendingTo;
  const setSendingTo = props.setSendingTo;
  var onlineUsers =  props.onlineUsers;
  onlineUsers = ["conference", ...onlineUsers];
  var unreadMessagesCount =  props.unreadMessagesCount;
  const closeOnlineUsersModal = props.closeOnlineUsersModal;

  return (
    <div className="online-users-list">
      {onlineUsers.map(user => (<UserView user={user} unreads={unreadMessagesCount[user]} sendingTo={sendingTo} setSendingTo={setSendingTo} closeOnlineUsersModal={closeOnlineUsersModal}/>))}
    </div>
  )
}
