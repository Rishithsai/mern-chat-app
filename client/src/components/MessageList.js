import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const Avatar = ({ user, size = 32 }) => {
  const colors = ['#7c6dfa', '#2bd9a0', '#f05a7e', '#f9a820', '#378add'];
  const color = colors[user.username.charCodeAt(0) % colors.length];
  const initials = user.username.slice(0, 2).toUpperCase();
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: `${color}25`, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.35, fontWeight: 600,
        flexShrink: 0, fontFamily: 'Syne, sans-serif',
      }}
    >
      {initials}
    </div>
  );
};

const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'long', day: 'numeric' });
};

const MessageList = ({ messages, loading, hasMore, loadMore, typingUsers }) => {
  const { user } = useAuth();
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Group messages by sender (consecutive)
  const grouped = [];
  messages.forEach((msg, i) => {
    const prev = messages[i - 1];
    const sameAuthor = prev && prev.sender._id === msg.sender._id;
    const closeInTime = prev && new Date(msg.createdAt) - new Date(prev.createdAt) < 5 * 60 * 1000;

    if (sameAuthor && closeInTime) {
      grouped[grouped.length - 1].msgs.push(msg);
    } else {
      grouped.push({ sender: msg.sender, msgs: [msg], date: msg.createdAt });
    }
  });

  return (
    <div className="message-list" ref={containerRef}>
      {hasMore && (
        <button className="load-more" onClick={loadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load older messages'}
        </button>
      )}

      {grouped.map((group, gi) => {
        const isMe = group.sender._id === user._id;
        const showDate =
          gi === 0 ||
          formatDate(group.date) !== formatDate(grouped[gi - 1]?.date);

        return (
          <React.Fragment key={gi}>
            {showDate && (
              <div className="date-divider">
                <span>{formatDate(group.date)}</span>
              </div>
            )}
            <div className={`msg-group ${isMe ? 'me' : ''}`}>
              {!isMe && <Avatar user={group.sender} />}
              <div className="msg-group-body">
                {!isMe && (
                  <div className="msg-meta">
                    <span className="msg-author">{group.sender.username}</span>
                    <span className="msg-time">{formatTime(group.msgs[0].createdAt)}</span>
                  </div>
                )}
                {group.msgs.map((msg) => (
                  <div key={msg._id} className="msg-bubble">
                    {msg.content}
                    {isMe && (
                      <span className="msg-time-inline">{formatTime(msg.createdAt)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </React.Fragment>
        );
      })}

      {typingUsers.length > 0 && (
        <div className="typing-row">
          <div className="typing-bubble">
            <span></span><span></span><span></span>
          </div>
          <span className="typing-text">
            {typingUsers.map((u) => u.username).join(', ')}{' '}
            {typingUsers.length === 1 ? 'is' : 'are'} typing
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;