/**
 * @file AdminRoute.tsx
 * @description Pass-through wrapper for admin pages. Authentication and role
 * checks are enforced at the page/route level; this component only ensures
 * children are rendered inside a fragment so layouts stay consistent.
 */
import React, { ReactNode } from 'react';

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => <>{children}</>;

export default AdminRoute;
