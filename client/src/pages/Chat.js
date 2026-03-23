import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import MembersPanel from '../components/MembersPanel';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import { useChat } from '../hooks/useChat';
import { useSocket } from '../context/SocketContext';
import './Chat.css';

const ChatRoom = ({ room }) => {
  const {
    messages,
    loading,
    hasMore,
    typingUsers,
    members,
    sendMessage,
    handleStartTyping,
    handleStopTyping,
    loadMore,
  } = useChat(room._id);

  return (
    <>
      <div className="chat-main">
        <div className="chat-header">
          <span className="chat-hash">#</span>
          <div>
            <div className="chat-room-name">{room.name}</div>
            {room.description && (
              <div className="chat-room-desc">{room.description}</div>
            )}
          </div>
          <div className="chat-header-right">
            <span className="member-count">👥 {members.length}</span>
          </div>
        </div>

        <MessageList
          messages={messages}
          loading={loading}
          hasMore={hasMore}
          loadMore={loadMore}
          typingUsers={typingUsers}
        />

        <MessageInput
          onSend={sendMessage}
          onTyping={handleStartTyping}
          onStopTyping={handleStopTyping}
          placeholder={`Message #${room.name}`}
        />
      </div>

      <MembersPanel members={members} />
    </>
  );
};

const EmptyState = () => (
  <div className="chat-empty">
    <div className="empty-icon">⚡</div>
    <h2>Welcome to socket.live</h2>
    <p>Select a room from the sidebar to start chatting</p>
  </div>
);

const Chat = () => {
  const [activeRoom, setActiveRoom] = useState(null);
  const { connected } = useSocket();

  return (
    <div className="chat-layout">
      {!connected && (
        <div className="conn-banner">
          Reconnecting to server...
        </div>
      )}
      <Sidebar activeRoom={activeRoom} onSelectRoom={setActiveRoom} />
      <div className="chat-content">
        {activeRoom ? (
          <ChatRoom key={activeRoom._id} room={activeRoom} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
};

export default Chat;