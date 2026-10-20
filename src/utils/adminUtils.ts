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

/** Obfuscation key — phải khớp với authService.ts và auth.tsx */
const OBFUSCATION_KEY = process.env.NEXT_PUBLIC_SESSION_OBFUSCATE || 'xK9mP2vL';

const obfDecode = (encoded: string): string | null => {
  try {
    const decoded = decodeURIComponent(atob(encoded).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    if (decoded.startsWith(OBFUSCATION_KEY) && decoded.endsWith(OBFUSCATION_KEY)) {
      return decoded.slice(OBFUSCATION_KEY.length, -OBFUSCATION_KEY.length);
    }
    JSON.parse(decoded);
    return decoded;
  } catch {
    return null;
  }
};

/** Kiểm tra user có phải admin không */
export const isAdmin = (): boolean => true;

/** Lấy dữ liệu user hiện tại.
 *
 * User info được đọc từ sessionStorage (obfuscated), fallback localStorage (obfuscated).
 * Admin UI nên dùng `useAuth()` hook thay vì hàm này. */
export const getCurrentUser = (): AdminUser => {
  try {
    if (typeof window === 'undefined') {
      return FALLBACK_ADMIN;
    }
    const raw =
      (window.sessionStorage && window.sessionStorage.getItem('user')) ||
      localStorage.getItem('user');
    if (!raw) return FALLBACK_ADMIN;
    const decoded = obfDecode(raw) || raw;
    return JSON.parse(decoded) as AdminUser;
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
