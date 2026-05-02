'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';

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
      <div className="text-center space-y-4">
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
          Invalid or missing reset token. Please request a new password reset link.
        </div>
        <Link href="/forgot-password" className="btn-primary block text-center mt-4">
          Request Reset Link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-success-600 text-2xl">✓</span>
        </div>
        <p className="text-neutral-700">Your password has been updated successfully.</p>
        <Link href="/login" className="btn-primary block text-center mt-4">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="password" className="form-label">
          New Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={formData.password}
          onChange={handleChange}
          className="form-input"
          placeholder="Enter new password"
        />
      </div>

      <div>
        <label htmlFor="password_confirmation" className="form-label">
          Confirm New Password
        </label>
        <input
          id="password_confirmation"
          name="password_confirmation"
          type="password"
          autoComplete="new-password"
          required
          value={formData.password_confirmation}
          onChange={handleChange}
          className="form-input"
          placeholder="Confirm new password"
        />
      </div>

      {errors.length > 0 && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg" role="alert">
          <span className="text-error-600 mr-2">⚠️</span>
          <ul className="inline">
            {errors.map((err, i) => (
              <li key={i} className="text-sm">{err}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full text-lg py-3"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Updating...
          </div>
        ) : (
          'Update Password'
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-medium">
            <span className="text-white text-3xl font-bold">PT</span>
          </div>
          <h1 className="text-4xl font-bold text-gradient mb-2">
            New Password
          </h1>
          <p className="text-lg text-neutral-600">
            Choose a strong password for your account
          </p>
        </div>

        <div className="card">
          <div className="card-body">
            <Suspense fallback={<div className="text-center text-neutral-500">Loading...</div>}>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
