import { NextRequest, NextResponse } from 'next/server';

const RAILS_API_BASE = process.env.RAILS_API_BASE || 'http://localhost:3000';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { year: string; month: string; goalId: string; date: string } }
) {
  try {
    const body = await request.json();
    
    const response = await fetch(
      `${RAILS_API_BASE}/progress/${params.year}/${params.month}/${params.goalId}/${params.date}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to update progress');
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
} 