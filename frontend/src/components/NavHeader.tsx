'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function NavHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const links = [
    { href: `/progress/${year}/${month}`, label: 'Progress', match: '/progress' },
    { href: '/journal-entries', label: 'Journal', match: '/journal-entries' },
    { href: '/stats', label: 'Stats', match: '/stats' },
  ];

  const handleCheckin = () => {
    localStorage.removeItem('last_checkin_date');
    if (pathname.startsWith('/progress')) {
      window.dispatchEvent(new Event('checkin-reset'));
    } else {
      router.push(`/progress/${year}/${month}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <nav
      className="sticky top-0 z-50 border-b border-neutral-200"
      style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}
    >
      <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center gap-2">
        {/* Logo */}
        <div
          className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-gradient-to-r from-primary-600 to-primary-700"
        >
          <span className="text-white text-sm font-extrabold">PT</span>
        </div>

        <span className="font-bold text-[15px] text-neutral-800 ml-1 mr-4 shrink-0">
          Progress Tracker
        </span>

        {/* Nav links */}
        <div className="flex gap-0.5 flex-1">
          {links.map((link) => {
            const isActive = pathname.startsWith(link.match);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Check in button */}
        <button
          onClick={handleCheckin}
          className="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 bg-secondary-50 text-secondary-700 hover:bg-secondary-100 border border-secondary-200 shrink-0"
        >
          Check in
        </button>

        {/* User info */}
        <div className="flex items-center gap-3">
          {user?.email && !user?.is_guest && (
            <span className="text-sm text-neutral-500 font-medium hidden sm:block">
              {user.email}
            </span>
          )}
          {user?.is_guest ? (
            <Link
              href="/login"
              className="border-2 border-neutral-300 text-neutral-600 hover:bg-neutral-100 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200"
            >
              Sign In
            </Link>
          ) : (
            <button
              onClick={handleLogout}
              className="border-2 border-neutral-300 text-neutral-600 hover:bg-neutral-100 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
