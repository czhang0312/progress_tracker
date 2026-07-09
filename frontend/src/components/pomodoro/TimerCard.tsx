'use client';

import { useState } from 'react';
import { T, SERIF, TRACKING } from '@/lib/theme';
import { MODE_LABELS, TimerMode, TimerStatus } from '@/hooks/usePomodoroTimer';

const MODES: TimerMode[] = ['pomodoro', 'shortBreak', 'longBreak'];

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function ModeTab({ mode, isActive, onClick }: { mode: TimerMode; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 py-2 transition-colors duration-150"
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: TRACKING,
        textTransform: 'uppercase',
        color: isActive ? T.ink : T.faint,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <span
        style={{
          width: 5, height: 5, borderRadius: '50%',
          background: isActive ? T.accent : 'transparent',
          flexShrink: 0, transition: 'background 0.15s',
        }}
      />
      {MODE_LABELS[mode]}
    </button>
  );
}

// The timer face speaks the app's progress-circle language: an accent ring
// sweeps clockwise as the session elapses, so a finished pomodoro is a
// filled circle — the same mark as a completed goal.
function TimerRing({ remainingMs, totalMs, children }: { remainingMs: number; totalMs: number; children: React.ReactNode }) {
  const size = 240;
  const stroke = 5;
  const c = size / 2;
  const r = c - stroke;
  const circumference = 2 * Math.PI * r;
  const elapsed = totalMs > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / totalMs)) : 0;

  return (
    <div style={{ position: 'relative', width: 'clamp(200px, 64vw, 240px)', margin: '0 auto' }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', width: '100%' }} aria-hidden="true">
        <circle cx={c} cy={c} r={r} fill="none" stroke={T.well} strokeWidth={stroke} />
        <circle
          cx={c} cy={c} r={r}
          fill="none"
          stroke={T.accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - elapsed)}
          transform={`rotate(-90 ${c} ${c})`}
          style={{ transition: 'stroke-dashoffset .3s linear' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 4,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function TimerCard({
  mode,
  status,
  remainingMs,
  totalMs,
  pomodorosInCycle,
  activeTaskName,
  onStart,
  onPause,
  onSkip,
  onSwitchMode,
  onOpenSettings,
}: {
  mode: TimerMode;
  status: TimerStatus;
  remainingMs: number;
  totalMs: number;
  pomodorosInCycle: number;
  activeTaskName: string | null;
  onStart: () => void;
  onPause: () => void;
  onSkip: () => void;
  onSwitchMode: (mode: TimerMode) => void;
  onOpenSettings: () => void;
}) {
  const [gearHov, setGearHov] = useState(false);
  const running = status === 'running';
  const roundNumber = mode === 'pomodoro' ? pomodorosInCycle + 1 : pomodorosInCycle;

  const handleSwitch = (next: TimerMode) => {
    if (next === mode) return;
    if (running && !window.confirm('The timer is running. Switch mode and reset it?')) return;
    onSwitchMode(next);
  };

  const handleSkip = () => {
    if (
      mode === 'pomodoro' &&
      !window.confirm('Finish this focus session early? It will count as a completed pomodoro.')
    ) {
      return;
    }
    onSkip();
  };

  return (
    <section className="card" style={{ position: 'relative', padding: 'clamp(20px, 5vw, 32px)' }}>
      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="Timer settings"
        title="Timer settings"
        onMouseEnter={() => setGearHov(true)}
        onMouseLeave={() => setGearHov(false)}
        style={{
          position: 'absolute', top: 14, right: 14,
          padding: 6, borderRadius: 'var(--radius)',
          background: gearHov ? T.well : 'transparent',
          border: 'none', cursor: 'pointer',
          color: gearHov ? T.ink : T.faint,
          display: 'flex', transition: 'all .15s',
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {/* Mode tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
        {MODES.map((m) => (
          <ModeTab key={m} mode={m} isActive={m === mode} onClick={() => handleSwitch(m)} />
        ))}
      </div>

      <TimerRing remainingMs={remainingMs} totalMs={totalMs}>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 'clamp(44px, 12vw, 56px)',
            fontWeight: 500,
            color: T.ink,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatTime(remainingMs)}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: TRACKING, textTransform: 'uppercase' }}>
          #{Math.max(1, roundNumber)}
        </div>
      </TimerRing>

      {/* Active task */}
      <p
        style={{
          textAlign: 'center', margin: '16px 0 0', fontSize: 13,
          color: activeTaskName ? T.ink : T.faint,
          fontStyle: activeTaskName ? 'normal' : 'italic',
        }}
      >
        {activeTaskName ?? 'Select a task below to focus on'}
      </p>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 18 }}>
        {running ? (
          <button type="button" className="btn-outline" style={{ minWidth: 132 }} onClick={onPause}>
            Pause
          </button>
        ) : (
          <button type="button" className="btn-primary" style={{ minWidth: 132 }} onClick={onStart}>
            {status === 'paused' ? 'Resume' : 'Start'}
          </button>
        )}
        {running && (
          <button type="button" className="btn-ghost" aria-label="Skip to next" title="Skip to next" onClick={handleSkip}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" stroke="none" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>
        )}
      </div>
    </section>
  );
}
