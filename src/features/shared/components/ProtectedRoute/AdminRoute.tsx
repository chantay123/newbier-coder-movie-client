/**
 * @file AdminRoute.tsx
 * @description Protected route wrapper for admin pages.
 * Ensures only authenticated users with admin role can access admin pages.
 */
import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth, isAdminUser } from '@/utils/auth';

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    setHasChecked(true);

    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      router.replace('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      return;
    }

    // Check if user has admin role (case-insensitive check)
    if (!isAdminUser(user)) {
      // User is logged in but not admin - redirect to home
      router.replace('/');
    }
  }, [user, loading, isAuthenticated, router]);

  // Show loading state while checking auth
  if (!hasChecked || loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: '100vh', background: '#0a0e16' }}
        suppressHydrationWarning
      >
        <div className="text-center" suppressHydrationWarning>
          <div
            className="spinner-border text-danger mb-3"
            role="status"
            style={{ width: '3rem', height: '3rem' }}
            suppressHydrationWarning
          >
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="text-light" suppressHydrationWarning>
            Đang xác thực quyền truy cập...
          </p>
        </div>
      </div>
    );
  }

  // Final check after loading
  const isAdmin = isAdminUser(user);
  if (!isAuthenticated || !user || !isAdmin) {
    return null;
  }

  return <>{children}</>;
};

export default AdminRoute;
