/**
 * @file pages/index.tsx
 * @description Root redirect page - redirects to /client
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to /client
    router.replace('/client');
  }, [router]);

  return null;
}
