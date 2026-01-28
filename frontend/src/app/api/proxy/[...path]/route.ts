import { NextRequest, NextResponse } from 'next/server';

const RAILS_API_BASE = process.env.RAILS_API_BASE || 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params);
}

async function proxy(
  request: NextRequest,
  params: { path: string[] }
) {
  try {
    const path = params.path.join('/');
    const url = `${RAILS_API_BASE}/${path}`;
    
    // Get cookies from browser request
    const cookies = request.headers.get('cookie');
    
    // Forward request to Rails with cookies
    const railsResponse = await fetch(url, {
      method: request.method,
      headers: {
        'Content-Type': request.headers.get('content-type') || 'application/json',
        'Accept': 'application/json',
        ...(cookies && { 'Cookie': cookies }), // Forward cookies to Rails
      },
      body: request.method !== 'GET' ? await request.text() : undefined,
    });

    // Get response body
    const data = await railsResponse.text();

    // Create response
    const response = new NextResponse(data, {
      status: railsResponse.status,
      headers: {
        'Content-Type': railsResponse.headers.get('content-type') || 'application/json',
      },
    });

    // Forward Set-Cookie headers from Rails back to browser
    const setCookies = railsResponse.headers.get('set-cookie');
    if (setCookies) {
      response.headers.set('Set-Cookie', setCookies);
    }

    return response;
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy request failed' },
      { status: 500 }
    );
  }
}
