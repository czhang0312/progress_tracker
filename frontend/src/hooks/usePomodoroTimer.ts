'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PomodoroSettings } from '@/lib/pomodoroSettings';

export type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';
export type TimerStatus = 'idle' | 'running' | 'paused';

export const MODE_LABELS: Record<TimerMode, string> = {
  pomodoro: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
};

interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  endAt: number | null; // absolute ms timestamp while running
  remainingMs: number;
  pomodorosInCycle: number;
  activeTaskId: number | null;
}

const TIMER_KEY = 'progress_tracker_pomodoro_timer_v1';

export function durationMs(mode: TimerMode, settings: PomodoroSettings): number {
  const minutes =
    mode === 'pomodoro'
      ? settings.pomodoroMinutes
      : mode === 'shortBreak'
        ? settings.shortBreakMinutes
        : settings.longBreakMinutes;
  return minutes * 60_000;
}

function defaultState(settings: PomodoroSettings): TimerState {
  return {
    mode: 'pomodoro',
    status: 'idle',
    endAt: null,
    remainingMs: durationMs('pomodoro', settings),
    pomodorosInCycle: 0,
    activeTaskId: null,
  };
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function persistState(state: TimerState) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(TIMER_KEY, JSON.stringify(state));
}

function readPersistedState(): Partial<TimerState> | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(TIMER_KEY);
    return raw ? (JSON.parse(raw) as Partial<TimerState>) : null;
  } catch {
    return null;
  }
}

function playBeep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const start = ctx.currentTime;
    [0, 0.2, 0.4].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, start + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start + offset);
      osc.stop(start + offset + 0.2);
    });
    window.setTimeout(() => void ctx.close(), 1000);
  } catch {
    // Audio unavailable (e.g. no user gesture yet) — completion still proceeds.
  }
}

// Timestamp-based pomodoro engine: while running we store an absolute `endAt`
// and each tick merely recomputes the remainder, so background-tab throttling
// or laptop sleep can't drift the countdown. State (including the active
// task) is persisted to localStorage and restored on mount; a countdown that
// elapsed while the page was closed completes exactly once on restore.
// Known v1 limitation: two open tabs each run their own timer.
export function usePomodoroTimer(
  settings: PomodoroSettings,
  onPomodoroComplete: (taskId: number | null) => void
) {
  const [state, setState] = useState<TimerState>(() => defaultState(settings));
  const stateRef = useRef(state);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const onCompleteRef = useRef(onPomodoroComplete);
  onCompleteRef.current = onPomodoroComplete;
  const restoredRef = useRef(false);
  const originalTitleRef = useRef<string | null>(null);

  const applyState = useCallback((next: TimerState) => {
    stateRef.current = next;
    persistState(next);
    setState(next);
  }, []);

  // Advance past the current interval: count the pomodoro (if any), pick the
  // next mode, and auto-start it per settings. The advanced state is persisted
  // BEFORE the completion callback fires so a crash/reload can't double-count.
  const completeInterval = useCallback(
    (reason: 'elapsed' | 'skipped', base?: TimerState) => {
      const current = base ?? stateRef.current;
      const cfg = settingsRef.current;
      const isPomodoro = current.mode === 'pomodoro';
      const pomodorosInCycle = isPomodoro ? current.pomodorosInCycle + 1 : current.pomodorosInCycle;
      const nextMode: TimerMode = isPomodoro
        ? pomodorosInCycle % cfg.longBreakInterval === 0
          ? 'longBreak'
          : 'shortBreak'
        : 'pomodoro';
      const autoStart = isPomodoro ? cfg.autoStartBreaks : cfg.autoStartPomodoros;
      const nextDuration = durationMs(nextMode, cfg);

      applyState({
        ...current,
        mode: nextMode,
        status: autoStart ? 'running' : 'idle',
        remainingMs: nextDuration,
        endAt: autoStart ? Date.now() + nextDuration : null,
        pomodorosInCycle,
      });

      if (reason === 'elapsed' && cfg.soundEnabled) playBeep();
      if (isPomodoro) onCompleteRef.current(current.activeTaskId);
    },
    [applyState]
  );

  // Restore the persisted timer once on mount (post-hydration to avoid SSR
  // mismatches).
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const persisted = readPersistedState();
    if (!persisted) return;

    const restored: TimerState = { ...defaultState(settingsRef.current), ...persisted };
    if (restored.status === 'running') {
      const remaining = (restored.endAt ?? 0) - Date.now();
      if (remaining <= 0) {
        completeInterval('elapsed', restored);
        return;
      }
      restored.remainingMs = remaining;
    }
    applyState(restored);
  }, [applyState, completeInterval]);

  // Countdown tick.
  useEffect(() => {
    if (state.status !== 'running') return;

    const id = window.setInterval(() => {
      const current = stateRef.current;
      if (current.status !== 'running' || current.endAt === null) return;
      const remaining = current.endAt - Date.now();
      if (remaining <= 0) {
        completeInterval('elapsed');
      } else {
        // Display-only update; not worth persisting every 250ms.
        const next = { ...current, remainingMs: remaining };
        stateRef.current = next;
        setState(next);
      }
    }, 250);

    return () => window.clearInterval(id);
  }, [state.status, completeInterval]);

  // Keep an idle timer in sync when durations change in settings.
  useEffect(() => {
    const current = stateRef.current;
    if (current.status !== 'idle') return;
    const target = durationMs(current.mode, settings);
    if (current.remainingMs !== target) {
      applyState({ ...current, remainingMs: target });
    }
  }, [settings, applyState]);

  // Countdown in the browser tab title while on the page.
  useEffect(() => {
    if (originalTitleRef.current === null) {
      originalTitleRef.current = document.title;
    }
    const totalSeconds = Math.max(0, Math.round(state.remainingMs / 1000));
    const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const ss = String(totalSeconds % 60).padStart(2, '0');
    document.title = `${mm}:${ss} — ${MODE_LABELS[state.mode]}`;
  }, [state.remainingMs, state.mode]);

  useEffect(() => {
    return () => {
      if (originalTitleRef.current !== null) {
        document.title = originalTitleRef.current;
      }
    };
  }, []);

  const start = useCallback(() => {
    const current = stateRef.current;
    if (current.status === 'running') return;
    applyState({ ...current, status: 'running', endAt: Date.now() + current.remainingMs });
  }, [applyState]);

  const pause = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== 'running' || current.endAt === null) return;
    applyState({
      ...current,
      status: 'paused',
      endAt: null,
      remainingMs: Math.max(0, current.endAt - Date.now()),
    });
  }, [applyState]);

  // Finish the current interval early; a skipped pomodoro still counts (Pomofocus behavior).
  const skip = useCallback(() => {
    completeInterval('skipped');
  }, [completeInterval]);

  const switchMode = useCallback(
    (mode: TimerMode) => {
      const current = stateRef.current;
      applyState({
        ...current,
        mode,
        status: 'idle',
        endAt: null,
        remainingMs: durationMs(mode, settingsRef.current),
      });
    },
    [applyState]
  );

  const setActiveTaskId = useCallback(
    (taskId: number | null) => {
      applyState({ ...stateRef.current, activeTaskId: taskId });
    },
    [applyState]
  );

  return {
    mode: state.mode,
    status: state.status,
    remainingMs: state.remainingMs,
    pomodorosInCycle: state.pomodorosInCycle,
    activeTaskId: state.activeTaskId,
    start,
    pause,
    skip,
    switchMode,
    setActiveTaskId,
  };
}
