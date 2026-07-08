'use client';

import { useEffect, useRef, useState } from 'react';
import { ExportFile, ImportSummary, parseAndValidate, importData } from '@/lib/dataTransfer';
import { T } from '@/lib/theme';

interface Props {
  user: { is_guest?: boolean } | null | undefined;
  onClose: () => void;
}

export default function ImportModal({ user, onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ExportFile | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !importing) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, importing]);

  const handleFile = (file: File) => {
    setError(null);
    setParsed(null);
    setSummary(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { data, summary } = parseAndValidate(String(reader.result));
        setParsed(data);
        setSummary(summary);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not read file.');
      }
    };
    reader.onerror = () => setError('Could not read file.');
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);
    setError(null);
    try {
      await importData(user, parsed);
      // Both the progress and journal pages load their state on mount, so a
      // full reload is the simplest correct way to reflect the replaced data.
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
      setImporting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,.55)',
        backdropFilter: 'blur(12px) saturate(110%)',
        WebkitBackdropFilter: 'blur(12px) saturate(110%)',
        zIndex: 300,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '12vh clamp(10px,3vw,24px) 24px',
        overflowY: 'auto',
        animation: 'backdropIn .2s ease-out',
      }}
      onClick={() => { if (!importing) onClose(); }}
    >
      <div
        style={{
          width: '100%', maxWidth: 460,
          borderRadius: 'var(--radius)',
          background: T.surface, border: `1px solid ${T.border}`,
          boxShadow: 'var(--shadow-overlay)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'focusIn .32s cubic-bezier(.16,1,.3,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', borderBottom: `1px solid ${T.border}`,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: T.ink, margin: 0, letterSpacing: '-0.01em' }}>
            Import data
          </h2>
          <button
            type="button"
            onClick={() => { if (!importing) onClose(); }}
            aria-label="Close"
            style={{
              border: 'none', background: 'transparent', color: T.muted,
              fontSize: 19, cursor: 'pointer', lineHeight: 1, padding: 2,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: T.muted, margin: 0 }}>
            Choose a Progress Tracker export file (<code style={{ fontSize: 12 }}>.json</code>) to load.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="btn-outline"
            style={{ alignSelf: 'flex-start', padding: '8px 14px', fontSize: 13 }}
          >
            {fileName ? 'Choose a different file' : 'Choose file'}
          </button>

          {fileName && !error && (
            <div style={{ fontSize: 12, color: T.faint, marginTop: -6 }}>{fileName}</div>
          )}

          {summary && !error && (
            <div style={{
              padding: '12px 16px', borderRadius: 'var(--radius)',
              background: T.well, border: `1px solid ${T.border}`,
              fontSize: 13, color: T.ink,
            }}>
              Found{' '}
              <strong>{summary.goals}</strong> goal{summary.goals === 1 ? '' : 's'} ·{' '}
              <strong>{summary.daily_progresses}</strong> tracked day{summary.daily_progresses === 1 ? '' : 's'} ·{' '}
              <strong>{summary.journal_entries}</strong> entr{summary.journal_entries === 1 ? 'y' : 'ies'}
            </div>
          )}

          {error && (
            <div style={{
              padding: '12px 16px', borderRadius: 'var(--radius)',
              background: T.dangerTint, border: `1px solid ${T.dangerBorder}`,
              fontSize: 13, color: T.danger,
            }}>
              {error}
            </div>
          )}

          {parsed && !error && (
            <div style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              padding: '12px 16px', borderRadius: 'var(--radius)',
              background: T.well, border: `1px solid ${T.border}`,
              fontSize: 13, lineHeight: 1.5, color: T.ink,
            }}>
              <span aria-hidden="true">⚠</span>
              <span>This will <strong>permanently replace</strong> all your current goals, progress, and journal entries.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
          padding: '12px 22px', borderTop: `1px solid ${T.border}`, background: T.well,
        }}>
          <button
            type="button"
            onClick={() => { if (!importing) onClose(); }}
            className="btn-ghost"
            style={{ padding: '7px 14px', fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!parsed || !!error || importing}
            style={{
              background: T.accent, color: '#fff',
              padding: '8px 16px', fontSize: 13, fontWeight: 600,
              borderRadius: 'var(--radius)', border: 'none',
              cursor: !parsed || importing ? 'default' : 'pointer',
              fontFamily: 'inherit', letterSpacing: '-0.01em',
              opacity: !parsed || !!error || importing ? 0.5 : 1,
            }}
          >
            {importing ? 'Importing…' : 'Replace my data'}
          </button>
        </div>
      </div>
    </div>
  );
}
