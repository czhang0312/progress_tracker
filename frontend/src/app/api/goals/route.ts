import { NextRequest, NextResponse } from 'next/server';

const RAILS_API_BASE = process.env.RAILS_API_BASE || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    // Get the cookie from the incoming request
    const cookie = request.headers.get('cookie');
    console.log('rails api base', RAILS_API_BASE);
    
    const response = await fetch(`${RAILS_API_BASE}/goals.json`, {
      credentials: 'include',
      headers: {
        ...(cookie && { cookie }), // Forward the cookie if it exists
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch goals');
    }
    
    const data = await response.json();
    
    // Create the response
    const nextResponse = NextResponse.json(data);
    
    // Forward any Set-Cookie headers from Rails to the client
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      nextResponse.headers.set('set-cookie', setCookieHeader);
    }
    
    return nextResponse;
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get the cookie from the incoming request
    const cookie = request.headers.get('cookie');
    
    const response = await fetch(`${RAILS_API_BASE}/goals.json`, {
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
    
    // Create the response
    const nextResponse = NextResponse.json(data, { status: 201 });
    
    // Forward any Set-Cookie headers from Rails to the client
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      nextResponse.headers.set('set-cookie', setCookieHeader);
    }
    
    return nextResponse;
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json(
      { error: 'Failed to create goal' },
      { status: 500 }
    );
  }
} 