'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface JournalEntryData {
  id: number;
  date: string;
  content: string;
}

const RAILS_API_BASE = process.env.NEXT_PUBLIC_RAILS_API_BASE || 'http://localhost:3001';

function EditJournalEntryForm() {
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



  const fetchJournalEntry = useCallback(async () => {
    try {
      const response = await fetch(`${RAILS_API_BASE}/journal_entries/${params.id}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch journal entry');
      }
      const entry: JournalEntryData = await response.json();
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
  }, [params.id]);

  useEffect(() => {
    fetchJournalEntry();
  }, [fetchJournalEntry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      // Send update request - Rails backend will handle deletion if content is empty
      const response = await fetch(`${RAILS_API_BASE}/journal_entries/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          journal_entry: formData
        }),
        credentials: 'include',
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
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Edit Journal Entry</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
            Date
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.date ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-600">{errors.date}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            Content
          </label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            rows={8}
            placeholder="Write your journal entry here... (Leave empty to delete this entry)"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.content ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.content && (
            <p className="mt-1 text-sm text-red-600">{errors.content}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Leave the content empty to delete this journal entry.
          </p>
        </div>
        
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : formData.content.trim() ? 'Save Changes' : 'Delete Entry'}
          </button>
          <Link 
            href={getBackUrl()}
            className="px-6 py-3 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function EditJournalEntryPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Edit Journal Entry</h1>
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    }>
      <EditJournalEntryForm />
    </Suspense>
  );
} 