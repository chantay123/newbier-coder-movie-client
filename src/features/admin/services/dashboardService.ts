
import axiosInstance from '@/API/config/axiosConfig';
import { MOCK_DASHBOARD_STATS, MOCK_ANALYTICS_DATA, MOCK_FEEDBACK_DATA } from '@/mock/admin';

/**
 * Retrieves dashboard summary statistics.
 * @description Endpoint /admin/dashboard/stats is not active on backend. Returns mock dataset directly to eliminate 404 errors.
 */
export const getDashboardStats = async () => {
  return MOCK_DASHBOARD_STATS;
};

export const getMovieStatsByPeriod = async (period = 'week') => {
  try {
    const response = await axiosInstance.get(`/admin/dashboard/views-by-day`);

    if (response.data && response.data.data) {
      return response.data.data;
    }

    return response.data;
  } catch (error) {
    // axiosConfig đã log [API] ... ở interceptor — tránh double log.
    throw error;
  }
};

/**
 * Retrieves user stats by period.
 * @description Uses mock dataset to avoid 404 errors from discontinued /admin/dashboard/stats endpoint.
 */
export const getUserStatsByPeriod = async (period = 'week') => {
  return {
    labels: ["Hiện tại"],
    data: [MOCK_DASHBOARD_STATS.newUsers || 0]
  };
};

export const getMovieStatsByGenre = async () => {
  try {
    const response = await axiosInstance.get('/admin/dashboard/genre-distribution');

    if (response.data && response.data.data) {
      return response.data.data;
    }

    return response.data;
  } catch (error) {
    // axiosConfig đã log [API] ... ở interceptor — tránh double log.
    throw error;
  }
};

/**
 * Retrieves cinema analytics data (views by day, genre distribution, recent movies).
 * @description Endpoint /admin/dashboard/analytics is not active on backend. Returns mock dataset directly to eliminate 404 errors.
 */
export const getAnalyticsData = async () => {
  return MOCK_ANALYTICS_DATA;
};

export const getRecentFeedbacks = async (limit = 5) => {
  try {
    const response = await axiosInstance.get(`/admin/dashboard/recent-feedbacks?limit=${limit}`);

    if (response.data && response.data.data) {
      return response.data.data.recentFeedbacks || [];
    }

    return [];
  } catch (error) {
    // axiosConfig đã log [API] ... ở interceptor — tránh double log.
    throw error;
  }
};

/**
 * Retrieves feedback breakdown statistics.
 * @description Endpoint /admin/dashboard/feedback-stats is not active on backend. Returns mock dataset directly to eliminate 404 errors.
 */
export const getFeedbackStats = async () => {
  return MOCK_FEEDBACK_DATA;
};