'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { RAILS_API_BASE } from '@/lib/config';
import { todayLocalDateString } from '@/lib/dateUtils';
import {
  createGuestJournalEntry,
  updateGuestJournalEntry,
  deleteGuestJournalEntry,
} from '@/lib/guestStorage';

// ─── Palette ────────────────────────────────────────────────────────────────
const T = {
  cardBg: '#ffffff',
  cardBorder: '#E2E8F0',
  tableHead: '#F8FAFC',
  text: '#0F172A',
  textMuted: '#64748B',
  textFaint: '#94A3B8',
  primary: '#2563EB',
  btnPrimary: '#0F172A',
  circFull: '#10B981',
} as const;

const PROMPTS = ["What went well?", "What's on my mind?", "One small win", "Tomorrow I will…"] as const;

// ─── Types ───────────────────────────────────────────────────────────────────
interface Goal { id: number; name: string; description: string; }
interface DailyProgress { goal_id: number; date: string; status: number; }
interface JournalEntry { id: number; date: string; content: string; }

interface Props {
  date: string;
  goals: Goal[];
  progress: Record<string, DailyProgress>;
  journal: Record<string, JournalEntry>;
  year: number;
  month: number;
  onClose: () => void;
  onProgressUpdate: (goalId: number, date: string, currentStatus: number) => void;
  onJournalChange: (date: string, entry: JournalEntry | null) => void;
  onNavigate: (delta: number) => void;
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function StatusDot({ status, c }: { status: number; c: string }) {
  const base: React.CSSProperties = {
    width: 16, height: 16, borderRadius: '50%',
    border: `1.5px solid ${c}`, flexShrink: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };
  if (status === 2) return (
    <span style={{ ...base, background: c }}>
      <span style={{ color: '#fff', fontSize: 9, fontWeight: 800, lineHeight: 1, userSelect: 'none' }}>✓</span>
    </span>
  );
  if (status === 1) return (
    <span style={{ ...base, background: `linear-gradient(45deg, ${c} 50%, transparent 50%)` }} />
  );
  return <span style={{ ...base, background: 'transparent' }} />;
}

function NavBtn({
  label, onClick, disabled, fontSize,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  fontSize?: number;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 30, height: 30, borderRadius: 7,
        border: 'none',
        background: hov && !disabled ? T.tableHead : 'transparent',
        color: disabled ? T.textFaint : T.textMuted,
        fontSize: fontSize ?? 17,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'inherit',
        transition: 'background .15s, color .15s',
        opacity: disabled ? 0.4 : 1,
        lineHeight: 1,
      }}
    >
      {label}
    </button>
  );
}

function GoalPill({
  goal, status, c, onClick,
}: {
  goal: Goal; status: number; c: string; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);

  let bg: string, border: string, color: string;
  if (status === 2) { bg = c + '14'; border = c + '55'; color = c; }
  else if (status === 1) { bg = c + '0a'; border = c + '33'; color = T.text; }
  else { bg = T.tableHead; border = T.cardBorder; color = T.textMuted; }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={[goal.name, goal.description, 'Click to cycle'].filter(Boolean).join('\n')}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 10px 5px 6px',
        borderRadius: 99,
        fontSize: 12, fontWeight: 500,
        background: bg,
        border: `1px solid ${hov ? c : border}`,
        color,
        cursor: 'pointer',
        userSelect: 'none',
        fontFamily: 'inherit',
        transition: 'all .15s',
        transform: hov ? 'translateY(-1px)' : 'none',
      }}
    >
      <StatusDot status={status} c={c} />
      {goal.name}
    </button>
  );
}

function PromptChip({ label, onClick }: { label: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', padding: '4px 10px', borderRadius: 99,
        fontSize: 12, fontWeight: 500, cursor: 'pointer',
        border: `1px solid ${hov ? T.primary : T.cardBorder}`,
        color: hov ? T.primary : T.textMuted,
        background: 'transparent', fontFamily: 'inherit',
        transition: 'all .15s',
      }}
    >
      {label}
    </button>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Delete entry"
      title="Delete entry"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: 4, borderRadius: 6, background: 'transparent', border: 'none',
        color: hov ? '#DC2626' : T.textFaint,
        cursor: 'pointer',
        transition: 'color .12s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" />
        <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      </svg>
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function JournalEntryModal({
  date,
  goals,
  progress,
  journal,
  onClose,
  onProgressUpdate,
  onJournalChange,
  onNavigate,
}: Props) {
  const { user } = useAuth();
  const today = todayLocalDateString();
  const isFuture = date > today;
  const isToday = date === today;

  const dateObj = new Date(`${date}T00:00:00`);
  const monthName = dateObj.toLocaleDateString('en-US', { month: 'long' });
  const dayNum = dateObj.getDate();
  const weekdayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

  const [draft, setDraft] = useState(() => journal[date]?.content ?? '');
  const draftRef = useRef(draft);
  const savingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevDateRef = useRef(date);

  // Keep ref in sync for use in callbacks
  useEffect(() => { draftRef.current = draft; }, [draft]);

  // Reset draft when date navigates
  useEffect(() => {
    if (prevDateRef.current !== date) {
      prevDateRef.current = date;
      const content = journal[date]?.content ?? '';
      setDraft(content);
      draftRef.current = content;
    }
  }, [date, journal]);

  // Autofocus on mount and on navigation
  useEffect(() => {
    if (!isFuture) textareaRef.current?.focus();
  }, [date, isFuture]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  // ── Save logic ──────────────────────────────────────────────────────────────
  const saveJournal = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    const content = draftRef.current.trim();
    const existing = journal[date];

    try {
      if (user?.is_guest) {
        if (existing) {
          if (content === '') {
            deleteGuestJournalEntry(existing.id);
            onJournalChange(date, null);
          } else if (content !== existing.content) {
            updateGuestJournalEntry(existing.id, { date, content });
            onJournalChange(date, { ...existing, content });
          }
        } else if (content !== '') {
          const created = createGuestJournalEntry({ date, content });
          onJournalChange(date, created);
        }
        return;
      }

      if (existing) {
        if (content === '') {
          await fetch(`${RAILS_API_BASE}/journal_entries/${existing.id}`, {
            method: 'DELETE', credentials: 'include',
            headers: { Accept: 'application/json' },
          });
          onJournalChange(date, null);
        } else if (content !== existing.content) {
          await fetch(`${RAILS_API_BASE}/journal_entries/${existing.id}`, {
            method: 'PATCH', credentials: 'include',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ content }),
          });
          onJournalChange(date, { ...existing, content });
        }
      } else if (content !== '') {
        const res = await fetch(`${RAILS_API_BASE}/journal_entries`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ date, content }),
        });
        const created = await res.json();
        onJournalChange(date, created);
      }
    } catch (err) {
      console.error('Failed to save journal entry:', err);
    } finally {
      savingRef.current = false;
    }
  }, [date, journal, user, onJournalChange]);

  const handleClose = useCallback(async () => {
    await saveJournal();
    onClose();
  }, [saveJournal, onClose]);

  const handleNavigate = useCallback(async (delta: number) => {
    await saveJournal();
    onNavigate(delta);
  }, [saveJournal, onNavigate]);

  const handleDelete = useCallback(async () => {
    const existing = journal[date];
    if (!existing) { onClose(); return; }
    if (!window.confirm('Delete this journal entry?')) return;

    if (user?.is_guest) {
      deleteGuestJournalEntry(existing.id);
      onJournalChange(date, null);
      setDraft('');
      return;
    }
    try {
      await fetch(`${RAILS_API_BASE}/journal_entries/${existing.id}`, {
        method: 'DELETE', credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      onJournalChange(date, null);
      setDraft('');
    } catch (err) {
      console.error('Failed to delete journal entry:', err);
    }
  }, [date, journal, user, onJournalChange, onClose]);

  // ── Keyboard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { handleClose(); return; }
      if (document.activeElement === textareaRef.current) return;
      if (e.key === 'ArrowLeft') handleNavigate(-1);
      if (e.key === 'ArrowRight' && !isToday && !isFuture) handleNavigate(1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleClose, handleNavigate, isToday, isFuture]);

  const existingEntry = journal[date] ?? null;
  const c = T.circFull;

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,.55)',
        backdropFilter: 'blur(12px) saturate(110%)',
        WebkitBackdropFilter: 'blur(12px) saturate(110%)',
        zIndex: 200,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '5vh 24px 24px',
        overflowY: 'auto',
        animation: 'backdropIn .2s ease-out',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 720,
          borderRadius: 18,
          background: T.cardBg, border: `1px solid ${T.cardBorder}`,
          boxShadow: '0 40px 100px -20px rgba(0,0,0,.45), 0 12px 30px -10px rgba(0,0,0,.18)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'focusIn .32s cubic-bezier(.16,1,.3,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Section 1: Chrome ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: `1px solid ${T.cardBorder}`,
        }}>
          <div style={{ display: 'flex', gap: 2 }}>
            <NavBtn label="‹" onClick={() => handleNavigate(-1)} />
            <NavBtn label="›" onClick={() => handleNavigate(1)} disabled={isToday || isFuture} />
          </div>
          <NavBtn label="×" onClick={handleClose} fontSize={19} />
        </div>

        {/* ── Section 2: Date headline ── */}
        <div style={{ padding: '36px 56px 22px', textAlign: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, marginBottom: 10,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 600, color: T.textMuted,
              letterSpacing: '0.18em', textTransform: 'uppercase',
            }}>
              {weekdayName}
            </span>
            {(isToday || isFuture) && (
              <>
                <span style={{
                  width: 3, height: 3, borderRadius: '50%',
                  background: T.textFaint, display: 'inline-block', flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: isToday ? T.primary : T.textMuted,
                }}>
                  {isToday ? 'Today' : 'Upcoming'}
                </span>
              </>
            )}
          </div>
          <h1 style={{
            fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif",
            fontSize: 48, fontWeight: 500, color: T.text,
            lineHeight: 1.05, letterSpacing: '-0.02em', margin: 0,
          }}>
            {monthName}{' '}
            <span style={{ fontStyle: 'italic', fontWeight: 400 }}>{dayNum}</span>
          </h1>
        </div>

        {/* ── Section 3: Goal pills ── */}
        {goals.length > 0 && !isFuture && (
          <div style={{
            padding: '0 32px 18px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
              {goals.map(goal => {
                const status = progress[`${goal.id}-${date}`]?.status ?? 0;
                return (
                  <GoalPill
                    key={goal.id}
                    goal={goal}
                    status={status}
                    c={c}
                    onClick={() => onProgressUpdate(goal.id, date, status)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ── Section 4: Journal divider ── */}
        <div style={{ position: 'relative', padding: '0 56px', marginBottom: 18 }}>
          <div style={{ height: 1, background: T.cardBorder }} />
          <span style={{
            position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)',
            background: T.cardBg, padding: '0 14px',
            fontSize: 10, fontWeight: 600, color: T.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.16em', whiteSpace: 'nowrap',
          }}>
            Journal
          </span>
        </div>

        {/* ── Section 5: Textarea ── */}
        <div style={{ padding: '0 56px 28px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <textarea
            ref={textareaRef}
            className="journal-hero-textarea"
            placeholder={isFuture ? 'A future day. Come back to write about it.' : "What's on your mind?"}
            disabled={isFuture}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            style={{
              width: '100%', border: 'none', outline: 'none', resize: 'none',
              background: 'transparent', padding: 0,
              fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif",
              fontSize: 18, lineHeight: 1.6, letterSpacing: '-0.005em',
              color: T.text, minHeight: 200, overflow: 'hidden',
              caretColor: T.primary,
              fontStyle: 'normal',
              opacity: isFuture ? 0.5 : 1,
            }}
          />
          {!draft && !isFuture && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: T.textFaint, fontWeight: 500, marginRight: 4, alignSelf: 'center' }}>
                Try:
              </span>
              {PROMPTS.map(p => (
                <PromptChip
                  key={p}
                  label={p}
                  onClick={() => {
                    setDraft(p + '\n');
                    textareaRef.current?.focus();
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Section 6: Footer ── */}
        <div style={{
          padding: '12px 22px', borderTop: `1px solid ${T.cardBorder}`,
          background: T.tableHead,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ minWidth: 28 }}>
            {existingEntry && <DeleteBtn onClick={handleDelete} />}
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: T.primary, color: '#fff',
              padding: '7px 18px', fontSize: 13, fontWeight: 500,
              borderRadius: 8, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', letterSpacing: '-0.01em',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
