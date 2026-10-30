import axiosInstance from '@/API/config/axiosConfig';
import { MOCK_DASHBOARD_STATS, MOCK_ANALYTICS_DATA, MOCK_FEEDBACK_DATA } from '@/mock/admin';
import { apiRoute } from '@/config/apiRoutes';

/**
 * Retrieves the summary statistics shown at the top of the admin dashboard.
 *
 * @returns The mock dataset used to render the dashboard summary cards.
 */
export const getDashboardStats = async () => {
  return MOCK_DASHBOARD_STATS;
};

/**
 * Retrieves the number of views per day of the selected period.
 *
 * @param period - The length of the period (`week`, `month`, ...).
 * @returns The daily view counts, or the raw response when the
 *          backend does not wrap the payload in a `data` field.
 * @throws The original Axios error when the request fails.
 */
export const getMovieStatsByPeriod = async (period = 'week') => {
  try {
    const response = await axiosInstance.get(apiRoute(`adminDashboardViewsByDay`));

    if (response.data && response.data.data) {
      return response.data.data;
    }

    return response.data;
  } catch (error) {
    // The `axiosConfig` interceptor already logged the `[API] ...` message,
    // so the error is not logged twice here.
    throw error;
  }
};

/**
 * Retrieves the number of new users of the selected period.
 *
 * @param period - The length of the period (`week`, `month`, ...).
 * @returns The new user statistics built from the mock dataset.
 */
export const getUserStatsByPeriod = async (period = 'week') => {
  return {
    labels: ["Hiện tại"],
    data: [MOCK_DASHBOARD_STATS.newUsers || 0]
  };
};

/**
 * Retrieves how many movies belong to each genre.
 *
 * @returns The genre distribution, or the raw response when the
 *          backend does not wrap the payload in a `data` field.
 * @throws The original Axios error when the request fails.
 */
export const getMovieStatsByGenre = async () => {
  try {
    const response = await axiosInstance.get(apiRoute(`adminDashboardGenreDistribution`));

    if (response.data && response.data.data) {
      return response.data.data;
    }

    return response.data;
  } catch (error) {
    // The `axiosConfig` interceptor already logged the `[API] ...` message,
    // so the error is not logged twice here.
    throw error;
  }
};

/**
 * Retrieves the cinema analytics data (views per day, genre distribution
 * and the most recent movies).
 *
 * @returns The mock analytics dataset used to render the analytics page.
 */
export const getAnalyticsData = async () => {
  return MOCK_ANALYTICS_DATA;
};

/**
 * Retrieves the most recent user feedback messages.
 *
 * @param limit - The maximum number of feedback items to return.
 * @returns The list of feedback items, or an empty list on failure.
 * @throws The original Axios error when the request fails.
 */
export const getRecentFeedbacks = async (limit = 5) => {
  try {
    const response = await axiosInstance.get(apiRoute(`adminDashboardRecentFeedbacks`) + `?limit=${limit}`);

    if (response.data && response.data.data) {
      return response.data.data.recentFeedbacks || [];
    }

    return [];
  } catch (error) {
    // The `axiosConfig` interceptor already logged the `[API] ...` message,
    // so the error is not logged twice here.
    throw error;
  }
};

/**
 * Retrieves the breakdown of the user feedback by type and status.
 *
 * @returns The mock feedback statistics used to render the feedback charts.
 */
export const getFeedbackStats = async () => {
  return MOCK_FEEDBACK_DATA;
};
