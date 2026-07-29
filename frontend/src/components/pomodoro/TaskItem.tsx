'use client';

import { useState } from 'react';
import ProgressCircle from '@/components/ProgressCircle';
import { T, tint } from '@/lib/theme';
import { Task } from '@/lib/pomodoroData';

export default function TaskItem({
  task,
  goalName,
  isActive,
  isDragging,
  isDragOver,
  onSelect,
  onToggleDone,
  onEdit,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  task: Task;
  goalName: string | null;
  isActive: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onSelect: () => void;
  onToggleDone: () => void;
  onEdit: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const [hov, setHov] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      aria-pressed={isActive}
      title={isActive ? 'Current focus task' : 'Set as focus task'}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px 12px 11px',
        borderLeft: `3px solid ${isActive ? T.accent : 'transparent'}`,
        borderBottom: `1px solid ${T.well}`,
        boxShadow: isDragOver ? `inset 0 2px 0 ${T.accent}` : 'none',
        background: hov ? tint(T.well, 60) : 'transparent',
        opacity: isDragging ? 0.4 : 1,
        cursor: 'grab',
        transition: 'background .12s, border-color .15s',
      }}
    >
      <ProgressCircle status={task.done ? 2 : 0} size={20} onClick={onToggleDone} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14, fontWeight: 500,
              color: task.done ? T.faint : T.ink,
              textDecoration: task.done ? 'line-through' : 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {task.name}
          </div>
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
        </div>
        {task.note && (
          <div
            style={{
              marginTop: 3, fontSize: 12, color: T.muted,
              whiteSpace: 'pre-wrap',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {task.note}
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
