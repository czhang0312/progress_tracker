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
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <nav
      className="sticky top-0 z-50 border-b border-neutral-200"
      style={{ background: '#FFFFFF', boxShadow: '0 1px 0 rgba(0,0,0,.02)' }}
    >
      <div className="max-w-[1100px] mx-auto px-6 h-[60px] flex items-center gap-3.5">
        {/* Logo — signature half-filled circle mark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: '2.4px solid #2563EB',
              background: 'linear-gradient(135deg, #2563EB 50%, transparent 50%)',
              flexShrink: 0,
            }}
          />
          <span style={{ fontWeight: 600, fontSize: 15, color: '#0F172A', letterSpacing: '-0.015em' }}>
            Progress Tracker
          </span>
        </div>

        {/* Nav links — editorial tracked-caps with dot indicator */}
        <div className="flex gap-6 ml-2 flex-1">
          {links.map((link) => {
            const isActive = pathname.startsWith(link.match);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-2 py-2 transition-colors duration-150"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: isActive ? '#0F172A' : '#94A3B8',
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: isActive ? '#2563EB' : 'transparent',
                    flexShrink: 0,
                    transition: 'background 0.15s',
                  }}
                />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* User info */}
        <div className="flex items-center gap-2.5">
          {user?.email && !user?.is_guest && (
            <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }} className="hidden sm:block">
              {user.email}
            </span>
          )}
          {user?.is_guest ? (
            <Link
              href="/login"
              style={{ fontSize: 12, color: '#64748B', fontWeight: 500, padding: '6px 10px', borderRadius: 8, background: 'transparent', whiteSpace: 'nowrap' }}
              className="transition-colors duration-150 hover:bg-black/[0.04] hover:text-neutral-900"
            >
              Sign In
            </Link>
          ) : (
            <button
              onClick={handleLogout}
              style={{ fontSize: 12, color: '#64748B', fontWeight: 500, padding: '6px 10px', borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
              className="transition-colors duration-150 hover:bg-black/[0.04] hover:text-neutral-900"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
