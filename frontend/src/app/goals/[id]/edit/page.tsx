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
      <h1 className="text-3xl font-bold mb-6">Edit Goal</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
        </div>
        
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {saving ? 'Updating...' : 'Update Goal'}
          </button>
          <Link 
            href="/goals"
            className="px-6 py-3 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
} 