// src/components/Admin/Users/UserTable.tsx
import React, { useState } from 'react';
import { FaEdit, FaTrash, FaBan, FaUnlock, FaSearch, FaFilter, FaSortAmountDown, FaSortAmountUp, FaUserCircle, FaHistory } from 'react-icons/fa';
import ConfirmModal from '@/features/admin/components/Common/ConfirmModal';
import LoginHistoryModal from '@/features/admin/components/Users/LoginHistoryModal';
import CinemaDropdown from '@/features/admin/components/Common/CinemaDropdown';
import { ADMIN_USERS_I18N } from '@/config/i18n/admin';
import cinemaTable from '@/styles/CinemaTable.module.css';

interface User {
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

interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  onBanUser: (userId: string, isActive: boolean) => void;
}

const UserTable: React.FC<UserTableProps> = ({ users = [], onEdit, onDelete, onBanUser }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [action, setAction] = useState<'ban' | 'unban' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const [newActiveState, setNewActiveState] = useState<boolean | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyUser, setHistoryUser] = useState<User | null>(null);

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleBanClick = (user: User) => {
    setSelectedUser(user);

    const currentUserActive = user.isActive !== false;

    setAction(currentUserActive ? 'ban' : 'unban');

    const newActiveState = !currentUserActive;

    setNewActiveState(newActiveState);
    setShowBanModal(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedUser && selectedUser._id) {
      onDelete(selectedUser._id);
      setShowDeleteModal(false);
    }
  };
  const handleBanConfirm = () => {
    if (selectedUser && selectedUser._id) {
      onBanUser(selectedUser._id, newActiveState as boolean);
      setShowBanModal(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const getRoleName = (role: string | { name: string; _id: string } | undefined): string => {
    if (!role) return 'User';
    if (typeof role === 'string') return role;
    return role?.name || 'User';
  };

  const getAccountTypeName = (accountType: string | { name: string; _id: string } | undefined): string => {
    if (!accountType) return 'Normal';
    if (typeof accountType === 'string') {
      return accountType === 'VIP' || accountType === 'vip' ? 'VIP' :
             accountType === 'premium' || accountType === 'Premium' ? 'Premium' :
             'Normal';
    }
    return accountType?.name || 'Normal';
  };

  const getRoleStyle = (role: string | { name: string; _id: string } | undefined) => {
    if (!role) return 'badge bg-secondary';

    const roleName = typeof role === 'string' ? role : role?.name;

    switch (roleName?.toLowerCase()) {
      case 'admin':
        return 'badge bg-danger';
      case 'moderator':
        return 'badge bg-warning';
      default:
        return 'badge bg-secondary';
    }
  };

  const getAccountTypeStyle = (accountType: string | { name: string; _id: string } | undefined) => {
    if (!accountType) return 'badge bg-secondary';

    const typeName = typeof accountType === 'string'
      ? accountType
      : accountType?.name || '';

    switch (typeName.toLowerCase()) {
      case 'vip':
        return 'badge bg-success';
      case 'premium':
        return 'badge bg-primary';
      default:
        return 'badge bg-secondary';
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterRole(e.target.value === 'all' ? null : e.target.value);
  };

  const safeUsers = Array.isArray(users) ? users : [];

  // Apply filtering
  const filteredUsers = safeUsers.filter(user => {
    if (!user) return false;

    const fullname = user.fullname || '';
    const email = user.email || '';
    const role = getRoleName(user.role).toLowerCase();

    const matchesSearch = searchQuery === '' ||
      fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRoleFilter = !filterRole || role === filterRole.toLowerCase();

    return matchesSearch && matchesRoleFilter;
  });

  // Apply sorting
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortField) return 0;

    let compareA: any;
    let compareB: any;

    switch (sortField) {
      case 'fullname':
        compareA = a.fullname || '';
        compareB = b.fullname || '';
        break;
      case 'email':
        compareA = a.email || '';
        compareB = b.email || '';
        break;
      case 'role':
        compareA = getRoleName(a.role);
        compareB = getRoleName(b.role);
        break;
      case 'accountType':
        compareA = getAccountTypeName(a.accountType);
        compareB = getAccountTypeName(b.accountType);
        break;
      case 'createdAt':
        compareA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        compareB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        break;
      default:
        return 0;
    }

    if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
    if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const getAvatarUrl = (user: User) => {
    if (!user || !user.avatar) return null;
    if (typeof user.avatar === 'string') {
      if (user.avatar.startsWith('http')) return user.avatar;
      return `${baseUrl}${user.avatar}`;
    }
    return null;
  }

  return (
    <>
      <div className="user-filters mb-3 p-3" style={{ backgroundColor: '#141416', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center flex-wrap gap-2 flex-grow-1" style={{ maxWidth: 640 }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flexGrow: 1, minWidth: 240 }}>
              <FaSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '0.8rem', pointerEvents: 'none' }} />
              <input
                type="text"
                style={{
                  width: '100%',
                  height: 36,
                  padding: '0 0.75rem 0 2.2rem',
                  backgroundColor: '#18181c',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 8,
                  color: '#f1f5f9',
                  fontSize: '0.84rem',
                  outline: 'none'
                }}
                placeholder={ADMIN_USERS_I18N.filters.searchPlaceholder}
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>

            {/* Role Filter Dropdown */}
            <CinemaDropdown
              options={[
                { value: 'all', label: ADMIN_USERS_I18N.filters.allRoles },
                { value: 'admin', label: ADMIN_USERS_I18N.filters.roleAdmin },
                { value: 'moderator', label: ADMIN_USERS_I18N.filters.roleModerator },
                { value: 'user', label: ADMIN_USERS_I18N.filters.roleUser }
              ]}
              value={filterRole || 'all'}
              onChange={(val) => setFilterRole(val === 'all' ? null : val)}
              prefixIcon={<FaFilter />}
              size="filter"
            />
          </div>

          <div>
            <span className="badge" style={{ backgroundColor: '#18181c', color: '#9ca3af', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}>
              {filteredUsers.length} người dùng
            </span>
          </div>
        </div>
      </div>

      <div className={cinemaTable.tableCard}>
        <div className={cinemaTable.tableResponsive}>
          <table className={cinemaTable.dataTable}>
            <thead>
              <tr>
                <th onClick={() => handleSort('fullname')} className="sortable-header" style={{ cursor: 'pointer' }}>
                  Họ Tên
                  {sortField === 'fullname' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? <FaSortAmountUp size={12} /> : <FaSortAmountDown size={12} />}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('email')} className="sortable-header" style={{ cursor: 'pointer' }}>
                  Email
                  {sortField === 'email' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? <FaSortAmountUp size={12} /> : <FaSortAmountDown size={12} />}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('role')} className="sortable-header" style={{ cursor: 'pointer' }}>
                  Vai trò
                  {sortField === 'role' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? <FaSortAmountUp size={12} /> : <FaSortAmountDown size={12} />}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('accountType')} className={`${cinemaTable.hideMobile} sortable-header`} style={{ cursor: 'pointer' }}>
                  Loại TK
                  {sortField === 'accountType' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? <FaSortAmountUp size={12} /> : <FaSortAmountDown size={12} />}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('createdAt')} className={`${cinemaTable.hideTablet} sortable-header`} style={{ cursor: 'pointer' }}>
                  Ngày tạo
                  {sortField === 'createdAt' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? <FaSortAmountUp size={12} /> : <FaSortAmountDown size={12} />}
                    </span>
                  )}
                </th>
                <th style={{ textAlign: 'center', width: '130px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <div className={cinemaTable.emptyStateContainer}>
                      <FaUserCircle size={44} style={{ color: '#6b7280', marginBottom: '0.75rem', opacity: 0.6 }} />
                      <div className={cinemaTable.emptyStateTitle}>Không tìm thấy người dùng nào</div>
                      <div className={cinemaTable.emptyStateSubtitle}>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn</div>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user) => {
                  if (!user || !user._id) return null;
                  const isUserInactive = user.isActive === false;

                  return (
                    <tr key={user._id} className={isUserInactive ? 'banned-user' : ''}>
                      <td>
                        <div className="d-flex align-items-center" style={{ gap: '10px' }}>
                          <div className="user-avatar" style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: '#18181c' }}>
                            {getAvatarUrl(user) ? (
                              <img
                                src={getAvatarUrl(user) || '/img/avatar.png'}
                                alt={user.fullname || 'User'}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/img/avatar.png';
                                }}
                              />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#26262a', color: '#9ca3af', fontWeight: 600, fontSize: '13px' }}>
                                {user.fullname ? user.fullname.charAt(0).toUpperCase() : 'U'}
                              </div>
                            )}
                            {isUserInactive && (
                              <div style={{ position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', color: '#fff', fontSize: '7px', borderRadius: '50%' }} title="Tài khoản đã bị cấm">
                                <FaBan />
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.86rem' }}>{user.fullname || 'Không có tên'}</div>
                            <div style={{ color: '#9ca3af', fontSize: '0.74rem', fontFamily: 'monospace' }}>ID: {user._id.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#cbd5e1' }}>{user.email || 'N/A'}</td>
                      <td>
                        <span className={getRoleStyle(user.role)}>
                          {getRoleName(user.role)}
                        </span>
                      </td>
                      <td className={cinemaTable.hideMobile}>
                        <span className={getAccountTypeStyle(user.accountType)}>
                          {getAccountTypeName(user.accountType)}
                        </span>
                      </td>
                      <td className={cinemaTable.hideTablet} style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                        {user.createdAt ? (
                          <div className="d-flex flex-column">
                            <span style={{ color: '#cbd5e1' }}>{formatDate(user.createdAt).split(',')[0]}</span>
                            <small style={{ color: '#6b7280' }}>{formatDate(user.createdAt).split(',')[1]}</small>
                          </div>
                        ) : (
                          <span>N/A</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={cinemaTable.rowActions} style={{ justifyContent: 'center' }}>
                          <button
                            className={`${cinemaTable.actionBtn} ${cinemaTable.actionBtnEdit}`}
                            onClick={() => onEdit(user)}
                            title="Chỉnh sửa thông tin"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className={cinemaTable.actionBtn}
                            onClick={() => {
                              setHistoryUser(user);
                              setShowHistoryModal(true);
                            }}
                            title="Lịch sử đăng nhập & bảo mật"
                          >
                            <FaHistory />
                          </button>
                          {getRoleName(user.role).toLowerCase() !== 'admin' && (
                            <>
                              <button
                                className={`${cinemaTable.actionBtn} ${cinemaTable.actionBtnBan}`}
                                onClick={() => handleBanClick(user)}
                                title={isUserInactive ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                              >
                                {isUserInactive ? <FaUnlock /> : <FaBan />}
                              </button>
                              <button
                                className={`${cinemaTable.actionBtn} ${cinemaTable.actionBtnDelete}`}
                                onClick={() => handleDeleteClick(user)}
                                title="Xóa người dùng"
                              >
                                <FaTrash />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        show={showDeleteModal}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa người dùng ${selectedUser?.fullname || ''}?`}
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteModal(false)}
      />      {/* Ban/Unban Confirmation Modal */}
      <ConfirmModal
        show={showBanModal}
        title={action === 'ban' ? "Xác nhận khóa tài khoản" : "Xác nhận mở khóa tài khoản"}
        message={
          action === 'ban'
            ? `Bạn có chắc chắn muốn khóa tài khoản người dùng "${selectedUser?.fullname || ''}"? Người dùng sẽ không thể đăng nhập vào hệ thống cho đến khi được mở khóa.`
            : `Bạn có chắc chắn muốn mở khóa tài khoản người dùng "${selectedUser?.fullname || ''}"? Người dùng sẽ có thể đăng nhập và sử dụng hệ thống bình thường.`
        }
        confirmText={action === 'ban' ? "Khóa tài khoản" : "Mở khóa tài khoản"}
        cancelText="Hủy"
        onConfirm={handleBanConfirm}
        onCancel={() => setShowBanModal(false)}
      />

      {/* User Login History & Auditing Modal */}
      <LoginHistoryModal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setHistoryUser(null);
        }}
        user={historyUser}
        onUnblock={(userId) => {
          onBanUser(userId, true);
          if (historyUser) {
            setHistoryUser({ ...historyUser, isActive: true });
          }
        }}
      />

      <style jsx>{`
        .user-filters {
          background-color: #141416;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .sortable-header {
          cursor: pointer;
          user-select: none;
          position: relative;
        }

        .sortable-header:hover {
          color: #ffffff !important;
        }

        .banned-user {
          background-color: rgba(239, 68, 68, 0.08) !important;
        }

        .banned-user td {
          color: #94a3b8 !important;
        }

        :global(.badge) {
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        :global(.badge.bg-danger) {
          background-color: rgba(229, 9, 20, 0.15) !important;
          color: #f87171 !important;
          border: 1px solid rgba(229, 9, 20, 0.3) !important;
        }

        :global(.badge.bg-warning) {
          background-color: rgba(245, 158, 11, 0.15) !important;
          color: #fbbf24 !important;
          border: 1px solid rgba(245, 158, 11, 0.3) !important;
        }

        :global(.badge.bg-primary) {
          background-color: rgba(59, 130, 246, 0.15) !important;
          color: #60a5fa !important;
          border: 1px solid rgba(59, 130, 246, 0.3) !important;
        }

        :global(.badge.bg-success) {
          background-color: rgba(16, 185, 129, 0.15) !important;
          color: #34d399 !important;
          border: 1px solid rgba(16, 185, 129, 0.3) !important;
        }

        :global(.badge.bg-secondary) {
          background-color: rgba(255, 255, 255, 0.06) !important;
          color: #cbd5e1 !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
      `}</style>
    </>
  );
};

export default UserTable;