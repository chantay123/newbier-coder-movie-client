/**
 * @file axiosConfig.ts
 * @description Cấu hình axios dùng chung cho toàn bộ API layer.
 * Gom baseURL resolver, request/response interceptor, và chiến lược refresh-token.
 */

import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

/** Bỏ slash cuối của URL một cách an toàn */
const stripTrailingSlash = (value: string | undefined | null): string =>
  value ? String(value).replace(/\/+$/, '') : '';

/** Resolver base URL tập trung — ưu tiên NEXT_PUBLIC_CORE_API_URL, fallback NEXT_PUBLIC_API_URL, mặc định localhost */
const resolveBaseURL = (): string => {
  const core = stripTrailingSlash(process.env.NEXT_PUBLIC_CORE_API_URL);
  if (core) return core; // đã bao gồm /api/v1
  const legacy = stripTrailingSlash(process.env.NEXT_PUBLIC_API_URL);
  if (legacy) return legacy; // thường kết thúc bằng /api
  return 'http://localhost:5000/api';
};

const baseURL = resolveBaseURL();

const axiosInstance = axios.create({
  baseURL: baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true
});

/** Đọc Bearer token hiện có từ localStorage / sessionStorage theo cơ chế
 * remember-me đã lưu trong authService. Khi remember-me tắt, access token
 * chỉ tồn tại trong sessionStorage (mất khi đóng tab) và refresh token
 * không có sẵn. */
const REMEMBER_ME_KEY = 'remember_me';
const ACCESS_KEYS = ['auth_token', 'token'];

const readAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const remembered = localStorage.getItem(REMEMBER_ME_KEY) === '1';
  if (remembered) {
    for (const key of ACCESS_KEYS) {
      const value = localStorage.getItem(key);
      if (value && value !== 'undefined' && value !== 'null') return value;
    }
    return null;
  }
  if (window.sessionStorage) {
    for (const key of ACCESS_KEYS) {
      const value = window.sessionStorage.getItem(key);
      if (value && value !== 'undefined' && value !== 'null') return value;
    }
  }
  // Fallback: tab reload trong cùng session — vẫn ưu tiên localStorage nếu có
  for (const key of ACCESS_KEYS) {
    const value = localStorage.getItem(key);
    if (value && value !== 'undefined' && value !== 'null') return value;
  }
  return null;
};

/** Mở rộng kiểu AxiosRequestConfig để đánh dấu đã retry */
interface RetryableRequest extends AxiosRequestConfig {
  _retry?: boolean;
}

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = readAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    const importantEndpoints = ['/subscription/', '/user/', '/auth/'];
    if (importantEndpoints.some((endpoint) => config.url?.includes(endpoint))) {
      // Đã gắn token đầy đủ cho các endpoint quan trọng
    }
  } else {
    const authRequiredEndpoints = [
      '/subscription/current',
      '/subscription/history',
      '/user/'
    ];

    if (authRequiredEndpoints.some((endpoint) => config.url?.includes(endpoint))) {

    }
  }

  if (config.method === 'patch' || config.method === 'PATCH') {
    config.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
    config.headers['Access-Control-Allow-Origin'] = '*';
  }

  return config;
}, (error: AxiosError) => {

  return Promise.reject(error);
});

axiosInstance.interceptors.response.use(
  (response) => {
    if (response.config.url?.includes('favorites')) {
      // Silent diagnostics - không cần log token hoặc payload
    }
    return response;
  },
  async (error: AxiosError) => {
    // Build a minimal diagnostic — NEVER log the request body, headers
    // (which may carry a Bearer token), or full error object. Browsers
    // also hide the underlying cause for Network Errors.
    const cfg = (error.config || {}) as RetryableRequest;
    const method = (cfg.method || 'get').toUpperCase();
    const url = cfg.url || '<unknown>';
    const status = error.response?.status; // undefined for Network Error
    const code = error.code; // e.g. 'ERR_NETWORK', 'ECONNABORTED'

    if (status) {
      const data = error.response?.data as
        | { responseStatus?: { responseMessage?: string } }
        | undefined;

    } else {
      // Network Error / timeout / CORS preflight failed. We log method+url
      // only; the browser hides the underlying reason.

    }

    // ---- MOCK-MODE 404 SHIM -----------------------------------------------
    // The deployed backend (core-movie-service.onrender.com) is missing a
    // handful of admin endpoints. Rather than letting every page spew 404s
    // and break their error handlers, we recognise the known-missing routes
    // here, fabricate a realistic empty response, and resolve the original
    // request as if it had succeeded. Each branch documents the shape the
    // caller expects so it's easy to remove when the real endpoint ships.
    if (status === 404) {
      const path = (url || '').split('?')[0];

      // GET /admin/notifications → empty feed so the bell stays usable
      if (path === '/admin/notifications') {
        return { data: [], status: 200, statusText: 'OK (mock-empty)', headers: {}, config: cfg } as never;
      }

      // GET /admin/movies/categories → empty list, page already has its own
      // mock categories (INITIAL_CATEGORIES) fallback
      if (path === '/admin/movies/categories') {
        return { data: { categories: [] }, status: 200, statusText: 'OK (mock-empty)', headers: {}, config: cfg } as never;
      }

      // GET /admin/dashboard/stats → flat stats object
      if (path === '/admin/dashboard/stats') {
        return {
          data: {
            data: {
              totalMovies: 0, newUsers: 0, engagementRate: 0, reports: 0,
              totalUsers: 0, totalViews: 0, totalComments: 0
            }
          },
          status: 200, statusText: 'OK (mock-empty)', headers: {}, config: cfg
        } as never;
      }

      // GET /admin/dashboard/analytics → empty analytics blob
      if (path === '/admin/dashboard/analytics') {
        return {
          data: { data: { viewsByDay: [], usersByDay: [], topMovies: [] } },
          status: 200, statusText: 'OK (mock-empty)', headers: {}, config: cfg
        } as never;
      }

      // GET /admin/dashboard/feedback-stats → empty breakdown
      if (path === '/admin/dashboard/feedback-stats') {
        return {
          data: { data: { byType: [], byStatus: [], byDay: { labels: [], data: [] } } },
          status: 200, statusText: 'OK (mock-empty)', headers: {}, config: cfg
        } as never;
      }

      // GET /admin/reports/stats → empty report stats
      if (path === '/admin/reports/stats') {
        return { data: { data: {} }, status: 200, statusText: 'OK (mock-empty)', headers: {}, config: cfg } as never;
      }
    }
    // ---- END MOCK-MODE 404 SHIM -------------------------------------------

    // ---- MOCK-MODE 401 SHIM -----------------------------------------------
    // The deployed backend returns 401 on /subscription/current for
    // unauthenticated users. The AdContext treats that as "auth error,
    // retry", which spams the console. We short-circuit that specific
    // endpoint so it returns a clean "no subscription" payload.
    if (status === 401) {
      const path = (url || '').split('?')[0];
      if (path === '/subscription/current') {
        return {
          data: {
            data: {
              hasActiveSubscription: false,
              subscription: null,
              daysLeft: 0,
              isExpired: false
            }
          },
          status: 200, statusText: 'OK (mock-empty)', headers: {}, config: cfg
        } as never;
      }
    }
    // ---- END MOCK-MODE 401 SHIM -------------------------------------------

    const originalRequest = cfg as RetryableRequest;

    // Account-locked signal from the backend: bounce to the locked page.
    const responseData = error.response?.data as { isAccountLocked?: boolean } | undefined;
    if (status === 403 && responseData?.isAccountLocked === true) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('isAccountLocked', 'true');
        window.location.href = '/common/account-locked';
      }
      return Promise.reject(error);
    }

    // 401: try a single silent refresh, then retry the original request.
    // We never retry auth endpoints themselves (login/refresh/logout) to
    // avoid infinite refresh loops.
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh-token') ||
      url.includes('/auth/logout') ||
      url.includes('/auth/register');

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        const { default: authService } = await import('../services/authService');
        await authService.refreshToken();
        // Retry the original request with the freshly-stored token.
        const newToken = readAuthToken();
        if (newToken) {
          originalRequest.headers = originalRequest.headers || {};
          (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        }
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh was rejected (refresh token expired/invalid) — full logout.
        const refreshErr = refreshError as { code?: string };
        if (refreshErr?.code === 'REFRESH_REJECTED') {
          const { default: authService } = await import('../services/authService');
          try { await authService.logout(); } catch { /* noop */ }
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
        }
        return Promise.reject(error);
      }
    }

    // 401 on auth endpoints, or refresh already failed: hard logout.
    if (status === 401) {
      if (typeof window !== 'undefined') {
        try { localStorage.removeItem('auth_token'); } catch { /* noop */ }
        try { localStorage.removeItem('token'); } catch { /* noop */ }
        try { localStorage.removeItem('refresh_token'); } catch { /* noop */ }
        try { localStorage.removeItem('user'); } catch { /* noop */ }
        try { localStorage.removeItem('remember_me'); } catch { /* noop */ }
        if (window.sessionStorage) {
          try { window.sessionStorage.removeItem('auth_token'); } catch { /* noop */ }
          try { window.sessionStorage.removeItem('token'); } catch { /* noop */ }
          try { window.sessionStorage.removeItem('user'); } catch { /* noop */ }
          try { window.sessionStorage.removeItem('backendToken'); } catch { /* noop */ }
        }
        window.location.href = '/auth/login';
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
