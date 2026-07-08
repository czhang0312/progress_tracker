'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';
import NavHeader from '@/components/NavHeader';
import PageLoader from '@/components/PageLoader';
import JournalEntryModal from '@/components/JournalEntryModal';
import ProgressCircle from '@/components/ProgressCircle';
import { T, SERIF, TRACKING } from '@/lib/theme';
import { RAILS_API_BASE } from '@/lib/config';
import { getGuestMonthlyProgress, setGuestProgressStatus, updateGuestGoal, deleteGuestGoal, createGuestGoal, reorderGuestGoals } from '@/lib/guestStorage';
import { localDateString, todayLocalDateString } from '@/lib/dateUtils';

// Whether the browser can drive an animation off a scroll container's position
// on the compositor. When true we sync the journal tabs to the table with a CSS
// scroll-driven animation (zero lag, no scroll listener); otherwise we fall back
// to mirroring scrollLeft from a JS scroll event.
const SUPPORTS_SCROLL_TIMELINE =
  typeof CSS !== 'undefined' && !!CSS.supports &&
  CSS.supports('animation-timeline: scroll()') &&
  CSS.supports('timeline-scope: --x');

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

function JournalTabButton({ entry, isFuture, onClick }: {
  entry: JournalEntry | null;
  isFuture: boolean;
  onClick: () => void;
}) {
  const isFilled = !!entry;
  const fill = T.border;
  const stroke = T.ringEmpty;

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
  const tabsStripRef = useRef<HTMLDivElement>(null);
  const tabsGridRef = useRef<HTMLDivElement>(null);
  const todayThRef = useRef<HTMLTableCellElement | null>(null);
  const hasScrolledToTodayRef = useRef(false);

  const year = parseInt(params.year as string);
  const month = parseInt(params.month as string);

  useEffect(() => {
    if (authLoading) return;
    hasScrolledToTodayRef.current = false;
    fetchProgressData();
  }, [year, month, user, authLoading, router]);

  useEffect(() => {
    if (loading || !data || hasScrolledToTodayRef.current) return;
    const container = tableScrollRef.current;
    const todayTh = todayThRef.current;
    if (!container || !todayTh) return;
    const containerRect = container.getBoundingClientRect();
    const todayRect = todayTh.getBoundingClientRect();
    const stickyEl = container.querySelector<HTMLElement>('.sticky-col-head');
    const stickyWidth = stickyEl ? stickyEl.getBoundingClientRect().width : 200;
    const availableWidth = containerRect.width - stickyWidth;
    const targetScrollLeft =
      container.scrollLeft + (todayRect.left - containerRect.left) - stickyWidth - availableWidth / 2 + todayRect.width / 2;
    container.scrollLeft = Math.max(0, targetScrollLeft);
    hasScrolledToTodayRef.current = true;
  }, [loading, data]);

  // Keep the journal-tabs strip horizontally aligned with the table when it overflows.
  // Preferred path: a CSS scroll-driven animation reads the table scroller's position
  // on the compositor, so the tabs track it with zero lag (no scroll event listener).
  // We only need JS to keep the animation's end-translate equal to the scroll range.
  useEffect(() => {
    if (loading || !data) return;
    const tableEl = tableScrollRef.current;
    const tabsEl = tabsStripRef.current;
    const gridEl = tabsGridRef.current;
    if (!tableEl || !tabsEl) return;

    if (SUPPORTS_SCROLL_TIMELINE && gridEl) {
      const setMax = () => {
        const max = tableEl.scrollWidth - tableEl.clientWidth;
        gridEl.style.setProperty('--tabs-max', `${-max}px`);
      };
      setMax();
      const ro = new ResizeObserver(setMax);
      ro.observe(tableEl);
      window.addEventListener('resize', setMax);
      return () => { ro.disconnect(); window.removeEventListener('resize', setMax); };
    }

    // Fallback for browsers without scroll-driven animations: mirror scrollLeft.
    const sync = () => {
      if (tabsEl.scrollLeft !== tableEl.scrollLeft) tabsEl.scrollLeft = tableEl.scrollLeft;
    };
    sync();
    tableEl.addEventListener('scroll', sync, { passive: true });
    return () => tableEl.removeEventListener('scroll', sync);
  }, [loading, data]);

  useEffect(() => {
    if (!editingGoalId) return;
    const updatePos = () => {
      if (!editTdRef.current) return;
      const rect = editTdRef.current.getBoundingClientRect();
      setEditPopoverPos({ top: rect.bottom, left: clampPopoverLeft(rect.left + 10) });
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
      setAddGoalPos({ top: rect.bottom, left: clampPopoverLeft(rect.left + 10) });
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

  // Keep popovers on-screen: their natural width is 480px but capped to the
  // viewport, so clamp the left edge so they never overflow off small screens.
  const clampPopoverLeft = (left: number) => {
    if (typeof window === 'undefined') return left;
    const w = Math.min(480, window.innerWidth - 16);
    return Math.max(8, Math.min(left, window.innerWidth - w - 8));
  };

  const openAddGoal = (e: React.MouseEvent<HTMLButtonElement>) => {
    setEditingGoalId(null);
    if (showAddGoal) {
      setShowAddGoal(false);
      return;
    }
    const td = (e.currentTarget as HTMLElement).closest('td')!;
    addGoalTdRef.current = td as HTMLElement;
    const rect = td.getBoundingClientRect();
    setAddGoalPos({ top: rect.bottom, left: clampPopoverLeft(rect.left + 10) });
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

  const openGoalEdit = (goal: Goal, e: React.MouseEvent<HTMLElement>) => {
    setShowAddGoal(false);
    if (editingGoalId === goal.id) {
      setEditingGoalId(null);
      return;
    }
    const td = (e.currentTarget as HTMLElement).closest('td')!;
    editTdRef.current = td as HTMLElement;
    const rect = td.getBoundingClientRect();
    setEditPopoverPos({ top: rect.bottom, left: clampPopoverLeft(rect.left + 10) });
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
          <div className="w-16 h-16 bg-danger-tint rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-danger text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-danger mb-2">Something went wrong</h1>
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
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <div className="min-h-screen">
      {editingGoalId && editPopoverPos && (
        <div
          ref={editPopoverRef}
          className="fixed z-[200] w-[480px] max-w-[calc(100vw-16px)] bg-surface border border-edge rounded overflow-hidden"
          style={{ top: editPopoverPos.top, left: editPopoverPos.left, boxShadow: 'var(--shadow-overlay)' }}
        >
          <form id="edit-goal-form" onSubmit={handleGoalEditSubmit} className="space-y-3 p-4 pb-3">
            <div className="flex items-center gap-3">
              <input
                type="text"
                name="name"
                value={editFormData.name}
                onChange={handleGoalEditChange}
                placeholder="Add goal name"
                className={`flex-1 min-w-0 bg-transparent border-none outline-none focus:ring-0 font-semibold text-neutral-800 placeholder:text-neutral-300 ${editErrors.name ? 'text-danger' : ''}`}
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
            {editErrors.name && <p className="mt-0.5 text-xs text-danger">{editErrors.name}</p>}

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
                  className={`w-full rounded-lg bg-neutral-100 border-none outline-none text-xs px-3 py-2 text-neutral-700 placeholder:text-neutral-400 focus:ring-0 ${editErrors.description ? 'ring-2 ring-danger' : ''}`}
                />
                {editErrors.description && <p className="mt-0.5 text-xs text-danger">{editErrors.description}</p>}
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
              className="ml-auto text-neutral-400 hover:text-danger p-1.5 rounded transition-colors"
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
          className="fixed z-[200] w-[480px] max-w-[calc(100vw-16px)] bg-surface border border-edge rounded overflow-hidden"
          style={{ top: addGoalPos.top, left: addGoalPos.left, boxShadow: 'var(--shadow-overlay)' }}
        >
          <form id="add-goal-form" onSubmit={handleAddGoalSubmit} className="space-y-3 p-4 pb-3">
            <div>
              <input
                type="text"
                name="name"
                value={addGoalFormData.name}
                onChange={(e) => setAddGoalFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Add goal name"
                className={`w-full bg-transparent border-none outline-none focus:ring-0 font-semibold text-neutral-800 placeholder:text-neutral-300 ${addGoalErrors.name ? 'text-danger' : ''}`}
                style={{ fontSize: '15px' }}
                autoFocus
                required
              />
              {addGoalErrors.name && <p className="mt-0.5 text-xs text-danger">{addGoalErrors.name}</p>}
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

            <div className="flex items-center gap-[6px] p-1 rounded bg-surface border border-edge">
              <Link
                href={`/progress/${prevMonth.year}/${prevMonth.month}`}
                className="w-[30px] h-[30px] rounded-[6px] flex items-center justify-center text-neutral-500 hover:bg-neutral-100 transition-colors duration-[120ms]"
                title={new Date(prevMonth.year, prevMonth.month - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </Link>
              {isCurrentMonth ? (
                <span className="h-[30px] flex items-center px-[12px] rounded-[6px] text-xs font-semibold text-neutral-400 cursor-default select-none">
                  Today
                </span>
              ) : (
                <Link
                  href={`/progress/${now.getFullYear()}/${now.getMonth() + 1}`}
                  className="h-[30px] flex items-center px-[12px] rounded-[6px] text-xs font-semibold text-neutral-900 hover:bg-neutral-100 transition-colors duration-[120ms]"
                >
                  Today
                </Link>
              )}
              <Link
                href={`/progress/${nextMonth.year}/${nextMonth.month}`}
                className="w-[30px] h-[30px] rounded-[6px] flex items-center justify-center text-neutral-500 hover:bg-neutral-100 transition-colors duration-[120ms]"
                title={new Date(nextMonth.year, nextMonth.month - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="animate-fade-in mt-4" style={{ timelineScope: '--tableScroll' }}>
            {/* Journal tab strip — sits above the table card, one tab per day */}
            <div style={{ marginRight: 10 }}>
            <div
              ref={tabsStripRef}
              className="journal-tabs-strip"
              style={SUPPORTS_SCROLL_TIMELINE ? { overflowX: 'hidden' } : undefined}
            >
              {/* In transform mode the grid's sticky cell can't stick (no real scroll),
                  so this non-translated cover masks tabs sliding under the first column. */}
              {SUPPORTS_SCROLL_TIMELINE && (
                <div aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: 0,
                  width: 'var(--sticky-w)', background: T.bg, zIndex: 6 }}>
                  <div style={{ position: 'absolute', bottom: 0, left: 11, right: 0,
                    borderBottom: `1px solid ${T.border}` }} />
                </div>
              )}
              <div
                ref={tabsGridRef}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `var(--sticky-w) repeat(${data.days_in_month}, 40px) 8px`,
                  alignItems: 'end', width: 'min-content',
                  ...(SUPPORTS_SCROLL_TIMELINE ? {
                    animationName: 'tabsSync', animationDuration: '1ms',
                    animationTimingFunction: 'linear', animationFillMode: 'both',
                    animationTimeline: '--tableScroll', willChange: 'transform',
                  } : null),
                }}
              >
                <div style={{ position: 'sticky', left: 0, zIndex: 5,
                  alignSelf: 'stretch', background: T.bg }}>
                  <div style={{ position: 'absolute', bottom: 0, left: 11, right: 0,
                    borderBottom: `1px solid ${T.border}` }} />
                </div>
                {Array.from({ length: data.days_in_month }, (_, i) => {
                  const day = i + 1;
                  const date = localDateString(new Date(year, month - 1, day));
                  return (
                    <JournalTabButton key={day}
                      entry={getJournalEntry(date)}
                      isFuture={date > todayLocalDateString()}
                      onClick={() => handleJournalClick(date)} />
                  );
                })}
                <div />
              </div>
            </div>
            </div>

            {/* Main table card */}
            <div style={{ background: T.surface, borderRadius: 'var(--radius)', border: `1px solid ${T.border}`,
              boxShadow: '0 1px 2px rgba(15,23,42,.04), 0 4px 16px -8px rgba(15,23,42,.08)',
              overflow: 'hidden' }}>
              <div ref={tableScrollRef} className="scrollbar-thin"
                style={{ overflowX: 'auto', overscrollBehaviorX: 'none', scrollTimelineName: '--tableScroll', scrollTimelineAxis: 'x' }}>
                <table className="progress-table" style={{ minWidth: 'min-content' }}>
                  <thead>
                    <tr>
                      <th className="sticky-col-head" style={{
                        width: 'var(--sticky-w)', minWidth: 'var(--sticky-w)', maxWidth: 'var(--sticky-w)', background: T.bg,
                        borderBottom: `1px solid ${T.border}`,
                        textAlign: 'left', padding: '12px 16px 12px 26px',
                        color: T.muted, textTransform: 'uppercase',
                        fontSize: 10, letterSpacing: TRACKING }}>
                        Goal
                      </th>
                      {Array.from({ length: data.days_in_month }, (_, i) => {
                        const day = i + 1;
                        const date = localDateString(new Date(year, month - 1, day));
                        const isToday = date === todayLocalDateString();
                        const isFuture = date > todayLocalDateString();
                        const jsDate = new Date(year, month - 1, day);
                        const dow = jsDate.toLocaleDateString('en-US', { weekday: 'narrow' });
                        return (
                          <th key={day}
                            ref={(el) => { if (isToday) todayThRef.current = el; }}
                            style={{ minWidth: 40, width: 40,
                              background: isToday ? T.accentTint : T.bg,
                              borderBottom: `1px solid ${T.border}`, padding: 0 }}>
                            <button className="day-header-btn"
                              onClick={() => handleJournalClick(date)}
                              style={{ cursor: 'pointer', opacity: isFuture ? 0.4 : 1 }}>
                              <div style={{ fontSize: 10, color: T.muted,
                                fontWeight: 600, letterSpacing: TRACKING, marginBottom: 1 }}>
                                {dow}
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 600,
                                color: isToday ? T.accent : T.ink, lineHeight: 1 }}>
                                {day}
                              </div>
                            </button>
                          </th>
                        );
                      })}
                      <th style={{ minWidth: 8, background: T.bg, borderBottom: `1px solid ${T.border}` }} />
                    </tr>
                  </thead>
                  <tbody>
                    {data.goals.map((goal) => (
                      <tr key={goal.id}
                        onDragOver={(e) => handleDragOver(e, goal.id)}
                        onDrop={(e) => handleDrop(e, goal.id)}
                        onDragEnd={handleDragEnd}
                        className={`${draggingGoalId === goal.id ? 'dragging' : ''} ${dragOverGoalId === goal.id && draggingGoalId !== null && draggingGoalId !== goal.id ? 'drag-over' : ''}`}>
                        <td className="sticky-col goal-row-cell" draggable
                          onDragStart={() => handleDragStart(goal.id)}
                          style={{ background: T.surface,
                            padding: '8px 12px', cursor: 'grab' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 14, userSelect: 'none' }}>
                            {/* Name + description */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div onClick={(e) => openGoalEdit(goal, e)} title="Click to edit"
                                style={{ fontWeight: 600, fontSize: 13, color: T.ink, lineHeight: 1.3,
                                  padding: '2px 6px', margin: '0 -6px', borderRadius: 6, cursor: 'grab',
                                  wordBreak: 'break-word',
                                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden' }}>
                                {goal.name}
                              </div>
                              {goal.description && (
                                <div onClick={(e) => openGoalEdit(goal, e)}
                                  title={`${goal.description}\n\nClick to edit`}
                                  style={{ fontSize: 12, color: T.faint,
                                    lineHeight: 1.4, padding: '1px 6px', margin: '2px -6px 0', borderRadius: 4,
                                    cursor: 'grab',
                                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden' }}>
                                  {goal.description}
                                </div>
                              )}
                            </div>

                            {/* Edit menu — 3-dot vertical */}
                            <button
                              onClick={(e) => openGoalEdit(goal, e)}
                              title="Edit goal" aria-label="Edit goal"
                              style={{ border: `1px solid ${T.border}`, background: 'transparent', color: T.muted,
                                cursor: 'pointer', padding: '4px 2px', lineHeight: 0, fontSize: 14,
                                borderRadius: 4, flexShrink: 0, alignSelf: 'flex-start',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center', width: 22, height: 24 }}>
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style={{ opacity: 0.6 }}>
                                <circle cx="8" cy="3" r="1.5" />
                                <circle cx="8" cy="8" r="1.5" />
                                <circle cx="8" cy="13" r="1.5" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        {Array.from({ length: data.days_in_month }, (_, i) => {
                          const day = i + 1;
                          const date = localDateString(new Date(year, month - 1, day));
                          const status = getProgressStatus(goal.id, date);
                          const isToday = date === todayLocalDateString();
                          const isFuture = date > todayLocalDateString();
                          const isBeforeCreation = date < (goal.started_at ?? goal.created_at?.substring(0, 10) ?? '');

                          return (
                            <td key={day} style={{ textAlign: 'center', padding: '5px 2px',
                              background: isToday ? T.accentTint : undefined }}>
                              {!isBeforeCreation && (
                                <ProgressCircle status={status} size={28}
                                  onClick={() => updateProgress(goal.id, date, status)}
                                  isFuture={isFuture} />
                              )}
                            </td>
                          );
                        })}
                        <td style={{ background: T.surface }} />
                      </tr>
                    ))}

                    {/* Add goal row */}
                    <tr>
                      <td className="sticky-col" colSpan={1}
                        style={{ background: T.surface, padding: '6px 10px',
                          borderBottom: `1px solid ${T.border}` }}>
                        <button onClick={openAddGoal}
                          style={{ width: '100%', textAlign: 'left', background: 'transparent',
                            border: 'none', cursor: 'pointer', padding: '7px 4px 7px 22px',
                            fontFamily: 'inherit', fontSize: 13, color: T.faint, fontWeight: 500,
                            borderRadius: 6, transition: 'all .12s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = T.accent; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = T.faint; }}>
                          + Add a goal
                        </button>
                      </td>
                      <td colSpan={data.days_in_month + 1}
                        style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }} />
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Legend strip */}
              <div style={{ padding: '10px 18px', borderTop: `1px solid ${T.border}`,
                background: T.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 14, fontSize: 11, color: T.muted, alignItems: 'center' }}>
                  {([['Empty', 0], ['Halfway', 1], ['Done', 2]] as const).map(([label, s]) => (
                    <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <ProgressCircle status={s} size={16} />
                      {label}
                    </span>
                  ))}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                    <svg width="14" height="6" viewBox="0 0 44 16" preserveAspectRatio="none" style={{ display: 'block' }}>
                      <path d="M0 16 L6 3 Q7 0 10 0 L34 0 Q37 0 38 3 L44 16 Z"
                        fill={T.border} stroke={T.ringEmpty} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                    </svg>
                    Journal entry
                  </span>
                </div>
                <div style={{ fontSize: 11, color: T.faint }}>
                  {data.goals.length} goal{data.goals.length === 1 ? '' : 's'} · drag to reorder
                </div>
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
              className="text-[32px] font-medium text-neutral-900 leading-[1.15] tracking-[-0.02em] mb-4"
              style={{ fontFamily: SERIF }}
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
                className="text-[32px] font-normal italic leading-none tracking-[-0.02em] text-accent"
                style={{ fontFamily: SERIF }}
              >
                01
              </span>
              <span className="text-[11px] font-semibold tracking-[.08em] uppercase text-neutral-500">
                Phase · Goal-initiating
              </span>
            </div>
            <p className="text-[15px] leading-[1.7] text-neutral-500 max-w-[720px] mb-[22px]">
              Motivation is highest on day one but reality hits fast. The goal turns out to be bigger than expected, obstacles you didn&apos;t plan for show up, and most people quietly abandon ship within the first two weeks. This app is built around two small forces that get you through this critical period:
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 max-w-[420px] mx-auto w-full">

            {/* Card 1: Honest Tracking */}
            <div className="bg-surface border border-edge rounded p-6 flex flex-col gap-3">
              <div className="text-accent h-8 flex items-center opacity-90">
                <svg viewBox="0 0 80 40" width="72" height="36" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="14" cy="20" r="10" fill="currentColor" />
                  <path d="M10 20 l3 3 6 -6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <circle cx="40" cy="20" r="10" />
                  <path d="M40 20 L47.1 12.9 A10 10 0 0 0 40 10 A10 10 0 0 0 32.9 27.1 Z" fill="currentColor" stroke="none" />
                  <circle cx="66" cy="20" r="10" opacity="0.4" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-[.08em] uppercase text-neutral-400 mb-1.5">Honest Tracking</p>
                <h3
                  className="text-xl font-medium text-neutral-900 leading-snug tracking-[-0.01em] mb-2.5"
                  style={{ fontFamily: SERIF }}
                >A circle that tells the truth</h3>
                <p className="text-[13px] leading-[1.6] text-neutral-500">
                  Each day you mark how it really went — done, partially done, or not done. No streaks to protect, no all-or-nothing pressure. A partial is still a day you showed up. Watching that honest record fill in across the weeks is quietly more motivating than any perfect streak could be.
                </p>
              </div>
            </div>

            {/* Card 2: Reflection */}
            <div className="bg-surface border border-edge rounded p-6 flex flex-col gap-3">
              <div className="text-accent h-8 flex items-center opacity-90">
                <svg viewBox="0 0 80 40" width="64" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 14 h44 M8 22 h34 M8 30 h26" />
                  <path d="M62 8 l8 8 -22 22 h-8 v-8 z" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-[.08em] uppercase text-neutral-400 mb-1.5">Reflection</p>
                <h3
                  className="text-xl font-medium text-neutral-900 leading-snug tracking-[-0.01em] mb-2.5"
                  style={{ fontFamily: SERIF }}
                >A few lines a day changes everything</h3>
                <p className="text-[13px] leading-[1.6] text-neutral-500">
                  A short daily journal entry turns chaos into clarity. When something goes wrong, you write it down. When the goal feels too big, you write that down too. Patterns emerge fast — and so do the small adjustments that make the next day easier than the last.
                </p>
              </div>
            </div>
          </div>

          {/* Then divider */}
          <div className="max-w-[1000px] mx-auto my-10 flex items-center gap-3.5 text-neutral-400">
            <div className="flex-1 h-px bg-neutral-200" />
            <span className="text-[11px] font-semibold tracking-[.08em] uppercase">Then</span>
            <div className="flex-1 h-px bg-neutral-200" />
          </div>

          {/* Phase 2 */}
          <div className="max-w-[1000px] mx-auto mb-[10px]">
            <div className="flex items-baseline gap-3.5 mb-[10px] flex-wrap">
              <span
                className="text-[32px] font-normal italic leading-none tracking-[-0.02em] text-accent"
                style={{ fontFamily: SERIF }}
              >
                02
              </span>
              <span className="text-[11px] font-semibold tracking-[.08em] uppercase text-neutral-500">
                Phase · Goal-tracking
              </span>
            </div>
            <p className="text-[15px] leading-[1.7] text-neutral-500 max-w-[720px] mb-[22px]">
              The hardest part is behind you. After the inital two weeks, the goal has been stress-tested, adjusted, and survived. Now the work shifts from figuring it out to showing up consistently — and that still requires a daily signal.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 max-w-[420px] mx-auto w-full">

            {/* Card 3: Keep Filling the Circles */}
            <div className="bg-surface border border-edge rounded p-6 flex flex-col gap-3">
              <div className="text-accent h-8 flex items-center opacity-90">
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
                <p className="text-[11px] font-semibold tracking-[.08em] uppercase text-neutral-400 mb-1.5">Keep Filling the Circles</p>
                <h3
                  className="text-xl font-medium text-neutral-900 leading-snug tracking-[-0.01em] mb-2.5"
                  style={{ fontFamily: SERIF }}
                >Consistency is built, not assumed</h3>
                <p className="text-[13px] leading-[1.6] text-neutral-500">
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