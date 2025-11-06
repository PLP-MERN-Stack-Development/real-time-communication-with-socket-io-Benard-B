import { io } from "socket.io-client";

let socket = null;

export function connect(token) {
  socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:4000', {
    auth: { token }
  });
  return socket;
}

export function getSocket() {
  return socket;
}
