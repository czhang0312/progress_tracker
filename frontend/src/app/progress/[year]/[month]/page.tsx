'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';
import NavHeader from '@/components/NavHeader';
import CheckinModal from '@/components/CheckinModal';
import { RAILS_API_BASE } from '@/lib/config';
import { getGuestMonthlyProgress, setGuestProgressStatus, updateGuestGoal, deleteGuestGoal, createGuestGoal, reorderGuestGoals } from '@/lib/guestStorage';
import { localDateString, todayLocalDateString } from '@/lib/dateUtils';

interface Goal {
  id: number;
  name: string;
  description: string;
  position: number;
  created_at?: string;
  started_at?: string;
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
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', description: '', started_at: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const editPopoverRef = useRef<HTMLDivElement>(null);
  const editTdRef = useRef<HTMLElement | null>(null);
  const [editPopoverPos, setEditPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddDescription, setShowAddDescription] = useState(false);
  const [addGoalFormData, setAddGoalFormData] = useState({ name: '', description: '' });
  const [addGoalSaving, setAddGoalSaving] = useState(false);
  const [addGoalErrors, setAddGoalErrors] = useState<Record<string, string>>({});
  const addGoalPopoverRef = useRef<HTMLDivElement>(null);
  const addGoalTdRef = useRef<HTMLElement | null>(null);
  const [addGoalPos, setAddGoalPos] = useState<{ top: number; left: number } | null>(null);
  const [draggingGoalId, setDraggingGoalId] = useState<number | null>(null);
  const draggingGoalIdRef = useRef<number | null>(null);
  const [dragOverGoalId, setDragOverGoalId] = useState<number | null>(null);

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


  useEffect(() => {
    if (!editingGoalId) return;
    const updatePos = () => {
      if (!editTdRef.current) return;
      const rect = editTdRef.current.getBoundingClientRect();
      setEditPopoverPos({ top: rect.bottom, left: rect.left + 10 });
    };
    window.addEventListener('scroll', updatePos, true);
    return () => window.removeEventListener('scroll', updatePos, true);
  }, [editingGoalId]);

  useEffect(() => {
    if (!editingGoalId) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (editPopoverRef.current && !editPopoverRef.current.contains(e.target as Node)) {
        setEditingGoalId(null);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [editingGoalId]);

  useEffect(() => {
    if (!showAddGoal) return;
    const updatePos = () => {
      if (!addGoalTdRef.current) return;
      const rect = addGoalTdRef.current.getBoundingClientRect();
      setAddGoalPos({ top: rect.bottom, left: rect.left + 10 });
    };
    window.addEventListener('scroll', updatePos, true);
    return () => window.removeEventListener('scroll', updatePos, true);
  }, [showAddGoal]);

  useEffect(() => {
    if (!showAddGoal) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (addGoalPopoverRef.current && !addGoalPopoverRef.current.contains(e.target as Node)) {
        setShowAddGoal(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [showAddGoal]);

  const openAddGoal = (e: React.MouseEvent<HTMLButtonElement>) => {
    setEditingGoalId(null);
    if (showAddGoal) {
      setShowAddGoal(false);
      return;
    }
    const td = (e.currentTarget as HTMLElement).closest('td')!;
    addGoalTdRef.current = td as HTMLElement;
    const rect = td.getBoundingClientRect();
    setAddGoalPos({ top: rect.bottom, left: rect.left + 10 });
    setAddGoalFormData({ name: '', description: '' });
    setAddGoalErrors({});
    setShowAddDescription(false);
    setShowAddGoal(true);
  };

  const handleAddGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddGoalSaving(true);
    setAddGoalErrors({});

    if (user?.is_guest) {
      const newGoal = createGuestGoal({
        name: addGoalFormData.name,
        description: addGoalFormData.description,
      });
      setData(prev => prev ? { ...prev, goals: [...prev.goals, newGoal] } : prev);
      setShowAddGoal(false);
      setAddGoalSaving(false);
      return;
    }

    try {
      const response = await fetch(`${RAILS_API_BASE}/goals`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addGoalFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.errors) {
          setAddGoalErrors(errorData.errors);
        } else {
          throw new Error('Failed to create goal');
        }
        return;
      }

      const newGoal = await response.json();
      setData(prev => prev ? { ...prev, goals: [...prev.goals, newGoal] } : prev);
      setShowAddGoal(false);
    } catch (err) {
      console.error('Error creating goal:', err);
      alert('Failed to create goal');
    } finally {
      setAddGoalSaving(false);
    }
  };

  const openGoalEdit = (goal: Goal, e: React.MouseEvent<HTMLButtonElement>) => {
    setShowAddGoal(false);
    if (editingGoalId === goal.id) {
      setEditingGoalId(null);
      return;
    }
    const td = (e.currentTarget as HTMLElement).closest('td')!;
    editTdRef.current = td as HTMLElement;
    const rect = td.getBoundingClientRect();
    setEditPopoverPos({ top: rect.bottom, left: rect.left + 10 });
    setEditingGoalId(goal.id);
    setEditFormData({
      name: goal.name,
      description: goal.description,
      started_at: goal.started_at ?? goal.created_at?.substring(0, 10) ?? '',
    });
    setEditErrors({});
  };

  const handleGoalEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGoalDelete = async () => {
    if (!editingGoalId) return;
    if (!window.confirm('Delete this goal? This cannot be undone.')) return;

    if (user?.is_guest) {
      deleteGuestGoal(editingGoalId);
      setData(prev => prev ? { ...prev, goals: prev.goals.filter(g => g.id !== editingGoalId) } : prev);
      setEditingGoalId(null);
      return;
    }

    try {
      const response = await fetch(`${RAILS_API_BASE}/goals/${editingGoalId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to delete goal');
      setData(prev => prev ? { ...prev, goals: prev.goals.filter(g => g.id !== editingGoalId) } : prev);
      setEditingGoalId(null);
    } catch (err) {
      console.error('Error deleting goal:', err);
      alert('Failed to delete goal');
    }
  };

  const handleGoalEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoalId) return;
    setEditSaving(true);
    setEditErrors({});

    if (user?.is_guest) {
      const updated = updateGuestGoal(editingGoalId, {
        name: editFormData.name,
        description: editFormData.description,
        started_at: editFormData.started_at,
      });
      if (updated) {
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            goals: prev.goals.map(g =>
              g.id === editingGoalId ? { ...g, ...editFormData } : g
            ),
          };
        });
        setEditingGoalId(null);
      }
      setEditSaving(false);
      return;
    }

    try {
      const response = await fetch(`${RAILS_API_BASE}/goals/${editingGoalId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.errors) {
          setEditErrors(errorData.errors);
        } else {
          throw new Error('Failed to update goal');
        }
        return;
      }

      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          goals: prev.goals.map(g =>
            g.id === editingGoalId ? { ...g, ...editFormData } : g
          ),
        };
      });
      setEditingGoalId(null);
    } catch (err) {
      console.error('Error updating goal:', err);
      alert('Failed to update goal');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDragStart = (goalId: number) => {
    setDraggingGoalId(goalId);
    draggingGoalIdRef.current = goalId;
  };

  const handleDragOver = (e: React.DragEvent, goalId: number) => {
    e.preventDefault();
    if (draggingGoalIdRef.current !== goalId) {
      setDragOverGoalId(goalId);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetGoalId: number) => {
    e.preventDefault();
    const sourceGoalId = draggingGoalIdRef.current;
    setDraggingGoalId(null);
    draggingGoalIdRef.current = null;
    setDragOverGoalId(null);

    if (!sourceGoalId || sourceGoalId === targetGoalId || !data) return;

    const goals = [...data.goals];
    const sourceIndex = goals.findIndex(g => g.id === sourceGoalId);
    const targetIndex = goals.findIndex(g => g.id === targetGoalId);
    const [removed] = goals.splice(sourceIndex, 1);
    goals.splice(targetIndex, 0, removed);

    setData(prev => prev ? { ...prev, goals } : prev);
    const goalIds = goals.map(g => g.id);

    if (user?.is_guest) {
      reorderGuestGoals(goalIds);
      return;
    }

    try {
      await fetch(`${RAILS_API_BASE}/goals/reorder`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_ids: goalIds }),
      });
    } catch (err) {
      console.error('Failed to reorder goals:', err);
    }
  };

  const handleDragEnd = () => {
    setDraggingGoalId(null);
    draggingGoalIdRef.current = null;
    setDragOverGoalId(null);
  };

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
      {editingGoalId && editPopoverPos && (
        <div
          ref={editPopoverRef}
          className="fixed z-[200] w-[480px] bg-white border border-neutral-200 rounded-xl ring-1 ring-neutral-900/10 p-4"
          style={{ top: editPopoverPos.top, left: editPopoverPos.left, boxShadow: '0 8px 40px 0 rgba(0,0,0,0.22), 0 2px 8px 0 rgba(0,0,0,0.12)' }}
        >
          <form onSubmit={handleGoalEditSubmit} className="space-y-3">
            <h3 className="font-semibold text-sm text-neutral-600">Edit Goal</h3>

            <div>
              <label className="block font-semibold uppercase tracking-wide mb-1 text-neutral-400" style={{ fontSize: '10px' }}>Name</label>
              <input
                type="text"
                name="name"
                value={editFormData.name}
                onChange={handleGoalEditChange}
                className={`form-input py-1.5 font-semibold ${editErrors.name ? 'border-error-500 focus:ring-error-500' : ''}`}
                style={{ fontSize: '13px' }}
                required
              />
              {editErrors.name && <p className="mt-0.5 text-xs text-error-600">{editErrors.name}</p>}
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wide mb-1 text-neutral-400" style={{ fontSize: '10px' }}>Description</label>
              <textarea
                name="description"
                value={editFormData.description}
                onChange={handleGoalEditChange}
                rows={3}
                className={`form-input text-xs py-1.5 ${editErrors.description ? 'border-error-500 focus:ring-error-500' : ''}`}
              />
              {editErrors.description && <p className="mt-0.5 text-xs text-error-600">{editErrors.description}</p>}
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wide mb-1 text-neutral-400" style={{ fontSize: '10px' }}>Start Date</label>
              <input
                type="date"
                name="started_at"
                value={editFormData.started_at}
                onChange={handleGoalEditChange}
                className="form-input text-xs py-1.5"
                required
              />
              <p className="mt-1 text-xs text-neutral-400">Progress circles hidden before this date.</p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button type="submit" disabled={editSaving} className="btn-primary">
                {editSaving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditingGoalId(null)} className="btn-outline">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGoalDelete}
                className="ml-auto text-xs text-error-500 hover:text-error-700 hover:bg-error-50 px-2 py-1.5 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </form>
        </div>
      )}
      {showAddGoal && addGoalPos && (
        <div
          ref={addGoalPopoverRef}
          className="fixed z-[200] w-[480px] bg-white border border-neutral-200 rounded-xl ring-1 ring-neutral-900/10 p-4"
          style={{ top: addGoalPos.top, left: addGoalPos.left, boxShadow: '0 8px 40px 0 rgba(0,0,0,0.22), 0 2px 8px 0 rgba(0,0,0,0.12)' }}
        >
          <form onSubmit={handleAddGoalSubmit} className="space-y-3">
            <h3 className="font-semibold text-sm text-neutral-600">New Goal</h3>

            <div>
              <label className="block font-semibold uppercase tracking-wide mb-1 text-neutral-400" style={{ fontSize: '10px' }}>Name</label>
              <input
                type="text"
                name="name"
                value={addGoalFormData.name}
                onChange={(e) => setAddGoalFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`form-input py-1.5 font-semibold ${addGoalErrors.name ? 'border-error-500 focus:ring-error-500' : ''}`}
                style={{ fontSize: '13px' }}
                autoFocus
                required
              />
              {addGoalErrors.name && <p className="mt-0.5 text-xs text-error-600">{addGoalErrors.name}</p>}
            </div>

            {!showAddDescription ? (
              <button
                type="button"
                onClick={() => setShowAddDescription(true)}
                className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors underline"
              >
                + Add description
              </button>
            ) : (
              <div>
                <label className="block font-semibold uppercase tracking-wide mb-1 text-neutral-400" style={{ fontSize: '10px' }}>Description</label>
                <textarea
                  name="description"
                  value={addGoalFormData.description}
                  onChange={(e) => setAddGoalFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  autoFocus
                  className="form-input text-xs py-1.5"
                />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={addGoalSaving} className="btn-primary">
                {addGoalSaving ? 'Creating...' : 'Create Goal'}
              </button>
              <button type="button" onClick={() => setShowAddGoal(false)} className="btn-outline">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
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
        <div className="max-w-[1200px] mx-auto p-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="page-title">{formatDate(year, month)}</h1>
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

          <div className="animate-fade-in mt-4">
            {/* Progress Table */}
            <div className="card sticky-table-container">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-20 bg-neutral-100 w-[200px] min-w-[200px] max-w-[200px]">
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
                      <tr
                        key={goal.id}
                        draggable
                        onDragStart={() => handleDragStart(goal.id)}
                        onDragOver={(e) => handleDragOver(e, goal.id)}
                        onDrop={(e) => handleDrop(e, goal.id)}
                        onDragEnd={handleDragEnd}
                        className={`transition-colors duration-200 ${draggingGoalId === goal.id ? 'opacity-40' : 'hover:bg-neutral-50'} ${dragOverGoalId === goal.id ? 'bg-primary-50 outline outline-2 outline-primary-300' : ''}`}
                      >
                        <td className="sticky left-0 z-20 bg-white h-16 border-b group w-[200px] min-w-[200px] max-w-[200px]">
                          <div className="relative h-full cursor-grab active:cursor-grabbing">
                            <div className="px-4 py-[10px] h-full flex flex-col justify-center">
                              <h3 className="font-semibold text-[13px] leading-tight line-clamp-2">{goal.name}</h3>
                              <p className="text-hint line-clamp-2 leading-tight mt-0.5">{goal.description}</p>
                            </div>
                            <button
                              draggable={false}
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => openGoalEdit(goal, e)}
                              className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                              title="Edit goal"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="5" r="2" />
                                <circle cx="12" cy="12" r="2" />
                                <circle cx="12" cy="19" r="2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        {Array.from({ length: data.days_in_month }, (_, i) => {
                          const day = i + 1;
                          const date = localDateString(new Date(year, month - 1, day));
                          const status = getProgressStatus(goal.id, date);
                          const statusText = status === 0 ? 'Not Started' : status === 1 ? 'Half Complete' : 'Complete';
                          const isToday = date === todayLocalDateString();
                          const isFuture = date > todayLocalDateString();
                          const isBeforeCreation = date < (goal.started_at ?? goal.created_at?.substring(0, 10) ?? '');

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

                    {/* Add goal row */}
                    <tr className="hover:bg-neutral-50 transition-colors duration-200">
                      <td className="sticky left-0 z-20 bg-white h-10 border-b">
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={openAddGoal}
                          className="px-4 h-full w-full flex items-center gap-1.5 text-neutral-400 hover:text-primary-600 transition-colors text-xs font-medium"
                        >
                          <span className="text-sm leading-none">+</span>
                          Add a goal
                        </button>
                      </td>
                      {Array.from({ length: data.days_in_month }, (_, i) => (
                        <td key={i} className="border-b border-neutral-100" />
                      ))}
                    </tr>

                    {/* Journal row — separated from goals by a thick border */}
                    <tr className="journal-row hover:bg-neutral-50 transition-colors duration-200">
                      <td className="sticky left-0 z-20 bg-white h-12">
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