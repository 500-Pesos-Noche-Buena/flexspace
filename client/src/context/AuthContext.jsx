import React, { createContext, useState, useEffect, useContext } from 'react';
import { setLogoutCallback } from '@/utils/Api';

export const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        try {
            return savedUser ? JSON.parse(savedUser) : null;
        } catch {
            return null;
        }
    });

    // Register logout callback with API module
    useEffect(() => {
        setLogoutCallback(() => {
            logout();
        });
    }, []);

    useEffect(() => {
        const syncLogout = (event) => {
            if (event.key === 'authToken' && !event.newValue) {
                setUser(null);
            }
        };

        window.addEventListener('storage', syncLogout);
        return () => window.removeEventListener('storage', syncLogout);
    }, []);

    const login = (userData, token) => {
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('authToken', token);
        setUser(userData);
    };

    const logout = () => {
        console.log('🔓 Clearing auth state...');
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};