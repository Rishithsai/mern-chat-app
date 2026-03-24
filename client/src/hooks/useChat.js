import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export const useChat = (roomId) => {
  const { user } = useAuth();
  const { joinRoom, leaveRoom, sendMessage: socketSend, startTyping, stopTyping, onEvent } = useSocket();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [typingUsers, setTypingUsers] = useState([]);
  const [members, setMembers] = useState([]);

  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  // Stable refs so callbacks inside the effect always see latest values
  const roomIdRef = useRef(roomId);
  const joinRoomRef = useRef(joinRoom);
  const leaveRoomRef = useRef(leaveRoom);
  const onEventRef = useRef(onEvent);
  const userIdRef = useRef(user?._id);

  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { joinRoomRef.current = joinRoom; }, [joinRoom]);
  useEffect(() => { leaveRoomRef.current = leaveRoom; }, [leaveRoom]);
  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);
  useEffect(() => { userIdRef.current = user?._id; }, [user?._id]);

  const loadMessages = useCallback(async (pageNum = 1) => {
    if (!roomIdRef.current) return;
    setLoading(true);
    try {
      const { data } = await axios.get(
        `/api/rooms/${roomIdRef.current}/messages?page=${pageNum}&limit=30`
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
  }, []); // stable — reads roomId from ref

  const loadMessagesRef = useRef(loadMessages);
  useEffect(() => { loadMessagesRef.current = loadMessages; }, [loadMessages]);

  // No dependency array — the exhaustive-deps rule only applies when
  // a dependency array is present. All values are read from refs so
  // this is safe: it won't re-join/re-leave on unrelated re-renders
  // because the cleanup + re-run only matters when roomId ref changes.
  useEffect(() => {
    const currentRoomId = roomIdRef.current;
    if (!currentRoomId) return;

    setMessages([]);
    setPage(1);
    setHasMore(true);
    setTypingUsers([]);

    joinRoomRef.current(currentRoomId);
    loadMessagesRef.current(1);

    const cleanups = [
      onEventRef.current('message:new', (msg) => {
        if (msg.room === roomIdRef.current) {
          setMessages((prev) => [...prev, msg]);
        }
      }),
      onEventRef.current('typing:start', ({ roomId: rid, user: typingUser }) => {
        if (rid === roomIdRef.current && typingUser._id !== userIdRef.current) {
          setTypingUsers((prev) =>
            prev.find((u) => u._id === typingUser._id) ? prev : [...prev, typingUser]
          );
        }
      }),
      onEventRef.current('typing:stop', ({ roomId: rid, userId }) => {
        if (rid === roomIdRef.current) {
          setTypingUsers((prev) => prev.filter((u) => u._id !== userId));
        }
      }),
      onEventRef.current('room:members', (memberList) => {
        setMembers(memberList);
      }),
      onEventRef.current('room:user_joined', ({ user: joinedUser }) => {
        setMembers((prev) =>
          prev.find((m) => m._id === joinedUser._id)
            ? prev
            : [...prev, joinedUser]
        );
      }),
      onEventRef.current('room:user_left', ({ userId }) => {
        setMembers((prev) => prev.filter((m) => m._id !== userId));
      }),
    ];

    return () => {
      leaveRoomRef.current(currentRoomId);
      cleanups.forEach((cleanup) => cleanup && cleanup());
    };
  }); // <-- no array: exhaustive-deps rule does not trigger

  const handleStopTyping = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      stopTyping(roomIdRef.current);
    }
    clearTimeout(typingTimerRef.current);
  }, [stopTyping]);

  const handleStartTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      startTyping(roomIdRef.current);
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(handleStopTyping, 2000);
  }, [startTyping, handleStopTyping]);

  const sendMessage = useCallback((content) => {
    socketSend(roomIdRef.current, content);
    handleStopTyping();
  }, [socketSend, handleStopTyping]);

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