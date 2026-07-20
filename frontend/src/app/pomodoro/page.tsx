'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import NavHeader from '@/components/NavHeader';
import PageLoader from '@/components/PageLoader';
import TimerCard from '@/components/pomodoro/TimerCard';
import TaskList from '@/components/pomodoro/TaskList';
import TimerSettingsModal from '@/components/pomodoro/TimerSettingsModal';
import { durationMs, usePomodoroTimer } from '@/hooks/usePomodoroTimer';
import {
  DEFAULT_SETTINGS,
  PomodoroSettings,
  loadPomodoroSettings,
  savePomodoroSettings,
} from '@/lib/pomodoroSettings';
import {
  PomodoroGoal,
  Task,
  TaskInput,
  clearFinishedTasks,
  completeSession,
  createTask,
  deleteTask,
  listTasks,
  reorderTasks,
  resetPomodoros,
  updateTask,
} from '@/lib/pomodoroData';
import { RAILS_API_BASE } from '@/lib/config';
import { getGuestGoals } from '@/lib/guestStorage';
import { todayLocalDateString } from '@/lib/dateUtils';
import { T } from '@/lib/theme';

async function fetchGoals(user: { is_guest?: boolean } | null | undefined): Promise<PomodoroGoal[]> {
  if (user?.is_guest) {
    return getGuestGoals();
  }
  const res = await fetch(`${RAILS_API_BASE}/goals`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  return res.ok ? res.json() : [];
}

export default function PomodoroPage() {
  const { user, loading } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<PomodoroGoal[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const draggingTaskIdRef = useRef<number | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<number | null>(null);

  // Settings live in localStorage; read after mount to avoid an SSR mismatch.
  useEffect(() => {
    setSettings(loadPomodoroSettings());
  }, []);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      try {
        const [taskList, goalList] = await Promise.all([listTasks(user), fetchGoals(user)]);
        if (!cancelled) {
          setTasks(taskList);
          setGoals(goalList);
        }
      } catch (err) {
        console.error('Failed to load pomodoro data:', err);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(id);
  }, [notice]);

  // Fires when a pomodoro finishes (including skips): records the session,
  // syncs the task's count, and surfaces goal auto-fill in a notice.
  const handlePomodoroComplete = useCallback(
    async (taskId: number | null) => {
      try {
        const result = await completeSession(user, {
          taskId,
          date: todayLocalDateString(),
          durationMinutes: settings.pomodoroMinutes,
        });
        if (result.task) {
          const completed = result.task;
          setTasks((prev) =>
            prev.map((t) => (t.id === completed.id ? { ...t, completed_pomodoros: completed.completed_pomodoros } : t))
          );
        }
        if (result.daily_progress) {
          const goal = goals.find((g) => g.id === result.daily_progress?.goal_id);
          if (goal) {
            setNotice(
              result.daily_progress.status === 2
                ? `${goal.name} — today's circle is filled ✓`
                : `${goal.name} — today's circle is half-filled`
            );
          }
        }
      } catch (err) {
        console.error('Failed to record pomodoro session:', err);
        setNotice('Could not save that pomodoro. It still counts — try finishing the next one.');
      }
    },
    [user, settings.pomodoroMinutes, goals]
  );

  const timer = usePomodoroTimer(settings, handlePomodoroComplete);
  const activeTask = tasks.find((t) => t.id === timer.activeTaskId) ?? null;

  const handleCreate = useCallback(
    async (input: TaskInput & { name: string }) => {
      try {
        const created = await createTask(user, input);
        setTasks((prev) => [...prev, created]);
      } catch (err) {
        console.error('Failed to create task:', err);
      }
    },
    [user]
  );

  const handleUpdate = useCallback(
    async (taskId: number, input: TaskInput) => {
      try {
        const updated = await updateTask(user, taskId, input);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      } catch (err) {
        console.error('Failed to update task:', err);
      }
    },
    [user]
  );

  const handleDelete = useCallback(
    async (taskId: number) => {
      try {
        await deleteTask(user, taskId);
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        if (timer.activeTaskId === taskId) timer.setActiveTaskId(null);
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
    },
    [user, timer]
  );

  const handleToggleDone = useCallback(
    (task: Task) => handleUpdate(task.id, { done: !task.done }),
    [handleUpdate]
  );

  const handleClearFinished = useCallback(async () => {
    try {
      await clearFinishedTasks(user);
      setTasks((prev) => {
        const kept = prev.filter((t) => !t.done);
        if (timer.activeTaskId !== null && !kept.some((t) => t.id === timer.activeTaskId)) {
          timer.setActiveTaskId(null);
        }
        return kept;
      });
    } catch (err) {
      console.error('Failed to clear finished tasks:', err);
    }
  }, [user, timer]);

  const handleResetPomodoros = useCallback(async () => {
    try {
      await resetPomodoros(user);
      setTasks((prev) => prev.map((t) => (t.completed_pomodoros === 0 ? t : { ...t, completed_pomodoros: 0 })));
    } catch (err) {
      console.error('Failed to reset pomodoros:', err);
    }
  }, [user]);

  const handleTaskDragStart = useCallback((taskId: number) => {
    setDraggingTaskId(taskId);
    draggingTaskIdRef.current = taskId;
  }, []);

  const handleTaskDragOver = useCallback((e: React.DragEvent, taskId: number) => {
    e.preventDefault();
    if (draggingTaskIdRef.current !== taskId) setDragOverTaskId(taskId);
  }, []);

  const handleTaskDrop = useCallback(
    async (e: React.DragEvent, targetTaskId: number) => {
      e.preventDefault();
      const sourceTaskId = draggingTaskIdRef.current;
      setDraggingTaskId(null);
      draggingTaskIdRef.current = null;
      setDragOverTaskId(null);
      if (!sourceTaskId || sourceTaskId === targetTaskId) return;

      const reordered = [...tasks];
      const sourceIndex = reordered.findIndex((t) => t.id === sourceTaskId);
      const targetIndex = reordered.findIndex((t) => t.id === targetTaskId);
      if (sourceIndex === -1 || targetIndex === -1) return;
      const [removed] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, removed);
      setTasks(reordered);

      try {
        await reorderTasks(user, reordered.map((t) => t.id));
      } catch (err) {
        console.error('Failed to reorder tasks:', err);
      }
    },
    [tasks, user]
  );

  const handleTaskDragEnd = useCallback(() => {
    setDraggingTaskId(null);
    draggingTaskIdRef.current = null;
    setDragOverTaskId(null);
  }, []);

  if (loading || dataLoading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-bg">
      <NavHeader />
      <main className="max-w-[620px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <TimerCard
          mode={timer.mode}
          status={timer.status}
          remainingMs={timer.remainingMs}
          totalMs={durationMs(timer.mode, settings)}
          pomodorosInCycle={timer.pomodorosInCycle}
          activeTaskName={activeTask?.name ?? null}
          onStart={timer.start}
          onPause={timer.pause}
          onSkip={timer.skip}
          onSwitchMode={timer.switchMode}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {notice && (
          <p
            role="status"
            style={{
              margin: '14px 0 0', textAlign: 'center',
              fontSize: 13, fontWeight: 500, color: T.accent,
              animation: 'fadeIn .25s ease-out',
            }}
          >
            {notice}
          </p>
        )}

        <TaskList
          tasks={tasks}
          goals={goals}
          settings={settings}
          activeTaskId={timer.activeTaskId}
          onSelectTask={timer.setActiveTaskId}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onToggleDone={handleToggleDone}
          onClearFinished={handleClearFinished}
          onResetPomodoros={handleResetPomodoros}
          draggingTaskId={draggingTaskId}
          dragOverTaskId={dragOverTaskId}
          onTaskDragStart={handleTaskDragStart}
          onTaskDragOver={handleTaskDragOver}
          onTaskDrop={handleTaskDrop}
          onTaskDragEnd={handleTaskDragEnd}
        />
      </main>

      {settingsOpen && (
        <TimerSettingsModal
          settings={settings}
          onSave={(next) => {
            savePomodoroSettings(next);
            setSettings(next);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
