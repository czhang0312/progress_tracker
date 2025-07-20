import { NextRequest, NextResponse } from 'next/server';

const RAILS_API_BASE = process.env.RAILS_API_BASE || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    // Get the cookie from the incoming request
    const cookie = request.headers.get('cookie');

    console.log('rails api base', RAILS_API_BASE);
    const response = await fetch(`${RAILS_API_BASE}/journal_entries.json`, {
      credentials: 'include',
      headers: {
        ...(cookie && { cookie }), // Forward the cookie if it exists
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch journal entries');
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch journal entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get the cookie from the incoming request
    const cookie = request.headers.get('cookie');
    
    const response = await fetch(`${RAILS_API_BASE}/journal_entries.json`, {
      method: 'POST',
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
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating journal entry:', error);
    return NextResponse.json(
      { error: 'Failed to create journal entry' },
      { status: 500 }
    );
  }
} 