'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function TopMenu() {
  const [searchInput, setSearchInput] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();

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
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between h-14 border-b border-gray-200 bg-white px-4 shadow-sm">
      {/* Left: Logo */}
      <div className="flex items-center">
        <Image
          src="/verilex-logo-name.png"
          alt="VeriLex AI"
          width={150}
          height={40}
          priority
        />
      </div>

      {/* Center: Lexi Search */}
      <form onSubmit={handleSearch} className="flex-1 mx-4 max-w-xl">
        <input
          type="text"
          placeholder="Ask Lexi a legal question..."
          className="w-full border border-gray-300 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </form>

      {/* Right: Avatar Dropdown */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="focus:outline-none"
        >
          <Image
            src="/placeholder-avatar.png"
            alt="User Avatar"
            width={32}
            height={32}
            className="rounded-full border border-gray-300"
          />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-md shadow-lg py-2 w-44">
            <button
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              onClick={() => {
                setDropdownOpen(false);
                router.push('/settings/account');
              }}
            >
              Account Settings
            </button>
            <button
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              onClick={() => {
                setDropdownOpen(false);
                handleSignOut();
              }}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
