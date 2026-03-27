'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // getMonth() returns 0-11
      router.push(`/progress/${year}/${month}`);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-medium">
            <span className="text-white text-3xl font-bold">PT</span>
          </div>
          <h1 className="text-4xl font-bold text-gradient mb-2">Progress Tracker</h1>
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mt-6"></div>
          <p className="text-neutral-600 mt-4">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
      <div className="text-center animate-fade-in">
        <div className="w-20 h-20 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-medium">
          <span className="text-white text-3xl font-bold">PT</span>
        </div>
        <h1 className="text-4xl font-bold text-gradient mb-2">Progress Tracker</h1>
        <p className="text-neutral-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
