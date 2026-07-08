'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
          <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1.15, marginTop: 16, margin: '16px 0 0' }}>
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
            {isSignup
              ? 'Start tracking your goals in under a minute.'
              : 'Sign in to continue tracking your progress.'}
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

          {/* Sign in / Sign up segmented toggle */}
          <div style={{
            display: 'flex',
            gap: 4,
            padding: 4,
            borderRadius: 'var(--radius)',
            marginBottom: 24,
            background: 'var(--well)',
            border: '1px solid var(--border)',
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
                    letterSpacing: TRACKING,
                    textTransform: 'uppercase',
                    borderRadius: 'calc(var(--radius) - 2px)',
                    transition: 'color .18s, background .18s, box-shadow .18s',
                    background: active ? 'var(--surface)' : 'transparent',
                    color: active ? 'var(--ink)' : 'var(--muted)',
                    boxShadow: active ? 'var(--shadow-sm)' : 'none',
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
                    style={{ fontSize: 11, color: T.accent, fontWeight: 500, textDecoration: 'none' }}
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
                background: 'var(--danger-tint)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger)',
                padding: '8px 12px',
                borderRadius: 'var(--radius)',
                fontSize: 12,
              }}>
                {error}
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
              {loading
                ? (isSignup ? 'Creating account…' : 'Signing in…')
                : (isSignup ? 'Create account' : 'Sign in')}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              or
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <Link
            href="/"
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
