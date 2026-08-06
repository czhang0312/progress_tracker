'use client';

import { useState } from 'react';
import { T, TRACKING } from '@/lib/theme';
import { PomodoroSettings } from '@/lib/pomodoroSettings';

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [raw, setRaw] = useState(String(value));

  return (
    <label style={{ display: 'block' }}>
      <span className="form-label">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        className="form-input"
        value={raw}
        onChange={(e) => {
          const next = e.target.value;
          setRaw(next);
          const parsed = parseInt(next, 10);
          if (!Number.isNaN(parsed)) onChange(Math.min(max, Math.max(min, parsed)));
        }}
        onBlur={() => {
          const parsed = parseInt(raw, 10);
          const clamped = Number.isNaN(parsed) ? min : Math.min(max, Math.max(min, parsed));
          setRaw(String(clamped));
          onChange(clamped);
        }}
      />
    </label>
  );
}

function MinutesField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return <NumberField label={label} value={value} min={1} max={999} onChange={onChange} />;
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 13, color: T.ink, cursor: 'pointer', gap: 12,
      }}
    >
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: T.accent, cursor: 'pointer' }}
      />
    </label>
  );
}

export default function TimerSettingsModal({
  settings,
  onSave,
  onClose,
}: {
  settings: PomodoroSettings;
  onSave: (settings: PomodoroSettings) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(settings);
  const set = <K extends keyof PomodoroSettings>(key: K, value: PomodoroSettings[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,.55)',
        backdropFilter: 'blur(12px) saturate(110%)',
        WebkitBackdropFilter: 'blur(12px) saturate(110%)',
        zIndex: 200,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '10vh clamp(10px,3vw,24px) 24px',
        overflowY: 'auto',
        animation: 'backdropIn .2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 400,
          borderRadius: 'var(--radius)',
          background: T.surface, border: `1px solid ${T.border}`,
          boxShadow: 'var(--shadow-overlay)',
          overflow: 'hidden',
          animation: 'focusIn .32s cubic-bezier(.16,1,.3,1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '14px 20px', borderBottom: `1px solid ${T.border}`,
            fontSize: 11, fontWeight: 600, color: T.muted,
            letterSpacing: TRACKING, textTransform: 'uppercase',
          }}
        >
          Timer Settings
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <MinutesField label="Focus" value={draft.pomodoroMinutes} onChange={(v) => set('pomodoroMinutes', v)} />
            <MinutesField label="Short break" value={draft.shortBreakMinutes} onChange={(v) => set('shortBreakMinutes', v)} />
            <MinutesField label="Long break" value={draft.longBreakMinutes} onChange={(v) => set('longBreakMinutes', v)} />
          </div>

          <NumberField
            label="Long break every (pomodoros)"
            value={draft.longBreakInterval}
            min={1}
            max={12}
            onChange={(v) => set('longBreakInterval', v)}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ToggleRow label="Auto-start breaks" checked={draft.autoStartBreaks} onChange={(v) => set('autoStartBreaks', v)} />
            <ToggleRow label="Auto-start pomodoros" checked={draft.autoStartPomodoros} onChange={(v) => set('autoStartPomodoros', v)} />
            <ToggleRow label="Sound on completion" checked={draft.soundEnabled} onChange={(v) => set('soundEnabled', v)} />
          </div>
        </div>

        <div
          style={{
            padding: '12px 20px', borderTop: `1px solid ${T.border}`, background: T.well,
            display: 'flex', justifyContent: 'flex-end', gap: 8,
          }}
        >
          <button type="button" className="btn-ghost" style={{ fontSize: 13 }} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ fontSize: 13 }}
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
