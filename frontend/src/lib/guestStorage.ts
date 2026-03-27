export interface GuestGoal {
  id: number;
  name: string;
  description: string;
  position: number;
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

interface GuestStore {
  goals: GuestGoal[];
  journalEntries: GuestJournalEntry[];
  dailyProgresses: GuestDailyProgress[];
  nextGoalId: number;
  nextJournalEntryId: number;
}

const STORE_KEY = 'progress_tracker_guest_store_v1';

const defaultStore: GuestStore = {
  goals: [],
  journalEntries: [],
  dailyProgresses: [],
  nextGoalId: -1,
  nextJournalEntryId: -1,
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
      nextGoalId: typeof parsed.nextGoalId === 'number' ? parsed.nextGoalId : -1,
      nextJournalEntryId: typeof parsed.nextJournalEntryId === 'number' ? parsed.nextJournalEntryId : -1,
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

export function createGuestGoal(input: { name: string; description: string }): GuestGoal {
  const store = readStore();
  const maxPosition = store.goals.reduce((max, goal) => Math.max(max, goal.position), 0);

  const goal: GuestGoal = {
    id: store.nextGoalId,
    name: input.name,
    description: input.description,
    position: maxPosition + 1,
  };

  store.goals.push(goal);
  store.nextGoalId -= 1;
  writeStore(store);

  return goal;
}

export function updateGuestGoal(goalId: number, input: { name: string; description: string }): GuestGoal | null {
  const store = readStore();
  const goal = store.goals.find((item) => item.id === goalId);
  if (!goal) {
    return null;
  }

  goal.name = input.name;
  goal.description = input.description;
  writeStore(store);

  return goal;
}

export function deleteGuestGoal(goalId: number) {
  const store = readStore();
  store.goals = store.goals.filter((goal) => goal.id !== goalId);
  store.dailyProgresses = store.dailyProgresses.filter((dp) => dp.goal_id !== goalId);

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

export function getGuestMonthlyProgress(year: number, month: number) {
  const store = readStore();
  const monthDate = new Date(year, month - 1, 1);
  const monthStart = monthDate.toISOString().split('T')[0];
  const monthEnd = new Date(year, month, 0).toISOString().split('T')[0];

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
