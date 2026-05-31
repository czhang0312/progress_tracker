'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';

const SERIF = "'Source Serif 4','Source Serif Pro',Georgia,serif";

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: '#64748B',
  letterSpacing: '0.1em',
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
          background: '#EF444415',
          border: '1px solid #EF444440',
          color: '#DC2626',
          padding: '10px 14px',
          borderRadius: 8,
          fontSize: 13.5,
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
            borderRadius: 8,
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
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
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          color: '#16A34A',
        }}>
          ✓
        </div>
        <p style={{ color: '#475569', fontSize: 13.5, lineHeight: 1.6 }}>
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
            borderRadius: 8,
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
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
          background: '#EF444415',
          border: '1px solid #EF444440',
          color: '#DC2626',
          padding: '8px 12px',
          borderRadius: 8,
          fontSize: 12.5,
          lineHeight: 1.5,
        }} role="alert">
          {errors.map((err, i) => <div key={i}>{err}</div>)}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
          color: '#fff',
          width: '100%',
          padding: '11px',
          fontSize: 14,
          marginTop: 2,
          border: 'none',
          borderRadius: 8,
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
      background: '#F1F5F9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 380, animation: 'fadeIn .25s ease-out' }}>

        {/* Logo + heading */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 22 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '3.2px solid #2563EB',
            background: 'linear-gradient(135deg, #2563EB 50%, transparent 50%)',
            flexShrink: 0,
          }} />
          <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.15, margin: '16px 0 0' }}>
            Choose a new password
          </h1>
          <p style={{ color: '#64748B', fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>
            Pick something strong and memorable.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 1px 2px rgba(15,23,42,.04), 0 12px 32px -16px rgba(15,23,42,.16)',
        }}>
          <Suspense fallback={
            <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13.5, padding: '12px 0' }}>
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
