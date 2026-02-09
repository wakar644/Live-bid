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
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
        console.log('✅ Socket connected successfully:', socket?.id);
    });

    socket.on('connect_error', (err) => {
        console.error('❌ Socket connection error:', err.message);
        // Common errors: "xhr poll error" (CORS/Network), "invalid token" (Auth)
    });

    socket.on('disconnect', (reason) => {
        console.warn('⚠️ Socket disconnected:', reason);
    });

    socket.on('reconnect_attempt', (attempt) => {
        console.log(`🔄 Socket reconnecting... (Attempt ${attempt})`);
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
