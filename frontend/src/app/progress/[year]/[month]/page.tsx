'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';
import { RAILS_API_BASE } from '@/lib/config';

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
  const { user, logout, loading: authLoading } = useAuth();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const year = parseInt(params.year as string);
  const month = parseInt(params.month as string);

  useEffect(() => {
    if (authLoading) return; // Wait for auth check to complete
    
    if (!user) {
      router.push('/login');
      return;
    }
    fetchProgressData();
  }, [year, month, user, authLoading, router]);

  const fetchProgressData = async () => {
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

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header with navigation and user info */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
              <div>
                <h1 className="text-4xl font-bold text-gradient mb-2">
                  Progress Tracker
                </h1>
                <p className="text-xl text-neutral-600">
                  {formatDate(year, month)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-neutral-500">Welcome back</p>
                  <p className="font-medium text-neutral-900">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-outline"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
              <Link 
                href={`/progress/${prevMonth.year}/${prevMonth.month}`}
                className="btn-outline flex items-center gap-2"
              >
                <span>←</span>
                {new Date(prevMonth.year, prevMonth.month - 1).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long' 
                })}
              </Link>
              
              <div className="flex gap-2">
                <Link 
                  href="/goals"
                  className="btn-primary"
                >
                  Manage Goals
                </Link>
                <Link 
                  href="/journal-entries"
                  className="btn-accent"
                >
                  Journal Entries
                </Link>
              </div>
              
              <Link 
                href={`/progress/${nextMonth.year}/${nextMonth.month}`}
                className="btn-outline flex items-center gap-2"
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

        {data.goals.length > 0 ? (
          <div className="animate-fade-in">
            {/* Progress Table */}
            <div className="card sticky-table-container">
              <div className="card-header">
                <h2 className="text-2xl font-bold text-neutral-900">Monthly Progress</h2>
                <p className="text-neutral-600 mt-1">Click circles to update your progress</p>
              </div>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-20 bg-neutral-100 min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🎯</span>
                          <span>Goals</span>
                        </div>
                      </th>
                      {Array.from({ length: data.days_in_month }, (_, i) => {
                        const day = i + 1;
                        const date = new Date(year, month - 1, day).toISOString().split('T')[0];
                        const journalEntry = getJournalEntry(date);
                        const isToday = date === new Date().toISOString().split('T')[0];
                        
                        return (
                          <th key={i + 1} className="text-center min-w-[60px] relative">
                            <div className="flex flex-col items-center gap-2">
                              <span className={`font-semibold ${isToday ? 'text-primary-600' : 'text-neutral-700'}`}>
                                {day}
                              </span>
                              <button
                                onClick={() => handleJournalClick(date)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-200 ${
                                  journalEntry 
                                    ? 'bg-accent-500 text-white hover:bg-accent-600 shadow-soft' 
                                    : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
                                }`}
                                title={journalEntry ? `Edit journal entry for ${date}` : `Add journal entry for ${date}`}
                              >
                                {journalEntry ? '✏️' : '📝'}
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
                        <td className="sticky left-0 z-20 bg-white shadow-sm">
                          <div className="p-4">
                            <h3 className="font-semibold text-neutral-900 mb-1">{goal.name}</h3>
                            <p className="text-sm text-neutral-600 line-clamp-2">{goal.description}</p>
                          </div>
                        </td>
                        {Array.from({ length: data.days_in_month }, (_, i) => {
                          const day = i + 1;
                          const date = new Date(year, month - 1, day).toISOString().split('T')[0];
                          const status = getProgressStatus(goal.id, date);
                          const statusText = status === 0 ? 'Not Started' : status === 1 ? 'Half Complete' : 'Complete';
                          const isToday = date === new Date().toISOString().split('T')[0];
                          
                          return (
                            <td key={day} className="p-2 text-center">
                              <div
                                className={`progress-circle status-${status} ${isToday ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}
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
          <div className="card text-center py-16 animate-fade-in">
            <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-neutral-400 text-4xl">🎯</span>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">No goals yet</h2>
            <p className="text-neutral-600 mb-6 max-w-md mx-auto">
              Create your first goal to start tracking your progress. Goals help you stay focused and motivated on what matters most.
            </p>
            <Link 
              href="/goals/new"
              className="btn-primary text-lg px-8 py-3"
            >
              Create Your First Goal
            </Link>
          </div>
        )}
      </div>
    </div>
  );
} 