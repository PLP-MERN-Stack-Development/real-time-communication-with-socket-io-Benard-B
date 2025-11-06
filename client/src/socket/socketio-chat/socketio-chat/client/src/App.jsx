import React, { useEffect, useState } from 'react';
import Login from './components/Login';
import Chat from './components/Chat';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
      try {
        const raw = localStorage.getItem('user');
        if (raw) setUser(JSON.parse(raw));
      } catch (e) {}
    }
  }, [token]);

  if (!token) {
    return <Login onAuth={(token,user) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); setToken(token); setUser(user); }} />;
  }

  return <Chat token={token} user={user} onLogout={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setToken(null); setUser(null); window.location.reload(); }} />;
}
