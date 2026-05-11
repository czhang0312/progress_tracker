'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CheckinRedirect() {
  const router = useRouter();

  useEffect(() => {
    const now = new Date();
    router.replace(`/progress/${now.getFullYear()}/${now.getMonth() + 1}`);
  }, [router]);

  return null;
}
