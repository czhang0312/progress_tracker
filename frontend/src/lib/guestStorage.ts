import { localDateString, todayLocalDateString } from './dateUtils';

export interface GuestGoal {
  id: number;
  name: string;
  description: string;
  position: number;
  created_at?: string; // YYYY-MM-DD
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
    created_at: todayLocalDateString(),
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

export interface GuestGoalStats {
  id: number;
  name: string;
  created_at: string;
  completion_pct: number;
  current_streak: number;
  longest_streak: number;
  best_month: string | null;
}

export interface GuestStatsData {
  year: number;
  daily_totals: Record<string, { filled: number; half: number; empty: number }>;
  per_goal: GuestGoalStats[];
}

function guestPrevDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return localDateString(d);
}

function guestCurrentStreak(activeDates: string[], today: string): number {
  let check = activeDates.includes(today) ? today : guestPrevDate(today);
  let count = 0;
  while (activeDates.includes(check)) {
    count++;
    check = guestPrevDate(check);
  }
  return count;
}

function guestLongestStreak(activeDates: string[]): number {
  if (activeDates.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < activeDates.length; i++) {
    const prev = new Date(activeDates[i - 1] + 'T00:00:00');
    const curr = new Date(activeDates[i] + 'T00:00:00');
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) {
      run++;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}

function guestBestMonth(goal: GuestGoal, allProgress: GuestDailyProgress[]): string | null {
  if (allProgress.length === 0) return null;

  const today = todayLocalDateString();
  const createdAt = goal.created_at ?? (allProgress[0]?.date ?? today);

  const monthGroups = new Map<string, GuestDailyProgress[]>();
  allProgress.forEach((dp) => {
    const key = dp.date.slice(0, 7);
    if (!monthGroups.has(key)) monthGroups.set(key, []);
    monthGroups.get(key)!.push(dp);
  });

  let bestKey: string | null = null;
  let bestRate = -1;

  monthGroups.forEach((dps, key) => {
    const [yr, mo] = key.split('-').map(Number);
    const monthStart = localDateString(new Date(yr, mo - 1, 1));
    const monthEnd = localDateString(new Date(yr, mo, 0));
    const from = monthStart < createdAt ? createdAt : monthStart;
    const to = monthEnd < today ? monthEnd : today;
    const totalDays =
      Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86400000) + 1;
    if (totalDays <= 0) return;

    const filled = dps.filter((dp) => dp.status === 2).length;
    const half = dps.filter((dp) => dp.status === 1).length;
    const rate = (filled + half * 0.5) / totalDays;

    if (rate > bestRate) {
      bestRate = rate;
      bestKey = key;
    }
  });

  if (!bestKey) return null;
  const [yr, mo] = (bestKey as string).split('-').map(Number);
  return new Date(yr, mo - 1).toLocaleDateString('en-US', { month: 'long' });
}

export function getGuestStats(year: number): GuestStatsData {
  const store = readStore();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const daily_totals: Record<string, { filled: number; half: number; empty: number }> = {};
  store.dailyProgresses
    .filter((dp) => dp.date >= yearStart && dp.date <= yearEnd)
    .forEach((dp) => {
      if (!daily_totals[dp.date]) daily_totals[dp.date] = { filled: 0, half: 0, empty: 0 };
      if (dp.status === 2) daily_totals[dp.date].filled++;
      else if (dp.status === 1) daily_totals[dp.date].half++;
      else daily_totals[dp.date].empty++;
    });

  const today = todayLocalDateString();

  const per_goal: GuestGoalStats[] = store.goals.map((goal) => {
    const allProgress = store.dailyProgresses
      .filter((dp) => dp.goal_id === goal.id)
      .sort((a, b) => a.date.localeCompare(b.date));

    const createdAt = goal.created_at ?? (allProgress[0]?.date ?? today);
    const totalDays = Math.max(
      Math.round((new Date(today + 'T00:00:00').getTime() - new Date(createdAt + 'T00:00:00').getTime()) / 86400000) + 1,
      0
    );

    const filled = allProgress.filter((dp) => dp.status === 2).length;
    const half = allProgress.filter((dp) => dp.status === 1).length;
    const completion_pct =
      totalDays > 0 ? Math.round(((filled + half * 0.5) / totalDays) * 1000) / 10 : 0;

    const activeDates = allProgress.filter((dp) => dp.status >= 1).map((dp) => dp.date);

    return {
      id: goal.id,
      name: goal.name,
      created_at: createdAt,
      completion_pct,
      current_streak: guestCurrentStreak(activeDates, today),
      longest_streak: guestLongestStreak(activeDates),
      best_month: guestBestMonth(goal, allProgress),
    };
  });

  return { year, daily_totals, per_goal };
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
