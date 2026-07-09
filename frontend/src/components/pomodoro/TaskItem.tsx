'use client';

import { useState } from 'react';
import ProgressCircle from '@/components/ProgressCircle';
import { T, tint } from '@/lib/theme';
import { Task } from '@/lib/pomodoroData';

export default function TaskItem({
  task,
  goalName,
  isActive,
  onSelect,
  onToggleDone,
  onEdit,
}: {
  task: Task;
  goalName: string | null;
  isActive: boolean;
  onSelect: () => void;
  onToggleDone: () => void;
  onEdit: () => void;
}) {
  const [hov, setHov] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      aria-pressed={isActive}
      title={isActive ? 'Current focus task' : 'Set as focus task'}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px 12px 11px',
        borderLeft: `3px solid ${isActive ? T.accent : 'transparent'}`,
        borderBottom: `1px solid ${T.well}`,
        background: hov ? tint(T.well, 60) : 'transparent',
        cursor: 'pointer',
        transition: 'background .12s, border-color .15s',
      }}
    >
      <ProgressCircle status={task.done ? 2 : 0} size={20} onClick={onToggleDone} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14, fontWeight: 500,
            color: task.done ? T.faint : T.ink,
            textDecoration: task.done ? 'line-through' : 'none',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {task.name}
        </div>
        {(goalName || task.note) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, minWidth: 0 }}>
            {goalName && (
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 11, fontWeight: 500, color: T.accent,
                  background: T.accentTint, borderRadius: 99,
                  padding: '2px 8px', flexShrink: 0,
                }}
              >
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: T.accent }} />
                {goalName}
              </span>
            )}
            {task.note && (
              <span style={{ fontSize: 12, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {task.note}
              </span>
            )}
          </div>
        )}
      </div>

      <span
        style={{
          fontSize: 12, fontWeight: 600, color: T.muted,
          fontVariantNumeric: 'tabular-nums', flexShrink: 0,
        }}
        title={`${task.completed_pomodoros} of ${task.estimated_pomodoros} pomodoros`}
      >
        {task.completed_pomodoros}
        <span style={{ color: T.faint, fontWeight: 500 }}>/{task.estimated_pomodoros}</span>
      </span>

      <button
        type="button"
        aria-label={`Edit ${task.name}`}
        title="Edit task"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        style={{
          padding: 5, borderRadius: 6, border: 'none',
          background: 'transparent', cursor: 'pointer',
          color: hov ? T.muted : T.faint,
          opacity: hov ? 1 : 0.45,
          display: 'flex', transition: 'all .12s', flexShrink: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        </svg>
      </button>
    </div>
  );
}
