'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function NewJournalEntryForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [formData, setFormData] = useState({
    date: '',
    content: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

    try {
      const response = await fetch('/api/journal-entries', {
        method: 'POST',
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
        const date = new Date(entry.date);
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
      const date = new Date(formData.date);
      return `/progress/${date.getFullYear()}/${date.getMonth() + 1}`;
    }
    return '/';
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">New Journal Entry</h1>
      
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
            disabled={loading}
            className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Entry'}
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

export default function NewJournalEntryPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">New Journal Entry</h1>
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    }>
      <NewJournalEntryForm />
    </Suspense>
  );
} 