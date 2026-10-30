/**
 * authService.ts
 *
 * Unified authentication service for the whole frontend.
 * It groups the login, register, refresh token, logout, profile, watchlist
 * and user stats calls.
 */

import { AUTH_CONFIG } from '@/config/authConfig';
import { getApiBaseUrl } from '@/config/apiBase';
import { apiUrl } from '@/config/apiRoutes';

/** Obfuscation key. It is an environment variable so it can be changed when needed. */
const OBFUSCATION_KEY = process.env.NEXT_PUBLIC_SESSION_OBFUSCATE || 'xK9mP2vL';

/**
 * Encodes a string into base64 with a prefix, so the value is easy to
 * recognize and to validate.
 *
 * @param plain - The clear text to encode.
 * @returns The encoded string, or the clear text when encoding fails.
 */
const obfEncode = (plain: string): string => {
  try {
    const prefixed = OBFUSCATION_KEY + plain + OBFUSCATION_KEY;
    // Simple base64 encoding.
    return btoa(encodeURIComponent(prefixed).replace(/%([0-9A-F]{2})/g,
      (_: string, p1: string) => String.fromCharCode(parseInt(p1, 16))));
  } catch {
    return plain;
  }
};

/**
 * Decodes a string that was obfuscated by {@link obfEncode}.
 *
 * @param encoded - The encoded value.
 * @returns The decoded string, or null when it cannot be decoded.
 */
const obfDecode = (encoded: string): string | null => {
  try {
    const decoded = decodeURIComponent(atob(encoded).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    // Strips the prefix and the suffix.
    if (decoded.startsWith(OBFUSCATION_KEY) && decoded.endsWith(OBFUSCATION_KEY)) {
      return decoded.slice(OBFUSCATION_KEY.length, -OBFUSCATION_KEY.length);
    }
    // Legacy plain JSON, still parsed correctly.
    JSON.parse(decoded);
    return decoded;
  } catch {
    return null;
  }
};

/**
 * The base URL of the backend. It always ends with `/api/v1`.
 *
 * This file used to resolve the base on its own
 * (`CORE_API_URL || API_URL || localhost/api`), and the logout and refresh
 * endpoints built their own URL with
 * `${API_URL.replace(/\/api\/?$/, '')}/api/v1/...`. That only worked when the
 * environment variable ended with `/api`. With the correct contract value
 * `/api/v1` the replacement did not match, so the URL became
 * `/api/v1/api/v1/auth/...` and answered 404 "Route not found".
 */
const API_URL = getApiBaseUrl();

/** Storage key constants — kept in sync between `login`, `refreshToken`,
 * `isLoggedIn`, `getAuthHeader`, and `_clearLocalSession`. */
const STORAGE_KEYS = {
  accessToken: 'auth_token',
  accessTokenAlt: 'token',
  refreshToken: 'refresh_token',
  user: 'user',
  isAccountLocked: 'isAccountLocked',
  sessionBackendToken: 'backendToken',
  sessionUser: 'user'
} as const;

/** Persisted remember-me flag stored in localStorage so subsequent page
 * loads can re-hydrate the checkbox state. The flag itself is not
 * security-sensitive (it does not grant access on its own). */
const REMEMBER_ME_KEY = 'remember_me';

/** Read the access token from the right storage depending on the
 * remember-me flag set during login. */
const readAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const remembered = localStorage.getItem(REMEMBER_ME_KEY) === '1';
  if (remembered) {
    return (
      localStorage.getItem(STORAGE_KEYS.accessToken) ||
      localStorage.getItem(STORAGE_KEYS.accessTokenAlt) ||
      null
    );
  }
  // Session-only: prefer sessionStorage; fall back to localStorage so
  // the active tab stays logged in during reloads within the same tab.
  return (
    (window.sessionStorage && window.sessionStorage.getItem(STORAGE_KEYS.accessToken)) ||
    localStorage.getItem(STORAGE_KEYS.accessToken) ||
    localStorage.getItem(STORAGE_KEYS.accessTokenAlt) ||
    null
  );
};

const readRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const remembered = localStorage.getItem(REMEMBER_ME_KEY) === '1';
  if (!remembered) return null; // session-only login does not keep refresh token
  return localStorage.getItem(STORAGE_KEYS.refreshToken);
};

/** The login information coming from the form. */
export interface LoginCredentials {
  username?: string;
  email?: string;
  password: string;
  rememberMe?: boolean;
}

/** The user payload returned by the backend. */
export interface UserPayload {
  _id?: string;
  id?: string;
  sub?: string;
  username?: string;
  email?: string;
  fullname?: string;
  role?: string;
  permissions?: string[];
  sessionId?: string;
  accountType?: string;
  avatar?: string;
  [key: string]: unknown;
}

/** The token and the user returned after a successful login. */
export interface LoginResult {
  success: true;
  user: UserPayload & { token: string };
  token: string;
  data?: unknown;
  rememberMe?: boolean;
}

/** The registration information. */
export interface RegisterData {
  username: string;
  email: string;
  password: string;
  fullname?: string;
  [key: string]: unknown;
}

/** The result of a registration. */
export interface RegisterResult {
  success: true;
  message: string;
  data: unknown;
}

/** The authorization header used with fetch. */
export interface AuthHeader {
  Authorization?: string;
  [key: string]: string | undefined;
}

/** The profile update information. */
export interface ProfileData {
  fullName?: string;
  address?: string;
  phone?: string;
  dateOfBirth?: string;
  bio?: string;
  favoriteGenres?: string[];
  [key: string]: unknown;
}

/** The password change information. */
export interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

/** An extended error with a code, used by the refresh flow. */
export interface ServiceError extends Error {
  code?: string;
  status?: number;
  cause?: unknown;
}

/**
 * Safely decodes the payload part of a JWT.
 *
 * @param token - The JWT to read.
 * @returns The decoded payload, or null when it cannot be parsed.
 */
const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload) as Record<string, unknown>;
  } catch {
    return null;
  }
};

/**
 * Removes every authentication artifact from the client side.
 *
 * @returns Nothing. Storage failures are swallowed on purpose.
 */
const clearLocalSession = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.accessTokenAlt);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.isAccountLocked);
    localStorage.removeItem(REMEMBER_ME_KEY);
  } catch {
    /* localStorage can be disabled (private mode) */
  }
  try {
    window.sessionStorage.removeItem(STORAGE_KEYS.sessionBackendToken);
    window.sessionStorage.removeItem(STORAGE_KEYS.sessionUser);
    window.sessionStorage.removeItem(STORAGE_KEYS.accessToken);
    window.sessionStorage.removeItem(STORAGE_KEYS.accessTokenAlt);
  } catch {
    /* sessionStorage can be disabled */
  }
};

const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResult> => {
    const username = credentials.username || credentials.email || '';
    const rememberMe = credentials.rememberMe === true;
    const payload = {
      username: typeof username === 'string' ? username.trim() : '',
      password: credentials.password
    };

    const loginEndpoint = AUTH_CONFIG?.api?.endpoint || apiUrl(`authLogin`);

    const response = await fetch(loginEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    let responseText = '';
    let data: any = null;

    try {
      responseText = await response.text();
      if (responseText) {
        data = JSON.parse(responseText);

      }
    } catch {
      // silent parse handling
    }

    if (!response.ok) {

    }

    // Diagnostic helper: deep-search for an access token anywhere in the
    // response object so we handle every shape the backend may return.
    const findAccessToken = (obj: unknown, depth = 0): string | null => {
      if (depth > 4 || !obj || typeof obj !== 'object') return null;
      const o = obj as Record<string, unknown>;
      for (const key of Object.keys(o)) {
        const v = o[key];
        // Stop recursion at non-object leaf values (we only want to descend
        // into plain objects/arrays).
        if (typeof v === 'string' && v.split('.').length === 3) {
          // Likely a JWT: three dot-separated base64 segments.
          return v;
        }
        if (typeof v === 'object' && v !== null) {
          const found = findAccessToken(v, depth + 1);
          if (found) return found;
        }
      }
      return null;
    };

    // Persist the remember-me flag BEFORE storing tokens so the storage
    // helpers in this module can read the right location.
    try {
      if (rememberMe) localStorage.setItem(REMEMBER_ME_KEY, '1');
      else localStorage.removeItem(REMEMBER_ME_KEY);
    } catch {
      /* localStorage may be disabled */
    }

    // Helper: write access token to the right storage based on rememberMe
    const persistAccessToken = (token: string): void => {
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEYS.accessToken, token);
        localStorage.setItem(STORAGE_KEYS.accessTokenAlt, token);
      } else {
        // Session-only: clear any leftover persisted tokens first so a
        // previous "remember me" login does not leak across sessions.
        localStorage.removeItem(STORAGE_KEYS.accessToken);
        localStorage.removeItem(STORAGE_KEYS.accessTokenAlt);
        localStorage.removeItem(STORAGE_KEYS.refreshToken);
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(STORAGE_KEYS.accessToken, token);
          window.sessionStorage.setItem(STORAGE_KEYS.accessTokenAlt, token);
        }
      }
    };

    // Extract access token from any plausible response shape.
    // Priority: explicit responseData paths first, then deep-search fallback.
    const rawAccessToken: string | null =
      data?.responseData?.access_token ||
      data?.responseData?.accessToken ||
      data?.data?.access_token ||
      data?.data?.accessToken ||
      data?.access_token ||
      data?.accessToken ||
      data?.token ||
      (typeof data === 'object' ? findAccessToken(data) : null) ||
      null;

    const rawRefreshToken: string | null =
      data?.responseData?.refresh_token ||
      data?.responseData?.refreshToken ||
      data?.data?.refresh_token ||
      data?.data?.refreshToken ||
      data?.refresh_token ||
      data?.refreshToken ||
      data?.refreshToken ||
      null;

    // Resolve user payload from explicit path, JWT decode fallback, or null.
    const resolveUser = (accessToken: string): UserPayload & { token: string } => {
      const userPayload: UserPayload | null =
        data?.responseData?.user ||
        data?.data?.user ||
        null;

      if (userPayload && typeof userPayload === 'object') {
        return {
          ...userPayload,
          _id: userPayload._id || userPayload.id || userPayload.sub,
          id: userPayload._id || userPayload.id || userPayload.sub,
          fullname: userPayload.fullname || userPayload.username || '',
          username: userPayload.username || userPayload.email || payload.username,
          role: userPayload.role || 'USER',
          token: accessToken
        };
      }

      const decoded = decodeJwtPayload(accessToken) || {};
      return {
        _id: (decoded.sub as string) || (decoded.userId as string) || (decoded.id as string),
        id: (decoded.sub as string) || (decoded.userId as string) || (decoded.id as string),
        username: (decoded.username as string) || payload.username,
        fullname: (decoded.fullname as string) || (decoded.username as string) || '',
        role: (decoded.role as string) || 'USER',
        permissions: (decoded.permissions as string[]) || [],
        sessionId: (decoded.sessionId as string) || '',
        accountType: (decoded.accountType as string) || 'Normal',
        token: accessToken
      };
    };

    // Case 1: Backend returns responseStatus + responseData (v1 contract).
    if (data?.responseStatus) {
      const code = data.responseStatus.responseCode;
      const message = data.responseStatus.responseMessage || '';
      const isSuccess =
        code === AUTH_CONFIG.api.successCode ||
        // Accept any 2xx-like code the backend may return.
        (typeof code === 'string' && code.startsWith('00000'));

      if (isSuccess && rawAccessToken) {
        persistAccessToken(rawAccessToken);
        if (rawRefreshToken && rememberMe) {
          localStorage.setItem(STORAGE_KEYS.refreshToken, rawRefreshToken);
        } else if (!rememberMe) {
          localStorage.removeItem(STORAGE_KEYS.refreshToken);
        }
        const user = resolveUser(rawAccessToken);
        if (rememberMe) {
          // Legacy localStorage key. It is still obfuscated to hide the
          // information from the DevTools.
          localStorage.setItem(STORAGE_KEYS.user, obfEncode(JSON.stringify(user)));
        } else if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(STORAGE_KEYS.sessionUser, obfEncode(JSON.stringify(user)));
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('storage'));
        }
        return { success: true, user, token: rawAccessToken, data, rememberMe };
      }

      // Non-success responseStatus (e.g. 00000204 Invalid credentials,
      // 00000500 Internal server error). Use the backend's responseCode
      // whitelist to decide which messages are "invalid credentials"
      // specifically. Anything else is passed through verbatim so that
      // server errors (5xx) are not mis-reported as a user typo.

      const isInvalidCreds =
        code === AUTH_CONFIG.api.invalidCredentialsCode ||
        response.status === 401 ||
        response.status === 403;
      throw new Error(isInvalidCreds
        ? 'Invalid username or password'
        : (message || 'Authentication failed'));
    }

    // Case 2: Legacy flat shape — HTTP ok + raw token at the top level.
    if (!response.ok) {
      // Use the server's HTTP status to decide the user-facing message.
      // 4xx (except 401/403) → not necessarily "invalid credentials".
      // 5xx → server-side failure, surface that to the user.
      let errorMessage = `HTTP ${response.status}`;
      if (response.status === 401 || response.status === 403) {
        errorMessage = 'Invalid username or password';
      } else if (response.status >= 500) {
        errorMessage = 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau ít phút.';
      } else if (data && (data.error || data.message)) {
        errorMessage = data.error || data.message;
      } else if (responseText.includes('<!DOCTYPE')) {
        errorMessage = 'Cannot reach the server. Please check the API URL.';
      }
      throw new Error(errorMessage);
    }

    // Case 3: response.ok && no responseStatus — legacy token-at-root.
    if (rawAccessToken) {
      persistAccessToken(rawAccessToken);
      if (rawRefreshToken && rememberMe) {
        localStorage.setItem(STORAGE_KEYS.refreshToken, rawRefreshToken);
      } else if (!rememberMe) {
        localStorage.removeItem(STORAGE_KEYS.refreshToken);
      }
      const user = resolveUser(rawAccessToken);
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEYS.user, obfEncode(JSON.stringify(user)));
      } else if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(STORAGE_KEYS.sessionUser, obfEncode(JSON.stringify(user)));
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
      }
      return { success: true, user, token: rawAccessToken, data, rememberMe };
    }

    // Case 4: 200 but token not found anywhere — unexpected server response.

    throw new Error('Không nhận được token từ máy chủ.');
  },

  register: async (userData: RegisterData): Promise<RegisterResult> => {
    const response = await fetch(apiUrl(`authRegister`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorMessage = 'Đăng ký thất bại';

      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } else {
        const textData = await response.text();

        if (textData.includes('<!DOCTYPE')) {
          errorMessage = 'Lỗi kết nối máy chủ. Vui lòng kiểm tra lại API URL.';
        }
      }
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textData = await response.text();

      throw new Error('Server trả về định dạng không phải JSON. Vui lòng kiểm tra log và cấu hình API.');
    }

    const data = await response.json();

    if (!data.message) {
      throw new Error('Không nhận được phản hồi từ server');
    }

    return {
      success: true,
      message: data.message,
      data
    };
  },

  logout: async (): Promise<void> => {
    // Best effort: the local session is cleared even when the server does not
    // answer.
    try {
      if (typeof window === 'undefined') {
        clearLocalSession();
        return;
      }

      const accessToken = readAccessToken();
      const refreshToken = readRefreshToken();

      // Build URL the same way as login
      const endpoint = apiUrl(`authLogout`);

      if (accessToken || refreshToken) {
        const headers: Record<string, string> = { 'Accept': 'application/json' };
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }
        const body = refreshToken ? JSON.stringify({ refreshToken }) : undefined;

        try {
          await fetch(endpoint, {
            method: 'POST',
            headers,
            body,
            // A slow backend must not block the local cleanup.
            keepalive: true
          });
        } catch (networkError) {

        }
      }
    } finally {
      clearLocalSession();
    }
  },

  /**
   * Internal: wipe all client-side auth artifacts. Exposed for code paths
   * (e.g. refresh failure, account-locked page) that need to log the user
   * out without making another network call.
   */
  _clearLocalSession: (): void => clearLocalSession(),

  // ---------------------------------------------------------------------
  // Refresh token - single-flight pattern
  // ---------------------------------------------------------------------
  _refreshInFlight: null as Promise<string> | null,

  refreshToken: async (): Promise<string> => {
    if (authService._refreshInFlight) {
      return authService._refreshInFlight;
    }

    const refreshToken = readRefreshToken();

    if (!refreshToken) {
      const err: ServiceError = new Error('No refresh token available');
      err.code = 'NO_REFRESH_TOKEN';
      throw err;
    }

    const endpoint = apiUrl(`authRefreshToken`);

    const promise = (async (): Promise<string> => {
      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ refreshToken })
        });
      } catch (networkError) {
        const err: ServiceError = new Error('Network error while refreshing token');
        err.code = 'NETWORK';
        err.cause = networkError;
        throw err;
      }

      if (response.status === 401 || response.status === 403) {
        clearLocalSession();
        const err: ServiceError = new Error('Refresh token rejected');
        err.code = 'REFRESH_REJECTED';
        err.status = response.status;
        throw err;
      }

      if (!response.ok) {
        const err: ServiceError = new Error(`Refresh failed (${response.status})`);
        err.code = 'TRANSIENT';
        err.status = response.status;
        throw err;
      }

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        const err: ServiceError = new Error('Invalid refresh response');
        err.code = 'INVALID_RESPONSE';
        throw err;
      }

      // Accept v1 contract first, then fall back to legacy shapes
      const payload = data?.responseData || data || {};
      const newAccessToken: string | null =
        payload.access_token ||
        payload.accessToken ||
        data?.token ||
        null;
      const newRefreshToken: string | null =
        payload.refresh_token ||
        payload.refreshToken ||
        data?.refreshToken ||
        null;

      if (!newAccessToken) {
        const err: ServiceError = new Error('No access token in refresh response');
        err.code = 'INVALID_RESPONSE';
        throw err;
      }

      if (typeof window !== 'undefined') {
        const remembered = localStorage.getItem(REMEMBER_ME_KEY) === '1';
        if (remembered) {
          localStorage.setItem(STORAGE_KEYS.accessToken, newAccessToken);
          localStorage.setItem(STORAGE_KEYS.accessTokenAlt, newAccessToken);
        } else if (window.sessionStorage) {
          window.sessionStorage.setItem(STORAGE_KEYS.accessToken, newAccessToken);
          window.sessionStorage.setItem(STORAGE_KEYS.accessTokenAlt, newAccessToken);
        }
        if (newRefreshToken && remembered) {
          localStorage.setItem(STORAGE_KEYS.refreshToken, newRefreshToken);
        }
      }

      return newAccessToken;
    })();

    authService._refreshInFlight = promise.finally(() => {
      authService._refreshInFlight = null;
    });

    return authService._refreshInFlight;
  },

  getAuthHeader: async (): Promise<Record<string, string>> => {
    try {
      let token: string | null = readAccessToken();

      if (!token && typeof window !== 'undefined' && window.sessionStorage) {
        token = window.sessionStorage.getItem(STORAGE_KEYS.sessionBackendToken);
      }

      if (!token) {
        const userStr =
          (typeof window !== 'undefined' && window.sessionStorage
            ? window.sessionStorage.getItem(STORAGE_KEYS.sessionUser)
            : null) || localStorage.getItem(STORAGE_KEYS.user);
        if (userStr) {
          try {
            const user = JSON.parse(userStr) as { backendToken?: string };
            if (user && user.backendToken) {
              token = user.backendToken;
            }
          } catch (e) {

          }
        }
      }

      if (token) {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          let payload: { exp?: number } | null = null;
          try {
            payload = JSON.parse(atob(tokenParts[1])) as { exp?: number };
          } catch {
            payload = null;
          }
          const exp = payload?.exp ? payload.exp * 1000 : null;
          // The token is refreshed proactively when it is about to expire.
          if (exp && exp < Date.now() + 60000) {
            try {
              token = await authService.refreshToken();
            } catch (refreshError) {
              const err = refreshError as ServiceError;
              if (err?.code === 'REFRESH_REJECTED') {
                throw new Error('Session expired. Please log in again.');
              }

            }
          }
        }
      }

      return token ? { 'Authorization': `Bearer ${token}` } : {};
    } catch (error) {

      throw error;
    }
  },

  isLoggedIn: (): boolean => {
    if (readAccessToken()) return true;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (window.sessionStorage.getItem(STORAGE_KEYS.sessionBackendToken)) return true;
    }
    try {
      const userJson =
        (typeof window !== 'undefined' && window.sessionStorage
          ? window.sessionStorage.getItem(STORAGE_KEYS.sessionUser)
          : null) || localStorage.getItem(STORAGE_KEYS.user);
      if (!userJson) return false;
      const decoded = obfDecode(userJson) || userJson;
      const user = JSON.parse(decoded) as { backendToken?: string };
      return !!user?.backendToken;
    } catch {
      return false;
    }
  },

  getCurrentUser: (): UserPayload | null => {
    try {
      const userJson =
        (typeof window !== 'undefined' && window.sessionStorage
          ? window.sessionStorage.getItem(STORAGE_KEYS.sessionUser)
          : null) || localStorage.getItem(STORAGE_KEYS.user);
      if (!userJson) return null;
      const decoded = obfDecode(userJson) || userJson;
      return JSON.parse(decoded) as UserPayload;
    } catch (e) {

      return null;
    }
  },

  updateProfile: async (profileData: ProfileData): Promise<{ success: boolean; message: string; user: UserPayload }> => {

    const headers = await authService.getAuthHeader();

    const updateData = {
      fullname: profileData.fullName,
      address: profileData.address,
      phone: profileData.phone,
      date_of_birth: profileData.dateOfBirth,
      bio: profileData.bio,
      favoriteGenres: profileData.favoriteGenres
    };

    const response = await fetch(apiUrl(`authUpdateProfile`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorMessage = 'Cập nhật thông tin thất bại';

      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;

      } else {
        const textData = await response.text();

      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    const currentUser = (() => {
      try {
        const fromSS = (typeof window !== 'undefined' && window.sessionStorage)
          ? window.sessionStorage.getItem('user')
          : null;
        if (fromSS) {
          const decoded = obfDecode(fromSS) || fromSS;
          return JSON.parse(decoded) as UserPayload;
        }
      } catch { /* ignore */ }
      return {} as UserPayload;
    })();
    const updatedUser: UserPayload = {
      ...currentUser,
      fullname: data.user.fullname,
      email: data.user.email,
      phone: data.user.phone || '',
      address: data.user.address || '',
      date_of_birth: data.user.date_of_birth || '',
      bio: data.user.bio || '',
      avatar: data.user.avatar || currentUser.avatar || '',
      favoriteGenres: data.user.favoriteGenres || [],
      fullName: data.user.fullname,
      dateOfBirth: data.user.date_of_birth
    };

    localStorage.removeItem('user'); // clean up legacy key
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('user', obfEncode(JSON.stringify(updatedUser)));
    }

    return {
      success: true,
      message: data.message || 'Cập nhật thông tin thành công',
      user: updatedUser
    };
  },

  uploadAvatar: async (file: File): Promise<{ success: boolean; message: string; avatarUrl: string; user: UserPayload }> => {
    const headers = await authService.getAuthHeader();

    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(apiUrl(`authUploadAvatar`), {
      method: 'POST',
      headers: headers,
      body: formData
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorMessage = 'Tải lên avatar thất bại';

      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;

      } else {
        const textData = await response.text();

      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    const currentUser = (() => {
      try {
        const fromSS = (typeof window !== 'undefined' && window.sessionStorage)
          ? window.sessionStorage.getItem('user')
          : null;
        if (fromSS) {
          const decoded = obfDecode(fromSS) || fromSS;
          return JSON.parse(decoded) as UserPayload;
        }
      } catch { /* ignore */ }
      return {} as UserPayload;
    })();
    const updatedUser: UserPayload = {
      ...currentUser,
      avatar: data.avatarUrl || data.user?.avatar
    };

    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('user', obfEncode(JSON.stringify(updatedUser)));
    }
    localStorage.removeItem('user'); // clean up legacy key

    return {
      success: true,
      message: data.message || 'Cập nhật avatar thành công',
      avatarUrl: data.avatarUrl || data.user?.avatar || '',
      user: updatedUser
    };
  },

  getProfile: async (): Promise<UserPayload> => {
    const headers = await authService.getAuthHeader();

    const response = await fetch(apiUrl(`authUserDetail`), { headers });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Không thể lấy thông tin người dùng');
    }

    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('user', obfEncode(JSON.stringify(data.user)));
    }
    localStorage.removeItem('user'); // clean up legacy key
    return data.user as UserPayload;
  },

  changePassword: async (passwordData: PasswordData): Promise<{ success: boolean; message: string }> => {

    const headers = await authService.getAuthHeader();

    const dataToSend = {
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
      confirmPassword: passwordData.confirmPassword || passwordData.newPassword
    };

    const response = await fetch(apiUrl(`authChangePassword`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers
      },
      body: JSON.stringify(dataToSend)
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorMessage = 'Đổi mật khẩu thất bại';

      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;

      } else {
        const textData = await response.text();

      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    return {
      success: true,
      message: data.message || 'Đổi mật khẩu thành công'
    };
  },

  deleteAccount: async (): Promise<{ success: boolean; message: string }> => {
    const headers = await authService.getAuthHeader();

    const response = await fetch(apiUrl(`authDeleteAccount`), {
      method: 'DELETE',
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Xóa tài khoản thất bại');
    }

    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');

    return {
      success: true,
      message: data.message || 'Tài khoản đã được xóa thành công'
    };
  },

  getActivityHistory: async (): Promise<unknown> => {
    const headers = await authService.getAuthHeader();

    const response = await fetch(apiUrl(`authActivityHistory`), { headers });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Không thể lấy lịch sử hoạt động');
    }

    return data.activities;
  },

  getFavorites: async (): Promise<unknown> => {
    const headers = await authService.getAuthHeader();

    const response = await fetch(apiUrl(`authFavorites`), { headers });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Không thể lấy danh sách yêu thích');
    }

    return data.favorites;
  },

  getWatchlist: async (): Promise<unknown> => {
    // Dynamic import, to avoid an import cycle with watchlistService.
    const { default: watchlistService } = await import('./watchlistService');
    return watchlistService.getWatchlist();
  },

  addToWatchlist: async (movieData: unknown): Promise<unknown> => {
    const { default: watchlistService } = await import('./watchlistService');
    return watchlistService.addToWatchlist(movieData as Parameters<typeof watchlistService.addToWatchlist>[0]);
  },

  removeFromWatchlist: async (movieId: string): Promise<unknown> => {
    const { default: watchlistService } = await import('./watchlistService');
    return watchlistService.removeFromWatchlist(movieId);
  },

  getStats: async (): Promise<unknown> => {
    const headers = await authService.getAuthHeader();

    const response = await fetch(apiUrl(`authStats`), { headers });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Không thể lấy thống kê người dùng');
    }

    return data.stats;
  },

  getUserWatchStats: async (): Promise<{
    totalWatchedMovies: number;
    totalWatchedSeries: number;
    totalWatchTime: { hours: number; minutes: number; displayText: string };
    favoriteGenres: unknown[];
  }> => {
    try {
      const headers = await authService.getAuthHeader();
      const response = await fetch(apiUrl(`userStatsWatch`), { headers });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Error ${response.status}: Không thể lấy thống kê xem phim`);
      }

      const data = await response.json();
      return (data.data as {
        totalWatchedMovies: number;
        totalWatchedSeries: number;
        totalWatchTime: { hours: number; minutes: number; displayText: string };
        favoriteGenres: unknown[];
      }) || {
        totalWatchedMovies: 0,
        totalWatchedSeries: 0,
        totalWatchTime: { hours: 0, minutes: 0, displayText: '0 giờ 0 phút' },
        favoriteGenres: []
      };
    } catch (error) {

      return {
        totalWatchedMovies: 0,
        totalWatchedSeries: 0,
        totalWatchTime: { hours: 0, minutes: 0, displayText: '0 giờ 0 phút' },
        favoriteGenres: []
      };
    }
  },

  getUserWeeklyActivity: async (): Promise<number[]> => {
    try {
      const headers = await authService.getAuthHeader();
      const response = await fetch(apiUrl(`userStatsWeeklyActivity`), { headers });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Error ${response.status}: Không thể lấy hoạt động hằng tuần`);
      }

      const data = await response.json();
      return (data.data as number[]) || [0, 0, 0, 0, 0, 0, 0];
    } catch (error) {

      return [0, 0, 0, 0, 0, 0, 0];
    }
  },

  getUserGenreDistribution: async (): Promise<unknown[]> => {
    try {
      const headers = await authService.getAuthHeader();
      const response = await fetch(apiUrl(`userStatsGenreDistribution`), { headers });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Error ${response.status}: Không thể lấy phân bố thể loại`);
      }

      const data = await response.json();
      return (data.data as unknown[]) || [];
    } catch (error) {

      return [];
    }
  },

  getUserAchievements: async (): Promise<{ achievements: unknown[]; stats: Record<string, unknown> }> => {
    const emptyResponse = {
      achievements: [],
      stats: {
        moviesWatched: 0,
        seriesWatched: 0,
        userLevel: 'Người mới',
        levelProgress: 0,
        totalLikes: 0,
        totalComments: 0,
        viewCount: 0,
        completedWatchCount: 0
      }
    };

    try {
      const headers = await authService.getAuthHeader();
      const response = await fetch(apiUrl(`userStatsAchievements`), { headers });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Error ${response.status}: Không thể lấy thành tựu người dùng`);
      }

      const data = await response.json();
      return (data.data as { achievements: unknown[]; stats: Record<string, unknown> }) || emptyResponse;
    } catch (error) {

      return emptyResponse;
    }
  },

  /**
   * Polls backend to confirm the user account is still active.
   *
   * Intentionally disabled: backend has no verified account-status endpoint.
   * Use WebSocket lock notifications or 403 isAccountLocked response on other
   * API calls instead.
   */
  checkAccountStatus: async (): Promise<void> => {
    const reason =
      'checkAccountStatus is disabled: backend has no verified account-status endpoint. ' +
      'Use the WebSocket lock notifications or the 403 isAccountLocked response on other API calls instead.';
    const err: ServiceError = new Error(reason);
    err.code = 'NOT_IMPLEMENTED';
    throw err;
  }
};

export default authService;
