'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RAILS_API_BASE } from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';
import { createGuestGoal } from '@/lib/guestStorage';

export default function NewGoalPage() {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    if (user?.is_guest) {
      createGuestGoal({
        name: formData.name,
        description: formData.description,
      });
      router.push('/goals');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${RAILS_API_BASE}/goals`, {
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
          throw new Error('Failed to create goal');
        }
        return;
      }

      router.push('/goals');
    } catch (err) {
      console.error('Error creating goal:', err);
      alert('Failed to create goal');
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

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="card animate-fade-in">
          <div className="card-body">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gradient mb-2">New Goal</h1>
              <p className="text-neutral-600">Define a clear goal to focus your daily progress.</p>
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
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? 'Creating...' : 'Create Goal'}
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