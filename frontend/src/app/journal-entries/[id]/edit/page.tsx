'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface JournalEntry {
  id: number;
  date: string;
  content: string;
}

export default function EditJournalEntryPage() {
  const params = useParams();
  const router = useRouter();
  const [formData, setFormData] = useState({
    date: '',
    content: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const entryId = parseInt(params.id as string);

  useEffect(() => {
    fetchJournalEntry();
  }, [entryId]);

  const fetchJournalEntry = async () => {
    try {
      const response = await fetch(`/api/journal-entries/${entryId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch journal entry');
      }
      const entry: JournalEntry = await response.json();
      setFormData({
        date: entry.date,
        content: entry.content
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const response = await fetch(`/api/journal-entries/${entryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.errors) {
          setErrors(errorData.errors);
        } else {
          throw new Error('Failed to update journal entry');
        }
        return;
      }

      const entry = await response.json();
      const date = new Date(entry.date);
      router.push(`/progress/${date.getFullYear()}/${date.getMonth() + 1}`);
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
    if (formData.date) {
      const date = new Date(formData.date);
      return `/progress/${date.getFullYear()}/${date.getMonth() + 1}`;
    }
    return '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p className="text-gray-600">{error}</p>
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
            placeholder="Write your journal entry here..."
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.content ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          />
          {errors.content && (
            <p className="mt-1 text-sm text-red-600">{errors.content}</p>
          )}
        </div>
        
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {saving ? 'Updating...' : 'Update Entry'}
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