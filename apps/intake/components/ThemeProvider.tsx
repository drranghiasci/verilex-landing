import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
    getAccentCssVars,
    getThemeCssVars,
    type AccentPreset,
    type ThemeMode
} from '../lib/themePresets';

type ThemeContextValue = {
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    toggleTheme: () => void;
    accentPreset: AccentPreset;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: ThemeMode;
    accentPreset?: AccentPreset;
};

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({
    children,
    defaultTheme = 'system',
    accentPreset = 'verilex_default',
}: ThemeProviderProps) {
    const [theme, setThemeState] = useState<'light' | 'dark'>('dark');

    // Initialize theme based on defaultTheme prop and stored preference
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const storedTheme = localStorage.getItem('intake-theme');

        if (storedTheme === 'light' || storedTheme === 'dark') {
            // User has explicit preference
            setThemeState(storedTheme);
        } else if (defaultTheme === 'system') {
            // Use system preference
            setThemeState(getSystemTheme());
        } else {
            // Use firm default
            setThemeState(defaultTheme);
        }
    }, [defaultTheme]);

    // Apply CSS variables when theme or accent changes
    useEffect(() => {
        if (typeof document === 'undefined') return;

        const root = document.documentElement;

        // Apply theme colors
        const themeVars = getThemeCssVars(theme);
        for (const [key, value] of Object.entries(themeVars)) {
            root.style.setProperty(key, value);
        }

        // Apply accent colors
        const accentVars = getAccentCssVars(accentPreset);
        for (const [key, value] of Object.entries(accentVars)) {
            root.style.setProperty(key, value);
        }

        // Set data attribute for CSS selectors
        root.setAttribute('data-theme', theme);
    }, [theme, accentPreset]);

    // Listen for system theme changes
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = () => {
            const storedTheme = localStorage.getItem('intake-theme');
            if (!storedTheme && defaultTheme === 'system') {
                setThemeState(getSystemTheme());
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [defaultTheme]);

    const setTheme = useCallback((newTheme: 'light' | 'dark') => {
        setThemeState(newTheme);
        if (typeof window !== 'undefined') {
            localStorage.setItem('intake-theme', newTheme);
        }
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    }, [theme, setTheme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, accentPreset }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
