'use client';

import React, { JSX } from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

type Theme = 'light' | 'dark';

interface ThemeSelectorProps {
  theme: Theme;
  setTheme: (value: Theme) => void;
}

export default function ThemeSelector({ theme, setTheme }: ThemeSelectorProps) {
  const options: { label: string; icon: React.ReactElement; value: Theme }[] = [
    { label: 'Light Mode', icon: <SunIcon className="w-4 h-4" />, value: 'light' },
    { label: 'Dark Mode', icon: <MoonIcon className="w-4 h-4" />, value: 'dark' },
  ];

  return (
    <div className="px-2 py-1">
      <p className="text-xs text-gray-500 dark:text-gray-400 px-2">Theme</p>
      {options.map(({ label, icon, value }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`flex items-center gap-2 w-full text-left px-4 py-2 text-sm transition-colors
            ${theme === value
              ? 'font-semibold text-blue-600 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-200'}
            hover:bg-gray-100 dark:hover:bg-gray-700`}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}
