'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';

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
  const { user, logout } = useAuth();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const year = parseInt(params.year as string);
  const month = parseInt(params.month as string);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchProgressData();
  }, [year, month, user, router]);

  const fetchProgressData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/progress/${year}/${month}`, {
        credentials: 'include',
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
      const response = await fetch(`/api/progress/${year}/${month}/${goalId}/${date}`, {
        method: 'PATCH',
        headers: {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No data found</h1>
        </div>
      </div>
    );
  }

  const prevMonth = getPrevMonth();
  const nextMonth = getNextMonth();

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header with navigation and user info */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          Progress Tracker - {formatDate(data.date)}
        </h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="flex justify-between items-center mb-6">
        <Link 
          href={`/progress/${prevMonth.year}/${prevMonth.month}`}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          ← {new Date(prevMonth.year, prevMonth.month - 1).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long' 
          })}
        </Link>
        
        <div className="flex gap-2">
          <Link 
            href="/goals"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Goals
          </Link>
          <Link 
            href="/journal-entries"
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Journal Entries
          </Link>
        </div>
        
        <Link 
          href={`/progress/${nextMonth.year}/${nextMonth.month}`}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          {new Date(nextMonth.year, nextMonth.month - 1).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long' 
          })} →
        </Link>
      </div>

      {data.goals.length > 0 ? (
        <>
          {/* Progress Table */}
          <div className="overflow-x-auto mb-8 border border-gray-300 rounded-lg sticky-table-container">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border-r border-gray-300 p-2 bg-gray-50 font-bold text-left min-w-[150px] sticky left-0 z-10">
                    Goals
                  </th>
                  {Array.from({ length: data.days_in_month }, (_, i) => {
                    const day = i + 1;
                    const date = new Date(year, month - 1, day).toISOString().split('T')[0];
                    const journalEntry = getJournalEntry(date);
                    
                    return (
                      <th key={i + 1} className="border border-gray-300 p-2 bg-gray-50 font-bold text-center min-w-[40px] relative">
                        <div className="flex flex-col items-center">
                          <span className="mb-1">{day}</span>
                          <button
                            onClick={() => handleJournalClick(date)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
                              journalEntry 
                                ? 'bg-green-500 text-white hover:bg-green-600' 
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
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
                  <tr key={goal.id} className="hover:bg-gray-50 transition-colors">
                    <td className="border-r border-gray-300 p-2 font-bold bg-white sticky left-0 z-10 shadow-sm">
                      {goal.name}
                    </td>
                    {Array.from({ length: data.days_in_month }, (_, i) => {
                      const day = i + 1;
                      const date = new Date(year, month - 1, day).toISOString().split('T')[0];
                      const status = getProgressStatus(goal.id, date);
                      const statusText = status === 0 ? 'Not Started' : status === 1 ? 'Half Complete' : 'Complete';
                      
                      return (
                        <td key={day} className="border border-gray-300 p-1 w-12 h-12">
                          <div
                            className={`progress-circle status-${status}`}
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
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No goals have been created yet.</p>
          <Link 
            href="/goals/new"
            className="inline-block px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Create your first goal
          </Link>
        </div>
      )}
    </div>
  );
} 