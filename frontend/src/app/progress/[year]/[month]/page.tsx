'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

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
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const year = parseInt(params.year as string);
  const month = parseInt(params.month as string);

  useEffect(() => {
    fetchProgressData();
  }, [year, month]);

  const fetchProgressData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/progress/${year}/${month}`);
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
      <h1 className="text-3xl font-bold mb-6">
        Progress Tracker - {formatDate(data.date)}
      </h1>
      
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
        
        <Link 
          href="/goals"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Goals
        </Link>
        
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
          <div className="overflow-x-auto mb-8">
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr>
                  <th className="border border-gray-300 p-2 bg-gray-50 font-bold text-left min-w-[120px]">
                    Goal
                  </th>
                  {Array.from({ length: data.days_in_month }, (_, i) => (
                    <th key={i + 1} className="border border-gray-300 p-2 bg-gray-50 font-bold text-center">
                      {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.goals.map((goal) => (
                  <tr key={goal.id}>
                    <td className="border border-gray-300 p-2 font-bold">
                      {goal.name}
                    </td>
                    {Array.from({ length: data.days_in_month }, (_, i) => {
                      const day = i + 1;
                      const date = new Date(year, month - 1, day).toISOString().split('T')[0];
                      const status = getProgressStatus(goal.id, date);
                      
                      return (
                        <td key={day} className="border border-gray-300 p-1 w-10 h-10">
                          <div
                            className={`progress-circle status-${status}`}
                            onClick={() => updateProgress(goal.id, date, status)}
                            data-goal-id={goal.id}
                            data-date={date}
                            data-status={status}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Journal Entries Section */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Journal Entries</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: data.days_in_month }, (_, i) => {
                const day = i + 1;
                const date = new Date(year, month - 1, day).toISOString().split('T')[0];
                const journalEntry = getJournalEntry(date);
                
                return (
                  <div key={day} className="border border-gray-300 p-3 rounded">
                    <div className="font-bold mb-2">{day}</div>
                    <div>
                      {journalEntry ? (
                        <>
                          <div className="text-xs mb-2 text-gray-600">
                            {journalEntry.content.length > 100 
                              ? `${journalEntry.content.substring(0, 100)}...` 
                              : journalEntry.content
                            }
                          </div>
                          <Link 
                            href={`/journal-entries/${journalEntry.id}/edit`}
                            className="text-xs text-blue-500 hover:underline"
                          >
                            Edit
                          </Link>
                        </>
                      ) : (
                        <Link 
                          href={`/journal-entries/new?date=${date}`}
                          className="text-xs text-blue-500 hover:underline"
                        >
                          Add Entry
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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