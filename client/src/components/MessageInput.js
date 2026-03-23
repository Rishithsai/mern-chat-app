import React, { useState, useRef } from 'react';

const MessageInput = ({ onSend, onTyping, onStopTyping, placeholder }) => {
  const [text, setText] = useState('');
  const typingRef = useRef(false);
  const timerRef = useRef(null);

  const handleChange = (e) => {
    setText(e.target.value);
    if (!typingRef.current) {
      typingRef.current = true;
      onTyping?.();
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      typingRef.current = false;
      onStopTyping?.();
    }, 1500);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    typingRef.current = false;
    onStopTyping?.();
    clearTimeout(timerRef.current);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="input-area">
      <div className="input-wrap">
        <span className="input-prefix">&gt;</span>
        <textarea
          className="chat-input"
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKey}
          placeholder={placeholder || 'Type a message...'}
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!text.trim()}
        >
          ↑
        </button>
      </div>
      <p className="input-hint">Enter to send · Shift+Enter for new line</p>
    </div>
  );
};

export default MessageInput;