import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const Sidebar = ({ activeRoom, onSelectRoom }) => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', description: '' });
  const [unread, setUnread] = useState({});

  const fetchRooms = async () => {
    try {
      const { data } = await axios.get('/api/rooms');
      setRooms(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Track unread counts for inactive rooms
  const { onEvent } = useSocket();
  useEffect(() => {
    const cleanup = onEvent('message:new', (msg) => {
      if (msg.room !== activeRoom?._id) {
        setUnread((prev) => ({ ...prev, [msg.room]: (prev[msg.room] || 0) + 1 }));
      }
    });
    return cleanup;
  }, [activeRoom, onEvent]);

  const handleSelectRoom = (room) => {
    setUnread((prev) => ({ ...prev, [room._id]: 0 }));
    onSelectRoom(room);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoom.name.trim()) return;
    try {
      const { data } = await axios.post('/api/rooms', newRoom);
      setRooms((prev) => [data, ...prev]);
      setNewRoom({ name: '', description: '' });
      setShowCreate(false);
      onSelectRoom(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create room');
    }
  };

  const getInitials = (name) => name.slice(0, 2).toUpperCase();
  const colors = ['#7c6dfa', '#2bd9a0', '#f05a7e', '#f9a820', '#378add'];
  const getColor = (name) => colors[name.charCodeAt(0) % colors.length];

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          ⚡ <span>socket.live</span>
        </div>
        <div className={`conn-dot ${connected ? 'online' : 'offline'}`} title={connected ? 'Connected' : 'Disconnected'} />
      </div>

      {/* Me */}
      <div className="sidebar-me">
        <div className="avatar-sm" style={{ background: `${getColor(user.username)}20`, color: getColor(user.username) }}>
          {getInitials(user.username)}
        </div>
        <div className="sidebar-me-info">
          <span className="sidebar-me-name">{user.username}</span>
          <span className="sidebar-me-status">● online</span>
        </div>
        <button className="logout-btn" onClick={logout} title="Sign out">⏻</button>
      </div>

      {/* Rooms */}
      <div className="sidebar-section-label">
        <span>Rooms</span>
        <button className="add-btn" onClick={() => setShowCreate(true)}>+</button>
      </div>

      {showCreate && (
        <form className="create-room-form" onSubmit={handleCreateRoom}>
          <input
            autoFocus
            placeholder="room-name"
            value={newRoom.name}
            onChange={(e) => setNewRoom((p) => ({ ...p, name: e.target.value }))}
          />
          <input
            placeholder="Description (optional)"
            value={newRoom.description}
            onChange={(e) => setNewRoom((p) => ({ ...p, description: e.target.value }))}
          />
          <div className="create-room-actions">
            <button type="submit">Create</button>
            <button type="button" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="room-list">
        {rooms.map((room) => (
          <button
            key={room._id}
            className={`room-item ${activeRoom?._id === room._id ? 'active' : ''}`}
            onClick={() => handleSelectRoom(room)}
          >
            <span className="room-hash">#</span>
            <span className="room-name">{room.name}</span>
            {unread[room._id] > 0 && (
              <span className="unread-badge">{unread[room._id]}</span>
            )}
          </button>
        ))}
        {rooms.length === 0 && (
          <p className="empty-rooms">No rooms yet. Create one!</p>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;