'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import PageLoader from '../components/PageLoader';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  // TEMP: visit /?preview to test the loading screen
  const preview = searchParams.has('preview');

  useEffect(() => {
    if (!loading && !preview) {
      const now = new Date();
      router.push(`/progress/${now.getFullYear()}/${now.getMonth() + 1}`);
    }
  }, [user, loading, preview, router]);

  if (loading || preview) {
    return <PageLoader />;
  }

  return <PageLoader />;
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
