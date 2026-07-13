import { localDateString, todayLocalDateString } from './dateUtils';

export interface GuestGoal {
  id: number;
  name: string;
  description: string;
  position: number;
  created_at?: string; // YYYY-MM-DD
  started_at?: string; // YYYY-MM-DD, user-editable tracking start date
  target_pomodoros?: number | null; // daily pomodoro target; null = no auto-fill
}

export interface GuestJournalEntry {
  id: number;
  date: string;
  content: string;
}

export interface GuestDailyProgress {
  goal_id: number;
  date: string;
  status: number;
}

export interface GuestTask {
  id: number;
  goal_id: number | null;
  name: string;
  note?: string;
  estimated_pomodoros: number;
  completed_pomodoros: number;
  done: boolean;
  position: number;
}

export interface GuestPomodoroSession {
  id: number;
  task_id: number | null;
  goal_id: number | null;
  date: string;
  duration_minutes: number;
}

interface GuestStore {
  goals: GuestGoal[];
  journalEntries: GuestJournalEntry[];
  dailyProgresses: GuestDailyProgress[];
  tasks: GuestTask[];
  pomodoroSessions: GuestPomodoroSession[];
  nextGoalId: number;
  nextJournalEntryId: number;
  nextTaskId: number;
  nextPomodoroSessionId: number;
}

const STORE_KEY = 'progress_tracker_guest_store_v1';

const defaultStore: GuestStore = {
  goals: [],
  journalEntries: [],
  dailyProgresses: [],
  tasks: [],
  pomodoroSessions: [],
  nextGoalId: -1,
  nextJournalEntryId: -1,
  nextTaskId: -1,
  nextPomodoroSessionId: -1,
};

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readStore(): GuestStore {
  if (!canUseStorage()) {
    return defaultStore;
  }

  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) {
      return defaultStore;
    }

    const parsed = JSON.parse(raw) as Partial<GuestStore>;
    return {
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      journalEntries: Array.isArray(parsed.journalEntries) ? parsed.journalEntries : [],
      dailyProgresses: Array.isArray(parsed.dailyProgresses) ? parsed.dailyProgresses : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      pomodoroSessions: Array.isArray(parsed.pomodoroSessions) ? parsed.pomodoroSessions : [],
      nextGoalId: typeof parsed.nextGoalId === 'number' ? parsed.nextGoalId : -1,
      nextJournalEntryId: typeof parsed.nextJournalEntryId === 'number' ? parsed.nextJournalEntryId : -1,
      nextTaskId: typeof parsed.nextTaskId === 'number' ? parsed.nextTaskId : -1,
      nextPomodoroSessionId: typeof parsed.nextPomodoroSessionId === 'number' ? parsed.nextPomodoroSessionId : -1,
    };
  } catch {
    return defaultStore;
  }
}

function writeStore(store: GuestStore) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export function getGuestGoals(): GuestGoal[] {
  return readStore().goals.sort((a, b) => a.position - b.position);
}

export function getGuestGoal(goalId: number): GuestGoal | null {
  return readStore().goals.find((goal) => goal.id === goalId) || null;
}

export function createGuestGoal(input: { name: string; description: string; target_pomodoros?: number | null }): GuestGoal {
  const store = readStore();
  const maxPosition = store.goals.reduce((max, goal) => Math.max(max, goal.position), 0);

  const today = todayLocalDateString();
  const goal: GuestGoal = {
    id: store.nextGoalId,
    name: input.name,
    description: input.description,
    position: maxPosition + 1,
    created_at: today,
    started_at: today,
    target_pomodoros: input.target_pomodoros ?? null,
  };

  store.goals.push(goal);
  store.nextGoalId -= 1;
  writeStore(store);

  return goal;
}

export function updateGuestGoal(goalId: number, input: { name: string; description: string; started_at?: string; target_pomodoros?: number | null }): GuestGoal | null {
  const store = readStore();
  const goal = store.goals.find((item) => item.id === goalId);
  if (!goal) {
    return null;
  }

  goal.name = input.name;
  goal.description = input.description;
  if (input.started_at !== undefined) goal.started_at = input.started_at;
  if (input.target_pomodoros !== undefined) goal.target_pomodoros = input.target_pomodoros;
  writeStore(store);

  return goal;
}

export function deleteGuestGoal(goalId: number) {
  const store = readStore();
  store.goals = store.goals.filter((goal) => goal.id !== goalId);
  store.dailyProgresses = store.dailyProgresses.filter((dp) => dp.goal_id !== goalId);

  // Mirror the server's FK nullify: linked tasks and sessions survive unlinked.
  store.tasks.forEach((task) => {
    if (task.goal_id === goalId) task.goal_id = null;
  });
  store.pomodoroSessions.forEach((session) => {
    if (session.goal_id === goalId) session.goal_id = null;
  });

  store.goals
    .sort((a, b) => a.position - b.position)
    .forEach((goal, index) => {
      goal.position = index + 1;
    });

  writeStore(store);
}

export function reorderGuestGoals(goalIds: number[]) {
  const store = readStore();
  const goalMap = new Map(store.goals.map((goal) => [goal.id, goal]));

  goalIds.forEach((goalId, index) => {
    const goal = goalMap.get(goalId);
    if (goal) {
      goal.position = index + 1;
    }
  });

  writeStore(store);
}

export function getGuestJournalEntries(): GuestJournalEntry[] {
  return readStore().journalEntries.sort((a, b) => a.date.localeCompare(b.date));
}

export function getGuestJournalEntry(entryId: number): GuestJournalEntry | null {
  return readStore().journalEntries.find((entry) => entry.id === entryId) || null;
}

export function createGuestJournalEntry(input: { date: string; content: string }): GuestJournalEntry {
  const store = readStore();

  const existingForDate = store.journalEntries.find((entry) => entry.date === input.date);
  if (existingForDate) {
    existingForDate.content = input.content;
    writeStore(store);
    return existingForDate;
  }

  const entry: GuestJournalEntry = {
    id: store.nextJournalEntryId,
    date: input.date,
    content: input.content,
  };

  store.journalEntries.push(entry);
  store.nextJournalEntryId -= 1;
  writeStore(store);

  return entry;
}

export function updateGuestJournalEntry(entryId: number, input: { date: string; content: string }): GuestJournalEntry | null {
  const store = readStore();
  const entry = store.journalEntries.find((item) => item.id === entryId);
  if (!entry) {
    return null;
  }

  const duplicateDate = store.journalEntries.find((item) => item.date === input.date && item.id !== entryId);
  if (duplicateDate) {
    duplicateDate.content = input.content;
    store.journalEntries = store.journalEntries.filter((item) => item.id !== entryId);
    writeStore(store);
    return duplicateDate;
  }

  entry.date = input.date;
  entry.content = input.content;
  writeStore(store);
  return entry;
}

export function deleteGuestJournalEntry(entryId: number) {
  const store = readStore();
  store.journalEntries = store.journalEntries.filter((entry) => entry.id !== entryId);
  writeStore(store);
}

export function getGuestProgressStatus(goalId: number, date: string): number {
  const store = readStore();
  const progress = store.dailyProgresses.find((dp) => dp.goal_id === goalId && dp.date === date);
  return progress?.status || 0;
}

export function setGuestProgressStatus(goalId: number, date: string, status: number) {
  const store = readStore();
  const progress = store.dailyProgresses.find((dp) => dp.goal_id === goalId && dp.date === date);

  if (progress) {
    progress.status = status;
  } else {
    store.dailyProgresses.push({ goal_id: goalId, date, status });
  }

  writeStore(store);
}

export function getGuestTasks(): GuestTask[] {
  return readStore().tasks.sort((a, b) => a.position - b.position || a.id - b.id);
}

export function createGuestTask(input: {
  name: string;
  note?: string;
  goal_id?: number | null;
  estimated_pomodoros?: number;
}): GuestTask {
  const store = readStore();
  const maxPosition = store.tasks.reduce((max, task) => Math.max(max, task.position), 0);
  const goal = input.goal_id != null ? store.goals.find((g) => g.id === input.goal_id) : undefined;

  const task: GuestTask = {
    id: store.nextTaskId,
    goal_id: goal?.id ?? null,
    name: input.name,
    note: input.note,
    // A goal-linked task inherits the goal's daily target as its estimate.
    estimated_pomodoros: input.estimated_pomodoros ?? goal?.target_pomodoros ?? 1,
    completed_pomodoros: 0,
    done: false,
    position: maxPosition + 1,
  };

  store.tasks.push(task);
  store.nextTaskId -= 1;
  writeStore(store);

  return task;
}

export function updateGuestTask(
  taskId: number,
  input: Partial<Pick<GuestTask, 'name' | 'note' | 'goal_id' | 'estimated_pomodoros' | 'completed_pomodoros' | 'done'>>
): GuestTask | null {
  const store = readStore();
  const task = store.tasks.find((item) => item.id === taskId);
  if (!task) {
    return null;
  }

  Object.assign(task, input);
  writeStore(store);

  return task;
}

export function deleteGuestTask(taskId: number) {
  const store = readStore();
  store.tasks = store.tasks.filter((task) => task.id !== taskId);
  store.pomodoroSessions.forEach((session) => {
    if (session.task_id === taskId) session.task_id = null;
  });
  writeStore(store);
}

export function clearGuestFinishedTasks(): number {
  const store = readStore();
  const finishedIds = new Set(store.tasks.filter((task) => task.done).map((task) => task.id));
  store.tasks = store.tasks.filter((task) => !task.done);
  store.pomodoroSessions.forEach((session) => {
    if (session.task_id !== null && finishedIds.has(session.task_id)) session.task_id = null;
  });
  writeStore(store);
  return finishedIds.size;
}

// Zeroes out every task's completed pomodoro count so tasks can be reused on
// a fresh day without losing their name/estimate/goal link.
export function resetGuestPomodoros(): number {
  const store = readStore();
  let updated = 0;
  store.tasks.forEach((task) => {
    if (task.completed_pomodoros !== 0) {
      task.completed_pomodoros = 0;
      updated += 1;
    }
  });
  writeStore(store);
  return updated;
}

// Guest mirror of the server's session-completion transaction: records the
// session, bumps the task counter, and auto-fills the goal's circle for the
// day (upgrade-only — never downgrades a manually set status).
export function completeGuestPomodoroSession(input: {
  task_id: number | null;
  date: string;
  duration_minutes: number;
}): {
  task: { id: number; completed_pomodoros: number } | null;
  daily_progress: { goal_id: number; date: string; status: number } | null;
} {
  const store = readStore();
  const task = input.task_id != null ? store.tasks.find((t) => t.id === input.task_id) : undefined;
  const goal = task?.goal_id != null ? store.goals.find((g) => g.id === task.goal_id) : undefined;

  store.pomodoroSessions.push({
    id: store.nextPomodoroSessionId,
    task_id: task?.id ?? null,
    goal_id: goal?.id ?? null,
    date: input.date,
    duration_minutes: input.duration_minutes,
  });
  store.nextPomodoroSessionId -= 1;

  if (task) {
    task.completed_pomodoros += 1;
  }

  let dailyProgress: { goal_id: number; date: string; status: number } | null = null;
  if (goal?.target_pomodoros) {
    const count = store.pomodoroSessions.filter(
      (s) => s.goal_id === goal.id && s.date === input.date
    ).length;
    const desired = count >= goal.target_pomodoros ? 2 : 1;
    const existing = store.dailyProgresses.find(
      (dp) => dp.goal_id === goal.id && dp.date === input.date
    );
    if (desired > (existing?.status ?? 0)) {
      if (existing) {
        existing.status = desired;
      } else {
        store.dailyProgresses.push({ goal_id: goal.id, date: input.date, status: desired });
      }
      dailyProgress = { goal_id: goal.id, date: input.date, status: desired };
    }
  }

  writeStore(store);

  return {
    task: task ? { id: task.id, completed_pomodoros: task.completed_pomodoros } : null,
    daily_progress: dailyProgress,
  };
}

// Shape accepted by replaceGuestData — mirrors the export file's `goals`
// (with nested daily progress) and journal entries, minus database ids.
export interface GuestImportData {
  goals: Array<{
    name: string;
    description?: string;
    position?: number;
    started_at?: string;
    target_pomodoros?: number | null;
    daily_progresses?: Array<{ date: string; status: number }>;
  }>;
  journalEntries: Array<{ date: string; content: string }>;
  tasks?: Array<{
    name: string;
    note?: string;
    goal_name?: string | null;
    estimated_pomodoros?: number;
    completed_pomodoros?: number;
    done?: boolean;
    position?: number;
    sessions?: Array<{ date: string; duration_minutes: number }>;
  }>;
}

// Raw store contents, used to build an export.
export function getGuestStore() {
  const store = readStore();
  return {
    goals: store.goals.slice().sort((a, b) => a.position - b.position),
    journalEntries: store.journalEntries.slice(),
    dailyProgresses: store.dailyProgresses.slice(),
    tasks: store.tasks.slice().sort((a, b) => a.position - b.position || a.id - b.id),
    pomodoroSessions: store.pomodoroSessions.slice(),
  };
}

// Wipes the guest store and repopulates it from imported data, assigning fresh
// negative ids (and remapping each goal's daily progress to its new id).
export function replaceGuestData(data: GuestImportData) {
  const today = todayLocalDateString();
  const goals: GuestGoal[] = [];
  const dailyProgresses: GuestDailyProgress[] = [];
  let nextGoalId = -1;

  const goalIdsByName = new Map<string, number>();

  data.goals.forEach((g, index) => {
    const id = nextGoalId;
    nextGoalId -= 1;
    goalIdsByName.set(g.name, id);
    goals.push({
      id,
      name: g.name,
      description: g.description ?? '',
      position: typeof g.position === 'number' ? g.position : index + 1,
      created_at: today,
      started_at: g.started_at ?? today,
      target_pomodoros: g.target_pomodoros ?? null,
    });
    (g.daily_progresses ?? []).forEach((dp) => {
      dailyProgresses.push({ goal_id: id, date: dp.date, status: dp.status });
    });
  });

  let nextJournalEntryId = -1;
  const journalEntries: GuestJournalEntry[] = data.journalEntries.map((e) => {
    const id = nextJournalEntryId;
    nextJournalEntryId -= 1;
    return { id, date: e.date, content: e.content };
  });

  const tasks: GuestTask[] = [];
  const pomodoroSessions: GuestPomodoroSession[] = [];
  let nextTaskId = -1;
  let nextPomodoroSessionId = -1;

  (data.tasks ?? []).forEach((t, index) => {
    const id = nextTaskId;
    nextTaskId -= 1;
    const goalId = t.goal_name != null ? goalIdsByName.get(t.goal_name) ?? null : null;
    tasks.push({
      id,
      goal_id: goalId,
      name: t.name,
      note: t.note,
      estimated_pomodoros: t.estimated_pomodoros ?? 1,
      completed_pomodoros: t.completed_pomodoros ?? 0,
      done: t.done ?? false,
      position: typeof t.position === 'number' ? t.position : index + 1,
    });
    (t.sessions ?? []).forEach((s) => {
      pomodoroSessions.push({
        id: nextPomodoroSessionId,
        task_id: id,
        goal_id: goalId,
        date: s.date,
        duration_minutes: s.duration_minutes,
      });
      nextPomodoroSessionId -= 1;
    });
  });

  writeStore({
    goals,
    journalEntries,
    dailyProgresses,
    tasks,
    pomodoroSessions,
    nextGoalId,
    nextJournalEntryId,
    nextTaskId,
    nextPomodoroSessionId,
  });
}

export function getGuestMonthlyProgress(year: number, month: number) {
  const store = readStore();
  const monthDate = new Date(year, month - 1, 1);
  const monthStart = localDateString(monthDate);
  const monthEnd = localDateString(new Date(year, month, 0));

  const goals = store.goals.slice().sort((a, b) => a.position - b.position);
  const dailyProgresses = store.dailyProgresses
    .filter((dp) => dp.date >= monthStart && dp.date <= monthEnd)
    .reduce<Record<string, GuestDailyProgress>>((acc, dp) => {
      acc[`${dp.goal_id}-${dp.date}`] = dp;
      return acc;
    }, {});

  const journalEntries = store.journalEntries
    .filter((entry) => entry.date >= monthStart && entry.date <= monthEnd)
    .reduce<Record<string, GuestJournalEntry>>((acc, entry) => {
      acc[entry.date] = entry;
      return acc;
    }, {});

  return {
    year,
    month,
    date: monthDate.toISOString(),
    goals,
    days_in_month: new Date(year, month, 0).getDate(),
    daily_progresses: dailyProgresses,
    journal_entries: journalEntries,
  };
}
