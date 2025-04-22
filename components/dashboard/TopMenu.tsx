'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Menu, Transition } from '@headlessui/react';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import md5 from 'md5';

export default function TopMenu() {
  const [searchInput, setSearchInput] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('/placeholder-avatar.png');
  const [darkMode, setDarkMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data?.user?.email ?? '';
      setUserEmail(email);
      if (email) {
        const hash = md5(email.trim().toLowerCase());
        const gravatar = `https://www.gravatar.com/avatar/${hash}?d=identicon`;
        setAvatarUrl(gravatar);
      }
    });

    const prefersDark = localStorage.getItem('theme') === 'dark';
    setDarkMode(prefersDark);
    if (prefersDark) document.documentElement.classList.add('dark');
  }, []);

  const toggleDarkMode = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Lexi Query:', searchInput);
    setSearchInput('');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between h-14 border-b border-gray-200 bg-white px-4 shadow-sm dark:bg-gray-900 dark:border-gray-700">
      {/* Logo */}
      <div className="flex items-center">
        <Image src="/verilex-logo-name.png" alt="VeriLex AI" width={150} height={40} priority />
      </div>

      {/* Lexi Search */}
      <form onSubmit={handleSearch} className="flex-1 mx-4 max-w-xl">
        <input
          type="text"
          placeholder="Ask Lexi a legal question..."
          className="w-full border border-gray-300 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </form>

      {/* Account Menu */}
      <Menu as="div" className="relative inline-block text-left">
        <Menu.Button className="flex items-center focus:outline-none">
          <Image
            src={avatarUrl}
            alt="User Avatar"
            width={32}
            height={32}
            className="rounded-full border border-gray-300 dark:border-gray-600"
          />
        </Menu.Button>

        <Transition
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 dark:divide-gray-700 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
            <div className="px-4 py-3">
              <p className="text-sm text-gray-700 dark:text-gray-200">Signed in as</p>
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{userEmail}</p>
            </div>
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => router.push('/settings/account')}
                    className={`${
                      active ? 'bg-gray-100 dark:bg-gray-700' : ''
                    } block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200`}
                  >
                    Account Settings
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={toggleDarkMode}
                    className={`${
                      active ? 'bg-gray-100 dark:bg-gray-700' : ''
                    } flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200`}
                  >
                    {darkMode ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
                    Toggle Dark Mode
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleSignOut}
                    className={`${
                      active ? 'bg-gray-100 dark:bg-gray-700' : ''
                    } block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400`}
                  >
                    Sign Out
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </header>
  );
}
