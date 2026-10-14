import { AUTH_CONFIG } from '../../config/authConfig';

const API_URL = process.env.NEXT_PUBLIC_CORE_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";



const authService = {
  login: async (credentials) => {
    try {
      const username = credentials.username || credentials.email || '';
      const payload = {
        username: typeof username === 'string' ? username.trim() : '',
        password: credentials.password
      };

      const loginEndpoint = AUTH_CONFIG?.api?.endpoint || `${API_URL}/auth/login`;

      const response = await fetch(loginEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      let responseText = '';
      let data = null;

      try {
        responseText = await response.text();
        if (responseText) {
          data = JSON.parse(responseText);
        }
      } catch {
        // silent parse handling
      }

      // Check standard v1 response contract (responseStatus + responseData)
      if (data && data.responseStatus) {
        // Treat invalid-credentials (00000204) and any non-success code as auth failure
        if (data.responseStatus.responseCode === AUTH_CONFIG.api.successCode && data.responseData?.access_token) {
          const accessToken = data.responseData.access_token;
          const refreshToken = data.responseData.refresh_token;
          const userPayload = data.responseData.user || null;

          // Persist tokens (do NOT log token values to console)
          localStorage.setItem("auth_token", accessToken);
          localStorage.setItem("token", accessToken);
          if (refreshToken) {
            localStorage.setItem("refresh_token", refreshToken);
          }

          let user = null;
          // Prefer user payload returned by API; fall back to JWT claims
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
            try {
              const base64Url = accessToken.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              }).join(''));

              const decoded = JSON.parse(jsonPayload);

              user = {
                _id: decoded.sub || decoded.userId || decoded.id,
                id: decoded.sub || decoded.userId || decoded.id,
                username: decoded.username || payload.username,
                fullname: decoded.fullname || decoded.username || '',
                role: decoded.role || 'USER',
                permissions: decoded.permissions || [],
                sessionId: decoded.sessionId || '',
                accountType: decoded.accountType || 'Normal',
                token: accessToken
              };
            } catch {
              user = {
                username: payload.username,
                role: 'USER',
                token: accessToken
              };
            }
          }

          localStorage.setItem("user", JSON.stringify(user));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('storage'));
          }

          return {
            success: true,
            user: user,
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
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("token", data.token);
        if (data.refreshToken) {
          localStorage.setItem("refresh_token", data.refreshToken);
        }

        try {
          const base64Url = data.token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));

          const decoded = JSON.parse(jsonPayload);
          const user = {
            _id: decoded.userId || decoded.sub,
            id: decoded.userId || decoded.sub,
            email: decoded.email || payload.username,
            username: decoded.username || payload.username,
            role: decoded.role || 'USER',
            accountType: decoded.accountType || 'Normal',
            token: data.token
          };

          localStorage.setItem("user", JSON.stringify(user));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('storage'));
          }

          return {
            success: true,
            user: user,
            token: data.token
          };
        } catch {
          throw new Error("Lỗi xử lý token từ server.");
        }
      }

      throw new Error("Không nhận được token từ máy chủ.");
    } catch (error) {
      throw error;
    }
  },

  register: async (userData) => {
    try {

      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = 'Đăng ký thất bại';

        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } else {
          const textData = await response.text();
          console.error("Received non-JSON response:", textData);
          if (textData.includes('<!DOCTYPE')) {
            errorMessage = 'Lỗi kết nối máy chủ. Vui lòng kiểm tra lại API URL.';
          }
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textData = await response.text();
        console.error("Received non-JSON response:", textData);
        throw new Error("Server trả về định dạng không phải JSON. Vui lòng kiểm tra log và cấu hình API.");
      }

      const data = await response.json();

      if (!data.message) {
        throw new Error("Không nhận được phản hồi từ server");
      }

      return {
        success: true,
        message: data.message,
        data: data
      };
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  },

  logout: async () => {
    // Tell the backend to invalidate the refresh token. The server response
    // is best-effort: we still clear local session state even if the call
    // fails (network error, 401 because the token was already expired, etc.)
    // so the user is not stuck on a "logged-in" UI.
    try {
      if (typeof window === 'undefined') {
        authService._clearLocalSession();
        return;
      }

      const accessToken = localStorage.getItem('auth_token');
      const refreshToken = localStorage.getItem('refresh_token');

      // Build the URL the same way the rest of this service does.
      const endpoint = `${API_URL.replace(/\/api\/?$/, '')}/api/v1/auth/logout`;

      // Only fire the request if we still have credentials. If the user is
      // already partially logged out, just clear local state.
      if (accessToken || refreshToken) {
        const headers = { 'Accept': 'application/json' };
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }
        const body = refreshToken ? JSON.stringify({ refreshToken }) : undefined;

        try {
          await fetch(endpoint, {
            method: 'POST',
            headers,
            body,
            // Do not let a slow backend block local cleanup.
            keepalive: true,
          });
        } catch (networkError) {
          // Network / CORS / offline: still clear local state.
          console.warn('Logout API call failed (continuing with local cleanup):', networkError?.message);
        }
      }
    } finally {
      authService._clearLocalSession();
    }
  },

  // Internal: wipe all client-side auth artifacts. Exposed for code paths
  // (e.g. refresh failure, account-locked page) that need to log the user
  // out without making another network call.
  _clearLocalSession: () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('isAccountLocked');
    } catch {
      /* localStorage may be disabled (private mode, etc.) */
    }
    try {
      window.sessionStorage.removeItem('backendToken');
      window.sessionStorage.removeItem('user');
    } catch {
      /* sessionStorage may be disabled in some browsers */
    }
  },

  // ---------------------------------------------------------------------
  // Refresh token
  // ---------------------------------------------------------------------
  //
  // `POST /auth/refresh-token` requires `{ refreshToken }` in the body
  // (verified against the live API: missing body returns 400 with
  // `errors[].field = "refreshToken"`). The success shape is unknown from
  // this environment (Swagger is behind auth), so we accept the same
  // v1 contract used by login (`responseData.access_token` /
  // `responseData.refresh_token`) and a few common legacy shapes.
  //
  // A single-flight lock (`_refreshInFlight`) prevents N parallel callers
  // from triggering N refresh requests — all callers await the same promise.
  _refreshInFlight: null,

  refreshToken: async () => {
    // Reuse the in-flight promise when several callers race to refresh.
    if (authService._refreshInFlight) {
      return authService._refreshInFlight;
    }

    const refreshToken = (typeof window !== 'undefined')
      ? localStorage.getItem('refresh_token')
      : null;

    if (!refreshToken) {
      const err = new Error('No refresh token available');
      err.code = 'NO_REFRESH_TOKEN';
      throw err;
    }

    const endpoint = `${API_URL.replace(/\/api\/?$/, '')}/api/v1/auth/refresh-token`;

    const promise = (async () => {
      let response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (networkError) {
        // Network / CORS / aborted: do NOT tear down the session.
        const err = new Error('Network error while refreshing token');
        err.code = 'NETWORK';
        err.cause = networkError;
        throw err;
      }

      // The backend rejected our refresh token. Force a full logout so the
      // user is taken back to the login page.
      if (response.status === 401 || response.status === 403) {
        authService._clearLocalSession();
        const err = new Error('Refresh token rejected');
        err.code = 'REFRESH_REJECTED';
        err.status = response.status;
        throw err;
      }

      if (!response.ok) {
        // Other failures (500, 502, …): keep the user signed in, the next
        // request can try again.
        const err = new Error(`Refresh failed (${response.status})`);
        err.code = 'TRANSIENT';
        err.status = response.status;
        throw err;
      }

      // Parse the body defensively.
      let data = null;
      try {
        data = await response.json();
      } catch {
        const err = new Error('Invalid refresh response');
        err.code = 'INVALID_RESPONSE';
        throw err;
      }

      // Accept v1 contract first, then fall back to legacy shapes.
      const payload = data?.responseData || data || {};
      const newAccessToken =
        payload.access_token ||
        payload.accessToken ||
        data?.token ||
        null;
      const newRefreshToken =
        payload.refresh_token ||
        payload.refreshToken ||
        data?.refreshToken ||
        null;

      if (!newAccessToken) {
        const err = new Error('No access token in refresh response');
        err.code = 'INVALID_RESPONSE';
        throw err;
      }

      // Persist the new tokens. If the backend rotated the refresh token,
      // store it; otherwise keep the existing one untouched.
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', newAccessToken);
        localStorage.setItem('token', newAccessToken); // legacy alias
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

  getAuthHeader: async () => {
    try {
      let token = localStorage.getItem('auth_token');

      if (!token && typeof window !== 'undefined' && window.sessionStorage) {
        token = sessionStorage.getItem('backendToken');
      }

      if (!token) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
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
          let payload;
          try {
            payload = JSON.parse(atob(tokenParts[1]));
          } catch {
            payload = null;
          }
          const exp = payload?.exp ? payload.exp * 1000 : null;
          // Refresh proactively when the access token is about to expire.
          if (exp && exp < Date.now() + 60000) {
            try {
              token = await authService.refreshToken();
            } catch (refreshError) {
              // The refresh service already handles `REFRESH_REJECTED` by
              // clearing the session. For transient / network errors, fall
              // back to the existing (still-valid-ish) token so the caller
              // can decide what to do.
              if (refreshError?.code === 'REFRESH_REJECTED') {
                throw new Error('Session expired. Please log in again.');
              }
              console.warn('Proactive token refresh failed; using existing token:', refreshError?.message);
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

  isLoggedIn: () => {
    const token = localStorage.getItem("auth_token") ||
                 (typeof window !== 'undefined' && window.sessionStorage && window.sessionStorage.getItem('backendToken')) ||
                 (() => {
                   try {
                     const user = JSON.parse(localStorage.getItem('user') || '{}');
                     return user?.backendToken;
                   } catch (e) {
                     return null;
                   }
                 })();

    return !!token;
  },

  getCurrentUser: () => {
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    } catch (e) {
      console.error("Error parsing user from localStorage:", e);
      return null;
    }
  },

  updateProfile: async (profileData) => {
    try {
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
          console.error("Error response:", errorData);
        } else {
          const textData = await response.text();
          console.error("Received non-JSON error response:", textData);
        }

        console.groupEnd();
        throw new Error(errorMessage);
      }

      const data = await response.json();

      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = {
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
    } catch (error) {
      console.error('Error updating profile:', error);
      console.groupEnd();
      throw error;
    }
  },

  uploadAvatar: async (file) => {
    try {

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

      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = {
        ...currentUser,
        avatar: data.avatarUrl || data.user?.avatar
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));

      return {
        success: true,
        message: data.message || 'Cập nhật avatar thành công',
        avatarUrl: data.avatarUrl || data.user?.avatar,
        user: updatedUser
      };
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  },

  getProfile: async () => {
    try {
      const headers = await authService.getAuthHeader();

      const response = await fetch(`${API_URL}/auth/user-detail`, {
        headers: headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Không thể lấy thông tin người dùng');
      }

      localStorage.setItem('user', JSON.stringify(data.user));

      return data.user;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  },

  changePassword: async (passwordData) => {
    try {
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
          console.error("Error response:", errorData);
        } else {
          const textData = await response.text();
          console.error("Received non-JSON error response:", textData);
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
    } catch (error) {
      console.error('Error changing password:', error);
      console.groupEnd();
      throw error;
    }
  },

  deleteAccount: async () => {
    try {
      const headers = await authService.getAuthHeader();

      const response = await fetch(`${API_URL}/auth/delete-account`, {
        method: 'DELETE',
        headers: headers
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
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  },

  getActivityHistory: async () => {
    try {
      const headers = await authService.getAuthHeader();

      const response = await fetch(`${API_URL}/auth/activity-history`, {
        headers: headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Không thể lấy lịch sử hoạt động');
      }

      return data.activities;
    } catch (error) {
      console.error('Error fetching activity history:', error);
      throw error;
    }
  },

  getFavorites: async () => {
    try {
      const headers = await authService.getAuthHeader();

      const response = await fetch(`${API_URL}/auth/favorites`, {
        headers: headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Không thể lấy danh sách yêu thích');
      }

      return data.favorites;
    } catch (error) {
      console.error('Error fetching favorites:', error);
      throw error;
    }
  },

  getWatchlist: async () => {
    try {
      const watchlistService = require('./watchlistService').default;

      return await watchlistService.getWatchlist();
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      throw error;
    }
  },

  addToWatchlist: async (movieData) => {
    try {
      const watchlistService = require('./watchlistService').default;

      return await watchlistService.addToWatchlist(movieData);
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      throw error;
    }
  },

  removeFromWatchlist: async (movieId) => {
    try {
      const watchlistService = require('./watchlistService').default;

      return await watchlistService.removeFromWatchlist(movieId);
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      throw error;
    }
  },

  getStats: async () => {
    try {
      const headers = await authService.getAuthHeader();

      const response = await fetch(`${API_URL}/auth/stats`, {
        headers: headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Không thể lấy thống kê người dùng');
      }

      return data.stats;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  },

  getUserWatchStats: async () => {
    try {
      const headers = await authService.getAuthHeader();

      const response = await fetch(`${API_URL}/user-stats/watch-stats`, {
        headers: headers
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Error ${response.status}: Không thể lấy thống kê xem phim`);
      }

      const data = await response.json();

      return data.data || {};
    } catch (error) {
      console.error('Error fetching user watch stats:', error);
      return {
        totalWatchedMovies: 0,
        totalWatchedSeries: 0,
        totalWatchTime: {
          hours: 0,
          minutes: 0,
          displayText: '0 giờ 0 phút'
        },
        favoriteGenres: []
      };
    }
  },

  getUserWeeklyActivity: async () => {
    try {

      const headers = await authService.getAuthHeader();

      const response = await fetch(`${API_URL}/user-stats/weekly-activity`, {
        headers: headers
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Error ${response.status}: Không thể lấy hoạt động hằng tuần`);
      }

      const data = await response.json();

      return data.data || [0, 0, 0, 0, 0, 0, 0];
    } catch (error) {
      console.error('Error fetching user weekly activity:', error);
      return [0, 0, 0, 0, 0, 0, 0];
    }
  },

  getUserGenreDistribution: async () => {
    try {

      const headers = await authService.getAuthHeader();

      const response = await fetch(`${API_URL}/user-stats/genre-distribution`, {
        headers: headers
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Error ${response.status}: Không thể lấy phân bố thể loại`);
      }

      const data = await response.json();

      return data.data || [];
    } catch (error) {
      console.error('Error fetching user genre distribution:', error);
      return [];
    }
  },

  getUserAchievements: async () => {
    try {

      const headers = await authService.getAuthHeader();

      const response = await fetch(`${API_URL}/user-stats/achievements`, {
        headers: headers
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Error ${response.status}: Không thể lấy thành tựu người dùng`);
      }

      const data = await response.json();

      return data.data || {
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
    } catch (error) {
      console.error('Error fetching user achievements:', error);
      return {
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
    }
  },

  // Polls backend to confirm the user account is still active.
  //
  // The previous implementation hit `/users/account/status` then
  // `/auth/user-detail`, both of which return 404 on the live API
  // (verified). Several other candidate paths (`/auth/me`, `/me`,
  // `/auth/profile`, `/users/me`, `/account`, …) also 404. We have
  // NO verified endpoint to call, so this function is intentionally
  // disabled: it never opens a network request and never fakes a
  // success / failure response. Real-time lock notifications remain
  // available via the WebSocket effect in `auth.js` (when the backend
  // supports WS) and the `403 isAccountLocked` signal surfaced by
  // `axiosConfig.js` on any other API call.
  checkAccountStatus: async () => {
    const reason =
      'checkAccountStatus is disabled: backend has no verified account-status endpoint. ' +
      'Use the WebSocket lock notifications or the 403 isAccountLocked response on other API calls instead.';
    const err = new Error(reason);
    err.code = 'NOT_IMPLEMENTED';
    // We still throw so the caller (auth.js) can `console.warn` once and
    // stop scheduling more calls. We never send a fake success.
    throw err;
  }
};

export default authService;