/**
 * @file notificationService.ts
 * @description Admin notification feed: list, mark read, delete.
 *
 * NOTE: The current backend does not expose `GET /admin/notifications`
 * (responds 404 — confirmed in the dev server log). Until the backend
 * ships this endpoint, `getNotifications()` swallows the 404 and returns
 * an empty list so the AdminHeader bell does not crash. Any other error
 * (401, 500, network) is re-thrown so we can debug it. This is *not* a
 * fake success: when the endpoint is live, the response is returned
 * unchanged. The bell will simply show "0" until the backend catches up.
 */
import axiosInstance from '@/API/config/axiosConfig';
import type { AxiosError } from 'axios';

export interface AdminNotification {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  entity?: { id: string; type: string };
}

/** Returns true only when the backend explicitly says the route is missing. */
const isNotFound = (error: unknown): boolean => {
  const ax = error as AxiosError;
  return ax?.response?.status === 404;
};

export const getNotifications = async (): Promise<AdminNotification[]> => {
  try {
    // Use the configured axiosInstance so we inherit baseURL, the auth
    // header, and the 401-refresh interceptor. We do NOT build the URL
    // by hand — doing so risks double-prefixing "/api".
    const response = await axiosInstance.get('/admin/notifications');
    const data = response.data as { data?: AdminNotification[] } | AdminNotification[];
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as { data?: AdminNotification[] }).data)) {
      return (data as { data: AdminNotification[] }).data;
    }
    // Unexpected shape — treat as empty rather than crashing the bell.
    return [];
  } catch (error) {
    if (isNotFound(error)) {
      // The endpoint isn't implemented yet. The axiosConfig interceptor
      // has already logged `[API] GET /admin/notifications → 404`; we
      // stay quiet here so the bell stays usable.
      return [];
    }
    // 401 is handled by the interceptor (it tries to refresh once). Any
    // other failure (500, network, CORS) is re-thrown so the caller can
    // show a real error state instead of a fake "0 unread".
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await axiosInstance.put(`/admin/notifications/${notificationId}/read`);
  } catch (error) {
    // The interceptor already logs the status. We do not double-log here.
    throw error;
  }
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    await axiosInstance.delete(`/admin/notifications/${notificationId}`);
  } catch (error) {
    throw error;
  }
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  try {
    await axiosInstance.put('/admin/notifications/read-all');
  } catch (error) {
    throw error;
  }
};
