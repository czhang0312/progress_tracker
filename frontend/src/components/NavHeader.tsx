'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { downloadExport } from '@/lib/dataTransfer';
import ImportModal from '@/components/ImportModal';
import { LogoMark } from '@/components/ProgressCircle';
import { T, TRACKING } from '@/lib/theme';

export default function NavHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const links = [
    { href: `/progress/${year}/${month}`, label: 'Progress', match: '/progress' },
    { href: '/journal-entries', label: 'Journal', match: '/journal-entries' },
    { href: '/pomodoro', label: 'Pomodoro', match: '/pomodoro' },
  ];

  // Close the menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.push('/login');
  };

  const handleExport = async () => {
    setMenuOpen(false);
    setExporting(true);
    try {
      await downloadExport(user);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const accountLabel = user?.is_guest ? 'Guest' : (user?.email ?? 'Account');

  const itemStyle: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'left',
    padding: '8px 12px', fontSize: 13, color: T.ink,
    background: 'transparent', border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', borderRadius: 'var(--radius)', whiteSpace: 'nowrap',
  };

  return (
    <nav
      className="sticky top-0 z-50 border-b border-edge"
      style={{ background: T.surface }}
    >
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-[60px] flex items-center gap-3.5">
        {/* Logo — signature half-filled circle mark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <LogoMark size={22} />
          <span className="hidden min-[500px]:inline" style={{ fontWeight: 600, fontSize: 15, color: T.ink, letterSpacing: '-0.015em' }}>
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
                  letterSpacing: TRACKING,
                  textTransform: 'uppercase',
                  color: isActive ? T.ink : T.faint,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: isActive ? T.accent : 'transparent',
                    flexShrink: 0,
                    transition: 'background 0.15s',
                  }}
                />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Account menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-1.5 transition-colors duration-150 hover:bg-black/[0.04]"
            style={{
              fontSize: 12, color: T.muted, fontWeight: 500,
              padding: '6px 8px', borderRadius: 'var(--radius)', background: 'transparent',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              maxWidth: 200,
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {accountLabel}
            </span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-1.5 bg-surface border border-edge rounded overflow-hidden"
              style={{ minWidth: 180, padding: 4, boxShadow: 'var(--shadow-overlay)', zIndex: 60 }}
            >
              <button
                role="menuitem"
                onClick={handleExport}
                disabled={exporting}
                style={itemStyle}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--well)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {exporting ? 'Exporting…' : 'Export data'}
              </button>
              <button
                role="menuitem"
                onClick={() => { setMenuOpen(false); setImportOpen(true); }}
                style={itemStyle}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--well)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Import data
              </button>

              <div style={{ height: 1, background: T.well, margin: '4px 0' }} />

              {user?.is_guest ? (
                <Link
                  role="menuitem"
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  style={itemStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--well)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  Sign in
                </Link>
              ) : (
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  style={itemStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--well)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  Sign out
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {importOpen && <ImportModal user={user} onClose={() => setImportOpen(false)} />}
    </nav>
  );
}
