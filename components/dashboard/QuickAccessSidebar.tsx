'use client';

import { useState } from 'react';
import {
  HomeIcon,
  FolderIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  DocumentIcon,
  Cog6ToothIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Link from 'next/link';

interface MenuItem {
  name: string;
  icon: React.ReactNode;
  href: string;
  available: boolean;
}

const menuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    icon: <HomeIcon className="h-5 w-5" />,
    href: '/dashboard',
    available: true
  },
  {
    name: 'Active Cases',
    icon: <FolderIcon className="h-5 w-5" />,
    href: '/dashboard/active-cases',
    available: true
  },
  {
    name: 'Messages',
    icon: <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5" />,
    href: '/dashboard/messages',
    available: false
  },
  {
    name: 'Filings & Docs',
    icon: <DocumentIcon className="h-5 w-5" />,
    href: '/dashboard/documents',
    available: false
  },
  {
    name: 'Settings',
    icon: <Cog6ToothIcon className="h-5 w-5" />,
    href: '/dashboard/settings',
    available: true
  }
];

export default function QuickAccessSidebar() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="h-screen fixed left-0 top-0 bg-white border-r border-gray-200 transition-all duration-300 shadow-sm z-20"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ width: isHovered ? 200 : 64 }}
    >
      <div className="flex flex-col items-center py-6 space-y-6">
        <div className="text-black font-bold text-xl">{isHovered ? 'VeriLex AI' : 'VL'}</div>

        <nav className="flex flex-col w-full px-2 space-y-2">
          {menuItems.map((item, idx) => (
            <Link
              key={idx}
              href={item.available ? item.href : '#'}
              className={clsx(
                'flex items-center space-x-3 rounded-md px-3 py-2 transition text-sm font-medium',
                item.available
                  ? 'hover:bg-gray-100 text-gray-800'
                  : 'text-gray-400 cursor-not-allowed opacity-60'
              )}
            >
              {item.icon}
              {isHovered && (
                <span className="whitespace-nowrap">
                  {item.name}
                  {!item.available && <span className="ml-1 text-xs">(Soon)</span>}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
