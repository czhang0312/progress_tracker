'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';
import NavHeader from '@/components/NavHeader';
import { RAILS_API_BASE } from '@/lib/config';
import { getGuestMonthlyProgress, setGuestProgressStatus } from '@/lib/guestStorage';
import { localDateString, todayLocalDateString } from '@/lib/dateUtils';

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

  const year = parseInt(params.year as string);
  const month = parseInt(params.month as string);

  useEffect(() => {
    if (authLoading) return; // Wait for auth check to complete

    fetchProgressData();
  }, [year, month, user, authLoading, router]);

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

  const prevMonth = getPrevMonth();
  const nextMonth = getNextMonth();

  return (
    <div className="min-h-screen">
      <NavHeader />
      <section className="min-h-screen">
        <div className="max-w-[1000px] mx-auto p-4">
          {/* Header */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="page-title">Progress Tracker</h1>
                  <p className="text-description mt-1">{formatDate(year, month)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/progress/${prevMonth.year}/${prevMonth.month}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors duration-150"
                  >
                    <span>←</span>
                    {new Date(prevMonth.year, prevMonth.month - 1).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long'
                    })}
                  </Link>
                  <Link
                    href={`/progress/${nextMonth.year}/${nextMonth.month}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors duration-150"
                  >
                    {new Date(nextMonth.year, nextMonth.month - 1).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long'
                    })}
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {data.goals.length > 0 ? (
            <div className="animate-fade-in">
              {/* Progress Table */}
              <div className="card sticky-table-container">
                <div className="card-header flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[17px] font-bold text-neutral-900">Monthly Progress</h2>
                    <p className="text-hint mt-0.5">Click circles to cycle: empty → half → complete</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-xs text-neutral-500">
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
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="table-modern">
                    <thead>
                      <tr>
                        <th className="sticky z-20 bg-neutral-100 min-w-[150px]">
                          <span className="text-sm font-semibold text-neutral-500">Goals</span>
                        </th>
                        {Array.from({ length: data.days_in_month }, (_, i) => {
                          const day = i + 1;
                          const date = localDateString(new Date(year, month - 1, day));
                          const journalEntry = getJournalEntry(date);
                          const isToday = date === todayLocalDateString();
                          const isFuture = date > todayLocalDateString();

                          return (
                            <th key={i + 1} className="text-center min-w-[44px] relative">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`text-xs font-bold ${isToday ? 'text-primary-600' : isFuture ? 'text-neutral-300' : 'text-neutral-500'}`}>
                                  {day}
                                </span>
                                <button
                                  onClick={() => handleJournalClick(date)}
                                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                                    journalEntry
                                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                                      : 'border border-neutral-300 text-neutral-400 hover:border-neutral-400 bg-white'
                                  }`}
                                  title={journalEntry ? `Edit journal entry for ${date}` : `Add journal entry for ${date}`}
                                >
                                  <span className="text-[10px] font-bold leading-none">{journalEntry ? '−' : '+'}</span>
                                </button>
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

                            return (
                              <td key={day} className="p-1 text-center">
                                <div
                                  className={`progress-circle status-${status} ${isToday ? 'ring-2 ring-primary-500 ring-offset-1' : ''} ${isFuture ? 'opacity-25' : ''}`}
                                  onClick={() => updateProgress(goal.id, date, status)}
                                  data-goal-id={goal.id}
                                  data-date={date}
                                  data-status={status}
                                  title={`${goal.name} - Day ${day}: ${statusText}`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="card text-center py-10 animate-fade-in">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-neutral-400 text-2xl">🎯</span>
              </div>
              <h2 className="text-xl font-bold text-neutral-900 mb-4">No goals yet</h2>
              <p className="text-neutral-600 mb-6 max-w-md mx-auto">
                Create your first goal to start tracking your progress. Goals help you stay focused and motivated on what matters most.
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

      <section className="min-h-[50vh] bg-sky-50">
        <div className="max-w-4xl mx-auto px-6 py-14 space-y-5 text-neutral-700 leading-relaxed">
          <h2 className="text-3xl font-bold text-neutral-900">About This Progress Tracker</h2>
          <p>
            This progress tracker helps turn long-term goals into small daily actions. Instead of relying on memory
            or motivation alone, each day gives you a simple status check: not started, half complete, or complete.
            Over time, the monthly view makes your consistency visible and helps you spot patterns in effort.
          </p>
          <p>
            The idea is inspired by this habit tracker video on YouTube:{' '}
            <a
              href="https://www.youtube.com/watch?v=qaozjfqXbfI&t=289s"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 font-medium hover:text-primary-700 underline"
            >
              Habit Tracker Walkthrough
            </a>
            . This version adapts the concept to your own workflow with goals and journal entries tied to each day.
          </p>
          <p>
            I created this project to build momentum through clarity: track what matters, reflect as you go, and
            make progress tangible.
          </p>
        </div>
      </section>
    </div>
  );
} 