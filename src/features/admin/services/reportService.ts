import axiosInstance from '@/API/config/axiosConfig';
import { MOCK_REPORT_DATA } from '@/mock/admin';
import { apiPath } from '@/config/apiPaths';

/**
 * Query parameters accepted by the report list endpoint.
 * Every field is optional so the admin page can send only what it needs.
 */
interface ReportParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  sortBy?: string;
  [key: string]: any;
}

/**
 * Fields an administrator can change when resolving a report.
 */
interface UpdateReportData {
  status?: string;
  adminNotes?: string;
  resolution?: string;
  [key: string]: any;
}

/**
 * The payload sent by a user when they create a new report.
 */
interface ReportData {
  type: string;
  content: string;
  contentId?: string;
  userId?: string;
  targetUserId?: string;
  details?: string;
  [key: string]: any;
}

/**
 * Retrieves the list of user reports for the admin report table.
 *
 * @param params - Optional filters such as page, limit, status or type.
 * @returns The reports returned by the backend.
 * @throws The original Axios error when the request fails.
 */
export const getReports = async (params: ReportParams = {}) => {
  try {
    const response = await axiosInstance.get(apiPath(`adminReportsList`), { params });
    return response.data.data;
  } catch (error) {
    // The axiosConfig interceptor already logged the `[API] ...` message,
    // so the error is not logged twice here.
    throw error;
  }
};

/**
 * Retrieves a single report by its id.
 *
 * @param reportId - The id of the report to load.
 * @returns The report details.
 * @throws The original Axios error when the request fails.
 */
export const getReportById = async (reportId: string) => {
  try {
    const response = await axiosInstance.get(apiPath(`adminReportsById`, reportId));
    return response.data.data;
  } catch (error) {
    // The axiosConfig interceptor already logged the `[API] ...` message,
    // so the error is not logged twice here.
    throw error;
  }
};

/**
 * Updates the status, notes or resolution of a report.
 *
 * @param reportId - The id of the report to update.
 * @param updateData - The fields that should change.
 * @returns The updated report.
 * @throws The original Axios error when the request fails.
 */
export const updateReport = async (reportId: string, updateData: UpdateReportData) => {
  try {
    const response = await axiosInstance.patch(apiPath(`adminReportsById`, reportId), updateData);
    return response.data.data;
  } catch (error) {
    // The axiosConfig interceptor already logged the `[API] ...` message,
    // so the error is not logged twice here.
    throw error;
  }
};

/**
 * Deletes a report permanently.
 *
 * @param reportId - The id of the report to delete.
 * @returns The deletion result returned by the backend.
 * @throws The original Axios error when the request fails.
 */
export const deleteReport = async (reportId: string) => {
  try {
    const response = await axiosInstance.delete(apiPath(`adminReportsById`, reportId));
    return response.data.data;
  } catch (error) {
    // The axiosConfig interceptor already logged the `[API] ...` message,
    // so the error is not logged twice here.
    throw error;
  }
};

/**
 * Retrieves the breakdown of reports by type and status.
 *
 * @returns The mock report statistics used to render the admin charts.
 */
export const getReportStats = async () => {
  return MOCK_REPORT_DATA;
};

/**
 * Creates a new report from the client side.
 *
 * @param reportData - The content of the report sent by the user.
 * @returns The report created by the backend.
 * @throws The original Axios error when the request fails.
 */
export const createReport = async (reportData: ReportData) => {
  try {
    const response = await axiosInstance.post(apiPath(`reportCreate`), reportData);
    return response.data.data;
  } catch (error) {
    // The axiosConfig interceptor already logged the `[API] ...` message,
    // so the error is not logged twice here.
    throw error;
  }
};

/**
 * Retrieves the reports created by the signed-in user.
 *
 * @returns The list of reports owned by the current user.
 * @throws The original Axios error when the request fails.
 */
export const getMyReports = async () => {
  try {
    const response = await axiosInstance.get(apiPath(`reportMyReports`));
    return response.data.data;
  } catch (error) {
    // The axiosConfig interceptor already logged the `[API] ...` message,
    // so the error is not logged twice here.
    throw error;
  }
};
