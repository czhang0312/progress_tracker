import { NextRequest, NextResponse } from 'next/server';
import { RAILS_API_BASE } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  try {
    const { year, month } = await params;
    
    // Get the cookie from the incoming request
    const cookie = request.headers.get('cookie');
    
    const response = await fetch(
      `${RAILS_API_BASE}/progress/${year}/${month}.json`,
      {
        credentials: 'include',
        headers: {
          ...(cookie && { cookie }), // Forward the cookie if it exists
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch progress data');
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching progress data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress data' },
      { status: 500 }
    );
  }
} 