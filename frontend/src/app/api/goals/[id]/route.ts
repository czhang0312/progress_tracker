import { NextRequest, NextResponse } from 'next/server';

const RAILS_API_BASE = process.env.RAILS_API_BASE || 'http://localhost:3000';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const response = await fetch(`${RAILS_API_BASE}/goals/${params.id}.json`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch goal');
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching goal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goal' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${RAILS_API_BASE}/goals/${params.id}.json`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json(
      { error: 'Failed to update goal' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const response = await fetch(`${RAILS_API_BASE}/goals/${params.id}.json`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete goal');
    }
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json(
      { error: 'Failed to delete goal' },
      { status: 500 }
    );
  }
} 