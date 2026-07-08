'use client';

import { useState } from 'react';
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await forgotPassword(email);
    setLoading(false);
    setSubmitted(true);
  };

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
            {submitted ? 'Check your email' : 'Reset your password'}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
            {submitted
              ? `We sent a reset link to ${email}`
              : "Enter your email and we'll send you a reset link."}
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
          {submitted ? (
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
                If an account exists for <strong style={{ color: 'var(--ink)' }}>{email}</strong>, you&apos;ll receive a reset link shortly.
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
                  marginTop: 4,
                }}
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Email</label>
                <input
                  className="form-input"
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ padding: '10px 14px', fontSize: 14 }}
                />
              </div>

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
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  or
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <Link
                href="/login"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  padding: '10px',
                  fontSize: 13,
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  color: 'var(--muted)',
                  background: 'transparent',
                  textDecoration: 'none',
                  fontWeight: 500,
                  transition: 'border-color .15s, color .15s',
                }}
              >
                Back to Sign In
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
