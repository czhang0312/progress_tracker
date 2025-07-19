import { NextRequest, NextResponse } from 'next/server';

const RAILS_API_BASE = process.env.RAILS_API_BASE || 'http://localhost:3001';

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
    
    // Create the response
    const nextResponse = NextResponse.json(data);
    
    // Forward any Set-Cookie headers from Rails to the client
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      nextResponse.headers.set('set-cookie', setCookieHeader);
    }
    
    return nextResponse;
  } catch (error) {
    console.error('Error fetching progress data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress data' },
      { status: 500 }
    );
  }
} 