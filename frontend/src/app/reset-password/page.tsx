'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';

import { LogoMark } from '@/components/ProgressCircle';
import { T, SERIF, TRACKING } from '@/lib/theme';

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: T.muted,
  letterSpacing: TRACKING,
  textTransform: 'uppercase',
};

const inputOverride: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: 14,
};

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [formData, setFormData] = useState({ password: '', password_confirmation: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const { resetPassword } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setErrors([]);

    const result = await resetPassword(token, formData.password, formData.password_confirmation);

    if (result.success) {
      setSuccess(true);
    } else {
      setErrors(result.errors ?? ['Something went wrong. Please try again.']);
    }
    setLoading(false);
  };

  if (!token) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
        <div style={{
          background: 'var(--danger-tint)',
          border: '1px solid var(--danger-border)',
          color: 'var(--danger)',
          padding: '10px 14px',
          borderRadius: 'var(--radius)',
          fontSize: 13,
          lineHeight: 1.5,
        }}>
          Invalid or missing reset token. Please request a new password reset link.
        </div>
        <Link
          href="/forgot-password"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '11px',
            fontSize: 14,
            borderRadius: 'var(--radius)',
            background: 'var(--accent)',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Request Reset Link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--accent-tint)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          color: 'var(--accent)',
        }}>
          ✓
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
          Your password has been updated successfully.
        </p>
        <Link
          href="/login"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '11px',
            fontSize: 14,
            borderRadius: 'var(--radius)',
            background: 'var(--accent)',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="password" style={labelStyle}>New Password</label>
        <input
          id="password"
          name="password"
          className="form-input"
          type="password"
          autoComplete="new-password"
          required
          value={formData.password}
          onChange={handleChange}
          placeholder="At least 6 characters"
          style={inputOverride}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="password_confirmation" style={labelStyle}>Confirm New Password</label>
        <input
          id="password_confirmation"
          name="password_confirmation"
          className="form-input"
          type="password"
          autoComplete="new-password"
          required
          value={formData.password_confirmation}
          onChange={handleChange}
          placeholder="Repeat your new password"
          style={inputOverride}
        />
      </div>

      {errors.length > 0 && (
        <div style={{
          background: 'var(--danger-tint)',
          border: '1px solid var(--danger-border)',
          color: 'var(--danger)',
          padding: '8px 12px',
          borderRadius: 'var(--radius)',
          fontSize: 12,
          lineHeight: 1.5,
        }} role="alert">
          {errors.map((err, i) => <div key={i}>{err}</div>)}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          background: 'var(--accent)',
          color: '#fff',
          width: '100%',
          padding: '11px',
          fontSize: 14,
          marginTop: 2,
          border: 'none',
          borderRadius: 'var(--radius)',
          fontFamily: 'inherit',
          fontWeight: 500,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.75 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'opacity .15s',
        }}
      >
        {loading && (
          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        )}
        {loading ? 'Updating…' : 'Update Password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 380, animation: 'fadeIn .25s ease-out' }}>

        {/* Logo + heading */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 22 }}>
          <LogoMark size={40} />
          <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1.15, margin: '16px 0 0' }}>
            Choose a new password
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
            Pick something strong and memorable.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: 24,
          boxShadow: 'var(--shadow-sm)',
        }}>
          <Suspense fallback={
            <div style={{ textAlign: 'center', color: 'var(--faint)', fontSize: 13, padding: '12px 0' }}>
              Loading…
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
