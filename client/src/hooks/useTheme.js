
import { useState, useEffect } from 'react';

export const useTheme = () => {
    const [themeColor, setThemeColor] = useState(() => {
        return localStorage.getItem('theme_color') || 'indigo';
    });

    const [themeMode, setThemeMode] = useState(() => {
        return localStorage.getItem('theme_mode') || 'dark';
    });

    useEffect(() => {
        const handleThemeChange = () => {
            const newColor = localStorage.getItem('theme_color') || 'indigo';
            const newMode = localStorage.getItem('theme_mode') || 'dark';
            setThemeColor(newColor);
            setThemeMode(newMode);
        };

        window.addEventListener('theme-changed', handleThemeChange);
        window.addEventListener('storage', handleThemeChange);

        return () => {
            window.removeEventListener('theme-changed', handleThemeChange);
            window.removeEventListener('storage', handleThemeChange);
        };
    }, []);

    return { themeColor, themeMode };
};