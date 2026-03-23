import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});

  useEffect(() => {
    if (!user?.token) return;

    // Connect with auth token
    // socketRef.current = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
    //   auth: { token: user.token },
    //   transports: ['websocket', 'polling'],
    // });
     socketRef.current = io('http://localhost:8000', {
      auth: { token: user.token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setConnected(false);
    });

    // Track online presence
    socket.on('user:status', ({ userId, status }) => {
      setOnlineUsers((prev) => ({ ...prev, [userId]: status }));
    });

    socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
      setConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user]);

  const joinRoom = (roomId) => {
    socketRef.current?.emit('room:join', { roomId });
  };

  const leaveRoom = (roomId) => {
    socketRef.current?.emit('room:leave', { roomId });
  };

  const sendMessage = (roomId, content) => {
    socketRef.current?.emit('message:send', { roomId, content });
  };

  const startTyping = (roomId) => {
    socketRef.current?.emit('typing:start', { roomId });
  };

  const stopTyping = (roomId) => {
    socketRef.current?.emit('typing:stop', { roomId });
  };

  const onEvent = (event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        connected,
        onlineUsers,
        joinRoom,
        leaveRoom,
        sendMessage,
        startTyping,
        stopTyping,
        onEvent,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};