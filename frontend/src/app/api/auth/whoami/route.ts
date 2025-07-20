import { NextRequest, NextResponse } from 'next/server';

const RAILS_API_BASE = process.env.RAILS_API_BASE || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    // Get the cookie from the incoming request
    const cookie = request.headers.get('cookie');
    
    const response = await fetch(`${RAILS_API_BASE}/auth/whoami`, {
      credentials: 'include',
      headers: {
        ...(cookie && { cookie }), // Forward the cookie if it exists
      },
    });
    
    const data = await response.json();
    
    // Create the response
    const nextResponse = NextResponse.json(data, { status: response.status });
    
    // Forward any Set-Cookie headers from Rails to the client
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      nextResponse.headers.set('set-cookie', setCookieHeader);
    }
    
    return nextResponse;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return NextResponse.json(
      { error: 'Failed to check authentication' },
      { status: 500 }
    );
  }
} 