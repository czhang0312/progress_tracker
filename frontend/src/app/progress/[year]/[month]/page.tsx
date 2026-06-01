'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';
import NavHeader from '@/components/NavHeader';
import PageLoader from '@/components/PageLoader';
import CheckinModal from '@/components/CheckinModal';
import JournalEntryModal from '@/components/JournalEntryModal';
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

function JournalTabButton({ entry, isToday, isFuture, onClick }: {
  entry: JournalEntry | null;
  isToday: boolean;
  isFuture: boolean;
  onClick: () => void;
}) {
  const isFilled = !!entry;
  let fill = '#E2E8F0';
  let stroke = '#CBD5E1';
  if (isFilled) { fill = '#DBEAFE'; stroke = '#BFDBFE'; }
  if (isToday && !isFilled) { fill = '#EFF6FF'; stroke = '#2563EB'; }
  else if (isToday && isFilled) { fill = '#BFDBFE'; stroke = '#2563EB'; }

  const cls = isFuture ? 'journal-tab journal-tab-future'
    : isFilled ? 'journal-tab journal-tab-filled'
    : 'journal-tab journal-tab-empty';

  const title = entry
    ? entry.content.slice(0, 80) + (entry.content.length > 80 ? '…' : '')
    : isFuture ? '' : 'Add journal entry';

  return (
    <button className={cls} disabled={isFuture} onClick={onClick} title={title}
      aria-label={entry ? 'Open journal entry' : isFuture ? 'Future date' : 'Add journal entry'}>
      <svg viewBox="0 0 44 16" preserveAspectRatio="none" width="100%" height="16">
        <path d="M0 16 L6 3 Q7 0 10 0 L34 0 Q37 0 38 3 L44 16 Z"
          fill={fill} stroke={stroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      </svg>
    </button>
  );
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
  const searchParams = useSearchParams();
  // TEMP: visit ?preview to test the skeleton loading screen
  const preview = searchParams.has('preview');
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
  const editFormDataOriginal = useRef({ name: '', description: '', started_at: '' });
  const [editPopoverPos, setEditPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddDescription, setShowAddDescription] = useState(false);
  const [addGoalFormData, setAddGoalFormData] = useState({ name: '', description: '' });
  const [addGoalSaving, setAddGoalSaving] = useState(false);
  const [addGoalErrors, setAddGoalErrors] = useState<Record<string, string>>({});
  const addGoalPopoverRef = useRef<HTMLDivElement>(null);
  const addGoalTdRef = useRef<HTMLElement | null>(null);
  const [addGoalPos, setAddGoalPos] = useState<{ top: number; left: number } | null>(null);
  const [showEditDescription, setShowEditDescription] = useState(false);
  const [journalModalDate, setJournalModalDate] = useState<string | null>(null);
  const [draggingGoalId, setDraggingGoalId] = useState<number | null>(null);
  const draggingGoalIdRef = useRef<number | null>(null);
  const [dragOverGoalId, setDragOverGoalId] = useState<number | null>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const todayThRef = useRef<HTMLTableCellElement | null>(null);

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
    if (loading || !data) return;
    const container = tableScrollRef.current;
    const todayTh = todayThRef.current;
    if (!container || !todayTh) return;
    const containerRect = container.getBoundingClientRect();
    const todayRect = todayTh.getBoundingClientRect();
    const stickyWidth = 200;
    const availableWidth = containerRect.width - stickyWidth;
    const targetScrollLeft =
      container.scrollLeft + (todayRect.left - containerRect.left) - stickyWidth - availableWidth / 2 + todayRect.width / 2;
    container.scrollLeft = Math.max(0, targetScrollLeft);
  }, [loading, data]);

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

  const confirmCancel = (isDirty: boolean) =>
    !isDirty || window.confirm('Changes not saved. Are you sure you want to cancel?');
  const isEditDirty = () =>
    editFormData.name !== editFormDataOriginal.current.name ||
    editFormData.description !== editFormDataOriginal.current.description ||
    editFormData.started_at !== editFormDataOriginal.current.started_at;
  const isAddDirty = () => addGoalFormData.name !== '' || addGoalFormData.description !== '';

  useEffect(() => {
    if (!editingGoalId) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (editPopoverRef.current && !editPopoverRef.current.contains(e.target as Node)) {
        if (confirmCancel(isEditDirty())) setEditingGoalId(null);
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
        if (confirmCancel(isAddDirty())) setShowAddGoal(false);
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
    const initial = {
      name: goal.name,
      description: goal.description,
      started_at: goal.started_at ?? goal.created_at?.substring(0, 10) ?? '',
    };
    setEditFormData(initial);
    editFormDataOriginal.current = initial;
    setShowEditDescription(!!goal.description);
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
    setJournalModalDate(date);
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

  if (loading || preview) {
    return <PageLoader />;
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
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <div className="min-h-screen">
      {editingGoalId && editPopoverPos && (
        <div
          ref={editPopoverRef}
          className="fixed z-[200] w-[480px] bg-white border border-neutral-200 rounded-xl ring-1 ring-neutral-900/10 overflow-hidden"
          style={{ top: editPopoverPos.top, left: editPopoverPos.left, boxShadow: '0 8px 40px 0 rgba(0,0,0,0.22), 0 2px 8px 0 rgba(0,0,0,0.12)' }}
        >
          <form id="edit-goal-form" onSubmit={handleGoalEditSubmit} className="space-y-3 p-4 pb-3">
            <div className="flex items-center gap-3">
              <input
                type="text"
                name="name"
                value={editFormData.name}
                onChange={handleGoalEditChange}
                placeholder="Add goal name"
                className={`flex-1 min-w-0 bg-transparent border-none outline-none focus:ring-0 font-semibold text-neutral-800 placeholder:text-neutral-300 ${editErrors.name ? 'text-error-600' : ''}`}
                style={{ fontSize: '15px' }}
                required
              />
              <input
                type="date"
                name="started_at"
                value={editFormData.started_at}
                onChange={handleGoalEditChange}
                className="text-[11px] text-neutral-500 bg-transparent border border-neutral-200 rounded px-1.5 py-0.5 w-auto shrink-0 focus:ring-0 focus:outline-none focus:border-neutral-300 hover:border-neutral-300 transition-colors"
                required
                title="Start date — progress circles hidden before this date"
              />
            </div>
            {editErrors.name && <p className="mt-0.5 text-xs text-error-600">{editErrors.name}</p>}

            {!showEditDescription ? (
              <button
                type="button"
                onClick={() => setShowEditDescription(true)}
                className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors underline"
              >
                + Add description
              </button>
            ) : (
              <div>
                <textarea
                  name="description"
                  value={editFormData.description}
                  onChange={handleGoalEditChange}
                  rows={3}
                  placeholder="Add goal description"
                  autoFocus={!editFormData.description}
                  className={`w-full rounded-lg bg-neutral-100 border-none outline-none text-xs px-3 py-2 text-neutral-700 placeholder:text-neutral-400 focus:ring-0 ${editErrors.description ? 'ring-2 ring-error-500' : ''}`}
                />
                {editErrors.description && <p className="mt-0.5 text-xs text-error-600">{editErrors.description}</p>}
              </div>
            )}

          </form>
          <div className="flex items-center gap-2 px-4 py-2 bg-neutral-50 border-t border-neutral-100">
            <button type="submit" form="edit-goal-form" disabled={editSaving} className="btn-primary px-3 py-2 text-xs">
              {editSaving ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={() => { if (confirmCancel(isEditDirty())) setEditingGoalId(null); }} className="btn-ghost px-3 py-2 text-xs border-none">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGoalDelete}
              className="ml-auto text-neutral-400 hover:text-error-500 p-1.5 rounded transition-colors"
              title="Delete goal"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {showAddGoal && addGoalPos && (
        <div
          ref={addGoalPopoverRef}
          className="fixed z-[200] w-[480px] bg-white border border-neutral-200 rounded-xl ring-1 ring-neutral-900/10 overflow-hidden"
          style={{ top: addGoalPos.top, left: addGoalPos.left, boxShadow: '0 8px 40px 0 rgba(0,0,0,0.22), 0 2px 8px 0 rgba(0,0,0,0.12)' }}
        >
          <form id="add-goal-form" onSubmit={handleAddGoalSubmit} className="space-y-3 p-4 pb-3">
            <div>
              <input
                type="text"
                name="name"
                value={addGoalFormData.name}
                onChange={(e) => setAddGoalFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Add goal name"
                className={`w-full bg-transparent border-none outline-none focus:ring-0 font-semibold text-neutral-800 placeholder:text-neutral-300 ${addGoalErrors.name ? 'text-error-600' : ''}`}
                style={{ fontSize: '15px' }}
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
                <textarea
                  name="description"
                  value={addGoalFormData.description}
                  onChange={(e) => setAddGoalFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Add goal description"
                  autoFocus
                  className="w-full rounded-lg bg-neutral-100 border-none outline-none text-xs px-3 py-2 text-neutral-700 placeholder:text-neutral-400 focus:ring-0"
                />
              </div>
            )}

          </form>
          <div className="flex gap-2 px-4 py-2 bg-neutral-50 border-t border-neutral-100">
            <button type="submit" form="add-goal-form" disabled={addGoalSaving} className="btn-primary px-3 py-2 text-xs">
              {addGoalSaving ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={() => { if (confirmCancel(isAddDirty())) setShowAddGoal(false); }} className="btn-ghost px-3 py-2 text-xs border-none">
              Cancel
            </button>
          </div>
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
      {journalModalDate && data && (
        <JournalEntryModal
          date={journalModalDate}
          goals={data.goals}
          progress={data.daily_progresses}
          journal={data.journal_entries}
          year={year}
          month={month}
          onClose={() => setJournalModalDate(null)}
          onProgressUpdate={updateProgress}
          onJournalChange={(date, entry) => {
            setData(prev => {
              if (!prev) return prev;
              if (!entry) {
                const updated = { ...prev.journal_entries };
                delete updated[date];
                return { ...prev, journal_entries: updated };
              }
              return { ...prev, journal_entries: { ...prev.journal_entries, [date]: entry } };
            });
          }}
          onNavigate={(delta) => {
            const current = new Date(journalModalDate + 'T00:00:00');
            current.setDate(current.getDate() + delta);
            const newDate = localDateString(current);
            if (newDate <= todayLocalDateString()) {
              setJournalModalDate(newDate);
            }
          }}
        />
      )}
      <NavHeader />
      <section className="min-h-screen">
        <div className="max-w-[1200px] mx-auto p-4">
          {/* Header */}
          <div className="flex items-end justify-between gap-4 px-2">
            <div>
              <h1 className="page-title">
                {new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' })}{' '}
                <span className="italic font-normal text-neutral-400">{year}</span>
              </h1>
            </div>

            <div className="flex items-center gap-[6px] p-1 rounded-[10px] bg-white border border-neutral-200">
              <Link
                href={`/progress/${prevMonth.year}/${prevMonth.month}`}
                className="w-[30px] h-[30px] rounded-[7px] flex items-center justify-center text-neutral-500 text-[18px] hover:bg-neutral-100 transition-colors duration-[120ms]"
                title={new Date(prevMonth.year, prevMonth.month - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              >
                ‹
              </Link>
              {isCurrentMonth ? (
                <span className="h-[30px] flex items-center px-[12px] rounded-[7px] text-xs font-semibold text-neutral-400 cursor-default select-none">
                  Today
                </span>
              ) : (
                <Link
                  href={`/progress/${now.getFullYear()}/${now.getMonth() + 1}`}
                  className="h-[30px] flex items-center px-[12px] rounded-[7px] text-xs font-semibold text-neutral-900 hover:bg-neutral-100 transition-colors duration-[120ms]"
                >
                  Today
                </Link>
              )}
              <Link
                href={`/progress/${nextMonth.year}/${nextMonth.month}`}
                className="w-[30px] h-[30px] rounded-[7px] flex items-center justify-center text-neutral-500 text-[18px] hover:bg-neutral-100 transition-colors duration-[120ms]"
                title={new Date(nextMonth.year, nextMonth.month - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              >
                ›
              </Link>
            </div>
          </div>

          <div className="animate-fade-in mt-4">
            {/* Progress Table */}
            <div className="sticky-table-container">
              <div ref={tableScrollRef} className="overflow-x-auto scrollbar-thin">
                <table className="table-modern">
                  <thead>
                    {/* Journal tab row first — renders above the date headers visually */}
                    <tr className="journal-tab-row">
                      <th className="sticky left-0 z-20 bg-neutral-100 w-[200px] min-w-[200px] max-w-[200px] p-0" />
                      {Array.from({ length: data.days_in_month }, (_, i) => {
                        const day = i + 1;
                        const date = localDateString(new Date(year, month - 1, day));
                        return (
                          <td key={day} className="p-0 align-bottom" style={{ width: 44, minWidth: 44 }}>
                            <JournalTabButton
                              entry={getJournalEntry(date)}
                              isToday={date === todayLocalDateString()}
                              isFuture={date > todayLocalDateString()}
                              onClick={() => handleJournalClick(date)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <th className="sticky left-0 z-20 w-[200px] min-w-[200px] max-w-[200px]" style={{ background: 'rgb(248, 250, 252)' }}>
                        <span className="text-sm font-semibold text-neutral-500 px-4">Goals</span>
                      </th>
                      {Array.from({ length: data.days_in_month }, (_, i) => {
                        const day = i + 1;
                        const date = localDateString(new Date(year, month - 1, day));
                        const isToday = date === todayLocalDateString();
                        const isFuture = date > todayLocalDateString();
                        const dayOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(year, month - 1, day).getDay()];

                        return (
                          <th key={i + 1} ref={(el) => { if (isToday) todayThRef.current = el; }} className="min-w-[44px]">
                            <div className="flex flex-col items-center justify-center">
                              <span className={`text-[9px] font-medium ${isToday ? 'text-primary-400' : isFuture ? 'text-neutral-200' : 'text-neutral-400'}`}>
                                {dayOfWeek}
                              </span>
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
                        <td className="sticky left-0 z-20 bg-white h-12 border-b group w-[200px] min-w-[200px] max-w-[200px]">
                          <div className="relative h-full cursor-grab active:cursor-grabbing">
                            <div className="px-6 py-1.5 h-full flex flex-col justify-center">
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

                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[960px] mx-auto px-4 pb-16">
        <div className="mt-10 border-t border-neutral-300" />
        <div className="max-w-[800px] mx-auto mb-4 pt-10">

          {/* Editorial intro */}
          <div className="max-w-2xl mx-auto mb-11 text-center">
            <h2
              className="text-[36px] font-medium text-neutral-900 leading-[1.15] tracking-[-0.02em] mb-4"
              style={{ fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif" }}
            >
              The hardest part of a new goal is
              <br />
              <em>the first two weeks.</em>
            </h2>
            <p className="text-[15px] leading-[1.7] text-neutral-500 max-w-[560px] mx-auto">
              Every goal has two phases. Here&apos;s how this app helps you through both.
            </p>
          </div>

          {/* Phase 1 */}
          <div className="max-w-[1000px] mx-auto mb-[10px]">
            <div className="flex items-baseline gap-3.5 mb-[10px] flex-wrap">
              <span
                className="text-[38px] font-normal italic leading-none tracking-[-0.02em] text-primary-600"
                style={{ fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif" }}
              >
                01
              </span>
              <span className="text-[11px] font-semibold tracking-[.22em] uppercase text-neutral-500">
                Phase · Goal-initiating
              </span>
            </div>
            <p className="text-[14.5px] leading-[1.7] text-neutral-500 max-w-[720px] mb-[22px]">
              Motivation is highest on day one but reality hits fast. The goal turns out to be bigger than expected, obstacles you didn&apos;t plan for show up, and most people quietly abandon ship within the first two weeks. This app is built around two small forces that get you through this critical period:
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 max-w-[420px] mx-auto w-full">

            {/* Card 1: Honest Tracking */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-[22px] flex flex-col gap-3">
              <div className="text-primary-600 h-8 flex items-center opacity-90">
                <svg viewBox="0 0 80 40" width="72" height="36" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="14" cy="20" r="10" fill="currentColor" />
                  <path d="M10 20 l3 3 6 -6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <circle cx="40" cy="20" r="10" />
                  <path d="M40 20 L47.1 12.9 A10 10 0 0 0 40 10 A10 10 0 0 0 32.9 27.1 Z" fill="currentColor" stroke="none" />
                  <circle cx="66" cy="20" r="10" opacity="0.4" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-[.16em] uppercase text-neutral-400 mb-1.5">Honest Tracking</p>
                <h3
                  className="text-xl font-medium text-neutral-900 leading-snug tracking-[-0.01em] mb-2.5"
                  style={{ fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif" }}
                >A circle that tells the truth</h3>
                <p className="text-[13.5px] leading-[1.6] text-neutral-500">
                  Each day you mark how it really went — done, partially done, or not done. No streaks to protect, no all-or-nothing pressure. A partial is still a day you showed up. Watching that honest record fill in across the weeks is quietly more motivating than any perfect streak could be.
                </p>
              </div>
            </div>

            {/* Card 2: Reflection */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-[22px] flex flex-col gap-3">
              <div className="text-primary-600 h-8 flex items-center opacity-90">
                <svg viewBox="0 0 80 40" width="64" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 14 h44 M8 22 h34 M8 30 h26" />
                  <path d="M62 8 l8 8 -22 22 h-8 v-8 z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-[.16em] uppercase text-neutral-400 mb-1.5">Reflection</p>
                <h3
                  className="text-xl font-medium text-neutral-900 leading-snug tracking-[-0.01em] mb-2.5"
                  style={{ fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif" }}
                >A few lines a day changes everything</h3>
                <p className="text-[13.5px] leading-[1.6] text-neutral-500">
                  A short daily journal entry turns chaos into clarity. When something goes wrong, you write it down. When the goal feels too big, you write that down too. Patterns emerge fast — and so do the small adjustments that make the next day easier than the last.
                </p>
              </div>
            </div>
          </div>

          {/* Then divider */}
          <div className="max-w-[1000px] mx-auto my-10 flex items-center gap-3.5 text-neutral-400">
            <div className="flex-1 h-px bg-neutral-200" />
            <span className="text-[10px] font-semibold tracking-[.22em] uppercase">Then</span>
            <div className="flex-1 h-px bg-neutral-200" />
          </div>

          {/* Phase 2 */}
          <div className="max-w-[1000px] mx-auto mb-[10px]">
            <div className="flex items-baseline gap-3.5 mb-[10px] flex-wrap">
              <span
                className="text-[38px] font-normal italic leading-none tracking-[-0.02em] text-primary-600"
                style={{ fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif" }}
              >
                02
              </span>
              <span className="text-[11px] font-semibold tracking-[.22em] uppercase text-neutral-500">
                Phase · Goal-tracking
              </span>
            </div>
            <p className="text-[14.5px] leading-[1.7] text-neutral-500 max-w-[720px] mb-[22px]">
              The hardest part is behind you. After the inital two weeks, the goal has been stress-tested, adjusted, and survived. Now the work shifts from figuring it out to showing up consistently — and that still requires a daily signal.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 max-w-[420px] mx-auto w-full">

            {/* Card 3: Keep Filling the Circles */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-[22px] flex flex-col gap-3">
              <div className="text-primary-600 h-8 flex items-center opacity-90">
                <svg viewBox="0 0 80 40" width="72" height="36" fill="currentColor">
                  <circle cx="8" cy="20" r="4" />
                  <circle cx="20" cy="20" r="4" />
                  <circle cx="32" cy="20" r="4" />
                  <circle cx="44" cy="20" r="4" />
                  <circle cx="56" cy="20" r="4" />
                  <circle cx="68" cy="20" r="4" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-[.16em] uppercase text-neutral-400 mb-1.5">Keep Filling the Circles</p>
                <h3
                  className="text-xl font-medium text-neutral-900 leading-snug tracking-[-0.01em] mb-2.5"
                  style={{ fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif" }}
                >Consistency is built, not assumed</h3>
                <p className="text-[13.5px] leading-[1.6] text-neutral-500">
                  Just because the habit is forming doesn&apos;t mean the check-in stops mattering. Filling in your circle each day keeps the goal visible and real. It takes seconds, but that small act of acknowledgment is what separates a habit that sticks from one that quietly fades.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
} 