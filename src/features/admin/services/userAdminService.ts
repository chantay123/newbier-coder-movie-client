/**
 * @file userAdminService.ts
 * @description Admin user management: list, create, update, toggle, upload avatar.
 */
import axiosInstance from '@/API/config/axiosConfig';
import { endpoints } from '@/config/API';

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

const fallbackUserList = (page: number, limit: number): AdminUserListResponse => ({
  users: [],
  page,
  totalPages: 1,
  total: 0,
  limit
});

export const getUsersForAdmin = async (params: AdminUserListParams = {}): Promise<AdminUserListResponse> => {
  const { page = 1, limit = 10 } = params;
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
    console.error('Error fetching users for admin:', error);
    throw error;
  }
};

export const getUserByAdmin = async (id: string): Promise<unknown> => {
  try {
    const response = await axiosInstance.get(endpoints.admin.users.getById(id));
    return response.data;
  } catch (error) {
    console.error(`Error fetching user ${id}:`, error);
    throw error;
  }
};

export const createUserByAdmin = async (userData: Record<string, unknown>): Promise<unknown> => {
  try {
    const response = await axiosInstance.post(endpoints.admin.users.create(), userData);
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const updateUserByAdmin = async (id: string, userData: Record<string, unknown>): Promise<unknown> => {
  try {
    const response = await axiosInstance.put(endpoints.admin.users.update(id), userData);
    return response.data;
  } catch (error) {
    console.error(`Error updating user ${id}:`, error);
    throw error;
  }
};

export const deleteUserByAdmin = async (id: string): Promise<unknown> => {
  try {
    const response = await axiosInstance.delete(endpoints.admin.users.delete(id));
    return response.data;
  } catch (error) {
    console.error(`Error deleting user ${id}:`, error);
    throw error;
  }
};

export const toggleUserActiveStatus = async (id: string, isActive: boolean): Promise<AdminUser> => {
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
    console.error(`Error toggling user ${id} status:`, error);
    throw error;
  }
};

export const getRolesForAdmin = async (): Promise<AdminRole[]> => {
  try {
    const response = await axiosInstance.get(endpoints.admin.roles.getAll());
    const data = response.data as { data?: { roles?: AdminRole[] } } | null;
    return data?.data?.roles || [];
  } catch (error) {
    console.error('Error fetching roles:', error);
    throw error;
  }
};

export const getAccountTypesForAdmin = async (): Promise<AdminAccountType[]> => {
  try {
    const response = await axiosInstance.get(endpoints.admin.accountTypes.getAll());
    const data = response.data as { data?: { accountTypes?: AdminAccountType[] } } | null;
    return data?.data?.accountTypes || [];
  } catch (error) {
    console.error('Error fetching account types:', error);
    throw error;
  }
};

export const uploadUserAvatar = async (id: string, avatarFile: File): Promise<unknown> => {
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
    console.error(`Error uploading avatar for user ${id}:`, error);
    throw error;
  }
};
