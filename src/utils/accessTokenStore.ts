/**
 * @file accessTokenStore.ts
 * @description The client-side holder of the access token.
 *
 * WHY THIS FILE EXISTS
 * The access token used to live in `localStorage.auth_token` (and in
 * `sessionStorage.auth_token`). Any script running on the page could read
 * it, so an XSS was enough to steal the session.
 *
 * The access token now lives:
 *   - on the SERVER, inside the encrypted `HttpOnly` session cookie (this
 *     is the source of truth, together with the refresh token);
 *   - on the CLIENT, in this module-level variable, which is plain memory.
 *
 * A module variable is not reachable from the console, is not written to
 * any storage, and disappears when the tab is closed. The trade-off is that
 * the token has to be fetched again after a reload — which is exactly what
 * `/api/auth/session-state` does, using only the `HttpOnly` cookie.
 *
 * WHY THE TOKEN IS NOT IN THE ZUSTAND PERSIST
 * The persisted store writes to `localStorage`, so a token there would be
 * readable by JavaScript again. The store keeps the token only in memory.
 */

/**
 * The access token of the current tab.
 *
 * It is deliberately a module-level variable and not a React state: it is
 * read by the Axios interceptors, which run outside of the React tree.
 */
let memoryAccessToken: string | null = null;

/**
 * The user profile of the current tab, without any token.
 */
let memoryUser: Record<string, unknown> | null = null;

/**
 * Tells whether the session is "remember me" (it survives a reload).
 */
let memoryRememberMe = false;

/**
 * The promise of the session restore. It is created once, so every caller
 * waits for the SAME request.
 */
let sessionRestorePromise: Promise<void> | null = null;

/** The name of the CSRF cookie. It has to match the server. */
const CSRF_COOKIE_NAME = 'mv_csrf';

/**
 * Stores the access token in memory.
 *
 * @param token - The token, or null when the session is over.
 */
export const setMemoryAccessToken = (token: string | null): void => {
  memoryAccessToken = token;
};

/**
 * Reads the access token from memory.
 *
 * @returns The token, or null when there is no session.
 */
export const getMemoryAccessToken = (): string | null => memoryAccessToken;

/**
 * Stores the user profile in memory.
 *
 * @param user - The profile, or null.
 */
export const setMemoryUser = (user: Record<string, unknown> | null): void => {
  memoryUser = user;
};

/**
 * Reads the user profile from memory.
 *
 * @returns The profile, or null.
 */
export const getMemoryUser = (): Record<string, unknown> | null => memoryUser;

/**
 * Stores the remember-me state.
 *
 * @param rememberMe - Whether the session survives a reload.
 */
export const setMemoryRememberMe = (rememberMe: boolean): void => {
  memoryRememberMe = rememberMe;
};

/**
 * Reads the remember-me state.
 *
 * @returns `true` when the session survives a reload.
 */
export const getMemoryRememberMe = (): boolean => memoryRememberMe;

/**
 * Wipes everything the module holds.
 *
 * It is called on logout and when the session expires.
 */
export const clearMemorySession = (): void => {
  memoryAccessToken = null;
  memoryUser = null;
  memoryRememberMe = false;
};

/**
 * Reads a cookie of the document.
 *
 * @param name - The name of the cookie.
 * @returns The value, or an empty string.
 */
const readDocumentCookie = (name: string): string => {
  if (typeof document === 'undefined') return '';
  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const entry = part.trim();
    if (entry.startsWith(prefix)) return decodeURIComponent(entry.slice(prefix.length));
  }
  return '';
};

/**
 * Returns the CSRF nonce of the browser, asking the server for one when
 * the cookie is not there yet.
 *
 * The nonce is sent in the `x-csrf-token` header of the state-changing
 * calls. A cross-site attacker can make the browser send the cookie, but it
 * cannot read it, so it cannot build a valid header.
 *
 * @returns The nonce.
 */
export const ensureCsrfToken = async (): Promise<string> => {
  const existing = readDocumentCookie(CSRF_COOKIE_NAME);
  if (existing) return existing;

  try {
    const response = await fetch('/api/auth/csrf-token', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    const data = (await response.json().catch(() => null)) as { csrfToken?: string } | null;
    if (data?.csrfToken) return data.csrfToken;
  } catch {
    /* the server is unreachable: the call will be rejected by the server */
  }

  // Fall back to the cookie, in case the answer arrived but the browser
  // did not expose the cookie yet.
  return readDocumentCookie(CSRF_COOKIE_NAME);
};

/**
 * Restores the session of the browser.
 *
 * The server reads the encrypted `HttpOnly` cookie, refreshes the access
 * token when it is expired, and answers with a fresh access token. The
 * refresh token never travels through the browser.
 *
 * The route is `/api/auth/session-state` and NOT `/api/auth/session`,
 * because the latter belongs to NextAuth (see the route file).
 *
 * @returns Nothing. The result is stored in the module.
 */
const restoreSession = async (): Promise<void> => {
  try {
    const response = await fetch('/api/auth/session-state', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      clearMemorySession();
      return;
    }

    const data = (await response.json().catch(() => null)) as {
      token?: string;
      user?: Record<string, unknown> | null;
      rememberMe?: boolean;
    } | null;

    if (!data?.token) {
      clearMemorySession();
      return;
    }

    memoryAccessToken = data.token;
    memoryUser = data.user ?? null;
    memoryRememberMe = data.rememberMe === true;
  } catch {
    // The server is unreachable: the session stays empty. The next call
    // of the Axios interceptor will answer 401 and the user will be sent
    // to the login page.
    clearMemorySession();
  }
};

/**
 * Makes sure the session was restored.
 *
 * The request is sent ONCE, even when many callers wait for it. Every
 * caller that needs the access token awaits this function first, so the
 * token is never missing because the restore was still in flight.
 *
 * @returns Nothing.
 */
export const ensureSessionReady = (): Promise<void> => {
  if (!sessionRestorePromise) {
    sessionRestorePromise = restoreSession().finally(() => {
      // The promise is kept, so a second call does not trigger a second
      // request. A new restore is only needed after a login or a logout,
      // and both of them call `resetSessionRestore()`.
    });
  }
  return sessionRestorePromise;
};

/**
 * Forgets the restore promise, so the next `ensureSessionReady()` call
 * asks the server again.
 *
 * It is called after a login and after a logout.
 */
export const resetSessionRestore = (): void => {
  sessionRestorePromise = null;
};
