import { RAILS_API_BASE } from './config';
import { getGuestStore, replaceGuestData } from './guestStorage';

// ─── File format ──────────────────────────────────────────────────────────────
export const EXPORT_FORMAT = 'progress-tracker-export';
export const EXPORT_VERSION = 1;

interface ExportProgress {
  date: string;
  status: number;
}
interface ExportGoal {
  name: string;
  description?: string;
  position?: number;
  started_at?: string;
  daily_progresses?: ExportProgress[];
}
interface ExportJournalEntry {
  date: string;
  content: string;
}
export interface ExportFile {
  format: string;
  version: number;
  exported_at?: string;
  goals: ExportGoal[];
  journal_entries: ExportJournalEntry[];
}

export interface ImportSummary {
  goals: number;
  daily_progresses: number;
  journal_entries: number;
}

type MaybeUser = { is_guest?: boolean } | null | undefined;

// ─── Export ───────────────────────────────────────────────────────────────────
function buildExportFromGuest(): ExportFile {
  const { goals, journalEntries, dailyProgresses } = getGuestStore();

  const progressByGoal = new Map<number, ExportProgress[]>();
  for (const dp of dailyProgresses) {
    const list = progressByGoal.get(dp.goal_id) ?? [];
    list.push({ date: dp.date, status: dp.status });
    progressByGoal.set(dp.goal_id, list);
  }

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    goals: goals.map((g) => ({
      name: g.name,
      description: g.description,
      position: g.position,
      started_at: g.started_at,
      daily_progresses: (progressByGoal.get(g.id) ?? []).sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    })),
    journal_entries: journalEntries
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({ date: e.date, content: e.content })),
  };
}

/** Builds the export document (from localStorage for guests, the API otherwise). */
export async function getExportData(user: MaybeUser): Promise<ExportFile> {
  if (user?.is_guest) {
    return buildExportFromGuest();
  }
  const res = await fetch(`${RAILS_API_BASE}/export`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error('Could not export your data. Please try again.');
  }
  return res.json();
}

/** Exports the user's data and triggers a browser download of the JSON file. */
export async function downloadExport(user: MaybeUser): Promise<void> {
  const data = await getExportData(user);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const today = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `progress-tracker-export-${today}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Import ───────────────────────────────────────────────────────────────────
/** Parses + validates raw file text. Throws an Error with a friendly message. */
export function parseAndValidate(text: string): { data: ExportFile; summary: ImportSummary } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("This file isn't valid JSON.");
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Unrecognized file format.');
  }
  const obj = parsed as Partial<ExportFile>;
  if (obj.format !== EXPORT_FORMAT || obj.version !== EXPORT_VERSION) {
    throw new Error("This doesn't look like a Progress Tracker export file.");
  }
  if (!Array.isArray(obj.goals)) {
    throw new Error('File is missing a goals list.');
  }
  const journalEntries = Array.isArray(obj.journal_entries) ? obj.journal_entries : [];

  let progressCount = 0;
  for (const g of obj.goals) {
    if (!g || typeof g.name !== 'string') {
      throw new Error('File contains a goal with no name.');
    }
    for (const dp of g.daily_progresses ?? []) {
      if (![0, 1, 2].includes(dp.status)) {
        throw new Error('File contains an invalid progress value.');
      }
      progressCount += 1;
    }
  }

  const data: ExportFile = { ...obj, goals: obj.goals, journal_entries: journalEntries } as ExportFile;
  return {
    data,
    summary: {
      goals: obj.goals.length,
      daily_progresses: progressCount,
      journal_entries: journalEntries.length,
    },
  };
}

/** Replaces all of the user's data with the parsed file (localStorage or API). */
export async function importData(user: MaybeUser, data: ExportFile): Promise<void> {
  if (user?.is_guest) {
    replaceGuestData({
      goals: data.goals,
      journalEntries: data.journal_entries,
    });
    return;
  }
  const res = await fetch(`${RAILS_API_BASE}/import`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new Error(body?.message || 'Import failed. Please try again.');
  }
}
