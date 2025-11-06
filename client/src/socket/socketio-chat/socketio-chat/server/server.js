const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// In-memory stores (replace with DB in production)
const users = {}; // userId -> { id, username, passwordHash, socketId, online }
const rooms = { general: { id: 'general', name: 'General', members: [] } };
const messages = {}; // roomId -> [ {id, from, to, text, time, read} ]

// Simple auth endpoints (register + login)
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username & password required' });
  const exists = Object.values(users).find(u => u.username === username);
  if (exists) return res.status(400).json({ error: 'username taken' });
  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 8);
  users[id] = { id, username, passwordHash, online: false };
  const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id, username } });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = Object.values(users).find(u => u.username === username);
  if (!user) return res.status(400).json({ error: 'invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ error: 'invalid credentials' });
  const token = jwt.sign({ id: user.id, username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username } });
});

// Protected route helper
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// Socket authorization middleware (token passed in auth)
io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error: token required'));
  const payload = verifyToken(token);
  if (!payload) return next(new Error('Authentication error: invalid token'));
  socket.user = payload;
  next();
});

io.on('connection', (socket) => {
  const user = socket.user;
  // attach socket id and presence
  const localUser = users[user.id] || { id: user.id, username: user.username };
  localUser.socketId = socket.id;
  localUser.online = true;
  users[user.id] = localUser;

  // join default room
  socket.join('general');
  if (!rooms.general.members.includes(user.id)) rooms.general.members.push(user.id);

  // notify everyone of presence change
  io.emit('presence:update', { id: user.id, username: user.username, online: true });

  // send initial data to this socket
  socket.emit('init', {
    user: { id: localUser.id, username: localUser.username },
    rooms: Object.values(rooms),
    users: Object.values(users),
    messages
  });

  // Handle joining a room
  socket.on('room:join', (roomId, cb) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { id: roomId, name: roomId, members: [] };
    }
    if (!rooms[roomId].members.includes(user.id)) rooms[roomId].members.push(user.id);
    socket.join(roomId);
    io.to(roomId).emit('room:update', rooms[roomId]);
    if (cb) cb(rooms[roomId]);
  });

  // Handle leaving a room
  socket.on('room:leave', (roomId, cb) => {
    socket.leave(roomId);
    const idx = (rooms[roomId] && rooms[roomId].members.indexOf(user.id));
    if (idx >= 0) rooms[roomId].members.splice(idx, 1);
    io.to(roomId).emit('room:update', rooms[roomId]);
    if (cb) cb({ ok: true });
  });

  // Handle sending messages (room or private)
  socket.on('message:send', (payload, cb) => {
    // payload: { roomId?, toUserId?, text }
    const id = uuidv4();
    const time = Date.now();
    const msg = { id, from: user.id, username: user.username, text: payload.text, time, read: false, to: payload.toUserId || null };
    const targetRoom = payload.roomId || (payload.toUserId ? `dm:${[user.id,payload.toUserId].sort().join(':')}` : null);
    if (payload.toUserId) {
      // create DM room if not exists
      if (!rooms[targetRoom]) rooms[targetRoom] = { id: targetRoom, name: `DM`, members: [user.id, payload.toUserId] };
      io.to(targetRoom).emit('message:new', msg);
    } else if (payload.roomId) {
      if (!messages[payload.roomId]) messages[payload.roomId] = [];
      messages[payload.roomId].push(msg);
      io.to(payload.roomId).emit('message:new', msg);
    }
    if (cb) cb({ ok: true, message: msg });
  });

  // Typing indicators
  socket.on('typing', ({ roomId, isTyping }) => {
    socket.to(roomId).emit('typing', { userId: user.id, username: user.username, isTyping });
  });

  // Read receipts
  socket.on('message:read', ({ roomId, messageId }) => {
    const list = messages[roomId] || [];
    const m = list.find(x => x.id === messageId);
    if (m) {
      m.read = true;
      io.to(roomId).emit('message:read', { messageId, readerId: user.id });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const u = users[user.id];
    if (u) {
      u.online = false;
      u.socketId = null;
      io.emit('presence:update', { id: user.id, username: user.username, online: false });
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
