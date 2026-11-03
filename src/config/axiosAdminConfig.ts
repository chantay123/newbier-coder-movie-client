// src/config/axiosAdminConfig.ts
import axios from 'axios';
import { getApiBaseUrl } from './apiBase';

/**
 * Axios instance used by the admin area.
 *
 * This file used to read `NEXT_PUBLIC_API_URL` on its own (ignoring
 * `NEXT_PUBLIC_CORE_API_URL`) with a `http://localhost:5000/api` fallback, so
 * the admin called the wrong host or the wrong version whenever only
 * `CORE_API_URL` was configured. It now shares the `getApiBaseUrl()` resolver,
 * so the admin and the rest of the app always talk to the same backend.
 */
const baseURL = getApiBaseUrl();

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
 * Reads the access token from EVERY storage location the auth flow can use.
 * authService.login() persists the token to:
 *  - localStorage (when rememberMe = true)
 *  - sessionStorage (when rememberMe = false)
 * If only localStorage was read, session-only logins would silently send no
 * Authorization header and the backend would answer 401 for every request.
 *
 * @returns The token, or null when no token is stored.
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

  return config;
}, (error) => {
  return Promise.reject(error);
});

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log 401 safely - NEVER log the token or the cookie. Only the endpoint
    // and the status are logged.
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '<unknown>';
      const method = (error.config?.method || 'get').toUpperCase();
      // eslint-disable-next-line no-console

      // The token is not deleted and the user is not redirected to the login
      // page here, because the failure may come from a public endpoint, a
      // network problem, or an expired token that still has to be refreshed.
      // AuthContext (useAuth) decides when to log out, based on the overall
      // session state.
    }

    if (error.response && error.response.status === 403) {
      // Forbidden
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
