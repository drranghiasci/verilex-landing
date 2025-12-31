'use client';

import { createContext, useEffect, useMemo, useState, useContext } from 'react';

type Theme = 'light' | 'dark';
type ThemeContextValue = {
  theme: Theme;
  setTheme: (value: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'verilex-theme';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const preferred = stored === 'light' || stored === 'dark' ? stored : 'dark';
    setThemeState(preferred);
    updateDocumentTheme(preferred);
  }, []);

  const updateDocumentTheme = (value: Theme) => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', value === 'dark');
  };

  const setTheme = (value: Theme) => {
    setThemeState(value);
    localStorage.setItem(STORAGE_KEY, value);
    updateDocumentTheme(value);
  };

  const contextValue = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
};
