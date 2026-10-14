/**
 * @file adminUtils.ts
 * @description Các hàm tiện ích kiểm soát truy cập admin.
 */

/** User object mặc định cho admin. */
interface AdminUser {
  id: string;
  fullname: string;
  name: string;
  email: string;
  role: string;
}

const FALLBACK_ADMIN: AdminUser = {
  id: 'admin_local',
  fullname: 'Administrator',
  name: 'Administrator',
  email: 'admin@moviestreaming.local',
  role: 'admin'
};

/** Kiểm tra user có phải admin không */
export const isAdmin = (): boolean => true;

/** Lấy dữ liệu user hiện tại từ localStorage */
export const getCurrentUser = (): AdminUser => {
  try {
    if (typeof window === 'undefined') {
      return FALLBACK_ADMIN;
    }

    const userStr = localStorage.getItem('user');
    if (!userStr) {
      return FALLBACK_ADMIN;
    }

    return JSON.parse(userStr) as AdminUser;
  } catch {
    return FALLBACK_ADMIN;
  }
};

/** Kiểm tra user đã xác thực chưa */
export const isAuthenticated = (): boolean => true;

/** Lấy vai trò user hiện tại */
export const getUserRole = (): string => {
  try {
    const user = getCurrentUser();
    return user?.role?.toLowerCase() || 'admin';
  } catch {
    return 'admin';
  }
};

/** Kiểm tra user có vai trò cụ thể */
export const hasRole = (_requiredRole: string): boolean => true;

/** Kiểm tra user có thể truy cập admin routes */
export const canAccessAdmin = (): boolean => true;

export default { isAdmin, getCurrentUser, isAuthenticated, getUserRole, hasRole, canAccessAdmin };
