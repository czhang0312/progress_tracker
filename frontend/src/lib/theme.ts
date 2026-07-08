// Design tokens — the single source of truth is the :root block in
// globals.css. This module re-exports those variables for the components
// that style via inline `style` objects, so no hex codes live in components.

export const T = {
  bg: 'var(--bg)',
  surface: 'var(--surface)',
  well: 'var(--well)',
  border: 'var(--border)',
  ink: 'var(--ink)',
  muted: 'var(--muted)',
  faint: 'var(--faint)',
  ringEmpty: 'var(--ring-empty)',
  accent: 'var(--accent)',
  accentHover: 'var(--accent-hover)',
  accentTint: 'var(--accent-tint)',
  danger: 'var(--danger)',
  dangerTint: 'var(--danger-tint)',
  dangerBorder: 'var(--danger-border)',
} as const;

export const SERIF = 'var(--font-serif), Georgia, serif';

export const RADIUS = 'var(--radius)';
export const SHADOW_SM = 'var(--shadow-sm)';
export const SHADOW_OVERLAY = 'var(--shadow-overlay)';

// Single letter-spacing for all tracked-caps labels.
export const TRACKING = '0.08em';

// Translucent version of a token color (replaces hex-alpha suffixes, which
// don't compose with CSS variables).
export const tint = (color: string, pct: number) =>
  `color-mix(in srgb, ${color} ${pct}%, transparent)`;
