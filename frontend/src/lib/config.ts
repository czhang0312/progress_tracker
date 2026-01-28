// Client-side code uses this (with NEXT_PUBLIC_ prefix)
export const RAILS_API_BASE = process.env.NEXT_PUBLIC_RAILS_API_BASE || 'http://localhost:3001';

// Debug logging
console.log('RAILS_API_BASE:', RAILS_API_BASE);
console.log('process.env.NEXT_PUBLIC_RAILS_API_BASE:', process.env.NEXT_PUBLIC_RAILS_API_BASE);
