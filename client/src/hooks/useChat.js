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

  // Keep latest socket functions and user in refs so the main effect
  // can reference them without needing them in its dependency array.
  // The effect must only re-run when roomId changes — adding these as
  // deps would cause repeated join/leave/listener cycles on every render.
  const joinRoomRef = useRef(joinRoom);
  const leaveRoomRef = useRef(leaveRoom);
  const onEventRef = useRef(onEvent);
  const userIdRef = useRef(user?._id);

  useEffect(() => { joinRoomRef.current = joinRoom; }, [joinRoom]);
  useEffect(() => { leaveRoomRef.current = leaveRoom; }, [leaveRoom]);
  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);
  useEffect(() => { userIdRef.current = user?._id; }, [user?._id]);

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

  useEffect(() => {
    if (!roomId) return;

    setMessages([]);
    setPage(1);
    setHasMore(true);
    setTypingUsers([]);

    joinRoomRef.current(roomId);
    loadMessages(1);

    const cleanups = [
      onEventRef.current('message:new', (msg) => {
        if (msg.room === roomId) {
          setMessages((prev) => [...prev, msg]);
        }
      }),
      onEventRef.current('typing:start', ({ roomId: rid, user: typingUser }) => {
        if (rid === roomId && typingUser._id !== userIdRef.current) {
          setTypingUsers((prev) =>
            prev.find((u) => u._id === typingUser._id) ? prev : [...prev, typingUser]
          );
        }
      }),
      onEventRef.current('typing:stop', ({ roomId: rid, userId }) => {
        if (rid === roomId) {
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
      leaveRoomRef.current(roomId);
      cleanups.forEach((cleanup) => cleanup && cleanup());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, loadMessages]);
  // ^ Intentionally omitting joinRoom, leaveRoom, onEvent, user._id —
  //   they are kept current via refs above. Including them would cause
  //   the effect to re-run on every render, repeatedly joining/leaving
  //   the room and re-registering all socket listeners.

  const sendMessage = useCallback((content) => {
    socketSend(roomId, content);
    handleStopTyping();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, socketSend]);

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