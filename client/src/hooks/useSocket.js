// hooks/useSocket.js - Create this if it doesn't exist
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let socket = null;

export const useSocket = (eventName) => {
    const [data, setData] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!socket) {
            socket = io(SOCKET_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            });

            socket.on('connect', () => {
                console.log('🔌 WebSocket connected');
                setIsConnected(true);
            });

            socket.on('disconnect', () => {
                console.log('🔌 WebSocket disconnected');
                setIsConnected(false);
            });

            socket.on('connect_error', (error) => {
                console.error('WebSocket connection error:', error);
                setIsConnected(false);
            });
        }

        if (eventName && socket) {
            const handler = (eventData) => {
                console.log(`📡 Received ${eventName}:`, eventData);
                setData(eventData);
            };
            
            socket.on(eventName, handler);
            
            return () => {
                socket.off(eventName, handler);
            };
        }
    }, [eventName]);

    return { data, isConnected, socket };
};