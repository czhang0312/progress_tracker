// For production, use the Next.js proxy to avoid Safari cookie issues
// For development, hit Rails directly
export const RAILS_API_BASE = process.env.NODE_ENV === 'production' 
  ? '/api/proxy'  // Proxy through Next.js in production
  : (process.env.NEXT_PUBLIC_RAILS_API_BASE || 'http://localhost:3001');

// Debug logging
console.log('RAILS_API_BASE:', RAILS_API_BASE);
console.log('NODE_ENV:', process.env.NODE_ENV);
