/**
 * @file userAdminService.ts
 * @description Admin user management: list, create, update, toggle, upload avatar.
 *
 * Currently operating in MOCK MODE — the backend (localhost:5000) is not
 * reachable in this dev environment, so all functions read/write to the
 * in-memory MOCK_ADMIN_USERS list instead of hitting the network.
 *
 * The export signatures, return types, and admin-users UI contract are
 * unchanged. When the backend is restored, the network calls (commented as
 * `// NETWORK:`) can be re-enabled and the mock branches removed.
 */
import { MOCK_ADMIN_USERS, MOCK_USER_STATS, MockUserItem } from '@/mock/admin/mockUsers';

export interface AdminUser {
  _id: string;
  fullname: string;
  email: string;
  role: string | Record<string, unknown>;
  accountType: string | Record<string, unknown>;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  avatar?: string;
}

export interface AdminRole {
  _id: string;
  name: string;
  description: string;
}

export interface AdminAccountType {
  _id: string;
  name: string;
  description: string;
}

export interface AdminUserListResponse {
  users: AdminUser[];
  page: number;
  totalPages: number;
  total: number;
  limit: number;
}

export interface AdminUserListParams {
  page?: number;
  limit?: number;
}

/** In-memory mock store (cloned so callers can't mutate the source array). */
const mockStore: MockUserItem[] = MOCK_ADMIN_USERS.map((u) => ({ ...u }));

const toAdminUser = (u: MockUserItem): AdminUser => ({
  _id: u._id,
  fullname: u.fullname,
  email: u.email,
  role: typeof u.role === 'string' ? u.role : (u.role as unknown as Record<string, unknown>),
  accountType:
    typeof u.accountType === 'string' ? u.accountType : (u.accountType as unknown as Record<string, unknown>),
  createdAt: new Date(u.createdAt),
  updatedAt: new Date(u.updatedAt),
  isActive: Boolean(u.isActive),
  avatar: u.avatar
});

/** Simulate a small network delay so the UI loading states still appear. */
const mockDelay = (ms = 250): Promise<void> => new Promise((r) => setTimeout(r, ms));

export const getUsersForAdmin = async (params: AdminUserListParams = {}): Promise<AdminUserListResponse> => {
  const { page = 1, limit = 10 } = params;
  await mockDelay();
  const total = mockStore.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const slice = mockStore.slice(start, start + limit);
  return {
    users: slice.map(toAdminUser),
    page,
    totalPages,
    total,
    limit
  };

  /* NETWORK: original implementation kept here for reference when the API is back.
  try {
    const response = await axiosInstance.get(endpoints.admin.users.getAll(page, limit));
    const payload = response.data as { data?: { users?: AdminUser[]; pagination?: { currentPage?: number; totalPages?: number; totalUsers?: number; usersPerPage?: number } } } | null;
    if (payload?.data) {
      const users = (payload.data.users || []).map((u) => ({
        ...u,
        isActive: u.isActive === undefined ? true : Boolean(u.isActive)
      }));
      return {
        users,
        page: payload.data.pagination?.currentPage || 1,
        totalPages: payload.data.pagination?.totalPages || 1,
        total: payload.data.pagination?.totalUsers || 0,
        limit: payload.data.pagination?.usersPerPage || 10
      };
    }
    return fallbackUserList(page, limit);
  } catch (error) {

    throw error;
  }
  */
};

export const getUserByAdmin = async (id: string): Promise<AdminUser | null> => {
  await mockDelay();
  const found = mockStore.find((u) => u._id === id);
  return found ? toAdminUser(found) : null;

  /* NETWORK:
  try {
    const response = await axiosInstance.get(endpoints.admin.users.getById(id));
    return response.data;
  } catch (error) {

    throw error;
  }
  */
};

export const createUserByAdmin = async (userData: Record<string, unknown>): Promise<AdminUser> => {
  await mockDelay();
  const now = new Date().toISOString();
  const newItem: MockUserItem = {
    _id: `usr-${Date.now()}`,
    fullname: (userData.fullname as string) || 'New User',
    email: (userData.email as string) || 'new.user@example.com',
    username: (userData.username as string) || `user_${Date.now()}`,
    role: { _id: 'r-user', name: 'user' },
    accountType: { _id: 'acc-free', name: 'Free' },
    isActive: true,
    avatar: '',
    createdAt: now,
    updatedAt: now
  };
  mockStore.unshift(newItem);
  return toAdminUser(newItem);

  /* NETWORK:
  try {
    const response = await axiosInstance.post(endpoints.admin.users.create(), userData);
    return response.data;
  } catch (error) {

    throw error;
  }
  */
};

export const updateUserByAdmin = async (id: string, userData: Record<string, unknown>): Promise<AdminUser | null> => {
  await mockDelay();
  const idx = mockStore.findIndex((u) => u._id === id);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  mockStore[idx] = {
    ...mockStore[idx],
    ...(typeof userData.fullname === 'string' ? { fullname: userData.fullname } : {}),
    ...(typeof userData.email === 'string' ? { email: userData.email } : {}),
    updatedAt: now
  };
  return toAdminUser(mockStore[idx]);

  /* NETWORK:
  try {
    const response = await axiosInstance.put(endpoints.admin.users.update(id), userData);
    return response.data;
  } catch (error) {

    throw error;
  }
  */
};

export const deleteUserByAdmin = async (id: string): Promise<{ success: boolean; id: string }> => {
  await mockDelay();
  const idx = mockStore.findIndex((u) => u._id === id);
  if (idx >= 0) mockStore.splice(idx, 1);
  return { success: idx >= 0, id };

  /* NETWORK:
  try {
    const response = await axiosInstance.delete(endpoints.admin.users.delete(id));
    return response.data;
  } catch (error) {

    throw error;
  }
  */
};

export const toggleUserActiveStatus = async (id: string, isActive: boolean): Promise<AdminUser> => {
  await mockDelay();
  const idx = mockStore.findIndex((u) => u._id === id);
  if (idx >= 0) {
    mockStore[idx] = { ...mockStore[idx], isActive, updatedAt: new Date().toISOString() };
  }
  return {
    _id: id,
    fullname: idx >= 0 ? mockStore[idx].fullname : '',
    email: idx >= 0 ? mockStore[idx].email : '',
    role: idx >= 0 ? (typeof mockStore[idx].role === 'string' ? mockStore[idx].role : (mockStore[idx].role as unknown as Record<string, unknown>)) : '',
    accountType: idx >= 0 ? (typeof mockStore[idx].accountType === 'string' ? mockStore[idx].accountType : (mockStore[idx].accountType as unknown as Record<string, unknown>)) : '',
    isActive: Boolean(isActive),
    createdAt: idx >= 0 ? new Date(mockStore[idx].createdAt) : new Date(),
    updatedAt: new Date()
  };

  /* NETWORK:
  try {
    const response = await axiosInstance.patch(
      endpoints.admin.users.toggleStatus(id),
      { isActive }
    );
    const data = response.data as { data?: { user?: Partial<AdminUser> } } | null;
    const incoming = data?.data?.user || {};
    const now = new Date();
    return {
      _id: id,
      isActive: Boolean(isActive),
      fullname: typeof incoming.fullname === 'string' ? incoming.fullname : '',
      email: typeof incoming.email === 'string' ? incoming.email : '',
      role: typeof incoming.role === 'string' ? incoming.role : (incoming.role ?? ''),
      accountType: typeof incoming.accountType === 'string' ? incoming.accountType : (incoming.accountType ?? ''),
      createdAt: incoming.createdAt ?? now,
      updatedAt: incoming.updatedAt ?? now
    };
  } catch (error) {

    throw error;
  }
  */
};

export const getRolesForAdmin = async (): Promise<AdminRole[]> => {
  await mockDelay();
  return [
    { _id: 'r-admin', name: 'admin', description: 'Toàn quyền hệ thống' },
    { _id: 'r-mod', name: 'moderator', description: 'Kiểm duyệt nội dung' },
    { _id: 'r-user', name: 'user', description: 'Người dùng thông thường' }
  ];

  /* NETWORK:
  try {
    const response = await axiosInstance.get(endpoints.admin.roles.getAll());
    const data = response.data as { data?: { roles?: AdminRole[] } } | null;
    return data?.data?.roles || [];
  } catch (error) {

    throw error;
  }
  */
};

export const getAccountTypesForAdmin = async (): Promise<AdminAccountType[]> => {
  await mockDelay();
  return [
    { _id: 'acc-vip', name: 'VIP', description: 'Tài khoản VIP' },
    { _id: 'acc-prem', name: 'Premium', description: 'Tài khoản Premium' },
    { _id: 'acc-free', name: 'Free', description: 'Tài khoản miễn phí' }
  ];

  /* NETWORK:
  try {
    const response = await axiosInstance.get(endpoints.admin.accountTypes.getAll());
    const data = response.data as { data?: { accountTypes?: AdminAccountType[] } } | null;
    return data?.data?.accountTypes || [];
  } catch (error) {

    throw error;
  }
  */
};

export const uploadUserAvatar = async (id: string, _avatarFile: File): Promise<{ success: boolean; id: string }> => {
  await mockDelay();
  // Mock: do not actually persist the file, just return success.
  return { success: true, id };

  /* NETWORK:
  try {
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    const response = await axiosInstance.post(
      endpoints.admin.users.uploadAvatar(id),
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  } catch (error) {

    throw error;
  }
  */
};

/** Re-exported for UI widgets that consume MOCK_USER_STATS directly. */
export { MOCK_USER_STATS };
