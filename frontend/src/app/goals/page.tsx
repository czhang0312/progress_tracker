'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Goal {
  id: number;
  name: string;
  description: string;
  position: number;
}

function SortableGoalItem({ goal, onDelete }: { goal: Goal; onDelete: (id: number) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="card hover:shadow-medium transition-all duration-200"
    >
      <div className="card-body">
        <div className="flex items-center gap-4">
          <div 
            className="text-neutral-400 text-2xl cursor-move p-3 hover:bg-neutral-100 rounded-lg border border-neutral-200 bg-neutral-50 transition-colors duration-200"
            {...attributes}
            {...listeners}
            title="Drag to reorder"
          >
            ⋮⋮
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-neutral-900 mb-2">{goal.name}</h3>
            <p className="text-neutral-600 leading-relaxed">{goal.description}</p>
          </div>
          <div className="flex gap-2">
            <Link 
              href={`/goals/${goal.id}/edit`}
              className="btn-outline"
              onClick={(e) => e.stopPropagation()}
            >
              Edit
            </Link>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(goal.id);
              }}
              className="btn bg-error-600 text-white hover:bg-error-700 focus:ring-error-500"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user, logout } = useAuth();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchGoals();
  }, [user, router]);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/goals', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch goals');
      }
      const data = await response.json();
      console.log('Fetched goals:', data); // Debug log
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
        credentials: 'include',
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

  const handleDragEnd = async (event: DragEndEvent) => {
    console.log('Drag end event:', event); // Debug log
    const { active, over } = event;

    if (active.id !== over?.id) {
      setGoals((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);

        const newGoals = arrayMove(items, oldIndex, newIndex);
        
        // Update positions in the backend
        const goalIds = newGoals.map(goal => goal.id);
        updateGoalOrder(goalIds);
        
        return newGoals;
      });
    }
  };

  const updateGoalOrder = async (goalIds: number[]) => {
    try {
      console.log('Updating goal order:', goalIds); // Debug log
      const response = await fetch('/api/goals/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ goal_ids: goalIds }),
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('Failed to update goal order');
      } else {
        console.log('Goal order updated successfully');
      }
    } catch (err) {
      console.error('Error updating goal order:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Loading Goals</h1>
          <p className="text-neutral-600">Getting your goals ready...</p>
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
          <button 
            onClick={fetchGoals}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
              <div>
                <h1 className="text-4xl font-bold text-gradient mb-2">Goals</h1>
                <p className="text-lg text-neutral-600">Manage and organize your goals</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-neutral-500">Welcome back</p>
                  <p className="font-medium text-neutral-900">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-outline"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <Link 
            href="/goals/new"
            className="btn-primary text-lg px-6 py-3"
          >
            <span className="mr-2">+</span>
            Create New Goal
          </Link>
          
          <div className="flex gap-2">
            <Link 
              href="/"
              className="btn-ghost"
            >
              ← Back to Progress
            </Link>
            <Link 
              href="/settings"
              className="btn-ghost"
            >
              Settings
            </Link>
          </div>
        </div>
        
        {/* Goals List */}
        {goals.length > 0 ? (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-6">
              <p className="text-neutral-600">
                Drag and drop to reorder your goals
              </p>
            </div>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={goals.map(goal => goal.id)}
                strategy={verticalListSortingStrategy}
              >
                {goals.map((goal) => (
                  <SortableGoalItem
                    key={goal.id}
                    goal={goal}
                    onDelete={deleteGoal}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        ) : (
          <div className="card text-center py-16 animate-fade-in">
            <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-neutral-400 text-4xl">🎯</span>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">No goals yet</h2>
            <p className="text-neutral-600 mb-6 max-w-md mx-auto">
              Create your first goal to start tracking your progress. Goals help you stay focused and motivated on what matters most.
            </p>
            <Link 
              href="/goals/new"
              className="btn-primary text-lg px-8 py-3"
            >
              Create Your First Goal
            </Link>
          </div>
        )}
      </div>
    </div>
  );
} 