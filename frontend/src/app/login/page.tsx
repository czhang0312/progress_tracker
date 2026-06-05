'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';

const SERIF = "'Source Serif 4','Source Serif Pro',Georgia,serif";

function Mark({ size = 40, stroke = 3.2 }: { size?: number; stroke?: number }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      border: `${stroke}px solid #2563EB`,
      background: 'linear-gradient(135deg, #2563EB 50%, transparent 50%)',
      flexShrink: 0,
    }} />
  );
}

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

function LoginContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { login, register } = useAuth();

  const isSignup = mode === 'signup';

  const switchMode = (m: 'signin' | 'signup') => {
    setMode(m);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields'); return; }
    if (isSignup && password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setLoading(true);
    setError(null);

    const success = isSignup
      ? await register(email, password, password)
      : await login(email, password);

    setLoading(false);

    if (success) {
      router.push('/');
    } else {
      setError(isSignup
        ? 'Could not create account. That email may already be in use.'
        : 'Invalid email or password.');
    }
  };

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
          <Mark />
          <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.15, marginTop: 16, margin: '16px 0 0' }}>
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p style={{ color: '#64748B', fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>
            {isSignup
              ? 'Start tracking your goals in under a minute.'
              : 'Sign in to continue tracking your progress.'}
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

          {/* Sign in / Sign up segmented toggle */}
          <div style={{
            display: 'flex',
            gap: 4,
            padding: 4,
            borderRadius: 11,
            marginBottom: 22,
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
          }}>
            {([ ['signin', 'Sign in'], ['signup', 'Sign up'] ] as [string, string][]).map(([m, label]) => {
              const typedM = m as 'signin' | 'signup';
              const active = mode === typedM;
              return (
                <button
                  key={typedM}
                  type="button"
                  onClick={() => switchMode(typedM)}
                  style={{
                    flex: 1,
                    padding: '9px 0',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.13em',
                    textTransform: 'uppercase',
                    borderRadius: 8,
                    transition: 'color .18s, background .18s, box-shadow .18s',
                    background: active ? '#ffffff' : 'transparent',
                    color: active ? '#0F172A' : '#64748B',
                    boxShadow: active
                      ? '0 1px 2px rgba(15,23,42,.06), 0 2px 8px -4px rgba(15,23,42,.14)'
                      : 'none',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Email</label>
              <input
                className="form-input"
                type="email"
                value={email}
                placeholder="you@example.com"
                onChange={e => setEmail(e.target.value)}
                style={inputOverride}
                autoComplete="email"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label style={labelStyle}>Password</label>
                {!isSignup && (
                  <Link
                    href="/forgot-password"
                    style={{ fontSize: 11, color: '#2563EB', fontWeight: 500, textDecoration: 'none' }}
                  >
                    Forgot Password?
                  </Link>
                )}
              </div>
              <input
                className="form-input"
                type="password"
                value={password}
                placeholder={isSignup ? 'At least 6 characters' : '••••••••'}
                onChange={e => setPassword(e.target.value)}
                style={inputOverride}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
              />
            </div>

            {error && (
              <div style={{
                background: '#EF444415',
                border: '1px solid #EF444440',
                color: '#DC2626',
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 12.5,
              }}>
                {error}
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
              {loading
                ? (isSignup ? 'Creating account…' : 'Signing in…')
                : (isSignup ? 'Create account' : 'Sign in')}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              or
            </span>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          </div>

          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '10px',
              fontSize: 13.5,
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              color: '#64748B',
              background: 'transparent',
              textDecoration: 'none',
              fontWeight: 500,
              transition: 'border-color .15s, color .15s',
            }}
          >
            Continue as guest
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
