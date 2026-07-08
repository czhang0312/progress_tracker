'use client';

import { useState, useEffect } from 'react';
import PageLoader from '@/components/PageLoader';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { RAILS_API_BASE } from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';
import { deleteGuestJournalEntry, getGuestJournalEntry, updateGuestJournalEntry } from '@/lib/guestStorage';

export default function EditJournalEntryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [formData, setFormData] = useState({
    date: '',
    content: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    fetchJournalEntry();
  }, [authLoading, user, params.id]);

  const fetchJournalEntry = async () => {
    if (user?.is_guest) {
      const entry = getGuestJournalEntry(parseInt(params.id as string));
      if (!entry) {
        alert('Journal entry not found');
        router.push('/journal-entries');
        return;
      }

      setFormData({
        date: entry.date,
        content: entry.content,
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${RAILS_API_BASE}/journal_entries/${params.id}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch journal entry');
      }
      const entry = await response.json();
      setFormData({
        date: entry.date,
        content: entry.content
      });
    } catch (err) {
      console.error('Error fetching journal entry:', err);
      alert('Failed to fetch journal entry');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    if (user?.is_guest) {
      const entryId = parseInt(params.id as string);
      if (formData.content.trim() === '') {
        deleteGuestJournalEntry(entryId);
      } else {
        const updated = updateGuestJournalEntry(entryId, {
          date: formData.date,
          content: formData.content,
        });

        if (!updated) {
          alert('Journal entry not found');
          setSaving(false);
          return;
        }
      }

      const returnTo = searchParams.get('returnTo');
      const year = searchParams.get('year');
      const month = searchParams.get('month');

      if (returnTo === 'progress' && year && month) {
        router.push(`/progress/${year}/${month}`);
      } else {
        const date = new Date(formData.date);
        router.push(`/progress/${date.getFullYear()}/${date.getMonth() + 1}`);
      }
      setSaving(false);
      return;
    }

    try {
      // Send update request - Rails backend will handle deletion if content is empty
      const response = await fetch(`${RAILS_API_BASE}/journal_entries/${params.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          journal_entry: formData
        }),
      });

      // Handle both successful update (200) and successful deletion (204)
      if (response.status === 204) {
        // Entry was deleted due to empty content - this is successful
        console.log('Journal entry deleted due to empty content');
      } else if (!response.ok) {
        const errorData = await response.json();
        if (errorData.errors) {
          setErrors(errorData.errors);
        } else {
          throw new Error('Failed to update journal entry');
        }
        return;
      }

      // Check if we should return to progress view
      const returnTo = searchParams.get('returnTo');
      const year = searchParams.get('year');
      const month = searchParams.get('month');
      
      if (returnTo === 'progress' && year && month) {
        router.push(`/progress/${year}/${month}`);
      } else {
        // Default behavior - go to progress view for the entry's month
        const date = new Date(formData.date);
        router.push(`/progress/${date.getFullYear()}/${date.getMonth() + 1}`);
      }
    } catch (err) {
      console.error('Error updating journal entry:', err);
      alert('Failed to update journal entry');
    } finally {
      setSaving(false);
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
      const date = new Date(formData.date);
      return `/progress/${date.getFullYear()}/${date.getMonth() + 1}`;
    }
    return '/';
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-2xl mx-auto p-6">
        <div className="card animate-fade-in">
          <div className="card-body">
            <div className="mb-6">
              <h1 className="page-title mb-2">Edit Journal Entry</h1>
              <p className="text-description">Refine your entry or clear content to remove it.</p>
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
                    errors.date ? 'border-danger focus:ring-danger' : ''
                  }`}
                  required
                />
                {errors.date && (
                  <p className="mt-1 text-danger">{errors.date}</p>
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
                  placeholder="Write your journal entry here... (Leave empty to delete this entry)"
                  className={`form-input min-h-[180px] ${
                    errors.content ? 'border-danger focus:ring-danger' : ''
                  }`}
                />
                {errors.content && (
                  <p className="mt-1 text-danger">{errors.content}</p>
                )}
                <p className="mt-1 text-neutral-500">
                  Leave the content empty to delete this journal entry.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Saving...' : formData.content.trim() ? 'Save Changes' : 'Delete Entry'}
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