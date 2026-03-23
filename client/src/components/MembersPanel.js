import React from 'react';
import { useSocket } from '../context/SocketContext';

const MembersPanel = ({ members }) => {
  const { onlineUsers } = useSocket();

  const getStatus = (member) => onlineUsers[member._id] || member.status || 'offline';

  const online = members.filter((m) => getStatus(m) === 'online');
  const away = members.filter((m) => getStatus(m) === 'away');
  const offline = members.filter((m) => getStatus(m) === 'offline');

  const colors = ['#7c6dfa', '#2bd9a0', '#f05a7e', '#f9a820', '#378add'];
  const getColor = (name) => colors[name.charCodeAt(0) % colors.length];
  const getInitials = (name) => name.slice(0, 2).toUpperCase();

  const MemberItem = ({ member }) => {
    const status = getStatus(member);
    return (
      <div className="member-item">
        <div
          className="member-avatar"
          style={{
            background: `${getColor(member.username)}20`,
            color: getColor(member.username),
            opacity: status === 'offline' ? 0.5 : 1,
          }}
        >
          {getInitials(member.username)}
          <span className={`member-dot ${status}`} />
        </div>
        <span className={`member-name ${status === 'offline' ? 'muted' : ''}`}>
          {member.username}
        </span>
      </div>
    );
  };

  return (
    <aside className="members-panel">
      <div className="members-header">Members · {members.length}</div>

      {online.length > 0 && (
        <>
          <div className="members-section">Online — {online.length}</div>
          {online.map((m) => <MemberItem key={m._id} member={m} />)}
        </>
      )}

      {away.length > 0 && (
        <>
          <div className="members-section">Away — {away.length}</div>
          {away.map((m) => <MemberItem key={m._id} member={m} />)}
        </>
      )}

      {offline.length > 0 && (
        <>
          <div className="members-section">Offline — {offline.length}</div>
          {offline.map((m) => <MemberItem key={m._id} member={m} />)}
        </>
      )}

      {members.length === 0 && (
        <p className="members-empty">No members yet</p>
      )}
    </aside>
  );
};

export default MembersPanel;