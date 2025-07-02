import { NextRequest, NextResponse } from 'next/server';

const RAILS_API_BASE = process.env.RAILS_API_BASE || 'http://localhost:3001';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string; goalId: string; date: string }> }
) {
  try {
    const { year, month, goalId, date } = await params;
    const body = await request.json();
    
    // Get the cookie from the incoming request
    const cookie = request.headers.get('cookie');
    
    console.log('Updating progress:', { year, month, goalId, date, body });
    
    const response = await fetch(
      `${RAILS_API_BASE}/progress/${year}/${month}/${goalId}/${date}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(cookie && { cookie }), // Forward the cookie if it exists
        },
        body: JSON.stringify(body),
        credentials: 'include',
      }
    );
    
    console.log('Rails response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Rails error response:', errorText);
      throw new Error(`Failed to update progress: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Rails success response:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update progress' },
      { status: 500 }
    );
  }
} 