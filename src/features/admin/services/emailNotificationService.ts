/**
 * @file emailNotificationService.ts
 * @description Admin email broadcast: maintenance alerts and custom announcements.
 */
import axios from '@/API/config/axiosConfig';
import { apiRoute } from '@/config/apiRoutes';

export const sendMaintenanceNotification = async (data: Record<string, unknown>): Promise<unknown> => {
  try {
    const response = await axios.post(apiRoute(`notificationsSendMaintenance`), data);
    return response.data;
  } catch (error) {

    throw error;
  }
};

export const sendCustomNotification = async (data: Record<string, unknown>): Promise<unknown> => {
  try {
    const response = await axios.post(apiRoute(`notificationsSendCustom`), data);
    return response.data;
  } catch (error) {

    throw error;
  }
};

export interface NotificationHistoryParams {
  page?: number;
  limit?: number;
}

export interface NotificationHistory {
  success: boolean;
  data: unknown[];
  pages: number;
}

export const getNotificationHistory = async (
  params: NotificationHistoryParams = {}
): Promise<NotificationHistory | unknown> => {
  try {
    const { page = 1, limit = 10 } = params;
    const response = await axios.get(apiRoute(`notificationsHistory`), {
      params: { page, limit }
    });
    const data = response.data as { success?: boolean; data?: { logs?: unknown[]; pagination?: { pages?: number } } };
    if (data?.success && data.data) {
      const { logs, pagination } = data.data;
      return {
        success: true,
        data: logs || [],
        pages: pagination?.pages ?? 1
      } as NotificationHistory;
    }
    return data;
  } catch (error) {

    throw error;
  }
};
