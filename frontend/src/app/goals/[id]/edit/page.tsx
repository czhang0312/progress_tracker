'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { RAILS_API_BASE } from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';
import { getGuestGoal, updateGuestGoal } from '@/lib/guestStorage';

interface Goal {
  id: number;
  name: string;
  description: string;
  position: number;
}

export default function EditGoalPage() {
  const params = useParams();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  const goalId = parseInt(params.id as string);

  useEffect(() => {
    if (authLoading) return;
    fetchGoal();
  }, [goalId, user, authLoading]);

  const fetchGoal = async () => {
    if (user?.is_guest) {
      const goal = getGuestGoal(goalId);
      if (!goal) {
        setError('Goal not found');
        setLoading(false);
        return;
      }

      setFormData({
        name: goal.name,
        description: goal.description,
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${RAILS_API_BASE}/goals/${goalId}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch goal');
      }
      const goal: Goal = await response.json();
      setFormData({
        name: goal.name,
        description: goal.description
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

    if (user?.is_guest) {
      const updated = updateGuestGoal(goalId, {
        name: formData.name,
        description: formData.description,
      });

      if (!updated) {
        setError('Goal not found');
      } else {
        router.push('/goals');
      }
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`${RAILS_API_BASE}/goals/${goalId}`, {
        method: 'PATCH',
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
          throw new Error('Failed to update goal');
        }
        return;
      }

      router.push('/goals');
    } catch (err) {
      console.error('Error updating goal:', err);
      alert('Failed to update goal');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Loading Goal</h1>
          <p className="text-neutral-600">Getting goal details ready...</p>
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
          <Link href="/goals" className="btn-primary">
            Back to Goals
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="card animate-fade-in">
          <div className="card-body">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gradient mb-2">Edit Goal</h1>
              <p className="text-neutral-600">Update your goal details to keep your progress on track.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="form-label">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`form-input ${
                    errors.name ? 'border-error-500 focus:ring-error-500' : ''
                  }`}
                  required
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-error-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="description" className="form-label">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className={`form-input min-h-[120px] ${
                    errors.description ? 'border-error-500 focus:ring-error-500' : ''
                  }`}
                  required
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-error-600">{errors.description}</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Updating...' : 'Update Goal'}
                </button>
                <Link
                  href="/goals"
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