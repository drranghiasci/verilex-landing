'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const buttons = [
    { icon: <Sun />, label: 'Light', value: 'light' },
    { icon: <Moon />, label: 'Dark', value: 'dark' },
    { icon: <Monitor />, label: 'System', value: 'system' },
  ];

  return (
    <div className="flex gap-2 items-center px-2">
      {buttons.map(({ icon, label, value }) => (
        <button
          key={value}
          onClick={() => toggleTheme(value)}
          className={`rounded-full p-2 transition ${theme === value ? 'bg-gray-300 dark:bg-zinc-700' : 'hover:bg-gray-200 dark:hover:bg-zinc-800'}`}
          aria-label={label}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
