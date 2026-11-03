// src/config/axiosAdminConfig.ts
import axios from 'axios';
import { getApiBaseUrl } from './apiBase';
import { getStoredAccessToken } from '@/API/services/authService';
import { ensureSessionReady } from '@/utils/accessTokenStore';

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
 * Reads the access token from the memory of the tab.
 *
 * The token is NOT read from the Web Storage: a token in the storage can be
 * read by any script running on the page. The refresh token never reaches
 * the browser at all — it lives in an encrypted `HttpOnly` cookie, on the
 * server side.
 *
 * @returns The token, or null when there is no session.
 */
const readAccessTokenFromAnyStorage = (): string | null => {
  if (typeof window === 'undefined') return null;
  return getStoredAccessToken();
};

axiosInstance.interceptors.request.use(async (config) => {
  // The session is restored before the first request of the tab, so the
  // token is available even right after a reload.
  await ensureSessionReady();

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
