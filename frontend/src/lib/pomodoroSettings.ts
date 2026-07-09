// Timer preferences are device-local (like Pomofocus) so they behave
// identically for guests and signed-in users.
export interface PomodoroSettings {
  pomodoroMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  soundEnabled: boolean;
}

const SETTINGS_KEY = 'progress_tracker_pomodoro_settings_v1';

export const DEFAULT_SETTINGS: PomodoroSettings = {
  pomodoroMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  soundEnabled: true,
};

export function loadPomodoroSettings(): PomodoroSettings {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PomodoroSettings>;
    return {
      pomodoroMinutes: clampMinutes(parsed.pomodoroMinutes, DEFAULT_SETTINGS.pomodoroMinutes),
      shortBreakMinutes: clampMinutes(parsed.shortBreakMinutes, DEFAULT_SETTINGS.shortBreakMinutes),
      longBreakMinutes: clampMinutes(parsed.longBreakMinutes, DEFAULT_SETTINGS.longBreakMinutes),
      longBreakInterval:
        typeof parsed.longBreakInterval === 'number' && parsed.longBreakInterval >= 1
          ? Math.floor(parsed.longBreakInterval)
          : DEFAULT_SETTINGS.longBreakInterval,
      autoStartBreaks: parsed.autoStartBreaks ?? DEFAULT_SETTINGS.autoStartBreaks,
      autoStartPomodoros: parsed.autoStartPomodoros ?? DEFAULT_SETTINGS.autoStartPomodoros,
      soundEnabled: parsed.soundEnabled ?? DEFAULT_SETTINGS.soundEnabled,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function savePomodoroSettings(settings: PomodoroSettings) {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function clampMinutes(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) return fallback;
  return Math.min(Math.floor(value), 999);
}
