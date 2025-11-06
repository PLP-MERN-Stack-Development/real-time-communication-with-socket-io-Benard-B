# Socket.io Chat Application (Client + Server)

This repository is a complete starter solution for the **Real-Time Chat Application with Socket.io** assignment.

## Features implemented
- Real-time messaging with Socket.io (bidirectional)
- User authentication (JWT) and simple presence
- Multiple chat rooms + private messaging
- Real-time notifications
- Typing indicators and read receipts
- Basic UI built in React
- Server built with Express + Socket.io
- In-memory stores (easy to replace with DB)

## Project structure
```
socketio-chat/
├── client/
├── server/
└── README.md
```

## Quick setup (local)
### Server
```bash
cd server
npm install
# create .env (example .env.example included)
node server.js
```

### Client
```bash
cd client
npm install
npm start
```

By default the server runs on port 4000 and the React client on port 3000. The client is configured to talk to `http://localhost:4000`.

## Notes
- This code uses an in-memory store for users/rooms/messages for simplicity. Replace with a database (MongoDB, Postgres) for production.
- JWT secret is read from `.env`. See `server/.env.example`.
- Add screenshots/GIFs to README after you run and capture them.

Good luck — push this folder to your GitHub Classroom repository to submit.
