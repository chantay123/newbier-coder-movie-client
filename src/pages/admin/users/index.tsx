// src/pages/admin/users.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import UserTable from '@/features/admin/components/Users/UserTable';
import UserForm from '@/features/admin/components/Users/UserForm';
import PaginationComponent from '@/features/admin/components/Common/Pagination';
import {
  getUsersForAdmin,
  deleteUserByAdmin,
  toggleUserActiveStatus,
  getRolesForAdmin,
  getAccountTypesForAdmin
} from '@/features/admin/services/userAdminService';
import { FaUserPlus, FaUsers, FaUserShield, FaUserAlt, FaUserCog } from 'react-icons/fa';
import AdminLayout from '@/layouts/AdminLayout';
import AdminRoute from '@/features/shared/components/ProtectedRoute/AdminRoute';
import styles from '@/styles/admin-users.module.css';
import { FaSync, FaExclamationTriangle } from 'react-icons/fa';
import { ADMIN_USERS_I18N, ADMIN_COMMON_I18N } from '@/config/i18n/admin';
import { MOCK_ADMIN_USERS, MOCK_USER_STATS } from '@/mock/admin';

// Basic type definitions for this component
interface UserForAdmin {
  _id: string;
  fullname: string;
  email: string;
  username?: string;
  role: any;
  accountType?: any;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
  password?: string;
  avatar?: string;
  [key: string]: any;
}

interface RoleForAdmin {
  _id: string;
  name: string;
  description: string;
  permissions?: string[];
}

interface AccountTypeForAdmin {
  _id: string;
  name: string;
  description: string;
}

// Type for UserTable component
interface UserTableUser {
  _id: string;
  fullname: string;
  email: string;
  role: string | { name: string; _id: string };
  accountType?: string | { name: string; _id: string };
  status?: string;
  createdAt: string;
  isActive?: boolean;
  avatar?: string;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  limit: number;
}

// Add interface for user statistics
interface UserStats {
  totalUsers: number;
  adminCount: number;
  moderatorCount: number;
  userCount: number;
  bannedCount: number;
}

// Convert UserForAdmin to User type for UserTable component
interface UserTableUser {
  _id: string;
  fullname: string;
  email: string;
  role: string | { name: string; _id: string };
  accountType?: string | { name: string; _id: string };
  status?: string;
  createdAt: string;
  isActive?: boolean;
  avatar?: string;
}

// Extended UserForAdmin interface for UserForm component compatibility
interface ExtendedUserForAdmin {
  _id: string;
  fullname: string;
  email: string;
  avatar?: string;
  role: string | { _id: string; name: string };
  accountType: string | { _id: string; name: string };
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

const AdminUsersPage = () => {
  const [users, setUsers] = useState<UserForAdmin[]>([]);
  const [roles, setRoles] = useState<RoleForAdmin[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountTypeForAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    limit: 10,
  });

  // Add state for user statistics
  const [userStats, setUserStats] = useState<UserStats>(MOCK_USER_STATS);
  const [isOfflineMock, setIsOfflineMock] = useState<boolean>(false);

  // WebSocket connection for real-time updates
  const wsRef = useRef<WebSocket | null>(null);
  const wsReconnectAttemptsRef = useRef<number>(0);
  const wsReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch users with pagination
  const fetchUsers = useCallback(async (page = 1, limit = 10) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit,
        _t: Date.now()
      };
      const responseData = await getUsersForAdmin(params) as any;

      if (responseData && Array.isArray(responseData.users) && responseData.users.length > 0) {
        setUsers(responseData.users);
        setIsOfflineMock(false);
        setPagination({
          currentPage: responseData.page || page,
          totalPages: responseData.totalPages || 1,
          totalUsers: responseData.total || responseData.users.length,
          limit: responseData.limit || limit,
        });
        setLoading(false);
        return;
      }
    } catch (err) {

    }

    // Fallback to rich mock users
    setIsOfflineMock(true);
    setUsers(MOCK_ADMIN_USERS as any);
    setPagination({
      currentPage: 1,
      totalPages: 1,
      totalUsers: MOCK_ADMIN_USERS.length,
      limit: 10,
    });
    setUserStats(MOCK_USER_STATS);
    setLoading(false);
  }, []);

  // Fetch user statistics (all users to count by role)
  const fetchUserStats = useCallback(async () => {
    try {
      const allUsersData = await getUsersForAdmin({ page: 1, limit: 1000 }) as any;
      if (allUsersData && Array.isArray(allUsersData.users) && allUsersData.users.length > 0) {
        const allUsers = allUsersData.users;
        const stats = {
          totalUsers: allUsersData.total || allUsers.length,
          adminCount: allUsers.filter((user: any) => {
            const userRole = typeof user.role === 'string' ? user.role : ((user.role as any)?.name || '');
            return userRole.toLowerCase() === 'admin';
          }).length,
          moderatorCount: allUsers.filter((user: any) => {
            const userRole = typeof user.role === 'string' ? user.role : ((user.role as any)?.name || '');
            return userRole.toLowerCase() === 'moderator';
          }).length,
          userCount: allUsers.filter((user: any) => {
            const userRole = typeof user.role === 'string' ? user.role : ((user.role as any)?.name || '');
            return userRole.toLowerCase() === 'user';
          }).length,
          bannedCount: allUsers.filter((user: any) => user && user.isActive === false).length,
        };
        setUserStats(stats);
        return;
      }
    } catch (err) {

    }
    setUserStats(MOCK_USER_STATS);
  }, []);
  const fetchRolesAndAccountTypes = useCallback(async () => {
    try {
      const [rolesData, accountTypesData] = await Promise.all([
        getRolesForAdmin(),
        getAccountTypesForAdmin()
      ]);

      if (Array.isArray(rolesData)) {
        setRoles(rolesData);
      } else {
        setRoles([]);

      }

      if (Array.isArray(accountTypesData)) {
        setAccountTypes(accountTypesData);
      } else {
        setAccountTypes([]);

      }
    } catch (err) {

    }
  }, []);

  // Setup WebSocket connection.
  //
  // The original implementation hardcoded `ws://localhost:5000` and
  // retried every 5 seconds on close — including when the close was
  // caused by a connection error. That meant a missing/unreachable
  // WebSocket endpoint would spam the console forever. We now:
  //   1) Resolve the URL from `NEXT_PUBLIC_WS_URL` (fallback to
  //      deriving it from `NEXT_PUBLIC_API_URL`).
  //   2) Cap reconnect attempts with exponential backoff and stop
  //      after 5 consecutive failures so we don't loop on a backend
  //      that simply doesn't expose a WebSocket.
  //   3) Pause reconnects while the tab is hidden — there's no point
  //      hammering a backend the user can't see.
  useEffect(() => {
    const resolveWsUrl = (): string | null => {
      const envUrl = process.env.NEXT_PUBLIC_WS_URL;
      if (envUrl && /^wss?:\/\//i.test(envUrl)) return envUrl;
      // Derive from NEXT_PUBLIC_API_URL when possible.
      const apiBase = process.env.NEXT_PUBLIC_API_URL;
      if (apiBase && /^https?:\/\//i.test(apiBase)) {
        return apiBase.replace(/^http/i, 'ws');
      }
      return null;
    };

    const MAX_RECONNECT_ATTEMPTS = 5;
    const baseBackoffMs = 5000;

    const clearReconnect = (): void => {
      if (wsReconnectTimerRef.current !== null) {
        clearTimeout(wsReconnectTimerRef.current);
        wsReconnectTimerRef.current = null;
      }
    };

    const setupWebSocket = (): void => {
      // Tear down any previous socket before opening a new one.
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { /* noop */ }
        wsRef.current = null;
      }
      clearReconnect();

      const wsUrl = resolveWsUrl();
      if (!wsUrl) {
        // No WebSocket endpoint is configured. Real-time updates will
        // be disabled for this session; the page still works because
        // every action already goes through HTTP + a refresh.
        return;
      }

      let ws: WebSocket;
      try {
        ws = new WebSocket(wsUrl);
      } catch (err) {

        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        // Successful connection — reset the backoff counter.
        wsReconnectAttemptsRef.current = 0;
        const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
        if (token) {
          try {
            ws.send(JSON.stringify({
              type: 'authenticate',
              token
            }));
          } catch {
            // The socket may have closed between the open and send —
            // nothing actionable, the next lifecycle event will handle it.
          }
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as {
            type?: string;
            userId?: string;
            changes?: Record<string, unknown>;
          };

          if (data.type === 'user_updated' && data.userId && data.changes) {
            const changes = data.changes;
            setUsers((prevUsers) => {
              return prevUsers.map((user) => {
                if (user._id === data.userId) {
                  const updatedUser = {
                    ...user,
                    ...changes
                  };
                  if (changes.accountType === 'VIP') {
                    const currentRole = user.role;
                    if (typeof currentRole === 'object' && currentRole && 'name' in currentRole) {
                      updatedUser.role = {
                        ...currentRole,
                        name: (changes.role as string) || (currentRole as { name: string }).name || 'VIP'
                      };
                    } else {
                      updatedUser.role = (changes.role as string) || 'VIP';
                    }
                  }
                  return updatedUser;
                }
                return user;
              });
            });
          }
        } catch (err) {
          // The server may emit a non-JSON keep-alive frame; log but
          // don't break the page.

        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        // Don't auto-reconnect if the tab is hidden or the user has
        // navigated away.
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
          return;
        }
        if (wsReconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {

          return;
        }
        const attempt = wsReconnectAttemptsRef.current;
        const delay = baseBackoffMs * Math.pow(2, attempt);
        wsReconnectAttemptsRef.current += 1;
        wsReconnectTimerRef.current = setTimeout(() => {
          wsReconnectTimerRef.current = null;
          setupWebSocket();
        }, delay);
      };

      ws.onerror = () => {
        // The browser hides the underlying cause for security reasons.
        // We don't log the event itself — the close handler will run
        // immediately after and drive the backoff/retry policy.
      };
    };

    setupWebSocket();

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        // Resume: if the socket isn't open, try once. The onclose
        // path will handle exponential backoff.
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          wsReconnectAttemptsRef.current = 0;
          setupWebSocket();
        }
      }
      // When hidden: do nothing. The next onclose will skip retry.
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      clearReconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { /* noop */ }
        wsRef.current = null;
      }
    };
  }, []); // Empty dependency array means this runs once on mount
  useEffect(() => {
    fetchUsers(pagination.currentPage, pagination.limit);
    fetchRolesAndAccountTypes();
    fetchUserStats(); // Add this to fetch stats on component mount
  }, [pagination.currentPage, pagination.limit, fetchUsers, fetchRolesAndAccountTypes, fetchUserStats]);
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };  // Convert UserForAdmin to UserTableUser type for UserTable
  const convertToUserTableType = (users: UserForAdmin[]): UserTableUser[] => {
    return users.map(user => ({
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      role: user.role as string | { name: string; _id: string },
      accountType: user.accountType as string | { name: string; _id: string } | undefined,
      createdAt: user.createdAt instanceof Date
        ? user.createdAt.toISOString()
        : (user.createdAt as string || new Date().toISOString()),
      isActive: user.isActive,
      avatar: (user as any).avatar
    }));
  };  const handleEditUserTable = (user: UserTableUser) => {
    // Find the full user data from our users array
    const fullUser = users.find(u => u._id === user._id);
    if (fullUser) {
      // Convert to format expected by UserForm
      const userForForm = {
        ...fullUser,
        role: fullUser.role,
        accountType: fullUser.accountType,
        avatar: fullUser.avatar
      };
      setSelectedUser(userForForm);
      setFormMode('edit');
      setShowUserForm(true);
    }
  };
  const handleDeleteUser = async (userId: string) => {
    if (!userId) {
      setError('Invalid user ID');
      return;
    }

    try {
      await deleteUserByAdmin(userId);
      // Refresh user list and stats after successful deletion
      fetchUsers(pagination.currentPage, pagination.limit);
      fetchUserStats(); // Refresh stats
    } catch (err) {
      let errorMessage = 'Failed to delete user';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    }
  };

  const handleBanUser = async (userId: string, isActive: boolean) => {
    if (!userId) {
      setError('Invalid user ID');
      return;
    }

    try {
      const result = await toggleUserActiveStatus(userId, isActive);

      setUsers(prevUsers =>
        prevUsers.map(user =>
          user._id === userId ? { ...user, isActive: isActive } : user
        )
      );

      alert(`Đã ${isActive ? 'mở khóa' : 'khóa'} tài khoản người dùng thành công!`);
      setTimeout(() => {
        fetchUsers(pagination.currentPage, pagination.limit);
        fetchUserStats(); // Refresh stats after ban/unban
      }, 500);
    } catch (err) {
      let errorMessage = `Không thể ${isActive ? 'mở khóa' : 'khóa'} tài khoản người dùng`;
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      alert(errorMessage);

    }
  };

  const handleAddNewUser = () => {
    setSelectedUser(null);
    setFormMode('create');
    setShowUserForm(true);
  };

  const handleUserFormClose = () => {
    setShowUserForm(false);
    setSelectedUser(null);
  };
  const handleUserFormSave = () => {
    // Refresh user list and stats after form save
    fetchUsers(pagination.currentPage, pagination.limit);
    fetchUserStats(); // Refresh stats after user creation/update
    handleUserFormClose();
  };// Count users by role - now uses userStats instead of current page users
  const getUserCountByRole = (roleName: any) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return userStats.adminCount;
      case 'moderator':
        return userStats.moderatorCount;
      case 'user':
        return userStats.userCount;
      default:
        return 0;
    }
  };

  // Count banned users - now uses userStats
  const getBannedUserCount = () => {
    return userStats.bannedCount;
  };

  return (
    <>
      <Head>
        <title>Quản lý người dùng - Admin Dashboard</title>
      </Head>

      <div className={styles.userAdminDashboard}>
        <section className={styles.contentHeader}>
          <div className="container-fluid p-0">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h1 className={styles.pageTitle}>{ADMIN_USERS_I18N.pageTitle}</h1>
                  {isOfflineMock && (
                    <span
                      className="badge"
                      style={{
                        backgroundColor: 'rgba(229, 9, 20, 0.12)',
                        color: '#f87171',
                        border: '1px solid rgba(229, 9, 20, 0.3)',
                        fontSize: '0.74rem',
                        fontWeight: 500,
                        padding: '0.35rem 0.65rem'
                      }}
                      title={ADMIN_COMMON_I18N.notices.offlineHint}
                    >
                      {ADMIN_COMMON_I18N.notices.offlineMode}
                    </span>
                  )}
                </div>
                <p className={styles.subtitle}>{ADMIN_USERS_I18N.pageSubtitle}</p>
              </div>
              <div>
                <button
                  type="button"
                  className={styles.addUserButton}
                  onClick={handleAddNewUser}
                >
                  <FaUserPlus /> {ADMIN_USERS_I18N.addNewUser}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="content">
          <div className="container-fluid p-0">
            {/* User Statistics Cards */}
            <div className="row g-3 mb-4">
              <div className="col-lg-3 col-sm-6 col-12">
                <div className={styles.statCard}>
                  <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8' }}>
                    <FaUsers />
                  </div>
                  <div className={styles.statInfo}>
                    <div className={styles.statLabel}>Tổng người dùng</div>
                    <div className={styles.statNumber}>{userStats.totalUsers || 0}</div>
                  </div>
                </div>
              </div>
              <div className="col-lg-3 col-sm-6 col-12">
                <div className={styles.statCard}>
                  <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#f87171' }}>
                    <FaUserShield />
                  </div>
                  <div className={styles.statInfo}>
                    <div className={styles.statLabel}>Admin</div>
                    <div className={styles.statNumber}>{getUserCountByRole('admin')}</div>
                  </div>
                </div>
              </div>
              <div className="col-lg-3 col-sm-6 col-12">
                <div className={styles.statCard}>
                  <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24' }}>
                    <FaUserCog />
                  </div>
                  <div className={styles.statInfo}>
                    <div className={styles.statLabel}>Moderator</div>
                    <div className={styles.statNumber}>{getUserCountByRole('moderator')}</div>
                  </div>
                </div>
              </div>
              <div className="col-lg-3 col-sm-6 col-12">
                <div className={styles.statCard}>
                  <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8' }}>
                    <FaUserAlt />
                  </div>
                  <div className={styles.statInfo}>
                    <div className={styles.statLabel}>Bị cấm</div>
                    <div className={styles.statNumber}>{getBannedUserCount()}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* User Table Card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h5 className={styles.cardTitle}>Danh sách người dùng</h5>
              </div>
              <div className="card-body p-0">
                {loading && (
                  <div className="text-center py-5">
                    <FaSync className="fa-spin" style={{ fontSize: '2rem', color: '#e50914' }} />
                    <p className="mt-3 text-muted" style={{ fontSize: '0.9rem' }}>Đang tải danh sách người dùng...</p>
                  </div>
                )}

                {error && !loading && (
                  <div className={styles.errorStateContainer}>
                    <FaExclamationTriangle className={styles.errorStateIcon} />
                    <div className={styles.errorStateTitle}>Không thể kết nối đến máy chủ</div>
                    <div className={styles.errorStateMessage}>{error}</div>
                    <button
                      className={styles.retryButton}
                      onClick={() => {
                        fetchUsers(pagination.currentPage, pagination.limit);
                        fetchUserStats();
                      }}
                    >
                      <FaSync className="me-1" /> Thử lại kết nối
                    </button>
                  </div>
                )}

                {!loading && !error && (
                  <>
                    {Array.isArray(users) && users.length > 0 ? (
                      <div className="table-responsive">
                        <UserTable
                          users={convertToUserTableType(users)}
                          onEdit={handleEditUserTable}
                          onDelete={handleDeleteUser}
                          onBanUser={handleBanUser}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-5">
                        <div className="mb-3">
                          <FaUsers size={40} style={{ color: '#64748b' }} />
                        </div>
                        <p style={{ color: '#94a3b8' }}>Chưa có người dùng nào trong hệ thống.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
              {!error && (
                <PaginationComponent
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  totalItems={userStats.totalUsers}
                  pageSize={pagination.limit}
                  onPageChange={handlePageChange}
                  onPageSizeChange={(newSize) => {
                    fetchUsers(1, newSize);
                  }}
                  itemName="người dùng"
                />
              )}
            </div>
          </div>
        </section>
      </div>

      {/* User Form Modal */}
      {showUserForm && (
        <UserForm
          show={showUserForm}
          user={selectedUser}
          mode={formMode}
          roles={roles}
          accountTypes={accountTypes}
          onClose={handleUserFormClose}
          onSave={handleUserFormSave}
        />
      )}
      <style jsx>{`
        .user-admin-dashboard {
          padding: 20px 24px;
          background-color: #0b0f17;
          min-height: calc(100vh - 60px);
          color: #f1f5f9;
        }

        .content-header {
          position: relative;
          margin-bottom: 20px;
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 4px;
          color: #ffffff;
          letter-spacing: -0.02em;
        }

        .text-muted {
          color: #94a3b8 !important;
          font-size: 0.85rem;
        }

        .info-box {
          border-radius: 10px;
          min-height: 76px;
          background-color: #111723;
          border: 1px solid rgba(255, 255, 255, 0.07);
          padding: 12px 16px;
          display: flex;
          align-items: center;
          transition: border-color 0.15s ease;
        }

        .info-box:hover {
          border-color: rgba(255, 255, 255, 0.15);
        }

        .info-box-icon {
          height: 44px;
          width: 44px;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          margin-right: 14px;
          flex-shrink: 0;
        }

        .bg-info {
          background-color: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
        }

        .bg-danger {
          background-color: rgba(239, 68, 68, 0.15);
          color: #f87171;
        }

        .bg-warning {
          background-color: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
        }

        .bg-secondary {
          background-color: rgba(148, 163, 184, 0.15);
          color: #cbd5e1;
        }

        .info-box-content {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .info-box-text {
          font-size: 0.78rem;
          color: #94a3b8;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 2px;
        }

        .info-box-number {
          font-weight: 700;
          font-size: 1.4rem;
          color: #ffffff;
          line-height: 1.2;
        }

        .card {
          margin-bottom: 20px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 10px;
          overflow: hidden;
          background-color: #111723;
        }

        .card-header {
          background-color: #141b29;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          padding: 14px 20px;
        }

        .card-footer {
          background-color: #0e131d;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          padding: 12px 20px;
        }

        :global(.btn-primary) {
          background-color: #e50914 !important;
          border: none !important;
          border-radius: 6px !important;
          font-weight: 500 !important;
          padding: 7px 16px !important;
          font-size: 0.88rem !important;
          transition: background-color 0.15s ease !important;
        }

        :global(.btn-primary:hover) {
          background-color: #c10711 !important;
        }
      `}</style>
    </>
  );
};

AdminUsersPage.getLayout = (page: React.ReactNode) => {
  return (
    <AdminRoute>
      <AdminLayout>{page}</AdminLayout>
    </AdminRoute>
  );
};

export default AdminUsersPage;