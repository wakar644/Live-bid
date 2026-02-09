import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Connect to WebSocket server with JWT authentication
 * @param token - JWT token for authentication
 * @returns Socket instance
 */
export const connectSocket = (token: string): Socket => {
    if (socket) {
        socket.disconnect();
    }

    socket = io(import.meta.env.VITE_WS_URL, {
        auth: {
            token,
        },
        autoConnect: true,
    });

    return socket;
};

/**
 * Get the current socket instance
 * @returns Socket instance or null if not connected
 */
export const getSocket = (): Socket | null => {
    return socket;
};

/**
 * Disconnect from WebSocket server
 */
export const disconnectSocket = (): void => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
