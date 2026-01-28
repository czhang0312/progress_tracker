// Server-side API routes use this (without NEXT_PUBLIC_ prefix)
export const RAILS_API_BASE = process.env.RAILS_API_BASE || 'http://localhost:3001';

// Client-side code uses this (with NEXT_PUBLIC_ prefix)
export const RAILS_API_BASE_CLIENT = process.env.NEXT_PUBLIC_RAILS_API_BASE || 'http://localhost:3001';
