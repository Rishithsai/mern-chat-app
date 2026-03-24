// import { useState, useEffect, useCallback, useRef } from 'react';
// import axios from 'axios';
// import { useSocket } from '../context/SocketContext';
// import { useAuth } from '../context/AuthContext';

// export const useChat = (roomId) => {
//   const { user } = useAuth();
//   const { joinRoom, leaveRoom, sendMessage: socketSend, startTyping, stopTyping, onEvent } = useSocket();

//   const [messages, setMessages] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [hasMore, setHasMore] = useState(true);
//   const [page, setPage] = useState(1);
//   const [typingUsers, setTypingUsers] = useState([]);
//   const [members, setMembers] = useState([]);

//   const typingTimerRef = useRef(null);
//   const isTypingRef = useRef(false);

//   // Load initial messages
//   const loadMessages = useCallback(async (pageNum = 1) => {
//     if (!roomId) return;
//     setLoading(true);
//     try {
//       const { data } = await axios.get(
//         `/api/rooms/${roomId}/messages?page=${pageNum}&limit=30`
//       );
//       if (pageNum === 1) {
//         setMessages(data.messages);
//       } else {
//         setMessages((prev) => [...data.messages, ...prev]);
//       }
//       setHasMore(data.hasMore);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   }, [roomId]);

//   useEffect(() => {
//     if (!roomId) return;

//     setMessages([]);
//     setPage(1);
//     setHasMore(true);
//     setTypingUsers([]);

//     joinRoom(roomId);
//     loadMessages(1);

//     // Socket listeners
//     const cleanups = [
//       onEvent('message:new', (msg) => {
//         if (msg.room === roomId) {
//           setMessages((prev) => [...prev, msg]);
//         }
//       }),
//       onEvent('typing:start', ({ roomId: rid, user: typingUser }) => {
//         if (rid === roomId && typingUser._id !== user._id) {
//           setTypingUsers((prev) =>
//             prev.find((u) => u._id === typingUser._id) ? prev : [...prev, typingUser]
//           );
//         }
//       }),
//       onEvent('typing:stop', ({ roomId: rid, userId }) => {
//         if (rid === roomId) {
//           setTypingUsers((prev) => prev.filter((u) => u._id !== userId));
//         }
//       }),
//       onEvent('room:members', (memberList) => {
//         setMembers(memberList);
//       }),
//       onEvent('room:user_joined', ({ user: joinedUser }) => {
//         setMembers((prev) =>
//           prev.find((m) => m._id === joinedUser._id)
//             ? prev
//             : [...prev, joinedUser]
//         );
//       }),
//       onEvent('room:user_left', ({ userId }) => {
//         setMembers((prev) => prev.filter((m) => m._id !== userId));
//       }),
//     ];

//     return () => {
//       leaveRoom(roomId);
//       cleanups.forEach((cleanup) => cleanup && cleanup());
//     };
//   }, [roomId]);

//   const sendMessage = (content) => {
//     socketSend(roomId, content);
//     handleStopTyping();
//   };

//   const handleStartTyping = () => {
//     if (!isTypingRef.current) {
//       isTypingRef.current = true;
//       startTyping(roomId);
//     }
//     clearTimeout(typingTimerRef.current);
//     typingTimerRef.current = setTimeout(handleStopTyping, 2000);
//   };

//   const handleStopTyping = () => {
//     if (isTypingRef.current) {
//       isTypingRef.current = false;
//       stopTyping(roomId);
//     }
//     clearTimeout(typingTimerRef.current);
//   };

//   const loadMore = () => {
//     if (!loading && hasMore) {
//       const next = page + 1;
//       setPage(next);
//       loadMessages(next);
//     }
//   };

//   return {
//     messages,
//     loading,
//     hasMore,
//     typingUsers,
//     members,
//     sendMessage,
//     handleStartTyping,
//     handleStopTyping,
//     loadMore,
//   };
// };



import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export const useChat = (roomId) => {
  const { user } = useAuth();
  const {
    joinRoom,
    leaveRoom,
    sendMessage: socketSend,
    startTyping,
    stopTyping,
    onEvent,
  } = useSocket();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [typingUsers, setTypingUsers] = useState([]);
  const [members, setMembers] = useState([]);

  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  const userId = user?._id;

  // ✅ Load messages (memoized)
  const loadMessages = useCallback(async (pageNum = 1) => {
    if (!roomId) return;

    setLoading(true);
    try {
      const { data } = await axios.get(
        `/api/rooms/${roomId}/messages?page=${pageNum}&limit=30`
      );

      if (pageNum === 1) {
        setMessages(data.messages);
      } else {
        setMessages((prev) => [...data.messages, ...prev]);
      }

      setHasMore(data.hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  // ✅ Main effect (FIXED dependencies)
  useEffect(() => {
    if (!roomId) return;

    setMessages([]);
    setPage(1);
    setHasMore(true);
    setTypingUsers([]);

    joinRoom(roomId);
    loadMessages(1);

    const cleanups = [
      onEvent('message:new', (msg) => {
        if (msg.room === roomId) {
          setMessages((prev) => [...prev, msg]);
        }
      }),

      onEvent('typing:start', ({ roomId: rid, user: typingUser }) => {
        if (rid === roomId && typingUser._id !== userId) {
          setTypingUsers((prev) =>
            prev.find((u) => u._id === typingUser._id)
              ? prev
              : [...prev, typingUser]
          );
        }
      }),

      onEvent('typing:stop', ({ roomId: rid, userId: stoppedId }) => {
        if (rid === roomId) {
          setTypingUsers((prev) =>
            prev.filter((u) => u._id !== stoppedId)
          );
        }
      }),

      onEvent('room:members', (memberList) => {
        setMembers(memberList);
      }),

      onEvent('room:user_joined', ({ user: joinedUser }) => {
        setMembers((prev) =>
          prev.find((m) => m._id === joinedUser._id)
            ? prev
            : [...prev, joinedUser]
        );
      }),

      onEvent('room:user_left', ({ userId: leftId }) => {
        setMembers((prev) =>
          prev.filter((m) => m._id !== leftId)
        );
      }),
    ];

    return () => {
      leaveRoom(roomId);
      cleanups.forEach((cleanup) => cleanup && cleanup());
    };
  }, [roomId, joinRoom, leaveRoom, loadMessages, onEvent, userId]);

  // ✅ Send message
  const sendMessage = useCallback((content) => {
    socketSend(roomId, content);
    handleStopTyping();
  }, [roomId, socketSend]);

  // ✅ Typing handlers
  const handleStopTyping = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      stopTyping(roomId);
    }
    clearTimeout(typingTimerRef.current);
  }, [roomId, stopTyping]);

  const handleStartTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      startTyping(roomId);
    }

    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(handleStopTyping, 2000);
  }, [roomId, startTyping, handleStopTyping]);

  // ✅ Load more messages (pagination)
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const next = page + 1;
      setPage(next);
      loadMessages(next);
    }
  }, [loading, hasMore, page, loadMessages]);

  return {
    messages,
    loading,
    hasMore,
    typingUsers,
    members,
    sendMessage,
    handleStartTyping,
    handleStopTyping,
    loadMore,
  };
};