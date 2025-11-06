import React, { useEffect, useState, useRef } from 'react';
import { connect, getSocket } from '../socket/socket';

function RoomList({ rooms, currentRoom, onJoin }) {
  return (
    <div style={{ padding: 8 }}>
      <h4>Rooms</h4>
      <ul>
        {rooms.map(r => <li key={r.id}><button onClick={() => onJoin(r.id)} style={{ fontWeight: r.id === currentRoom ? 'bold' : 'normal' }}>{r.name}</button></li>)}
      </ul>
    </div>
  );
}

function UsersList({ users }) {
  return (
    <div style={{ padding: 8 }}>
      <h4>Users</h4>
      <ul>
        {users.map(u => <li key={u.id}>{u.username} {u.online ? '(online)' : '(offline)'}</li>)}
      </ul>
    </div>
  );
}

function MessageList({ messages }) {
  return (
    <div style={{ padding: 8, height: 300, overflow: 'auto', border: '1px solid #eee' }}>
      {messages.map(m => (
        <div key={m.id} style={{ marginBottom: 6 }}>
          <strong>{m.username}</strong>: {m.text} <small>{new Date(m.time).toLocaleTimeString()}</small> {m.read ? <em>✓</em> : null}
        </div>
      ))}
    </div>
  );
}

export default function Chat({ token, user, onLogout }) {
  const [socket, setSocket] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [messagesStore, setMessagesStore] = useState({});
  const [currentRoom, setCurrentRoom] = useState('general');
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const msgListRef = useRef();

  useEffect(() => {
    const s = connect(token);
    setSocket(s);

    s.on('connect_error', (err) => {
      console.error('connect_error', err.message);
    });

    s.on('init', (data) => {
      setRooms(data.rooms || []);
      setUsers(data.users || []);
      setMessagesStore(data.messages || {});
    });

    s.on('presence:update', (p) => {
      setUsers(prev => {
        const copy = prev.filter(x => x.id !== p.id);
        copy.push(p);
        return copy;
      });
    });

    s.on('room:update', (room) => {
      setRooms(prev => {
        const others = prev.filter(r => r.id !== room.id);
        others.push(room);
        return others;
      });
    });

    s.on('message:new', (msg) => {
      setMessagesStore(prev => {
        const copy = { ...prev };
        if (!copy[currentRoom]) copy[currentRoom] = [];
        // if msg is for a room we are not viewing, put it under its room id if specified
        const target = msg.to ? `dm:${[msg.from, msg.to].sort().join(':')}` : currentRoom;
        const rid = msg.roomId || (msg.to ? target : currentRoom);
        if (!copy[rid]) copy[rid] = [];
        copy[rid] = [...copy[rid], msg];
        return copy;
      });
    });

    s.on('typing', ({ userId, username, isTyping }) => {
      setTypingUsers(prev => ({ ...prev, [userId]: isTyping ? username : null }));
    });

    s.on('message:read', ({ messageId, readerId }) => {
      setMessagesStore(prev => {
        const copy = { ...prev };
        Object.keys(copy).forEach(roomId => {
          copy[roomId] = copy[roomId].map(m => m.id === messageId ? { ...m, read: true } : m);
        });
        return copy;
      });
    });

    return () => {
      s.disconnect();
    };
  }, [token, currentRoom]);

  function joinRoom(roomId) {
    const s = getSocket();
    if (!s) return;
    s.emit('room:join', roomId, (room) => {
      setCurrentRoom(roomId);
    });
  }

  function sendMessage(e) {
    e && e.preventDefault();
    if (!input) return;
    const s = getSocket();
    const payload = { roomId: currentRoom, text: input };
    s.emit('message:send', payload, (ack) => {
      // optimistic UI handled by server 'message:new'
    });
    setInput('');
    s.emit('typing', { roomId: currentRoom, isTyping: false });
  }

  function handleTyping(e) {
    setInput(e.target.value);
    const s = getSocket();
    s && s.emit('typing', { roomId: currentRoom, isTyping: e.target.value.length > 0 });
  }

  const messages = messagesStore[currentRoom] || [];

  return (
    <div style={{ display: 'flex', gap: 12, padding: 12 }}>
      <div style={{ width: 200 }}>
        <div style={{ marginBottom: 8 }}>
          <strong>{user.username}</strong>
          <button onClick={onLogout} style={{ marginLeft: 8 }}>Logout</button>
        </div>
        <RoomList rooms={rooms} currentRoom={currentRoom} onJoin={joinRoom} />
        <UsersList users={users} />
      </div>

      <div style={{ flex: 1 }}>
        <h3>{currentRoom}</h3>
        <MessageList messages={messages} />
        <div>
          {Object.values(typingUsers).filter(Boolean).length > 0 && <div><em>{Object.values(typingUsers).filter(Boolean).join(', ')} typing...</em></div>}
          <form onSubmit={sendMessage}>
            <input value={input} onChange={handleTyping} style={{ width: '80%' }} />
            <button type="submit">Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}
