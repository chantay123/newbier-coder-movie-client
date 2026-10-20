
import axiosInstance from '@/API/config/axiosConfig';
import { MOCK_REPORT_DATA } from '@/mock/admin';

interface ReportParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  sortBy?: string;
  [key: string]: any;
}

interface UpdateReportData {
  status?: string;
  adminNotes?: string;
  resolution?: string;
  [key: string]: any;
}

interface ReportData {
  type: string;
  content: string;
  contentId?: string;
  userId?: string;
  targetUserId?: string;
  details?: string;
  [key: string]: any;
}

export const getReports = async (params: ReportParams = {}) => {
  try {
    const response = await axiosInstance.get('/admin/reports', { params });
    return response.data.data;
  } catch (error) {
    // axiosConfig đã log [API] ... ở interceptor — tránh double log.
    throw error;
  }
};

export const getReportById = async (reportId: string) => {
  try {
    const response = await axiosInstance.get(`/admin/reports/${reportId}`);
    return response.data.data;
  } catch (error) {
    // axiosConfig đã log [API] ... ở interceptor — tránh double log.
    throw error;
  }
};

export const updateReport = async (reportId: string, updateData: UpdateReportData) => {
  try {
    const response = await axiosInstance.patch(`/admin/reports/${reportId}`, updateData);
    return response.data.data;
  } catch (error) {
    // axiosConfig đã log [API] ... ở interceptor — tránh double log.
    throw error;
  }
};

export const deleteReport = async (reportId: string) => {
  try {
    const response = await axiosInstance.delete(`/admin/reports/${reportId}`);
    return response.data.data;
  } catch (error) {
    // axiosConfig đã log [API] ... ở interceptor — tránh double log.
    throw error;
  }
};

/**
 * Retrieves report breakdown statistics.
 * @description Endpoint /admin/reports/stats is not active on backend. Returns mock dataset directly to eliminate 404 errors.
 */
export const getReportStats = async () => {
  return MOCK_REPORT_DATA;
};

export const createReport = async (reportData: ReportData) => {
  try {
    const response = await axiosInstance.post('/reports', reportData);
    return response.data.data;
  } catch (error) {
    // axiosConfig đã log [API] ... ở interceptor — tránh double log.
    throw error;
  }
};

export const getMyReports = async () => {
  try {
    const response = await axiosInstance.get('/reports/my-reports');
    return response.data.data;
  } catch (error) {
    // axiosConfig đã log [API] ... ở interceptor — tránh double log.
    throw error;
  }
};