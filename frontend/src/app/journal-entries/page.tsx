'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RAILS_API_BASE } from '@/lib/config';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { deleteGuestJournalEntry, getGuestJournalEntries } from '@/lib/guestStorage';

interface JournalEntry {
  id: number;
  date: string;
  content: string;
}

export default function JournalEntriesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    if (authLoading) return;
    fetchJournalEntries();
  }, [authLoading, user]);

  const fetchJournalEntries = async () => {
    if (user?.is_guest) {
      setEntries(getGuestJournalEntries());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${RAILS_API_BASE}/journal_entries`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
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
    if (user?.is_guest) {
      deleteGuestJournalEntry(id);
      setEntries(getGuestJournalEntries());
      return;
    }

    if (!confirm('Are you sure you want to delete this journal entry?')) {
      return;
    }

    try {
      const response = await fetch(`${RAILS_API_BASE}/journal_entries/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          const body = await response.json().catch(() => null);
          if (body?.code === 'AUTH_REQUIRED') {
            router.push('/login');
            return;
          }
        }
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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Loading Journal Entries</h1>
          <p className="text-neutral-600">Getting your journal entries ready...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-error-600 text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-error-600 mb-2">Something went wrong</h1>
          <p className="text-neutral-600 mb-4">{error}</p>
          <button onClick={fetchJournalEntries} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="card mb-6">
          <div className="card-body">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-4xl font-bold text-gradient mb-2">Journal Entries</h1>
                <p className="text-lg text-neutral-600">Review, search, and manage your entries</p>
              </div>
              <Link
                href="/journal-entries/new"
                className="btn-primary text-lg px-6 py-3"
              >
                <span className="mr-2">+</span>
                New Entry
              </Link>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search journal content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full md:w-auto px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                />
              </div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDateFilter('');
                }}
                className="btn-outline"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-4 text-sm text-neutral-600">
          {filteredEntries.length} of {entries.length} entries
        </div>

        {/* Journal Entries List */}
        {filteredEntries.length > 0 ? (
          <div className="space-y-4 animate-fade-in">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="card hover:shadow-medium transition-all duration-200"
              >
                <div className="card-body">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-neutral-900">{formatDate(entry.date)}</h3>
                      <p className="text-sm text-neutral-500">{getMonthYear(entry.date)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/journal-entries/${entry.id}/edit`}
                        className="btn-outline"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="btn-outline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="text-neutral-700 whitespace-pre-wrap leading-relaxed">
                    {entry.content.length > 300
                      ? `${entry.content.substring(0, 300)}...`
                      : entry.content
                    }
                  </div>
                  {entry.content.length > 300 && (
                    <Link
                      href={`/journal-entries/${entry.id}/edit`}
                      className="inline-block mt-3 text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Read more
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-16 animate-fade-in">
            {entries.length === 0 ? (
              <>
                <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-neutral-400 text-4xl">📝</span>
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 mb-4">No journal entries yet</h2>
                <p className="text-neutral-600 mb-6 max-w-md mx-auto">
                  Create your first journal entry to capture your thoughts and reflect on your progress.
                </p>
                <Link
                  href="/journal-entries/new"
                  className="btn-primary text-lg px-8 py-3"
                >
                  Create your first journal entry
                </Link>
              </>
            ) : (
              <p className="text-neutral-600">No entries match your search criteria.</p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/"
            className="btn-primary"
          >
            Back to Progress Tracker
          </Link>
        </div>
      </div>
    </div>
  );
}