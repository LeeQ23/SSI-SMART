import { io } from 'socket.io-client';

// In development, connect directly to the Express server port 5003 to bypass Vite proxy issues.
// In production, connect to the current origin (where the app is served).
const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:5003' : window.location.origin;

export const createSocketConnection = (options = {}) => {
    return io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        ...options
    });
};
