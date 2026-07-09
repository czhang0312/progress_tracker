'use client';

import { useState } from 'react';
import { T, TRACKING, tint } from '@/lib/theme';
import { PomodoroGoal, Task, TaskInput } from '@/lib/pomodoroData';

function Stepper({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
}) {
  const btnStyle: React.CSSProperties = {
    width: 28, height: 28, borderRadius: 'var(--radius)',
    border: `1px solid ${T.border}`, background: T.surface,
    color: T.muted, fontSize: 15, lineHeight: 1, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit',
  };
  return (
    <div>
      <span className="form-label">{label}</span>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <button type="button" style={btnStyle} aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, value - 1))}>
          −
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: T.ink, minWidth: 20, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </span>
        <button type="button" style={btnStyle} aria-label={`Increase ${label}`} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}

function GoalChip({ goal, selected, onClick }: { goal: PomodoroGoal; selected?: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={selected ? 'Unlink from this goal' : `Add "${goal.name}" as a task`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 99,
        fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
        background: selected ? T.accentTint : 'transparent',
        border: `1px solid ${selected || hov ? T.accent : T.border}`,
        color: selected || hov ? T.accent : T.muted,
        cursor: 'pointer', transition: 'all .15s',
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: selected ? T.accent : T.faint }} />
      {goal.name}
      {goal.target_pomodoros ? (
        <span style={{ fontSize: 11, color: T.faint, fontVariantNumeric: 'tabular-nums' }}>
          {goal.target_pomodoros}/day
        </span>
      ) : null}
      {selected && <span aria-hidden="true" style={{ fontSize: 13, lineHeight: 1 }}>×</span>}
    </button>
  );
}

// Inline add/edit card (Pomofocus-style). In add mode, "From your goals"
// chips create a linked task in one tap; in edit mode they link/unlink.
export default function TaskForm({
  task,
  goals,
  hiddenGoalIds,
  onSave,
  onDelete,
  onCancel,
}: {
  task?: Task;
  goals: PomodoroGoal[];
  hiddenGoalIds: Set<number>;
  onSave: (input: TaskInput & { name: string }) => void;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!task;
  const [name, setName] = useState(task?.name ?? '');
  const [note, setNote] = useState(task?.note ?? '');
  const [est, setEst] = useState(task?.estimated_pomodoros ?? 1);
  const [act, setAct] = useState(task?.completed_pomodoros ?? 0);
  const [goalId, setGoalId] = useState<number | null>(task?.goal_id ?? null);

  const pickerGoals = isEdit
    ? goals
    : goals.filter((g) => !hiddenGoalIds.has(g.id));

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      name: trimmed,
      note: note.trim(),
      goal_id: goalId,
      estimated_pomodoros: est,
      ...(isEdit ? { completed_pomodoros: act } : {}),
    });
  };

  return (
    <div
      style={{
        border: `1px solid ${T.border}`, borderRadius: 'var(--radius)',
        background: T.surface, padding: 16,
        boxShadow: 'var(--shadow-sm)',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}
    >
      {/* One-tap add from goals */}
      {!isEdit && pickerGoals.length > 0 && (
        <div>
          <span
            style={{
              display: 'block', fontSize: 10, fontWeight: 600, color: T.muted,
              letterSpacing: TRACKING, textTransform: 'uppercase', marginBottom: 8,
            }}
          >
            From your goals
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {pickerGoals.map((goal) => (
              <GoalChip
                key={goal.id}
                goal={goal}
                onClick={() =>
                  onSave({
                    name: goal.name,
                    goal_id: goal.id,
                    estimated_pomodoros: goal.target_pomodoros ?? 1,
                  })
                }
              />
            ))}
          </div>
          <div style={{ height: 1, background: T.well, margin: '14px 0 0' }} />
        </div>
      )}

      <input
        type="text"
        className="form-input"
        placeholder="What are you working on?"
        value={name}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') onCancel();
        }}
        style={{ fontSize: 14, fontWeight: 500 }}
      />

      <input
        type="text"
        className="form-input"
        placeholder="Add a note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') onCancel();
        }}
        style={{ fontSize: 13 }}
      />

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <Stepper label="Est. pomodoros" value={est} min={1} onChange={setEst} />
        {isEdit && <Stepper label="Completed" value={act} min={0} onChange={setAct} />}
      </div>

      {/* Link to goal (edit mode) */}
      {isEdit && goals.length > 0 && (
        <div>
          <span className="form-label">Linked goal</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {goals.map((goal) => (
              <GoalChip
                key={goal.id}
                goal={goal}
                selected={goalId === goal.id}
                onClick={() => setGoalId(goalId === goal.id ? null : goal.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: `1px solid ${T.well}`, paddingTop: 12, gap: 8,
        }}
      >
        <div>
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="btn-ghost"
              style={{ color: T.danger, padding: '6px 10px', fontSize: 13 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = tint(T.danger, 8))}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Delete
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ padding: '6px 16px', fontSize: 13 }}
            disabled={!name.trim()}
            onClick={submit}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
