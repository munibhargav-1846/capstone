import { io } from "socket.io-client";
let socket = null;
function getSocket() {
  const token = localStorage.getItem("taskline_token");
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1e3
    });
  } else if (socket.auth && socket.auth.token !== token) {
    socket.auth = { token };
    if (socket.connected) {
      socket.disconnect();
    }
    socket.connect();
  }
  return socket;
}
function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
export {
  disconnectSocket,
  getSocket
};
