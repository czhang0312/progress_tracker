import { NextRequest, NextResponse } from 'next/server';

const RAILS_API_BASE = process.env.RAILS_API_BASE || 'http://localhost:3001';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${RAILS_API_BASE}/goals/reorder`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error('Failed to reorder goals');
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reordering goals:', error);
    return NextResponse.json(
      { error: 'Failed to reorder goals' },
      { status: 500 }
    );
  }
} 