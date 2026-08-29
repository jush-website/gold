import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'theme_v1';
const THEME_COLOR = { dark: '#0c0d10', light: '#f7f5f0' };

const readStored = () => {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
    } catch {
        return 'dark'; // 無痕模式讀不到 localStorage
    }
};

// 深色是預設，使用者可以手動切成淺色。
// index.html 裡有一段同樣邏輯的行內腳本，負責在首次繪製前就套用，避免閃白。
export const useTheme = () => {
    const [theme, setTheme] = useState(readStored);

    useEffect(() => {
        document.documentElement.classList.toggle('theme-light', theme === 'light');
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = THEME_COLOR[theme];
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch { /* 存不了就只在這次工作階段生效 */ }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    }, []);

    return { theme, toggleTheme, isLight: theme === 'light' };
};
