'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
      className="border border-gray-300 p-4 rounded flex justify-between items-center bg-white hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3">
        <div 
          className="text-gray-800 text-2xl cursor-move p-2 hover:bg-blue-100 rounded border border-gray-300 bg-gray-50"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
        >
          ⋮⋮
        </div>
        <div>
          <h3 className="text-xl font-bold mb-2">{goal.name}</h3>
          <p className="text-gray-600">{goal.description}</p>
        </div>
      </div>
      <div className="flex gap-3">
        <Link 
          href={`/goals/${goal.id}/edit`}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          Edit
        </Link>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(goal.id);
          }}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
          <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
            <p className="text-blue-800 font-medium">
              💡 Drag and drop goals to reorder them
            </p>
            <p className="text-blue-600 text-sm mt-1">
              Click and drag the ⋮⋮ handle on the left of each goal
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