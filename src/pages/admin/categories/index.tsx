/**
 * @file categories/index.tsx
 * @description Alias redirecting /admin/categories to /admin/genres.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AdminCategoriesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/genres');
  }, [router]);

  return null;
}
