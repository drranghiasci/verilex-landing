'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FolderOpenIcon,
  FolderPlusIcon,
  Cog8ToothIcon,
  QuestionMarkCircleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type MenuItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
  available?: boolean;
};

const menuItems: MenuItem[] = [
  {
    name: 'New Case',
    href: '/new-case',
    icon: <FolderPlusIcon className="h-5 w-5" />,
    available: true,
  },
  {
    name: 'Active Cases',
    href: '/active-cases',
    icon: <FolderOpenIcon className="h-5 w-5" />,
    available: true,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: <Cog8ToothIcon className="h-5 w-5" />,
    available: true,
  },
  {
    name: 'Analytics (Soon)',
    href: '#',
    icon: <QuestionMarkCircleIcon className="h-5 w-5" />,
    available: false,
  },
  {
    name: 'Document Generator (Soon)',
    href: '#',
    icon: <LockClosedIcon className="h-5 w-5" />,
    available: false,
  },
];

export default function QuickAccessSidebar() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="fixed left-0 top-0 h-screen bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-700 shadow-sm z-20 flex flex-col items-center pt-16 transition-all duration-300"
      style={{ width: isHovered ? 240 : 64 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Navigation Items */}
      <nav className="flex flex-col w-full px-2 space-y-2">
        {menuItems.map((item, idx) => {
          const disabled = !item.available;
          return (
            <Link
              key={idx}
              href={disabled ? '#' : item.href}
              className={clsx(
                'flex items-center rounded-md px-3 py-2 transition text-sm font-medium group',
                disabled
                  ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-zinc-800'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
              )}
            >
              {item.icon}
              {isHovered && (
                <span className="ml-3 whitespace-nowrap">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
