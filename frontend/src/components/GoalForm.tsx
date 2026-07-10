'use client';

export interface GoalFormValues {
  name: string;
  description: string;
  started_at: string;
  target_pomodoros: string;
}

// Shared add/edit goal form. Rendered inline inside a positioned popover by
// the progress page, which owns popover placement, outside-click/dirty
// checks, and the actual save/delete API calls.
export default function GoalForm({
  formId,
  isEdit,
  values,
  onChange,
  errors,
  saving,
  showDescription,
  onShowDescription,
  onSubmit,
  onCancel,
  onDelete,
}: {
  formId: string;
  isEdit: boolean;
  values: GoalFormValues;
  onChange: (field: keyof GoalFormValues, value: string) => void;
  errors: Record<string, string>;
  saving: boolean;
  showDescription: boolean;
  onShowDescription: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  return (
    <>
      <form id={formId} onSubmit={onSubmit} className="space-y-3 p-4 pb-3">
        <div className="flex items-center gap-3">
          <input
            type="text"
            name="name"
            value={values.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Add goal name"
            className={`flex-1 min-w-0 bg-transparent border-none outline-none focus:ring-0 font-semibold text-neutral-800 placeholder:text-neutral-300 ${errors.name ? 'text-danger' : ''}`}
            style={{ fontSize: '15px' }}
            autoFocus={!isEdit}
            required
          />
          {isEdit && (
            <input
              type="date"
              name="started_at"
              value={values.started_at}
              onChange={(e) => onChange('started_at', e.target.value)}
              className="text-[11px] text-neutral-500 bg-transparent border border-neutral-200 rounded px-1.5 py-0.5 w-auto shrink-0 focus:ring-0 focus:outline-none focus:border-neutral-300 hover:border-neutral-300 transition-colors"
              required
              title="Start date — progress circles hidden before this date"
            />
          )}
        </div>
        {errors.name && <p className="mt-0.5 text-xs text-danger">{errors.name}</p>}

        <label
          className="flex items-center gap-2 text-[11px] text-neutral-500 w-fit"
          title="Optional daily target — completed focus sessions on the Pomodoro page fill this goal's circle automatically"
        >
          Pomodoros/day
          <input
            type="number"
            name="target_pomodoros"
            min={1}
            max={99}
            value={values.target_pomodoros}
            onChange={(e) => onChange('target_pomodoros', e.target.value)}
            placeholder="–"
            className="w-[52px] text-[11px] text-neutral-700 bg-transparent border border-neutral-200 rounded px-1.5 py-0.5 focus:ring-0 focus:outline-none focus:border-neutral-300 hover:border-neutral-300 transition-colors"
          />
        </label>

        {!showDescription ? (
          <button
            type="button"
            onClick={onShowDescription}
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors underline"
          >
            + Add description
          </button>
        ) : (
          <div>
            <textarea
              name="description"
              value={values.description}
              onChange={(e) => onChange('description', e.target.value)}
              rows={3}
              placeholder="Add goal description"
              autoFocus={!values.description}
              className={`w-full rounded-lg bg-neutral-100 border-none outline-none text-xs px-3 py-2 text-neutral-700 placeholder:text-neutral-400 focus:ring-0 ${errors.description ? 'ring-2 ring-danger' : ''}`}
            />
            {errors.description && <p className="mt-0.5 text-xs text-danger">{errors.description}</p>}
          </div>
        )}
      </form>
      <div className="flex items-center gap-2 px-4 py-2 bg-neutral-50 border-t border-neutral-100">
        <button type="submit" form={formId} disabled={saving} className="btn-primary px-3 py-2 text-xs">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost px-3 py-2 text-xs border-none">
          Cancel
        </button>
        {isEdit && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto text-neutral-400 hover:text-danger p-1.5 rounded transition-colors"
            title="Delete goal"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        )}
      </div>
    </>
  );
}
