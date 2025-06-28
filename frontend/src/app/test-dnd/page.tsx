'use client';

import { useState } from 'react';
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

const testItems = [
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
  { id: 3, name: 'Item 3' },
];

function SortableItem({ item }: { item: { id: number; name: string } }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-gray-300 p-4 rounded bg-white mb-2"
    >
      <div 
        className="text-gray-800 text-xl cursor-move p-2 hover:bg-blue-100 rounded border border-gray-300 bg-gray-50 inline-block"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </div>
      <span className="ml-3">{item.name}</span>
    </div>
  );
}

export default function TestDndPage() {
  const [items, setItems] = useState(testItems);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    console.log('Test drag end event:', event);
    const { active, over } = event;

    if (active.id !== over?.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Drag and Drop Test</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
        <p className="text-blue-800 font-medium">
          Test drag and drop functionality
        </p>
        <p className="text-blue-600 text-sm mt-1">
          Try dragging the items below
        </p>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <SortableItem key={item.id} item={item} />
          ))}
        </SortableContext>
      </DndContext>
      
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-2">Current Order:</h2>
        <ol className="list-decimal list-inside">
          {items.map((item, index) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ol>
      </div>
    </div>
  );
} 