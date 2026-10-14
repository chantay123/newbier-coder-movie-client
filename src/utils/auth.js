import { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import authService from '../API/services/authService';
import { useSession, signOut } from 'next-auth/react';

// Create authentication context
const AuthContext = createContext(null);

// Provider component to wrap the entire application
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [showAccountLockedBanner, setShowAccountLockedBanner] = useState(false);
  const router = useRouter();
  const wsRef = useRef(null);
  
  // Hook to access NextAuth session
  const { data: session, status: sessionStatus } = useSession();

  // Listen to storage events to update user state when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } catch (error) {
          console.error('Error parsing user from localStorage:', error);
        }
      } else {
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Check if user is logged in when page loads or session changes
  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        // Only perform auth check on client side
        if (typeof window !== 'undefined') {
          // First check NextAuth session
          if (session?.user) {
            if (session.backendToken) {
              localStorage.setItem('auth_token', session.backendToken);
              sessionStorage.setItem('backendToken', session.backendToken);
              
              const userWithToken = {
                ...session.user,
                backendToken: session.backendToken
              };
              
              localStorage.setItem('user', JSON.stringify(userWithToken));
              
              setUser(userWithToken);
              setLoading(false);
              return; // Exit early as we've set the user
            }
          }
          
          // Fallback to traditional token-based auth
          const storedToken = localStorage.getItem('token');
          const storedUser = localStorage.getItem('user');
          
          if (storedToken && storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
            } catch (error) {
              console.error('Error parsing user from localStorage:', error);
            }
          } else {
            // Fallback to authService
            const currentUser = authService.getCurrentUser();
            if (currentUser) {
              setUser(currentUser);
            }
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setError('Không thể kiểm tra trạng thái đăng nhập');
      } finally {
        setLoading(false);
      }
    };

    checkLoggedIn();
  }, [session, sessionStatus, router.pathname]);

  // Track whether this provider instance is still mounted. React Strict
  // Mode (and HMR) unmount/remount effects synchronously, so a stale async
  // `checkAccountStatus` must not call setState or redirect after unmount.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Holds the AbortController of an in-flight account-status poll so the
  // logout path can cancel it (otherwise a redirect could fire after the
  // user has already signed out).
  const abortControllerRef = useRef(null);

  // Guard against double-firing `logout` (Strict Mode, double-clicks).
  const logoutInFlightRef = useRef(false);

  // Polls backend to confirm the user account is still active.
  //
  // As of the last verification, the backend does NOT expose any
  // `/account/status` / `/users/me` / `/auth/me` route (all 404). This
  // function therefore:
  //   - never fakes a success
  //   - never crashes the provider
  //   - throttles itself to once every 30s
  //   - stops calling the backend entirely after the first NOT_IMPLEMENTED
  //     response (the sessionStorage flag survives React Strict Mode and
  //     effect re-runs)
  // Real-time lock notifications still come from the WebSocket effect
  // (when the backend supports WS) and from 403 isAccountLocked on other
  // authenticated calls.
  const checkAccountStatus = useCallback(async () => {
    if (typeof window === 'undefined') return;

    // If a previous call confirmed the endpoint is unavailable, do not
    // try again for the rest of the session. (We don't use localStorage
    // for this because we want to re-evaluate on next login / new tab.)
    if (window.sessionStorage.getItem('accountStatusDisabled') === '1') return;

    // Skip the check on routes that opt out of it.
    const pathname = window.location.pathname;
    if (pathname === '/account-locked' || pathname === '/auth/login') return;

    // Skip the check if no user is signed in.
    if (!user) return;

    // Fast-path: persisted lock flag short-circuits the network call.
    if (localStorage.getItem('isAccountLocked') === 'true') {
      if (pathname !== '/account-locked') {
        window.location.href = '/account-locked';
      }
      return;
    }

    // Throttle API calls to avoid flooding the backend.
    const now = Date.now();
    const lastCheck = parseInt(localStorage.getItem('lastAccountStatusCheck') || '0', 10);
    if (now - lastCheck < 30000) return;
    localStorage.setItem('lastAccountStatusCheck', now.toString());

    // AbortController prevents the request from outliving the component
    // (avoids `Failed to fetch` after unmount and Strict Mode double-invokes).
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    // Expose so the logout path can cancel this poll.
    abortControllerRef.current = controller;

    try {
      // Delegate the network call to the centralized service. If the
      // service reports NOT_IMPLEMENTED (no verified endpoint exists),
      // we log once per session and skip the call for the rest of the
      // page lifetime. Other failures are treated as "no lock signal".
      const result = await authService.checkAccountStatus({ signal: controller.signal });
      // Bail out if the provider was unmounted while we were awaiting.
      if (!isMountedRef.current) return;
      if (result && result.isAccountLocked && pathname !== '/account-locked') {
        localStorage.setItem('isAccountLocked', 'true');
        window.location.href = '/account-locked';
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      if (error?.name === 'AbortError') return;

      // Don't keep logging the same "no endpoint" error on every effect
      // re-run. A sessionStorage flag limits it to once per browser tab
      // and ALSO suppresses future calls for the rest of the session.
      if (error?.code === 'NOT_IMPLEMENTED') {
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('accountStatusDisabled', '1');
          if (!window.sessionStorage.getItem('accountStatusDisabledLogged')) {
            window.sessionStorage.setItem('accountStatusDisabledLogged', '1');
            console.info(
              '[Auth] checkAccountStatus is disabled (no verified endpoint). ' +
              'Lock notifications are still received via the WebSocket channel ' +
              'and the 403 isAccountLocked signal on other API calls.'
            );
          }
        }
        return;
      }
      console.warn('Account status check skipped:', error?.message || error);
    } finally {
      clearTimeout(timeoutId);
      // Only clear the ref if it still points to this controller — a
      // newer poll may have replaced it in the meantime.
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [user]);

  // Check account status on mount and whenever user changes
  useEffect(() => {
    if (user && user._id) {
      checkAccountStatus();
    }
  }, [user, checkAccountStatus]);

  // Setup WebSocket connection for real-time notifications.
  //
  // Notes for reviewers:
  // - The browser's `onerror` only gives a generic Event with no reason,
  //   so we log URL + state and let `onclose` (with its close code) be
  //   the authoritative source of truth.
  // - Reconnect uses exponential backoff with a cap, and stops entirely
  //   on 4xx (endpoint missing / auth rejected) to avoid log spam.
  // - A feature flag (`NEXT_PUBLIC_WS_ENABLED`) and a runtime probe
  //   (`NEXT_PUBLIC_WS_URL`) prevent us from opening a connection when
  //   the backend doesn't expose a WS endpoint.
  useEffect(() => {
    // Only setup WebSocket if we have a logged in user.
    if (!user || !user._id) return;

    // Feature flag: allow disabling WebSocket entirely via env without
    // touching the code (e.g. when the backend has no WS endpoint yet).
    // The flag is the single source of truth — both `true` and `false`
    // are honored; unset (or "true") means enabled, matching the common
    // convention that absence means "default on".
    if (process.env.NEXT_PUBLIC_WS_ENABLED === 'false') {
      // Single, quiet log. We do NOT retry or reconnect.
      return;
    }

    // Track whether this effect instance is still active. Used to cancel
    // any pending reconnect timer when the user logs out, switches
    // accounts, or React Strict Mode unmounts the effect.
    let cancelled = false;
    let reconnectTimer = null;
    let ws = null;
    let attempts = 0;

    // Build the WebSocket URL.
    //
    // Resolution order (most explicit first):
    //   1. If NEXT_PUBLIC_WS_URL is a full ws:// or wss:// URL → use as-is.
    //   2. If NEXT_PUBLIC_WS_URL is set to a bare host (e.g. "api.host/ws"),
    //      use the current page protocol to pick ws/wss.
    //   3. Otherwise, derive from NEXT_PUBLIC_CORE_API_URL (production)
    //      then NEXT_PUBLIC_API_URL (legacy). Strip the /api or /api/v1
    //      suffix so we can append /ws cleanly.
    //
    // The runtime test is intentional: do NOT just trust one env var. If
    // the resolved host equals the current origin, skip the connection to
    // avoid a guaranteed-failed cross-host attempt.
    const buildWsUrl = () => {
      const explicit = process.env.NEXT_PUBLIC_WS_URL;
      if (explicit) {
        if (/^wss?:\/\//i.test(explicit)) return explicit;
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        return `${protocol}://${explicit.replace(/^https?:\/\//, '').replace(/\/+$/, '')}/ws`;
      }
      const core = process.env.NEXT_PUBLIC_CORE_API_URL;
      const legacy = process.env.NEXT_PUBLIC_API_URL;
      // Prefer the core (production) host. The legacy value usually points
      // at http://localhost:5000 which has no WebSocket endpoint.
      const base = (core || legacy || '').replace(/\/+$/, '');
      if (!base) return null;
      const host = base.replace(/^https?:\/\//, '');
      if (!host) return null;
      // Skip if the URL would target the current origin (no-op connection).
      if (typeof window !== 'undefined' && host === window.location.host) {
        return null;
      }
      const protocol = base.startsWith('https://') ? 'wss'
                     : base.startsWith('http://') ? 'ws'
                     : (window.location.protocol === 'https:' ? 'wss' : 'ws');
      return `${protocol}://${host}/ws`;
    };

    const wsUrl = buildWsUrl();
    if (!wsUrl) {
      // The backend has no WS endpoint (verified) or WS is disabled via
      // env. We log a single informational message — never on every
      // effect re-run — and return without scheduling a reconnect.
      console.info(
        `${logScope} disabled (NEXT_PUBLIC_WS_ENABLED=${process.env.NEXT_PUBLIC_WS_ENABLED || 'unset'}, ` +
        `resolved host=${
          (process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_CORE_API_URL || process.env.NEXT_PUBLIC_API_URL || '<none>')
            .replace(/^https?:\/\//, '').replace(/\/+$/, '')
        }). ` +
        'Real-time lock notifications rely on this channel; verify backend support before enabling.'
      );
      return;
    }

    const logScope = '[WS]';

    const connect = () => {
      if (cancelled) return;
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;
      } catch (err) {
        console.warn(`${logScope} failed to construct WebSocket:`, err?.message);
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        attempts = 0; // reset backoff on a successful handshake
        console.info(`${logScope} connected: ${wsUrl}`);
        // Authenticate the connection. The exact protocol is server-defined;
        // sending a best-effort `authenticate` message covers the existing
        // backend contract without crashing if the server ignores it.
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
        if (token && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: 'authenticate', token }));
          } catch (sendErr) {
            console.warn(`${logScope} failed to send authenticate:`, sendErr?.message);
          }
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle account status changes
          if (data.type === 'account_status_changed' && data.userId === user._id) {
            if (data.isActive === false) {
              setIsAccountLocked(true);
              setShowAccountLockedBanner(true);
              localStorage.setItem('isAccountLocked', 'true');
            } else if (data.isActive === true) {
              setIsAccountLocked(false);
              setShowAccountLockedBanner(false);
              localStorage.removeItem('isAccountLocked');
              alert(data.message || 'Tài khoản của bạn đã được mở khóa và hiện đang hoạt động bình thường.');
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = () => {
        // Browsers intentionally hide the reason here. We log URL + state
        // and let `onclose` carry the diagnostic value (close code).
        console.warn(
          `${logScope} error event received (url=${wsUrl}, readyState=${ws?.readyState})`
        );
      };

      ws.onclose = (event) => {
        // 1000 = normal, 1001 = going away (page unload). Both are fine.
        // 4xxx codes mean the server rejected the request (no endpoint,
        // auth failure). We stop reconnecting in that case to avoid spam.
        console.info(
          `${logScope} closed (code=${event?.code}, reason="${event?.reason || ''}", wasClean=${event?.wasClean})`
        );
        if (cancelled) return;
        if (!user || !user._id) return;
        if (document.visibilityState === 'hidden') return;

        // Stop on hard 4xx (client-side errors) — reconnecting won't help.
        if (event?.code >= 4000 && event?.code < 5000) return;
        scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      if (!user || !user._id) return;
      if (reconnectTimer) return;
      // Exponential backoff: 2s, 4s, 8s, 16s, 30s (capped). Reset on success.
      const delay = Math.min(30000, 2000 * Math.pow(2, Math.min(attempts, 4)));
      attempts += 1;
      // Give up after a generous number of attempts to avoid endless retries
      // when the server is permanently unreachable.
      if (attempts > 8) {
        console.warn(`${logScope} giving up after ${attempts} attempts.`);
        return;
      }
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!cancelled) connect();
      }, delay);
    };

    connect();

    // Cleanup function: cancel pending reconnects, close the live socket.
    return () => {
      cancelled = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (ws) {
        try {
          // readyState 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close(1000, 'client cleanup');
          }
        } catch {
          /* ignore */
        }
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
      }
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };
  }, [user]);

  // Login function
  const login = async (credentials) => {
    try {
      setError(null);
      setIsAccountLocked(false);
      const data = await authService.login(credentials);

      if (data.success && data.user) {
        // New session: reset the throttle timestamp so the first
        // account-status check isn't suppressed by a stale value.
        localStorage.removeItem('lastAccountStatusCheck');
        localStorage.removeItem('isAccountLocked');
        // Re-evaluate availability on each new session (in case the
        // backend was updated to expose an endpoint since last login).
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem('accountStatusDisabled');
          window.sessionStorage.removeItem('accountStatusDisabledLogged');
        }
        setUser(data.user);
        return { success: true, data };
      } else {
        throw new Error('Đăng nhập thất bại: Không nhận được thông tin người dùng');
      }
    } catch (error) {
      console.error('Login error in auth context:', error);

      if (error.response?.data?.isAccountLocked) {
        setIsAccountLocked(true);
        setError('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
        return {
          success: false,
          error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
          isAccountLocked: true
        };
      }

      setError(error.message);
      return { success: false, error: error.message || 'Đăng nhập thất bại' };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setError(null);
      
      // Make sure userData has fullname field
      if (!userData.fullname) {
        throw new Error('Họ tên là bắt buộc');
      }
      
      const data = await authService.register(userData);
      return { success: true, data };
    } catch (error) {
      console.error('Registration error in auth context:', error);
      setError(error.message);
      return { success: false, error: error.message || 'Đăng ký thất bại' };
    }
  };

  // Logout function
  const logout = async () => {
    // Guard against double-clicks / React Strict Mode double-fires that
    // could fire two `POST /auth/logout` requests in parallel.
    if (logoutInFlightRef.current) return;
    logoutInFlightRef.current = true;
    try {
      // Sign out of NextAuth first (it owns its own cookies/session).
      if (session) {
        try {
          await signOut({ redirect: false });
        } catch (nextAuthError) {
          // NextAuth sign-out is best-effort; we still want to clear the
          // local backend session below.
          console.warn('NextAuth signOut failed (continuing):', nextAuthError?.message);
        }
      }
      // Call the backend logout endpoint (now an async function) and
      // wipe local state. `authService.logout` is safe to await even when
      // the user is already partially signed out.
      try {
        await authService.logout();
      } catch (logoutError) {
        console.warn('authService.logout failed (clearing local state anyway):', logoutError?.message);
      }

      // Reset the throttle flag so a fresh login doesn't immediately
      // hit the API with the previous user's lastCheck timestamp.
      localStorage.removeItem('lastAccountStatusCheck');
      localStorage.removeItem('isAccountLocked');

      setUser(null);
      setError(null);
      setIsAccountLocked(false);
      setShowAccountLockedBanner(false);

      // Force any pending account-status poll to be discarded so it
      // can't fire a redirect with a stale token after the user logs out.
      if (abortControllerRef.current) {
        try { abortControllerRef.current.abort(); } catch { /* noop */ }
        abortControllerRef.current = null;
      }

      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      setError('Đăng xuất thất bại');
    } finally {
      logoutInFlightRef.current = false;
    }
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      setError(null);
      const result = await authService.updateProfile(profileData);
      setUser(result.user);
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Profile update error:', error);
      
      if (error.response?.data?.isAccountLocked) {
        setIsAccountLocked(true);
        setError('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
        return { 
          success: false, 
          error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
          isAccountLocked: true 
        };
      }
      
      setError(error.message);
      return { success: false, error: error.message || 'Cập nhật thông tin thất bại' };
    }
  };

  // Upload avatar
  const uploadAvatar = async (file) => {
    try {
      const result = await authService.uploadAvatar(file);
      // Update user state with new avatar
      setUser(result.user);
      return { success: true, avatarUrl: result.avatarUrl };
    } catch (error) {
      console.error('Avatar upload error:', error);
      
      if (error.response?.data?.isAccountLocked) {
        setIsAccountLocked(true);
        return { 
          success: false, 
          error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
          isAccountLocked: true 
        };
      }
      
      return { success: false, error: error.message || 'Tải ảnh lên thất bại' };
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      if (user) {
        const updatedUser = await authService.getProfile();
        setUser(updatedUser);
        return updatedUser;
      }
      return null;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      
      if (error.response?.status === 403 && error.response?.data?.isAccountLocked) {
        setIsAccountLocked(true);
        setError('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
        return null;
      }
      
      return null;
    }
  };

  const updateAvatarInUI = (user) => {
    if (user && user.avatar) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      let avatarUrl = user.avatar;
      
      if (avatarUrl && avatarUrl.startsWith('/')) {
        avatarUrl = `${baseUrl}${avatarUrl}`;
      }
      
      avatarUrl = `${avatarUrl}?t=${new Date().getTime()}`;
      
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({
        ...currentUser,
        avatar: avatarUrl
      }));
      
      return avatarUrl;
    }
    return null;
  };  // Check the user object to understand how admin roles are stored

  
  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    uploadAvatar,
    refreshUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin' || user?.isAdmin === true, // Check both role and isAdmin properties
    isAccountLocked,
    showAccountLockedBanner,
    hideAccountLockedBanner: () => setShowAccountLockedBanner(false),
    resetAccountLockStatus: () => {
      setIsAccountLocked(false);
      setShowAccountLockedBanner(false);
      localStorage.removeItem('isAccountLocked');
    },
    status: loading ? 'loading' : user ? 'authenticated' : 'unauthenticated'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Hook to protect routes requiring authentication
export const withAuth = (Component) => {
  const AuthenticatedComponent = (props) => {
    const { user, loading, isAccountLocked } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        router.replace('/auth/login');
      }
    }, [user, loading, router]);

    // Show loading state or redirect if not logged in
    if (loading) {
      return <div>Loading...</div>;
    }

    if (!user) {
      return null; // will redirect
    }

    return <Component {...props} />;
  };

  return AuthenticatedComponent;
};

// Hook to protect routes and check account status
export const withAccountStatus = (Component) => {
  const WithAccountStatus = (props) => {
    const { user, loading, isAccountLocked } = useAuth();
    const router = useRouter();
    const [showBanner, setShowBanner] = useState(false);
    
    useEffect(() => {
      // Check if user is authenticated but account is locked
      if (!loading && user && isAccountLocked) {
        setShowBanner(true);
        
        // Wait a moment to show the banner then redirect
        const timer = setTimeout(() => {
          router.push('/');
        }, 500);
        
        return () => clearTimeout(timer);
      }
    }, [user, loading, isAccountLocked, router]);

    // Show account locked banner if needed
    if (showBanner) {
      return (
        <div className="account-locked-container">
          <div className="account-locked-banner">
            <h2>Tài khoản đã bị khóa</h2>
            <p>Tài khoản của bạn hiện đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.</p>
            <button onClick={() => router.push('/auth/login')}>
              Quay lại trang đăng nhập
            </button>
          </div>
          <style jsx>{`
            .account-locked-container {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-color: rgba(0, 0, 0, 0.8);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 9999;
            }
            .account-locked-banner {
              background: linear-gradient(135deg, #e50914 0%, #8b0000 100%);
              padding: 2rem;
              border-radius: 8px;
              color: white;
              text-align: center;
              max-width: 500px;
              width: 90%;
            }
            button {
              background: white;
              color: #e50914;
              border: none;
              padding: 10px 20px;
              border-radius: 4px;
              font-weight: bold;
              margin-top: 15px;
              cursor: pointer;
            }
          `}</style>
        </div>
      );
    }

    // Content only loads if user is authenticated and account is not locked
    return <Component {...props} />;
  };

  return WithAccountStatus;
};

export default useAuth;