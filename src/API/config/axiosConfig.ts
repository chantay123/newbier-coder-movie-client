/**
 * axiosConfig.ts
 *
 * The axios configuration shared by the whole API layer.
 * It groups the base URL resolver, the request and response interceptors,
 * and the refresh-token strategy.
 */

import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { getApiBaseUrl } from '@/config/apiBase';
import { RT } from '@/config/apiRoutes';

export type { AxiosError };

/**
 * The base URL of the axios instance.
 *
 * This file used to resolve the base URL on its own
 * (`NEXT_PUBLIC_CORE_API_URL` -> `NEXT_PUBLIC_API_URL` ->
 * `http://localhost:5000/api`) while `config/API.ts`, `adService`,
 * `statsService` and others resolved it in a different way, so one app sent
 * its requests to two different base URLs. Everything now shares
 * `getApiBaseUrl()`.
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
 * Reads the Bearer token from localStorage or sessionStorage, following the
 * remember-me mechanism implemented in authService.
 *
 * WHY EVERY LOCATION IS READ
 * `authService.login()` writes the token to:
 *   - localStorage  -> when the user ticks "Remember me"
 *   - sessionStorage -> when the user does not tick it, so the token only
 *     lives inside the tab
 * If only localStorage was read, every session login would send a request
 * without the `Authorization` header and the backend would answer 401. In
 * the UI that shows up as "You need to sign in" even though the user is
 * signed in.
 *
 * That is why sessionStorage is read FIRST (the token of the current
 * session), and localStorage is only the fallback. The `remember_me` flag
 * decides whether the token PERSISTS across new tabs, not where it is read.
 */
const ACCESS_KEYS = ['auth_token', 'token'];

/**
 * Reads the access token from the browser storage.
 *
 * @returns The token, or null when no usable token is stored.
 */
const readAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  const isUsable = (value: string | null): value is string =>
    Boolean(value) && value !== 'undefined' && value !== 'null';

  // 1. sessionStorage - the token of the current login session.
  if (window.sessionStorage) {
    for (const key of ACCESS_KEYS) {
      const value = window.sessionStorage.getItem(key);
      if (isUsable(value)) return value;
    }
    // The token granted by the NextAuth session (the AuthProvider stores it
    // in sessionStorage).
    const backendToken = window.sessionStorage.getItem('backendToken');
    if (isUsable(backendToken)) return backendToken;
  }

  // 2. localStorage - the token that persists across tabs (remember me), or
  //    one left over from an earlier session in the same tab.
  for (const key of ACCESS_KEYS) {
    const value = localStorage.getItem(key);
    if (isUsable(value)) return value;
  }

  return null;
};

/** Extends AxiosRequestConfig with a flag that marks an already retried request. */
interface RetryableRequest extends AxiosRequestConfig {
  _retry?: boolean;
}

/**
 * The tokens of the endpoints that need the Bearer token.
 *
 * The request URLs carry the OPAQUE TOKEN of the endpoint, not the real
 * path (that one lives on the server), so the tokens are used to recognize
 * an endpoint here.
 */
const AUTH_REQUIRED_TOKENS = new Set<string>([
  RT.subscriptionCurrent,
  RT.subscriptionHistory,
  RT.subscriptionAdminSubscriptions,
  RT.subscriptionAdminPendingSubscriptions,
  RT.userStatsWatch,
  RT.userStatsWeeklyActivity,
  RT.userStatsActivityWeek,
  RT.userStatsGenreDistribution,
  RT.userStatsDailyViewingTime,
  RT.userStatsSeriesProgress,
  RT.userStatsInProgressSeries,
  RT.userStatsAchievements,
  RT.usersMeHistory,
  RT.usersMeFavorites,
  RT.usersHistoryByUser,
  RT.adminUsersList,
  RT.adminUsersById,
  RT.adminUsersCreate,
  RT.adminUsersUpdate,
  RT.adminUsersDelete,
  RT.adminUsersRole,
  RT.adminUsersBan,
  RT.adminUsersUnban,
  RT.adminUsersToggleStatus,
  RT.adminUsersAvatar,
]);

/**
 * The tokens of the authentication endpoints.
 *
 * A 401 on one of them must NOT trigger the refresh-and-retry flow: that
 * would loop forever, because the refresh endpoint itself answers 401.
 */
const AUTH_ENDPOINT_TOKENS = new Set<string>([
  RT.authLogin,
  RT.authRefreshToken,
  RT.authLogout,
  RT.authRegister,
]);

/**
 * Extracts the token of a request URL.
 *
 * @param url - The URL of the request.
 * @returns The token, or an empty string when the URL carries none.
 */
const tokenOfUrl = (url: string | undefined): string => {
  if (!url) return '';
  // The URL is `<base>/<token>/<params...>`, so the token is the segment
  // right after the base. Only the first segment that looks like a token
  // is considered.
  const match = url.match(/\/(t[0-9a-f]{8})(?:\/|$|\?)/);
  return match ? match[1] : '';
};

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = readAuthToken();

  // The Bearer token is attached to EVERY request, so the backend can
  // answer 401 on the endpoints that need it.
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (AUTH_REQUIRED_TOKENS.has(tokenOfUrl(config.url))) {
    // The endpoint needs a token but none is stored: the backend will
    // answer 401 and the response interceptor handles it. A silent
    // diagnostic helps to spot a broken session early.
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
    // The favorites endpoints are recognized by their opaque token, because
    // the real path never reaches the client bundle.
    if (tokenOfUrl(response.config.url) === RT.usersMeFavorites) {
      // Silent diagnostics. The token and the payload are never logged.
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
    // The deployed backend is missing a handful of admin endpoints. Rather
    // than letting every page spew 404s and break their error handlers, we
    // recognise the known-missing routes here, fabricate a realistic empty
    // response, and resolve the original request as if it had succeeded.
    // Each branch documents the shape the caller expects so it's easy to
    // remove when the real endpoint ships.
    //
    // NOTE: the endpoints are recognized by their OPAQUE TOKEN, because the
    // real path never reaches the client bundle.
    if (status === 404) {
      const token = tokenOfUrl(url);

      // GET /admin/movies/categories -> empty list. The page already has its
      // own mock categories (INITIAL_CATEGORIES) as a fallback.
      if (token === RT.adminMoviesCategories) {
        return { data: { categories: [] }, status: 200, statusText: 'OK (mock-empty)', headers: {}, config: cfg } as never;
      }
    }
    // ---- END MOCK-MODE 404 SHIM -------------------------------------------

    // ---- MOCK-MODE 401 SHIM -----------------------------------------------
    // The deployed backend returns 401 on /subscription/current for
    // unauthenticated users. The AdContext treats that as "auth error,
    // retry", which spams the console. We short-circuit that specific
    // endpoint so it returns a clean "no subscription" payload.
    if (status === 401) {
      const token = tokenOfUrl(url);
      if (token === RT.subscriptionCurrent) {
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
    const isAuthEndpoint = AUTH_ENDPOINT_TOKENS.has(tokenOfUrl(url));

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
