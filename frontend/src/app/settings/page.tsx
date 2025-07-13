'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';

export default function SettingsPage() {
  const [passwordResetEmail, setPasswordResetEmail] = useState('');
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const { user, logout } = useAuth();

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: passwordResetEmail }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send password reset email');
      }

      const data = await response.json();
      setPasswordResetSent(true);
      setSuccess(data.message || 'Password reset instructions have been sent to your email.');
      setPasswordResetEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link 
            href="/"
            className="btn-ghost mb-4 inline-flex items-center"
          >
            ← Back to Progress
          </Link>
          
          <h1 className="text-4xl font-bold text-neutral-900 mb-2">Settings</h1>
          <p className="text-neutral-600">Manage your account and preferences</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Account Information */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-2xl font-bold text-neutral-900">Account Information</h2>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Email Address
                  </label>
                  <p className="text-neutral-900 bg-neutral-100 px-3 py-2 rounded-lg">
                    {user.email}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Account Status
                  </label>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Password Reset */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-2xl font-bold text-neutral-900">Password Reset</h2>
            </div>
            <div className="card-body">
              {!passwordResetSent ? (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={passwordResetEmail}
                      onChange={(e) => setPasswordResetEmail(e.target.value)}
                      className="form-input w-full"
                      placeholder="Enter your email address"
                      required
                    />
                  </div>
                  
                  {error && (
                    <div className="alert alert-error">
                      {error}
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full"
                  >
                    {loading ? 'Sending...' : 'Send Reset Instructions'}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="alert alert-success">
                    {success}
                  </div>
                  <p className="text-sm text-neutral-600">
                    Check your email for instructions on how to reset your password. 
                    The link will expire in 6 hours.
                  </p>
                  <button
                    onClick={() => setPasswordResetSent(false)}
                    className="btn-outline w-full"
                  >
                    Send Another Reset Email
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Account Actions */}
          <div className="card md:col-span-2">
            <div className="card-header">
              <h2 className="text-2xl font-bold text-neutral-900">Account Actions</h2>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-neutral-900">Sign Out</h3>
                    <p className="text-sm text-neutral-600">
                      Sign out of your account on this device
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="btn-outline"
                  >
                    Sign Out
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-neutral-900">Data Export</h3>
                    <p className="text-sm text-neutral-600">
                      Download your goals and progress data
                    </p>
                  </div>
                  <button
                    className="btn-outline"
                    disabled
                    title="Coming soon"
                  >
                    Export Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 