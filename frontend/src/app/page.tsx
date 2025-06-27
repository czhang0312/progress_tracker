'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // getMonth() returns 0-11
    router.push(`/progress/${year}/${month}`);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Progress Tracker</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
