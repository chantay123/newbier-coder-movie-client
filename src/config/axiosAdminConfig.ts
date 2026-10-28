// src/config/axiosAdminConfig.ts
import axios from 'axios';

const baseURL =
  process.env.NEXT_PUBLIC_ADMIN_API_URL ||
  process.env.NEXT_PUBLIC_CORE_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://core-movie-service.onrender.com/api/v1';

const axiosInstance = axios.create({
  baseURL: baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true
});

/**
 * Read the access token from EVERY storage location the auth flow can use.
 * authService.login() persists the token to:
 *  - localStorage (when rememberMe = true)
 *  - sessionStorage (when rememberMe = false)
 * If we only read localStorage, session-only logins would silently send
 * no Authorization header and the backend would 401 every request.
 */
const readAccessTokenFromAnyStorage = (): string | null => {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('auth_token')
    || localStorage.getItem('token')
    || (window.sessionStorage ? window.sessionStorage.getItem('auth_token') : null)
    || (window.sessionStorage ? window.sessionStorage.getItem('token') : null)
    || null
  );
};

axiosInstance.interceptors.request.use((config) => {
  const token = readAccessTokenFromAnyStorage();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Ensure x-request-trace distributed tracing header is always populated
  if (!config.headers['x-request-trace']) {
    const traceId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    config.headers['x-request-trace'] = traceId;
  }

  // Ensure Accept & Content-Type
  if (!config.headers['Accept']) {
    config.headers['Accept'] = 'application/json';
  }
  if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }

  if (config.method === 'patch' || config.method === 'PATCH') {
    config.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
    config.headers['Access-Control-Allow-Origin'] = '*';
  }

  return config;
}, (error) => {

  return Promise.reject(error);
});

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log 401 an toàn - KHÔNG log token/cookie. Chỉ log endpoint + status.
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '<unknown>';
      const method = (error.config?.method || 'get').toUpperCase();
      // eslint-disable-next-line no-console

      // Theo yêu cầu #9: KHÔNG tự động xóa token/redirect login khi lỗi
      // có thể do endpoint public, lỗi mạng, hoặc token hết hạn cần refresh.
      // Để AuthContext (useAuth) quyết định khi nào cần logout dựa trên
      // trạng thái session tổng thể.
    }

    if (error.response && error.response.status === 403) {
      // eslint-disable-next-line no-console

    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
