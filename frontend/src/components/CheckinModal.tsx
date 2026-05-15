'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { RAILS_API_BASE } from '@/lib/config';
import {
  setGuestProgressStatus,
  createGuestJournalEntry,
  updateGuestJournalEntry,
} from '@/lib/guestStorage';

interface Goal {
  id: number;
  name: string;
  description: string;
  position: number;
}

interface DailyProgress {
  goal_id: number;
  date: string;
  status: number;
}

interface JournalEntry {
  id: number;
  date: string;
  content: string;
}

interface CheckinModalProps {
  goals: Goal[];
  dailyProgresses: Record<string, DailyProgress>;
  journalEntries: Record<string, JournalEntry>;
  today: string;
  year: number;
  month: number;
  onClose: (updates: {
    progressUpdates: Record<string, DailyProgress>;
    journalUpdate: JournalEntry | null;
  }) => void;
}

const PROMPTS = [
  "What went well?",
  "How are you feeling?",
  "What's on your mind?",
  "One small win",
  "Tomorrow I will…",
];

export default function CheckinModal({
  goals,
  dailyProgresses,
  journalEntries,
  today,
  year,
  month,
  onClose,
}: CheckinModalProps) {
  const { user } = useAuth();
  const [localProgress, setLocalProgress] = useState<Record<string, DailyProgress>>(dailyProgresses);
  const [journalText, setJournalText] = useState(journalEntries[today]?.content ?? '');
  const [step, setStep] = useState<'checkin' | 'done'>('checkin');
  const initialJournalContent = useRef(journalEntries[today]?.content ?? '');

  const hour = new Date().getHours();
  const greeting =
    hour < 5  ? 'Still up' :
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
    'Good evening';

  const niceDate = new Date(`${today}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const userName = user?.email
    ? user.email.split('@')[0].split('.')[0].replace(/^./, c => c.toUpperCase())
    : 'there';

  const todayDay = parseInt(today.split('-')[2]);
  const yearMonth = today.substring(0, 7);

  let streak = 0;
  for (let d = todayDay - 1; d >= 1; d--) {
    const ds = `${yearMonth}-${String(d).padStart(2, '0')}`;
    const any = goals.some(g => (localProgress[`${g.id}-${ds}`]?.status ?? 0) >= 1);
    if (any) streak++;
    else break;
  }

  const yesterdayStr = todayDay > 1
    ? `${yearMonth}-${String(todayDay - 1).padStart(2, '0')}`
    : null;
  const yesterdayDone = yesterdayStr
    ? goals.filter(g => (localProgress[`${g.id}-${yesterdayStr}`]?.status ?? 0) === 2).length
    : 0;

  const todayDone = goals.filter(g => (localProgress[`${g.id}-${today}`]?.status ?? 0) === 2).length;
  const todayHalf = goals.filter(g => (localProgress[`${g.id}-${today}`]?.status ?? 0) === 1).length;
  const totalProgress = goals.length ? (todayDone + todayHalf * 0.5) / goals.length : 0;

  const getStatus = (goalId: number) => localProgress[`${goalId}-${today}`]?.status ?? 0;

  const cycleStatus = async (goalId: number) => {
    const key = `${goalId}-${today}`;
    const cur = getStatus(goalId);
    const next = (cur + 1) % 3;

    setLocalProgress(p => ({
      ...p,
      [key]: { goal_id: goalId, date: today, status: next },
    }));

    if (user?.is_guest) {
      setGuestProgressStatus(goalId, today, next);
      return;
    }

    try {
      await fetch(`${RAILS_API_BASE}/progress/${year}/${month}/${goalId}/${today}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ status: next }),
      });
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  const handleSave = async () => {
    const content = journalText.trim();
    const existing = journalEntries[today];

    if (content && content !== initialJournalContent.current.trim()) {
      if (user?.is_guest) {
        if (existing) {
          updateGuestJournalEntry(existing.id, { date: today, content });
        } else {
          createGuestJournalEntry({ date: today, content });
        }
      } else {
        try {
          if (existing) {
            await fetch(`${RAILS_API_BASE}/journal_entries/${existing.id}`, {
              method: 'PATCH',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({ content }),
            });
          } else {
            await fetch(`${RAILS_API_BASE}/journal_entries`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({ date: today, content }),
            });
          }
        } catch (err) {
          console.error('Failed to save journal:', err);
        }
      }
    }

    localStorage.setItem('last_checkin_date', today);
    setStep('done');
    const journalUpdate: JournalEntry | null = content
      ? { id: existing?.id ?? -1, date: today, content }
      : null;
    setTimeout(() => onClose({ progressUpdates: localProgress, journalUpdate }), 1200);
  };

  const handleSkip = () => {
    localStorage.setItem('last_checkin_date', today);
    onClose({ progressUpdates: localProgress, journalUpdate: null });
  };

  const insertPrompt = (p: string) => {
    setJournalText(t => (t ? t : `${p}\n`));
  };

  if (step === 'done') {
    return (
      <div className="checkin-backdrop">
        <div className="checkin-sheet checkin-sheet-done">
          <div className="checkin-done-icon">✨</div>
          <h2 className="checkin-done-title">You&apos;re checked in.</h2>
          <p className="checkin-done-sub">
            Have a great {hour < 17 ? 'day' : 'evening'}, {userName}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="checkin-backdrop" onClick={handleSkip}>
      <div className="checkin-sheet" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="checkin-header">
          <div className="checkin-label">Daily check-in · {niceDate}</div>
          <h1 className="checkin-greeting">
            {greeting},{' '}
            <span>{userName}</span>.
          </h1>
          <p className="checkin-subtext">
            {streak >= 2 ? (
              <>You&apos;ve shown up{' '}
                <strong className="text-neutral-900">{streak} days in a row</strong>
                {' '}— let&apos;s keep it going.</>
            ) : yesterdayDone > 0 ? (
              <>Yesterday you hit{' '}
                <strong className="text-neutral-900">{yesterdayDone} of {goals.length}</strong>.
                {' '}A fresh page today.</>
            ) : (
              'A quiet moment to set the tone for the day.'
            )}
          </p>
          <button className="checkin-close" onClick={handleSkip} aria-label="Skip check-in">
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="checkin-body">
          {/* Goals */}
          <div className="checkin-section-goals">
            <div className="checkin-section-row">
              <span className="checkin-section-title">How did today go?</span>
              <span className="checkin-hint">
                {totalProgress > 0 ? `${Math.round(totalProgress * 100)}% complete` : 'Tap to mark'}
              </span>
            </div>
            <div className="checkin-goals-list">
              {goals.map(goal => {
                const status = getStatus(goal.id);
                const statusLabel = status === 2 ? 'Done' : status === 1 ? 'Halfway' : 'Not yet';
                const statusClass =
                  status === 2 ? 'checkin-status-done' :
                  status === 1 ? 'checkin-status-half' :
                  'checkin-status-none';
                return (
                  <div
                    key={goal.id}
                    className="checkin-goal-row"
                    onClick={() => cycleStatus(goal.id)}
                  >
                    <span
                      className={`progress-circle status-${status}`}
                      style={{ width: 36, height: 36, flexShrink: 0 }}
                    />
                    <div className="checkin-goal-info">
                      <div className="checkin-goal-name">{goal.name}</div>
                      <div className="checkin-goal-desc">{goal.description}</div>
                    </div>
                    <span className={`checkin-status-label ${statusClass}`}>{statusLabel}</span>
                  </div>
                );
              })}
              {goals.length === 0 && (
                <p className="checkin-empty">No goals yet — add some to start tracking.</p>
              )}
            </div>
          </div>

          {/* Journal */}
          <div className="checkin-journal">
            <div className="checkin-journal-header">
              <span className="checkin-section-title">
                A few words about today
                <span className="checkin-optional">· optional</span>
              </span>
            </div>
            <textarea
              className="checkin-textarea"
              rows={4}
              placeholder="What's on your mind?"
              value={journalText}
              onChange={e => setJournalText(e.target.value)}
            />
            {!journalText && (
              <div className="checkin-prompts">
                {PROMPTS.map(p => (
                  <button
                    key={p}
                    className="checkin-prompt-chip"
                    onClick={() => insertPrompt(p)}
                    type="button"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="checkin-footer">
          <button className="checkin-skip" onClick={handleSkip} type="button">
            Skip for today
          </button>
          <button className="btn-primary checkin-save" onClick={handleSave} type="button">
            {journalText.trim() ? 'Save & finish' : 'All done →'}
          </button>
        </div>
      </div>
    </div>
  );
}
