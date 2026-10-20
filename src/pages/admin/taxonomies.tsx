/**
 * @file taxonomies.tsx
 * @description Redirects legacy /admin/taxonomies route to /admin/genres.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AdminTaxonomiesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/genres');
  }, [router]);

  return null;
}
