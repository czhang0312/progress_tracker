'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { RAILS_API_BASE } from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';
import { createGuestJournalEntry } from '@/lib/guestStorage';

function NewJournalEntryForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [formData, setFormData] = useState({
    date: '',
    content: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { user } = useAuth();

  const parseLocalDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) {
      return new Date(dateString);
    }
    return new Date(year, month - 1, day);
  };

  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      setFormData(prev => ({ ...prev, date: dateParam }));
    } else {
      // Default to today
      setFormData(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    if (user?.is_guest) {
      const entry = createGuestJournalEntry({
        date: formData.date,
        content: formData.content,
      });

      const returnTo = searchParams.get('returnTo');
      const year = searchParams.get('year');
      const month = searchParams.get('month');

      if (returnTo === 'progress' && year && month) {
        router.push(`/progress/${year}/${month}`);
      } else {
        const date = parseLocalDate(entry.date);
        router.push(`/progress/${date.getFullYear()}/${date.getMonth() + 1}`);
      }
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${RAILS_API_BASE}/journal_entries`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.errors) {
          setErrors(errorData.errors);
        } else {
          throw new Error('Failed to create journal entry');
        }
        return;
      }

      const entry = await response.json();
      
      // Check if we should return to progress view
      const returnTo = searchParams.get('returnTo');
      const year = searchParams.get('year');
      const month = searchParams.get('month');
      
      if (returnTo === 'progress' && year && month) {
        router.push(`/progress/${year}/${month}`);
      } else {
        // Default behavior - go to progress view for the entry's month
        const date = parseLocalDate(entry.date);
        router.push(`/progress/${date.getFullYear()}/${date.getMonth() + 1}`);
      }
    } catch (err) {
      console.error('Error creating journal entry:', err);
      alert('Failed to create journal entry');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getBackUrl = () => {
    const returnTo = searchParams.get('returnTo');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    
    if (returnTo === 'progress' && year && month) {
      return `/progress/${year}/${month}`;
    }
    
    if (formData.date) {
      const date = parseLocalDate(formData.date);
      return `/progress/${date.getFullYear()}/${date.getMonth() + 1}`;
    }
    return '/';
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="card animate-fade-in">
          <div className="card-body">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gradient mb-2">New Journal Entry</h1>
              <p className="text-neutral-600">Capture your thoughts and reflect on your progress.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="date" className="form-label">
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className={`form-input ${
                    errors.date ? 'border-error-500 focus:ring-error-500' : ''
                  }`}
                  required
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-error-600">{errors.date}</p>
                )}
              </div>

              <div>
                <label htmlFor="content" className="form-label">
                  Content
                </label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  rows={8}
                  placeholder="Write your journal entry here..."
                  className={`form-input min-h-[220px] ${
                    errors.content ? 'border-error-500 focus:ring-error-500' : ''
                  }`}
                  required
                />
                {errors.content && (
                  <p className="mt-1 text-sm text-error-600">{errors.content}</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? 'Creating...' : 'Create Entry'}
                </button>
                <Link
                  href={getBackUrl()}
                  className="btn-outline text-center"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewJournalEntryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="text-center animate-fade-in">
            <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Loading Form</h1>
            <p className="text-neutral-600">Preparing journal entry details...</p>
          </div>
        </div>
      }
    >
      <NewJournalEntryForm />
    </Suspense>
  );
} 