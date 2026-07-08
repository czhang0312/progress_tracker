'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { RAILS_API_BASE } from '@/lib/config';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import NavHeader from '@/components/NavHeader';
import PageLoader from '@/components/PageLoader';
import JournalEntryModal from '@/components/JournalEntryModal';
import { T, SERIF, TRACKING, tint } from '@/lib/theme';
import { localDateString, todayLocalDateString } from '@/lib/dateUtils';
import {
  getGuestJournalEntries,
  getGuestGoals,
  getGuestMonthlyProgress,
  setGuestProgressStatus,
} from '@/lib/guestStorage';

interface JournalEntry {
  id: number;
  date: string;
  content: string;
}

interface Goal {
  id: number;
  name: string;
  description: string;
}

interface DailyProgress {
  goal_id: number;
  date: string;
  status: number;
}


const RANGE_OPTIONS = [
  { id: 'all', label: 'All time' },
  { id: 'month', label: 'This month' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'year', label: 'This year' },
  { id: 'custom', label: 'Custom…' },
] as const;

type RangeId = (typeof RANGE_OPTIONS)[number]['id'];

// ─── Search highlighting ──────────────────────────────────────────────────────
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) return <>{text}</>;
  const re = new RegExp(`(${escapeRegex(query.trim())})`, 'gi');
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        re.test(part) ? (
          <mark
            key={i}
            style={{ background: tint(T.accent, 20), color: T.ink, padding: '0 2px', borderRadius: 2 }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── Diary entry card — calendar-tear-off date + serif body ───────────────────
function JournalEntryCard({
  entry,
  query,
  isToday,
  onOpen,
}: {
  entry: JournalEntry;
  query: string;
  isToday: boolean;
  onOpen: () => void;
}) {
  const [y, m, d] = entry.date.split('-').map(Number);
  const jsDate = new Date(y, m - 1, d);
  const dayName = jsDate.toLocaleDateString('en-US', { weekday: 'long' });
  const shortMonth = jsDate.toLocaleDateString('en-US', { month: 'short' });

  return (
    <article
      onClick={onOpen}
      style={{
        display: 'grid',
        gridTemplateColumns: '88px minmax(0,1fr)',
        gap: 28,
        padding: '22px 26px 24px',
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
        transition: 'border-color .15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = tint(T.accent, 53);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = T.border;
      }}
    >
      {/* Date column — calendar-tear-off feel */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 4,
          borderRight: `1px solid ${T.border}`,
          paddingRight: 24,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: T.muted,
            textTransform: 'uppercase',
            letterSpacing: TRACKING,
          }}
        >
          {shortMonth}
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 44,
            fontWeight: 500,
            lineHeight: 1,
            color: isToday ? T.accent : T.ink,
            letterSpacing: '-.02em',
          }}
        >
          {d}
        </div>
        <div style={{ fontSize: 11, color: T.muted, fontWeight: 500, marginTop: 2 }}>{dayName}</div>
        {isToday && (
          <span
            style={{
              marginTop: 6,
              fontSize: 11,
              fontWeight: 600,
              color: T.accent,
              letterSpacing: TRACKING,
              textTransform: 'uppercase',
            }}
          >
            Today
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 17,
            lineHeight: 1.7,
            color: T.ink,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            letterSpacing: '-.003em',
          }}
        >
          <HighlightedText text={entry.content} query={query} />
        </div>
      </div>
    </article>
  );
}

export default function JournalEntriesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [journal, setJournal] = useState<Record<string, JournalEntry>>({});
  const [goals, setGoals] = useState<Goal[]>([]);
  const [progress, setProgress] = useState<Record<string, DailyProgress>>({});
  const loadedMonths = useRef<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [range, setRange] = useState<RangeId>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const [modalDate, setModalDate] = useState<string | null>(null);

  const todayDate = todayLocalDateString();

  // ── Initial load: journal entries + goals ───────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    const load = async () => {
      if (user?.is_guest) {
        const entries = getGuestJournalEntries();
        const record: Record<string, JournalEntry> = {};
        entries.forEach((e) => { record[e.date] = e; });
        if (!cancelled) {
          setJournal(record);
          setGoals(getGuestGoals());
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const [entriesRes, goalsRes] = await Promise.all([
          fetch(`${RAILS_API_BASE}/journal_entries`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
          }),
          fetch(`${RAILS_API_BASE}/goals`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
          }),
        ]);
        if (!entriesRes.ok) throw new Error('Failed to fetch journal entries');
        const entries: JournalEntry[] = await entriesRes.json();
        const record: Record<string, JournalEntry> = {};
        entries.forEach((e) => { record[e.date] = e; });
        const goalsData: Goal[] = goalsRes.ok ? await goalsRes.json() : [];
        if (!cancelled) {
          setJournal(record);
          setGoals(goalsData);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [authLoading, user]);

  // ── Lazily load a month's progress so the modal can show goal pills ──────────
  const ensureMonthProgress = useCallback(async (year: number, month: number) => {
    const key = `${year}-${month}`;
    if (loadedMonths.current.has(key)) return;
    loadedMonths.current.add(key);

    if (user?.is_guest) {
      const data = getGuestMonthlyProgress(year, month);
      setProgress((prev) => ({ ...prev, ...data.daily_progresses }));
      return;
    }

    try {
      const res = await fetch(`${RAILS_API_BASE}/progress/${year}/${month}.json`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return;
      const data = await res.json();
      setProgress((prev) => ({ ...prev, ...data.daily_progresses }));
    } catch (err) {
      console.error('Failed to load month progress:', err);
    }
  }, [user]);

  const openEntry = useCallback(async (date: string) => {
    const [y, m] = date.split('-').map(Number);
    await ensureMonthProgress(y, m);
    setModalDate(date);
  }, [ensureMonthProgress]);

  // ── Update a goal's progress status (from inside the modal) ──────────────────
  const updateProgress = useCallback(async (goalId: number, date: string, currentStatus: number) => {
    const newStatus = (currentStatus + 1) % 3;
    const [year, month] = date.split('-').map(Number);
    const key = `${goalId}-${date}`;

    if (user?.is_guest) {
      setGuestProgressStatus(goalId, date, newStatus);
      setProgress((prev) => ({ ...prev, [key]: { goal_id: goalId, date, status: newStatus } }));
      return;
    }

    try {
      const res = await fetch(`${RAILS_API_BASE}/progress/${year}/${month}/${goalId}/${date}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          const body = await res.json().catch(() => null);
          if (body?.code === 'AUTH_REQUIRED') {
            router.push('/login');
            return;
          }
        }
        throw new Error('Failed to update progress');
      }
      setProgress((prev) => ({ ...prev, [key]: { goal_id: goalId, date, status: newStatus } }));
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  }, [user, router]);

  // ⌘K / ⌃K focuses search
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // All entries, newest first
  const allEntries = useMemo(
    () => Object.values(journal).sort((a, b) => b.date.localeCompare(a.date)),
    [journal]
  );

  const inRange = useCallback((dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const [ty, tm, td] = todayDate.split('-').map(Number);
    const today = new Date(ty, tm - 1, td);
    if (range === 'all') return true;
    if (range === 'year') return y === ty;
    if (range === 'month') return y === ty && m === tm;
    if (range === '30d') {
      const cutoff = new Date(today);
      cutoff.setDate(cutoff.getDate() - 30);
      return dt >= cutoff && dt <= today;
    }
    if (range === 'custom') {
      if (customFrom && dateStr < customFrom) return false;
      if (customTo && dateStr > customTo) return false;
      return true;
    }
    return true;
  }, [range, customFrom, customTo, todayDate]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allEntries.filter((e) => inRange(e.date) && (!q || e.content.toLowerCase().includes(q)));
  }, [allEntries, search, inRange]);

  // Group by month for the spine label
  const groupedByMonth = useMemo(() => {
    const groups: { key: string; label: string; entries: JournalEntry[] }[] = [];
    let cur: { key: string; label: string; entries: JournalEntry[] } | null = null;
    filtered.forEach((e) => {
      const [y, m] = e.date.split('-').map(Number);
      const key = `${y}-${m}`;
      if (!cur || cur.key !== key) {
        cur = {
          key,
          label: new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          entries: [],
        };
        groups.push(cur);
      }
      cur.entries.push(e);
    });
    return groups;
  }, [filtered]);

  const clearAll = () => {
    setSearch('');
    setRange('all');
    setCustomFrom('');
    setCustomTo('');
  };
  const hasFilters = !!search || range !== 'all';

  if (loading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 bg-danger-tint rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-danger text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-danger mb-2">Something went wrong</h1>
          <p className="text-neutral-600 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <NavHeader />

      {modalDate && (
        <JournalEntryModal
          date={modalDate}
          goals={goals}
          progress={progress}
          journal={journal}
          year={Number(modalDate.split('-')[0])}
          month={Number(modalDate.split('-')[1])}
          onClose={() => setModalDate(null)}
          onProgressUpdate={updateProgress}
          onJournalChange={(date, entry) => {
            setJournal((prev) => {
              if (!entry) {
                const next = { ...prev };
                delete next[date];
                return next;
              }
              return { ...prev, [date]: entry };
            });
          }}
          onNavigate={(delta) => {
            const current = new Date(modalDate + 'T00:00:00');
            current.setDate(current.getDate() + delta);
            const newDate = localDateString(current);
            if (newDate <= todayDate) {
              const [y, m] = newDate.split('-').map(Number);
              ensureMonthProgress(y, m);
              setModalDate(newDate);
            }
          }}
        />
      )}

      <div className="animate-fade-in" style={{ minHeight: 'calc(100vh - 60px)', background: T.bg }}>
        <div
          className="journal-layout-grid"
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '32px clamp(16px,5vw,24px) 80px',
          }}
        >
          {/* ── Diary (left, wider) ── */}
          <div style={{ minWidth: 0 }}>
            {/* Page title */}
            <div style={{ marginBottom: 36, paddingLeft: 4 }}>
              <h1 className="page-title">Journal</h1>
            </div>

            {/* Result count when filtering */}
            {hasFilters && (
              <div
                style={{
                  marginBottom: 20,
                  padding: '10px 14px',
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 'var(--radius)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 13,
                }}
              >
                <span style={{ color: T.muted }}>
                  <span style={{ fontWeight: 600, color: T.ink }}>{filtered.length}</span>{' '}
                  {filtered.length === 1 ? 'entry' : 'entries'}
                  {search && (
                    <span>
                      {' '}matching{' '}
                      <span
                        style={{
                          color: T.ink,
                          fontFamily: 'monospace',
                          background: T.well,
                          padding: '1px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {search}
                      </span>
                    </span>
                  )}
                </span>
                <button
                  onClick={clearAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: T.muted,
                    fontSize: 12,
                    fontFamily: 'inherit',
                    fontWeight: 500,
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = T.accent)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = T.muted)}
                >
                  Clear filters ×
                </button>
              </div>
            )}

            {/* Empty state */}
            {filtered.length === 0 && (
              <div style={{ padding: '72px 0', textAlign: 'center' }}>
                <div
                  style={{
                    fontFamily: SERIF,
                    fontSize: 22,
                    fontWeight: 400,
                    color: T.muted,
                    fontStyle: 'italic',
                    marginBottom: 12,
                  }}
                >
                  {allEntries.length === 0 ? 'A blank page.' : 'No entries found.'}
                </div>
                {hasFilters && (
                  <button
                    onClick={clearAll}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 13,
                      color: T.muted,
                      textDecoration: 'underline',
                      textDecorationColor: T.border,
                      textUnderlineOffset: 3,
                      padding: 0,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = T.ink)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = T.muted)}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* Diary entries — month-grouped */}
            <div>
              {groupedByMonth.map((group, gi) => (
                <div key={group.key} style={{ marginBottom: gi === groupedByMonth.length - 1 ? 0 : 32 }}>
                  {/* Month spine label */}
                  <div
                    style={{
                      position: 'sticky',
                      top: 60,
                      zIndex: 5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '8px 0 16px',
                      background: `linear-gradient(${T.bg} 70%, transparent)`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: SERIF,
                        fontSize: 14,
                        fontWeight: 500,
                        color: T.muted,
                        fontStyle: 'italic',
                        letterSpacing: '.01em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {group.label}
                    </span>
                    <span style={{ flex: 1, height: 1, background: T.border }} />
                    <span
                      style={{
                        fontSize: 11,
                        color: T.faint,
                        fontWeight: 500,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {group.entries.length}
                    </span>
                  </div>

                  {/* Entries in this month */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {group.entries.map((entry) => (
                      <JournalEntryCard
                        key={entry.id}
                        entry={entry}
                        query={search}
                        isToday={entry.date === todayDate}
                        onOpen={() => openEntry(entry.date)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Sidebar (right) ── */}
          <aside
            style={{
              position: 'sticky',
              top: 80,
              alignSelf: 'start',
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
            }}
          >
            {/* Search */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  color: T.muted,
                  textTransform: 'uppercase',
                  letterSpacing: TRACKING,
                  marginBottom: 8,
                }}
              >
                Search entries
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: T.faint,
                    fontSize: 14,
                    pointerEvents: 'none',
                  }}
                >
                  ⌕
                </span>
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="What are you looking for?"
                  style={{
                    width: '100%',
                    font: 'inherit',
                    fontSize: 13,
                    padding: '9px 32px 9px 32px',
                    background: T.surface,
                    color: T.ink,
                    border: `1px solid ${T.border}`,
                    borderRadius: 'var(--radius)',
                    outline: 'none',
                    transition: 'border-color .12s, box-shadow .12s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = T.accent;
                    e.target.style.boxShadow = `0 0 0 3px ${T.accent}22`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = T.border;
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {search ? (
                  <button
                    onClick={() => {
                      setSearch('');
                      searchRef.current?.focus();
                    }}
                    aria-label="Clear search"
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 22,
                      height: 22,
                      border: 'none',
                      background: T.well,
                      color: T.muted,
                      cursor: 'pointer',
                      fontSize: 13,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                    }}
                  >
                    ×
                  </button>
                ) : (
                  <kbd
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontFamily: 'inherit',
                      fontSize: 10,
                      padding: '1px 5px',
                      border: `1px solid ${T.border}`,
                      borderRadius: 4,
                      color: T.faint,
                      background: T.well,
                      pointerEvents: 'none',
                    }}
                  >
                    ⌘K
                  </kbd>
                )}
              </div>
            </div>

            {/* Date range */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  color: T.muted,
                  textTransform: 'uppercase',
                  letterSpacing: TRACKING,
                  marginBottom: 8,
                }}
              >
                Date range
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setRange(opt.id)}
                    style={{
                      textAlign: 'left',
                      padding: '7px 10px',
                      background: range === opt.id ? tint(T.accent, 8) : 'transparent',
                      color: range === opt.id ? T.accent : T.ink,
                      border: 'none',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 13,
                      fontWeight: range === opt.id ? 600 : 500,
                      transition: 'background .12s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    onMouseEnter={(e) => {
                      if (range !== opt.id) e.currentTarget.style.background = T.well;
                    }}
                    onMouseLeave={(e) => {
                      if (range !== opt.id) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span>{opt.label}</span>
                    {range === opt.id && <span style={{ fontSize: 11 }}>✓</span>}
                  </button>
                ))}
              </div>

              {range === 'custom' && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 'var(--radius)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: T.muted,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: TRACKING,
                      }}
                    >
                      From
                    </span>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      style={{
                        font: 'inherit',
                        fontSize: 12,
                        padding: '5px 8px',
                        background: T.surface,
                        color: T.ink,
                        border: `1px solid ${T.border}`,
                        borderRadius: 'var(--radius)',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: T.muted,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: TRACKING,
                      }}
                    >
                      To
                    </span>
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      style={{
                        font: 'inherit',
                        fontSize: 12,
                        padding: '5px 8px',
                        background: T.surface,
                        color: T.ink,
                        border: `1px solid ${T.border}`,
                        borderRadius: 'var(--radius)',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
