import { NextRequest, NextResponse } from 'next/server';
import { RAILS_API_BASE } from '@/lib/config';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get the cookie from the incoming request
    const cookie = request.headers.get('cookie');
    
    const response = await fetch(`${RAILS_API_BASE}/goals/reorder`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie && { cookie }), // Forward the cookie if it exists
      },
      body: JSON.stringify(body),
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
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