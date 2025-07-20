'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface JournalEntry {
  id: number;
  date: string;
  content: string;
}

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const RAILS_API_BASE = process.env.NEXT_PUBLIC_RAILS_API_BASE || 'http://localhost:3001';
  console.log('process rails api base', process.env.NEXT_PUBLIC_RAILS_API_BASE);

  useEffect(() => {
    fetchJournalEntries();
  }, []);

  const fetchJournalEntries = async () => {
    try {
      setLoading(true);
      console.log('rails api base', RAILS_API_BASE);
      const response = await fetch(`${RAILS_API_BASE}/journal_entries`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch journal entries');
      }
      const data = await response.json();
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this journal entry?')) {
      return;
    }

    try {
      const response = await fetch(`${RAILS_API_BASE}/journal_entries/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete journal entry');
      }

      // Remove from local state
      setEntries(prev => prev.filter(entry => entry.id !== id));
    } catch (err) {
      console.error('Error deleting journal entry:', err);
      alert('Failed to delete journal entry');
    }
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = searchTerm === '' || 
      entry.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = dateFilter === '' || entry.date === dateFilter;
    return matchesSearch && matchesDate;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getMonthYear = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
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
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Journal Entries</h1>
        <Link 
          href="/journal_entries/new"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          New Entry
        </Link>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search journal content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => {
            setSearchTerm('');
            setDateFilter('');
          }}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-gray-600">
        {filteredEntries.length} of {entries.length} entries
      </div>

      {/* Journal Entries List */}
      {filteredEntries.length > 0 ? (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <div key={entry.id} className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-lg">{formatDate(entry.date)}</h3>
                  <p className="text-sm text-gray-500">{getMonthYear(entry.date)}</p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/journal_entries/${entry.id}/edit`}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="text-gray-700 whitespace-pre-wrap">
                {entry.content.length > 300 
                  ? `${entry.content.substring(0, 300)}...` 
                  : entry.content
                }
              </div>
              {entry.content.length > 300 && (
                <Link
                  href={`/journal_entries/${entry.id}/edit`}
                  className="text-blue-500 hover:underline text-sm mt-2 inline-block"
                >
                  Read more
                </Link>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          {entries.length === 0 ? (
            <>
              <p className="text-gray-600 mb-4">No journal entries yet.</p>
              <Link 
                href="/journal_entries/new"
                className="inline-block px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Create your first journal entry
              </Link>
            </>
          ) : (
            <p className="text-gray-600">No entries match your search criteria.</p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex justify-center">
        <Link 
          href="/"
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Back to Progress Tracker
        </Link>
      </div>
    </div>
  );
} 