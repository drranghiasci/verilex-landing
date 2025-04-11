'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  // Future placeholders
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
      className="fixed left-0 top-0 h-screen bg-white border-r border-gray-200 shadow-sm z-20
                 flex flex-col items-center py-4 transition-all duration-300"
      style={{ width: isHovered ? 240 : 64 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo Section */}
      <div className="mb-8">
        {isHovered ? (
          <Image
            src="/verilex-logo-name.png"
            alt="Verilex AI Logo Expanded"
            width={160}
            height={50}
            priority
          />
        ) : (
          <Image
            src="/verilex-logo.png"
            alt="Verilex AI Logo Collapsed"
            width={40}
            height={40}
            priority
          />
        )}
      </div>

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
                  ? 'opacity-50 cursor-not-allowed bg-gray-100'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              {item.icon}
              {isHovered && (
                <span className="ml-3 whitespace-nowrap">
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
