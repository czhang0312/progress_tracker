'use client';

import { useState } from 'react';
import { T, TRACKING } from '@/lib/theme';
import { PomodoroGoal, Task, TaskInput } from '@/lib/pomodoroData';
import { PomodoroSettings } from '@/lib/pomodoroSettings';
import TaskItem from './TaskItem';
import TaskForm from './TaskForm';

export default function TaskList({
  tasks,
  goals,
  settings,
  activeTaskId,
  onSelectTask,
  onCreate,
  onUpdate,
  onDelete,
  onToggleDone,
  onClearFinished,
  onResetPomodoros,
}: {
  tasks: Task[];
  goals: PomodoroGoal[];
  settings: PomodoroSettings;
  activeTaskId: number | null;
  onSelectTask: (taskId: number) => void;
  onCreate: (input: TaskInput & { name: string }) => void;
  onUpdate: (taskId: number, input: TaskInput) => void;
  onDelete: (taskId: number) => void;
  onToggleDone: (task: Task) => void;
  onClearFinished: () => void;
  onResetPomodoros: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addHov, setAddHov] = useState(false);

  const goalNames = new Map(goals.map((g) => [g.id, g.name]));
  // Goals already covered by an unfinished task are hidden from the picker.
  const hiddenGoalIds = new Set(
    tasks.filter((t) => !t.done && t.goal_id !== null).map((t) => t.goal_id as number)
  );

  const hasFinished = tasks.some((t) => t.done);
  const hasCompletedPomodoros = tasks.some((t) => t.completed_pomodoros > 0);
  const totalEst = tasks.reduce((sum, t) => sum + t.estimated_pomodoros, 0);
  const totalAct = tasks.reduce((sum, t) => sum + t.completed_pomodoros, 0);
  const remainingPomodoros = tasks
    .filter((t) => !t.done)
    .reduce((sum, t) => sum + Math.max(0, t.estimated_pomodoros - t.completed_pomodoros), 0);
  const finishAt =
    remainingPomodoros > 0
      ? new Date(
          Date.now() +
            (remainingPomodoros * settings.pomodoroMinutes +
              Math.max(0, remainingPomodoros - 1) * settings.shortBreakMinutes) *
              60_000
        ).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : null;

  return (
    <section className="card" style={{ marginTop: 20, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: `1px solid ${T.border}`,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: TRACKING, textTransform: 'uppercase' }}>
          Tasks
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {hasCompletedPomodoros && (
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: 12, padding: '4px 8px' }}
              onClick={() => {
                if (window.confirm('Reset every task’s completed pomodoros to 0?')) onResetPomodoros();
              }}
            >
              Reset pomodoros
            </button>
          )}
          {hasFinished && (
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: 12, padding: '4px 8px' }}
              onClick={() => {
                if (window.confirm('Remove all finished tasks?')) onClearFinished();
              }}
            >
              Clear finished
            </button>
          )}
        </div>
      </div>

      {tasks.length === 0 && !adding && (
        <p style={{ padding: '24px 16px', margin: 0, textAlign: 'center', fontSize: 13, color: T.faint, fontStyle: 'italic' }}>
          No tasks yet. Add one to focus on — or pull one in from your goals.
        </p>
      )}

      <div>
        {tasks.map((task) =>
          editingId === task.id ? (
            <div key={task.id} style={{ padding: 10 }}>
              <TaskForm
                task={task}
                goals={goals}
                hiddenGoalIds={hiddenGoalIds}
                onSave={(input) => {
                  onUpdate(task.id, input);
                  setEditingId(null);
                }}
                onDelete={() => {
                  if (window.confirm(`Delete "${task.name}"?`)) {
                    onDelete(task.id);
                    setEditingId(null);
                  }
                }}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <TaskItem
              key={task.id}
              task={task}
              goalName={task.goal_id !== null ? goalNames.get(task.goal_id) ?? null : null}
              isActive={task.id === activeTaskId}
              onSelect={() => onSelectTask(task.id)}
              onToggleDone={() => onToggleDone(task)}
              onEdit={() => {
                setAdding(false);
                setEditingId(task.id);
              }}
            />
          )
        )}
      </div>

      <div style={{ padding: 10 }}>
        {adding ? (
          <TaskForm
            goals={goals}
            hiddenGoalIds={hiddenGoalIds}
            onSave={(input) => {
              onCreate(input);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setAdding(true);
            }}
            onMouseEnter={() => setAddHov(true)}
            onMouseLeave={() => setAddHov(false)}
            style={{
              width: '100%', padding: '12px 0',
              borderRadius: 'var(--radius)',
              border: `1.5px dashed ${addHov ? T.accent : T.border}`,
              background: addHov ? T.accentTint : 'transparent',
              color: addHov ? T.accent : T.muted,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all .15s',
            }}
          >
            + Add task
          </button>
        )}
      </div>

      {tasks.length > 0 && (
        <div
          style={{
            padding: '10px 16px', borderTop: `1px solid ${T.border}`, background: T.well,
            display: 'flex', justifyContent: 'center', gap: 16,
            fontSize: 12, color: T.muted, fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span>
            Pomodoros <strong style={{ color: T.ink, fontWeight: 600 }}>{totalAct}/{totalEst}</strong>
          </span>
          {finishAt && (
            <span>
              Finishes ~<strong style={{ color: T.ink, fontWeight: 600 }}>{finishAt}</strong>
            </span>
          )}
        </div>
      )}
    </section>
  );
}
