/**
 * @file authService.ts
 * @description Service xác thực thống nhất cho toàn bộ frontend.
 * Gom login, register, refresh token, logout, profile, watchlist, user stats.
 */

import { AUTH_CONFIG } from '../../config/authConfig';

const API_URL = process.env.NEXT_PUBLIC_CORE_API_URL
  || process.env.NEXT_PUBLIC_API_URL
  || 'http://localhost:5000/api';

/** Thông tin đăng nhập từ form */
export interface LoginCredentials {
  username?: string;
  email?: string;
  password: string;
}

/** Payload user trả về từ backend */
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

/** Token + user trả về khi login thành công */
export interface LoginResult {
  success: true;
  user: UserPayload & { token: string };
  token: string;
  data?: unknown;
}

/** Thông tin đăng ký */
export interface RegisterData {
  username: string;
  email: string;
  password: string;
  fullname?: string;
  [key: string]: unknown;
}

/** Kết quả đăng ký */
export interface RegisterResult {
  success: true;
  message: string;
  data: unknown;
}

/** Header auth dùng cho fetch */
export interface AuthHeader {
  Authorization?: string;
  [key: string]: string | undefined;
}

/** Thông tin profile update */
export interface ProfileData {
  fullName?: string;
  address?: string;
  phone?: string;
  dateOfBirth?: string;
  bio?: string;
  favoriteGenres?: string[];
  [key: string]: unknown;
}

/** Thông tin đổi mật khẩu */
export interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

/** Error mở rộng với code cho refresh flow */
export interface ServiceError extends Error {
  code?: string;
  status?: number;
  cause?: unknown;
}

/** Decode an toàn phần payload của JWT */
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

/** Xoá toàn bộ artifact xác thực phía client */
const clearLocalSession = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('isAccountLocked');
  } catch {
    /* localStorage có thể bị disable (private mode) */
  }
  try {
    window.sessionStorage.removeItem('backendToken');
    window.sessionStorage.removeItem('user');
  } catch {
    /* sessionStorage có thể bị disable */
  }
};

const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResult> => {
    const username = credentials.username || credentials.email || '';
    const payload = {
      username: typeof username === 'string' ? username.trim() : '',
      password: credentials.password
    };

    const loginEndpoint = AUTH_CONFIG?.api?.endpoint || `${API_URL}/auth/login`;

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

    // Chuẩn v1: responseStatus + responseData
    if (data && data.responseStatus) {
      if (
        data.responseStatus.responseCode === AUTH_CONFIG.api.successCode
        && data.responseData?.access_token
      ) {
        const accessToken: string = data.responseData.access_token;
        const refreshToken: string | undefined = data.responseData.refresh_token;
        const userPayload: UserPayload | null = data.responseData.user || null;

        // Persist tokens (do NOT log token values)
        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('token', accessToken);
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }

        let user: UserPayload & { token: string };
        if (userPayload && typeof userPayload === 'object') {
          user = {
            ...userPayload,
            _id: userPayload._id || userPayload.id || userPayload.sub,
            id: userPayload._id || userPayload.id || userPayload.sub,
            fullname: userPayload.fullname || userPayload.username || '',
            username: userPayload.username || userPayload.email || payload.username,
            role: userPayload.role || 'USER',
            token: accessToken
          };
        } else {
          const decoded = decodeJwtPayload(accessToken) || {};
          user = {
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
        }

        localStorage.setItem('user', JSON.stringify(user));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('storage'));
        }

        return {
          success: true,
          user,
          token: accessToken,
          data: data.responseData
        };
      } else {
        // Non-success code (e.g. 00000204 Invalid credentials)
        const code = data.responseStatus.responseCode || 'unknown';
        const apiMessage = data.responseStatus.responseMessage || 'Invalid credentials';
        const message = code === AUTH_CONFIG.api.invalidCredentialsCode
          ? 'Invalid username or password'
          : apiMessage;
        throw new Error(message);
      }
    }

    // Legacy fallback (token directly in response)
    if (!response.ok) {
      let errorMessage = 'Invalid username or password';
      if (response.status === 401 || response.status === 403) {
        errorMessage = 'Invalid username or password';
      } else if (data && (data.error || data.message)) {
        errorMessage = data.error || data.message;
      } else if (responseText.includes('<!DOCTYPE')) {
        errorMessage = 'Cannot reach the server. Please check the API URL.';
      }
      throw new Error(errorMessage);
    }

    if (data && data.token) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('token', data.token);
      if (data.refreshToken) {
        localStorage.setItem('refresh_token', data.refreshToken);
      }

      const decoded = decodeJwtPayload(data.token) || {};
      const user: UserPayload & { token: string } = {
        _id: (decoded.userId as string) || (decoded.sub as string),
        id: (decoded.userId as string) || (decoded.sub as string),
        email: (decoded.email as string) || payload.username,
        username: (decoded.username as string) || payload.username,
        role: (decoded.role as string) || 'USER',
        accountType: (decoded.accountType as string) || 'Normal',
        token: data.token
      };

      localStorage.setItem('user', JSON.stringify(user));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
      }

      return {
        success: true,
        user,
        token: data.token
      };
    }

    throw new Error('Không nhận được token từ máy chủ.');
  },

  register: async (userData: RegisterData): Promise<RegisterResult> => {
    const response = await fetch(`${API_URL}/auth/register`, {
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
        console.error('Received non-JSON response:', textData);
        if (textData.includes('<!DOCTYPE')) {
          errorMessage = 'Lỗi kết nối máy chủ. Vui lòng kiểm tra lại API URL.';
        }
      }
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textData = await response.text();
      console.error('Received non-JSON response:', textData);
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
    // Best-effort: clear local session ngay cả khi server không phản hồi.
    try {
      if (typeof window === 'undefined') {
        clearLocalSession();
        return;
      }

      const accessToken = localStorage.getItem('auth_token');
      const refreshToken = localStorage.getItem('refresh_token');

      // Build URL the same way as login
      const endpoint = `${API_URL.replace(/\/api\/?$/, '')}/api/v1/auth/logout`;

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
            // Không để backend chậm block local cleanup
            keepalive: true
          });
        } catch (networkError) {
          console.warn('Logout API call failed (continuing with local cleanup):', (networkError as Error)?.message);
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

    const refreshToken = (typeof window !== 'undefined')
      ? localStorage.getItem('refresh_token')
      : null;

    if (!refreshToken) {
      const err: ServiceError = new Error('No refresh token available');
      err.code = 'NO_REFRESH_TOKEN';
      throw err;
    }

    const endpoint = `${API_URL.replace(/\/api\/?$/, '')}/api/v1/auth/refresh-token`;

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
        localStorage.setItem('auth_token', newAccessToken);
        localStorage.setItem('token', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('refresh_token', newRefreshToken);
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
      let token: string | null = localStorage.getItem('auth_token');

      if (!token && typeof window !== 'undefined' && window.sessionStorage) {
        token = sessionStorage.getItem('backendToken');
      }

      if (!token) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr) as { backendToken?: string };
            if (user && user.backendToken) {
              token = user.backendToken;
            }
          } catch (e) {
            console.error('Error parsing user from localStorage:', e);
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
          // Refresh proactively khi token sắp hết hạn
          if (exp && exp < Date.now() + 60000) {
            try {
              token = await authService.refreshToken();
            } catch (refreshError) {
              const err = refreshError as ServiceError;
              if (err?.code === 'REFRESH_REJECTED') {
                throw new Error('Session expired. Please log in again.');
              }
              console.warn('Proactive token refresh failed; using existing token:', err?.message);
            }
          }
        }
      }

      return token ? { 'Authorization': `Bearer ${token}` } : {};
    } catch (error) {
      console.error('Error getting auth header:', error);
      throw error;
    }
  },

  isLoggedIn: (): boolean => {
    const token =
      localStorage.getItem('auth_token') ||
      (typeof window !== 'undefined' && window.sessionStorage && window.sessionStorage.getItem('backendToken')) ||
      (() => {
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}') as { backendToken?: string };
          return user?.backendToken || null;
        } catch {
          return null;
        }
      })();
    return !!token;
  },

  getCurrentUser: (): UserPayload | null => {
    try {
      const user = localStorage.getItem('user');
      return user ? (JSON.parse(user) as UserPayload) : null;
    } catch (e) {
      console.error('Error parsing user from localStorage:', e);
      return null;
    }
  },

  updateProfile: async (profileData: ProfileData): Promise<{ success: boolean; message: string; user: UserPayload }> => {
    console.group('===== Profile Update =====');

    const headers = await authService.getAuthHeader();

    const updateData = {
      fullname: profileData.fullName,
      address: profileData.address,
      phone: profileData.phone,
      date_of_birth: profileData.dateOfBirth,
      bio: profileData.bio,
      favoriteGenres: profileData.favoriteGenres
    };

    const response = await fetch(`${API_URL}/auth/update-profile`, {
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
        console.error('Error response:', errorData);
      } else {
        const textData = await response.text();
        console.error('Received non-JSON error response:', textData);
      }

      console.groupEnd();
      throw new Error(errorMessage);
    }

    const data = await response.json();

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}') as UserPayload;
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

    localStorage.setItem('user', JSON.stringify(updatedUser));
    console.groupEnd();

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

    const response = await fetch(`${API_URL}/auth/upload-avatar`, {
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
        console.error('Error response:', errorData);
      } else {
        const textData = await response.text();
        console.error('Received non-JSON error response:', textData);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}') as UserPayload;
    const updatedUser: UserPayload = {
      ...currentUser,
      avatar: data.avatarUrl || data.user?.avatar
    };

    localStorage.setItem('user', JSON.stringify(updatedUser));

    return {
      success: true,
      message: data.message || 'Cập nhật avatar thành công',
      avatarUrl: data.avatarUrl || data.user?.avatar || '',
      user: updatedUser
    };
  },

  getProfile: async (): Promise<UserPayload> => {
    const headers = await authService.getAuthHeader();

    const response = await fetch(`${API_URL}/auth/user-detail`, { headers });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Không thể lấy thông tin người dùng');
    }

    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user as UserPayload;
  },

  changePassword: async (passwordData: PasswordData): Promise<{ success: boolean; message: string }> => {
    console.group('===== Change Password =====');

    const headers = await authService.getAuthHeader();

    const dataToSend = {
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
      confirmPassword: passwordData.confirmPassword || passwordData.newPassword
    };

    const response = await fetch(`${API_URL}/auth/change-password`, {
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
        console.error('Error response:', errorData);
      } else {
        const textData = await response.text();
        console.error('Received non-JSON error response:', textData);
      }
      console.groupEnd();
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.groupEnd();

    return {
      success: true,
      message: data.message || 'Đổi mật khẩu thành công'
    };
  },

  deleteAccount: async (): Promise<{ success: boolean; message: string }> => {
    const headers = await authService.getAuthHeader();

    const response = await fetch(`${API_URL}/auth/delete-account`, {
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

    const response = await fetch(`${API_URL}/auth/activity-history`, { headers });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Không thể lấy lịch sử hoạt động');
    }

    return data.activities;
  },

  getFavorites: async (): Promise<unknown> => {
    const headers = await authService.getAuthHeader();

    const response = await fetch(`${API_URL}/auth/favorites`, { headers });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Không thể lấy danh sách yêu thích');
    }

    return data.favorites;
  },

  getWatchlist: async (): Promise<unknown> => {
    // Dynamic import để tránh vòng import với watchlistService
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

    const response = await fetch(`${API_URL}/auth/stats`, { headers });

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
      const response = await fetch(`${API_URL}/user-stats/watch-stats`, { headers });

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
      console.error('Error fetching user watch stats:', error);
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
      const response = await fetch(`${API_URL}/user-stats/weekly-activity`, { headers });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Error ${response.status}: Không thể lấy hoạt động hằng tuần`);
      }

      const data = await response.json();
      return (data.data as number[]) || [0, 0, 0, 0, 0, 0, 0];
    } catch (error) {
      console.error('Error fetching user weekly activity:', error);
      return [0, 0, 0, 0, 0, 0, 0];
    }
  },

  getUserGenreDistribution: async (): Promise<unknown[]> => {
    try {
      const headers = await authService.getAuthHeader();
      const response = await fetch(`${API_URL}/user-stats/genre-distribution`, { headers });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Error ${response.status}: Không thể lấy phân bố thể loại`);
      }

      const data = await response.json();
      return (data.data as unknown[]) || [];
    } catch (error) {
      console.error('Error fetching user genre distribution:', error);
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
      const response = await fetch(`${API_URL}/user-stats/achievements`, { headers });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Error ${response.status}: Không thể lấy thành tựu người dùng`);
      }

      const data = await response.json();
      return (data.data as { achievements: unknown[]; stats: Record<string, unknown> }) || emptyResponse;
    } catch (error) {
      console.error('Error fetching user achievements:', error);
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
