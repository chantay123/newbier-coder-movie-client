/**
 * statsService.ts
 *
 * Per-user stats: watch time, weekly activity, genre distribution,
 * series progress, in-progress series, achievements, rated movies.
 */
import axios from 'axios';
import { getApiBaseUrl } from '@/config/apiBase';
import { apiUrl } from '@/config/apiRoutes';

/** The backend base URL. It uses the shared resolver instead of reading the environment. */
const API_URL = getApiBaseUrl();

const getAuthHeader = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const statsService = {
  getUserWatchStats: async (): Promise<unknown> => {
    try {
      const response = await axios.get(apiUrl(`userStatsWatch`), { headers: getAuthHeader() });
      return (response.data as { data: unknown }).data;
    } catch (error) {

      return null;
    }
  },

  getUserWeeklyActivity: async (): Promise<unknown> => {
    try {
      const response = await axios.get(apiUrl(`userStatsWeeklyActivity`), { headers: getAuthHeader() });
      return (response.data as { data: unknown }).data;
    } catch (error) {

      return null;
    }
  },

  getUserGenreDistribution: async (): Promise<unknown> => {
    try {
      const response = await axios.get(apiUrl(`userStatsGenreDistribution`), { headers: getAuthHeader() });
      return (response.data as { data: unknown }).data;
    } catch (error) {

      return null;
    }
  },

  getUserDailyViewingTime: async (): Promise<unknown> => {
    try {
      const response = await axios.get(apiUrl(`userStatsDailyViewingTime`), { headers: getAuthHeader() });
      return (response.data as { data: unknown }).data;
    } catch (error) {

      return null;
    }
  },

  getUserSeriesProgress: async (seriesId: string): Promise<unknown> => {
    try {
      const response = await axios.get(apiUrl(`userStatsSeriesProgress`, seriesId), { headers: getAuthHeader() });
      return (response.data as { data: unknown }).data;
    } catch (error) {

      return null;
    }
  },

  getUserInProgressSeries: async (): Promise<unknown> => {
    try {
      const response = await axios.get(apiUrl(`userStatsInProgressSeries`), { headers: getAuthHeader() });
      return (response.data as { data: unknown }).data;
    } catch (error) {

      return null;
    }
  },

  getUserAchievements: async (): Promise<unknown> => {
    try {
      const response = await axios.get(apiUrl(`userStatsAchievements`), { headers: getAuthHeader() });
      return (response.data as { data: unknown }).data;
    } catch (error) {

      return null;
    }
  },

  getUserRatedMovies: async (): Promise<unknown> => {
    const headers = getAuthHeader();
    if (!Object.keys(headers).length) {
      throw new Error('You are not logged in');
    }
    try {
      const response = await axios.get(apiUrl(`ratingsUser`), { headers });
      const data = response.data as { success?: boolean; message?: string; data?: unknown };
      if (data.success) return data.data || null;

      return null;
    } catch (error) {

      return null;
    }
  }
};

export default statsService;
