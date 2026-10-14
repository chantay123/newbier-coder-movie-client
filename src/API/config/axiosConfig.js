import axios from 'axios';

// Centralized base URL resolver. Prefer the production core API
// (NEXT_PUBLIC_CORE_API_URL), then the legacy API URL. This keeps all
// axios-driven services (subscription, admin, stats, etc.) in sync with
// `authService` and `systemConfig` — a single source of truth for the
// active backend host.
const stripTrailingSlash = (value) => (value ? String(value).replace(/\/+$/, '') : '');

const resolveBaseURL = () => {
  const core = stripTrailingSlash(process.env.NEXT_PUBLIC_CORE_API_URL);
  if (core) return core; // already includes /api/v1
  const legacy = stripTrailingSlash(process.env.NEXT_PUBLIC_API_URL);
  if (legacy) return legacy; // typically ends with /api
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

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || localStorage.getItem('authToken');

  if (token && token !== 'undefined' && token !== 'null') {
    config.headers.Authorization = `Bearer ${token}`;
    const importantEndpoints = ['/subscription/', '/user/', '/auth/'];
    if (importantEndpoints.some(endpoint => config.url.includes(endpoint))) {
    }  } else {
    const authRequiredEndpoints = [
      '/subscription/ad-benefits',
      '/subscription/current',
      '/subscription/history',
      '/user/'
    ];

    if (authRequiredEndpoints.some(endpoint => config.url.includes(endpoint))) {
      console.warn('[API] No valid auth token found for authenticated request:', config.url);
    }
  }

  if (config.method === 'patch' || config.method === 'PATCH') {
    config.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
    config.headers['Access-Control-Allow-Origin'] = '*';
  }

  return config;
}, (error) => {
  console.error('[API Request Error]', error);
  return Promise.reject(error);
});

axiosInstance.interceptors.response.use(
  (response) => {

    if (response.config.url.includes('favorites')) {
    }

    return response;
  },
  async (error) => {
    // Build a minimal diagnostic — NEVER log the request body, headers
    // (which may carry a Bearer token), or full error object. Browsers
    // also hide the underlying cause for Network Errors.
    const cfg = error.config || {};
    const method = (cfg.method || 'get').toUpperCase();
    const url = cfg.url || '<unknown>';
    const status = error.response?.status; // undefined for Network Error
    const code = error.code; // e.g. 'ERR_NETWORK', 'ECONNABORTED'

    if (status) {
      console.warn(
        `[API] ${method} ${url} → ${status} ` +
        `(${error.response?.data?.responseStatus?.responseMessage || error.response?.statusText || 'no body'})`
      );
    } else {
      // Network Error / timeout / CORS preflight failed. We log method+url
      // only; the browser hides the underlying reason. This is a stable
      // signal that the host is unreachable (e.g. localhost dev server
      // down) or CORS is blocked.
      console.warn(`[API] ${method} ${url} → Network Error (code=${code || 'n/a'})`);
    }

    const originalRequest = error.config || {};

    // Account-locked signal from the backend: bounce to the locked page.
    if (status === 403 && error.response?.data?.isAccountLocked === true) {
      localStorage.setItem('isAccountLocked', 'true');

      if (typeof window !== 'undefined') {
        window.location.href = '/account-locked';
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
        const newToken = localStorage.getItem('auth_token');
        if (newToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh was rejected (refresh token expired/invalid) — full logout.
        if (refreshError?.code === 'REFRESH_REJECTED') {
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
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');

      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;