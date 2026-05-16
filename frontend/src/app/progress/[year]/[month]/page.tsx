'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';
import NavHeader from '@/components/NavHeader';
import CheckinModal from '@/components/CheckinModal';
import { RAILS_API_BASE } from '@/lib/config';
import { getGuestMonthlyProgress, setGuestProgressStatus } from '@/lib/guestStorage';
import { localDateString, todayLocalDateString } from '@/lib/dateUtils';

interface Goal {
  id: number;
  name: string;
  description: string;
  position: number;
  created_at: string;
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

interface ProgressData {
  year: number;
  month: number;
  date: string;
  goals: Goal[];
  days_in_month: number;
  daily_progresses: Record<string, DailyProgress>;
  journal_entries: Record<string, JournalEntry>;
}

export default function ProgressPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCheckin, setShowCheckin] = useState(false);

  const year = parseInt(params.year as string);
  const month = parseInt(params.month as string);

  useEffect(() => {
    if (authLoading) return;
    fetchProgressData();
  }, [year, month, user, authLoading, router]);

  useEffect(() => {
    if (loading || authLoading) return;
    const today = todayLocalDateString();
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrentMonth && localStorage.getItem('last_checkin_date') !== today) {
      setShowCheckin(true);
    }

    const onReset = () => {
      if (isCurrentMonth) setShowCheckin(true);
    };
    window.addEventListener('checkin-reset', onReset);
    return () => window.removeEventListener('checkin-reset', onReset);
  }, [loading, authLoading, year, month]);

  const fetchProgressData = async () => {
    if (user?.is_guest) {
      setLoading(true);
      setData(getGuestMonthlyProgress(year, month));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${RAILS_API_BASE}/progress/${year}/${month}.json`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch progress data');
      }
      const progressData = await response.json();
      setData(progressData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (goalId: number, date: string, currentStatus: number) => {
    const newStatus = (currentStatus + 1) % 3;

    if (user?.is_guest) {
      setGuestProgressStatus(goalId, date, newStatus);
      setData(prev => {
        if (!prev) return prev;
        const key = `${goalId}-${date}`;
        return {
          ...prev,
          daily_progresses: {
            ...prev.daily_progresses,
            [key]: { goal_id: goalId, date, status: newStatus }
          }
        };
      });
      return;
    }
    
    try {
      const response = await fetch(`${RAILS_API_BASE}/progress/${year}/${month}/${goalId}/${date}`, {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          const body = await response.json().catch(() => null);
          if (body?.code === 'AUTH_REQUIRED') {
            const shouldNavigate = window.confirm('Sign in to save your data. Go to the login page now?');
            if (shouldNavigate) {
              router.push('/login');
            }
            return;
          }
        }
        throw new Error('Failed to update progress');
      }

      // Update local state
      setData(prev => {
        if (!prev) return prev;
        const key = `${goalId}-${date}`;
        return {
          ...prev,
          daily_progresses: {
            ...prev.daily_progresses,
            [key]: { goal_id: goalId, date, status: newStatus }
          }
        };
      });
    } catch (err) {
      console.error('Error updating progress:', err);
      alert('Failed to update progress');
    }
  };

  const getProgressStatus = (goalId: number, date: string) => {
    if (!data) return 0;
    const key = `${goalId}-${date}`;
    return data.daily_progresses[key]?.status || 0;
  };

  const getJournalEntry = (date: string) => {
    if (!data) return null;
    return data.journal_entries[date] || null;
  };

  const handleJournalClick = (date: string) => {
    const journalEntry = getJournalEntry(date);
    if (journalEntry) {
      // Edit existing entry
      router.push(`/journal-entries/${journalEntry.id}/edit?returnTo=progress&year=${year}&month=${month}`);
    } else {
      // Create new entry
      router.push(`/journal-entries/new?date=${date}&returnTo=progress&year=${year}&month=${month}`);
    }
  };

  const formatDate = (year: number, month: number) => {
    return new Date(year, month - 1).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const getPrevMonth = () => {
    const prevDate = new Date(year, month - 2, 1);
    return {
      year: prevDate.getFullYear(),
      month: prevDate.getMonth() + 1
    };
  };

  const getNextMonth = () => {
    const nextDate = new Date(year, month, 1);
    return {
      year: nextDate.getFullYear(),
      month: nextDate.getMonth() + 1
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Loading Progress</h1>
          <p className="text-neutral-600">Getting your data ready...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-error-600 text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-error-600 mb-2">Something went wrong</h1>
          <p className="text-neutral-600 mb-4">{error}</p>
          <button 
            onClick={fetchProgressData}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-neutral-400 text-2xl">📊</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">No data found</h1>
          <p className="text-neutral-600">Unable to load progress data</p>
        </div>
      </div>
    );
  }

  const handleCheckinClose = ({
    progressUpdates,
    journalUpdate,
  }: {
    progressUpdates: Record<string, DailyProgress>;
    journalUpdate: JournalEntry | null;
  }) => {
    setShowCheckin(false);
    setData(prev => {
      if (!prev) return prev;
      const merged = { ...prev.daily_progresses, ...progressUpdates };
      const updatedJournals = journalUpdate
        ? { ...prev.journal_entries, [journalUpdate.date]: journalUpdate }
        : prev.journal_entries;
      return { ...prev, daily_progresses: merged, journal_entries: updatedJournals };
    });
  };

  const prevMonth = getPrevMonth();
  const nextMonth = getNextMonth();

  return (
    <div className="min-h-screen">
      {showCheckin && data && (
        <CheckinModal
          goals={data.goals}
          dailyProgresses={data.daily_progresses}
          journalEntries={data.journal_entries}
          today={todayLocalDateString()}
          year={year}
          month={month}
          onClose={handleCheckinClose}
        />
      )}
      <NavHeader />
      <section className="min-h-screen">
        <div className="max-w-[1000px] mx-auto p-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="page-title ">{formatDate(year, month)}</h1>
              <div className="flex items-center gap-4 mt-0.5 text-xs text-neutral-500">
                <span>Click circles to cycle:</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full border-2 border-neutral-300 bg-white" />
                  <span>Empty</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full border-2 border-neutral-300 shrink-0" style={{ background: 'linear-gradient(135deg, #10B981 50%, white 50%)' }} />
                  <span>Half</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-secondary-500 flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-xs">✓</span>
                  </div>
                  <span>Done</span>
                </div>
              </div>
            </div>

            <div className="inline-flex items-center rounded-xl border border-neutral-200 overflow-hidden text-sm text-neutral-500 bg-white">
              <Link
                href={`/progress/${prevMonth.year}/${prevMonth.month}`}
                className="px-3 py-1.5 hover:bg-neutral-50 transition-colors duration-150"
                title={new Date(prevMonth.year, prevMonth.month - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              >
                ‹
              </Link>
              <Link
                href={`/progress/${new Date().getFullYear()}/${new Date().getMonth() + 1}`}
                className="px-3 py-1.5 border-x border-neutral-200 hover:bg-neutral-50 transition-colors duration-150"
              >
                Today
              </Link>
              <Link
                href={`/progress/${nextMonth.year}/${nextMonth.month}`}
                className="px-3 py-1.5 hover:bg-neutral-50 transition-colors duration-150"
                title={new Date(nextMonth.year, nextMonth.month - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              >
                ›
              </Link>
            </div>
          </div>

          {data.goals.length > 0 ? (
            <div className="animate-fade-in mt-4">
              {/* Progress Table */}
              <div className="card sticky-table-container">
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="table-modern">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-20 bg-neutral-100 min-w-[150px] border-r border-neutral-200">
                          <span className="text-sm font-semibold text-neutral-500 px-4">Goals</span>
                        </th>
                        {Array.from({ length: data.days_in_month }, (_, i) => {
                          const day = i + 1;
                          const date = localDateString(new Date(year, month - 1, day));
                          const isToday = date === todayLocalDateString();
                          const isFuture = date > todayLocalDateString();

                          return (
                            <th key={i + 1} className="min-w-[44px]">
                              <div className="flex items-center justify-center">
                                <span className={`text-xs font-bold ${isToday ? 'text-primary-600' : isFuture ? 'text-neutral-300' : 'text-neutral-500'}`}>
                                  {day}
                                </span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {data.goals.map((goal) => (
                        <tr key={goal.id} className="hover:bg-neutral-50 transition-colors duration-200">
                          <td className="sticky left-0 z-20 bg-white shadow-sm h-16 border-b border-r border-neutral-200">
                            <div className="px-4 py-[10px] h-full flex flex-col justify-center">
                              <h3 className="font-semibold text-[13px] leading-tight">{goal.name}</h3>
                              <p className="text-hint line-clamp-2 leading-tight mt-0.5">{goal.description}</p>
                            </div>
                          </td>
                          {Array.from({ length: data.days_in_month }, (_, i) => {
                            const day = i + 1;
                            const date = localDateString(new Date(year, month - 1, day));
                            const status = getProgressStatus(goal.id, date);
                            const statusText = status === 0 ? 'Not Started' : status === 1 ? 'Half Complete' : 'Complete';
                            const isToday = date === todayLocalDateString();
                            const isFuture = date > todayLocalDateString();
                            const isBeforeCreation = date < goal.created_at.substring(0, 10);

                            return (
                              <td key={day} className="p-1 text-center">
                                {!isBeforeCreation && (
                                  <div
                                    className={`progress-circle status-${status} ${isToday ? 'ring-2 ring-primary-500 ring-offset-1' : ''} ${isFuture ? 'opacity-25' : ''}`}
                                    onClick={() => updateProgress(goal.id, date, status)}
                                    data-goal-id={goal.id}
                                    data-date={date}
                                    data-status={status}
                                    title={`${goal.name} - Day ${day}: ${statusText}`}
                                  />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      {/* Journal row — separated from goals by a thick border */}
                      <tr className="journal-row hover:bg-neutral-50 transition-colors duration-200">
                        <td className="sticky left-0 z-20 bg-white shadow-sm h-12 border-r border-neutral-200">
                          <div className="px-4 h-full flex items-center gap-2">
                            <span className="text-base leading-none">✏️</span>
                            <span className="font-semibold text-[13px] text-neutral-600">Journal</span>
                          </div>
                        </td>
                        {Array.from({ length: data.days_in_month }, (_, i) => {
                          const day = i + 1;
                          const date = localDateString(new Date(year, month - 1, day));
                          const journalEntry = getJournalEntry(date);
                          const isFuture = date > todayLocalDateString();

                          return (
                            <td key={day} className="p-1 text-center">
                              {!isFuture && (
                                <button
                                  onClick={() => handleJournalClick(date)}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center mx-auto transition-all duration-200 ${
                                    journalEntry
                                      ? 'bg-primary-100 text-primary-600 hover:bg-primary-200'
                                      : 'text-neutral-300 hover:text-neutral-400 hover:bg-neutral-100'
                                  }`}
                                  title={
                                    journalEntry
                                      ? `Edit journal: "${journalEntry.content.substring(0, 60)}${journalEntry.content.length > 60 ? '…' : ''}"`
                                      : `Add journal entry for ${date}`
                                  }
                                >
                                  <span className="text-[11px] font-bold leading-none">
                                    {journalEntry ? '✦' : '+'}
                                  </span>
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="card text-center py-6 animate-fade-in mt-4">
              <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-neutral-400 text-lg">🎯</span>
              </div>
              <h2 className="text-base font-bold text-neutral-900 mb-1">No goals yet</h2>
              <p className="text-description mb-4 max-w-sm mx-auto">
                Create your first goal to start tracking your progress.
              </p>
              <Link
                href="/goals/new"
                className="btn-primary"
              >
                Create Your First Goal
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        <div className="max-w-4xl mx-auto px-6 py-16 animate-fade-in">
          <div className="text-center mb-10">
            <h2 className="page-title">About This Progress Tracker</h2>
            <p className="mt-3 text-neutral-500 text-base max-w-xl mx-auto leading-relaxed">
              Turn long-term goals into small daily actions — and make your consistency visible over time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="card card-body flex flex-col gap-3">
              <div className="text-3xl">🎯</div>
              <h3 className="font-semibold text-neutral-900 text-base">Set Your Goals</h3>
              <p className="text-neutral-600 text-sm leading-relaxed">
                Define what matters most to you. Each goal gets its own row in the monthly tracker so nothing falls through the cracks.
              </p>
            </div>

            <div className="card card-body flex flex-col gap-3">
              <div className="text-3xl">📅</div>
              <h3 className="font-semibold text-neutral-900 text-base">Check In Daily</h3>
              <p className="text-neutral-600 text-sm leading-relaxed">
                Each day has a simple three-state check: tap once to mark it started, again for complete. No lengthy forms.
              </p>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <div className="w-5 h-5 rounded-full shrink-0 bg-white border-2 border-neutral-300" />
                  Not started
                </div>
                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <div className="w-5 h-5 rounded-full shrink-0 border-2 border-neutral-300" style={{ background: 'linear-gradient(135deg, #10B981 50%, white 50%)' }} />
                  Half done
                </div>
                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <div className="w-5 h-5 rounded-full shrink-0 bg-secondary-500 border-2 border-secondary-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
                  Complete
                </div>
              </div>
            </div>

            <div className="card card-body flex flex-col gap-3">
              <div className="text-3xl">📈</div>
              <h3 className="font-semibold text-neutral-900 text-base">See Patterns</h3>
              <p className="text-neutral-600 text-sm leading-relaxed">
                The monthly view makes your effort visible at a glance. Inspired by{' '}
                <a
                  href="https://www.youtube.com/watch?v=qaozjfqXbfI&t=289s"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 font-medium hover:text-primary-700 underline"
                >
                  this habit tracker walkthrough
                </a>
                , adapted for goals and journal entries.
              </p>
            </div>
          </div>

          <p className="text-center text-neutral-400 text-sm mt-8">
            Built to build momentum through clarity — track what matters, reflect as you go, and make progress tangible.
          </p>
        </div>
      </section>
    </div>
  );
} 