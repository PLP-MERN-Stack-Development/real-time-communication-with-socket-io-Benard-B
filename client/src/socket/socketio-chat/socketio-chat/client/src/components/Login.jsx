import React, { useState } from 'react';

export default function Login({ onAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    try {
      const res = await fetch((process.env.REACT_APP_SERVER_URL || 'http://localhost:4000') + '/api/' + (mode === 'login' ? 'login' : 'register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auth failed');
      onAuth(data.token, data.user);
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 420, margin: '40px auto', border: '1px solid #ddd', borderRadius: 8 }}>
      <h2>{mode === 'login' ? 'Login' : 'Register'}</h2>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 8 }}>
          <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        {err && <div style={{ color: 'red' }}>{err}</div>}
        <button type="submit">{mode === 'login' ? 'Login' : 'Register'}</button>
      </form>
      <hr />
      <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>Switch to {mode === 'login' ? 'Register' : 'Login'}</button>
    </div>
  );
}
