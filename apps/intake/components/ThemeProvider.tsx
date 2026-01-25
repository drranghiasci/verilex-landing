import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
    getAccentCssVars,
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

function getInitialTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'dark';
    const stored = localStorage.getItem('verilex-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    // Default to dark mode or system preference
    return getSystemTheme();
}

export function ThemeProvider({
    children,
    defaultTheme = 'dark',  // Changed default from 'system' to 'dark'
    accentPreset = 'verilex_default',
}: ThemeProviderProps) {
    // Initialize with dark to avoid hydration mismatch, then sync on mount
    const [theme, setThemeState] = useState<'light' | 'dark'>('dark');

    // Initialize theme based on defaultTheme prop and stored preference
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const storedTheme = localStorage.getItem('verilex-theme');

        if (storedTheme === 'light' || storedTheme === 'dark') {
            // User has explicit preference
            setThemeState(storedTheme);
        } else {
            // No stored preference - always default to dark to avoid flash
            // The user can manually switch to light if they want
            setThemeState('dark');
        }
    }, [defaultTheme]);

    // Apply CSS variables when theme or accent changes
    useEffect(() => {
        if (typeof document === 'undefined') return;

        const root = document.documentElement;

        // CSS handles theme colors via .dark class - no need to apply inline
        // Only apply accent colors (firm-specific, not in base CSS)
        const accentVars = getAccentCssVars(accentPreset);
        for (const [key, value] of Object.entries(accentVars)) {
            root.style.setProperty(key, value);
        }

        // Toggle dark class for CSS selectors
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Set data attribute for CSS selectors
        root.setAttribute('data-theme', theme);
    }, [theme, accentPreset]);

    // Listen for system theme changes
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = () => {
            const storedTheme = localStorage.getItem('verilex-theme');
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
            localStorage.setItem('verilex-theme', newTheme);
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
