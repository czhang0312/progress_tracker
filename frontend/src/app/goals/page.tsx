'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Goal {
  id: number;
  name: string;
  description: string;
  position: number;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/goals');
      if (!response.ok) {
        throw new Error('Failed to fetch goals');
      }
      const data = await response.json();
      setGoals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const deleteGoal = async (goalId: number) => {
    if (!confirm('Are you sure you want to delete this goal?')) {
      return;
    }

    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete goal');
      }

      // Remove the goal from local state
      setGoals(prev => prev.filter(goal => goal.id !== goalId));
    } catch (err) {
      console.error('Error deleting goal:', err);
      alert('Failed to delete goal');
    }
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
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Goals</h1>
      
      <Link 
        href="/goals/new"
        className="inline-block px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors mb-6"
      >
        New Goal
      </Link>
      
      {goals.length > 0 ? (
        <div className="space-y-4">
          {goals.map((goal) => (
            <div key={goal.id} className="border border-gray-300 p-4 rounded flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold mb-2">{goal.name}</h3>
                <p className="text-gray-600">{goal.description}</p>
              </div>
              <div className="flex gap-3">
                <Link 
                  href={`/goals/${goal.id}/edit`}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Edit
                </Link>
                <button
                  onClick={() => deleteGoal(goal.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No goals have been created yet.</p>
      )}
      
      <div className="mt-8">
        <Link 
          href="/"
          className="text-blue-500 hover:underline"
        >
          Back to Progress
        </Link>
      </div>
    </div>
  );
} 