import { RAILS_API_BASE } from './config';
import {
  clearGuestFinishedTasks,
  completeGuestPomodoroSession,
  createGuestTask,
  deleteGuestTask,
  getGuestTasks,
  resetGuestPomodoros,
  updateGuestTask,
} from './guestStorage';

export interface Task {
  id: number;
  goal_id: number | null;
  name: string;
  note?: string | null;
  estimated_pomodoros: number;
  completed_pomodoros: number;
  done: boolean;
  position: number;
}

// The slice of a goal the pomodoro page needs (works for both the Rails
// goal JSON and GuestGoal).
export interface PomodoroGoal {
  id: number;
  name: string;
  target_pomodoros?: number | null;
}

export interface TaskInput {
  name?: string;
  note?: string;
  goal_id?: number | null;
  estimated_pomodoros?: number;
  completed_pomodoros?: number;
  done?: boolean;
}

export interface SessionResult {
  task: { id: number; completed_pomodoros: number } | null;
  daily_progress: { goal_id: number; date: string; status: number } | null;
}

type MaybeUser = { is_guest?: boolean } | null | undefined;

const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${RAILS_API_BASE}${path}`, {
    credentials: 'include',
    headers: JSON_HEADERS,
    ...init,
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export async function listTasks(user: MaybeUser): Promise<Task[]> {
  if (user?.is_guest) {
    return getGuestTasks();
  }
  return request<Task[]>('/tasks');
}

export async function createTask(user: MaybeUser, input: TaskInput & { name: string }): Promise<Task> {
  if (user?.is_guest) {
    return createGuestTask(input);
  }
  return request<Task>('/tasks', { method: 'POST', body: JSON.stringify({ task: input }) });
}

export async function updateTask(user: MaybeUser, taskId: number, input: TaskInput): Promise<Task> {
  if (user?.is_guest) {
    const task = updateGuestTask(taskId, input);
    if (!task) throw new Error('Task not found');
    return task;
  }
  return request<Task>(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ task: input }) });
}

export async function deleteTask(user: MaybeUser, taskId: number): Promise<void> {
  if (user?.is_guest) {
    deleteGuestTask(taskId);
    return;
  }
  await request<void>(`/tasks/${taskId}`, { method: 'DELETE' });
}

export async function clearFinishedTasks(user: MaybeUser): Promise<void> {
  if (user?.is_guest) {
    clearGuestFinishedTasks();
    return;
  }
  await request<{ success: boolean }>('/tasks/clear_finished', { method: 'DELETE' });
}

// Zeroes out every task's completed pomodoro count so tasks can be reused on
// a fresh day without losing their name/estimate/goal link.
export async function resetPomodoros(user: MaybeUser): Promise<void> {
  if (user?.is_guest) {
    resetGuestPomodoros();
    return;
  }
  await request<{ success: boolean }>('/tasks/reset_pomodoros', { method: 'PATCH' });
}

// Records a completed pomodoro; for goal-linked tasks the backend (or the
// guest mirror) also auto-fills the goal's progress circle for the day.
export async function completeSession(
  user: MaybeUser,
  input: { taskId: number | null; date: string; durationMinutes: number }
): Promise<SessionResult> {
  if (user?.is_guest) {
    return completeGuestPomodoroSession({
      task_id: input.taskId,
      date: input.date,
      duration_minutes: input.durationMinutes,
    });
  }
  return request<SessionResult>('/pomodoro_sessions', {
    method: 'POST',
    body: JSON.stringify({
      task_id: input.taskId,
      date: input.date,
      duration_minutes: input.durationMinutes,
    }),
  });
}
