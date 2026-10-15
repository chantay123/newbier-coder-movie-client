/**
 * @file statsService.ts
 * @description Per-user stats: watch time, weekly activity, genre distribution,
 * series progress, in-progress series, achievements, rated movies.
 */
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getAuthHeader = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const statsService = {
  getUserWatchStats: async (): Promise<unknown> => {
    try {
      const response = await axios.get(`${API_URL}/user-stats/watch-stats`, { headers: getAuthHeader() });
      return (response.data as { data: unknown }).data;
    } catch (error) {

      return null;
    }
  },

  getUserWeeklyActivity: async (): Promise<unknown> => {
    try {
      const response = await axios.get(`${API_URL}/user-stats/weekly-activity`, { headers: getAuthHeader() });
      return (response.data as { data: unknown }).data;
    } catch (error) {

      return null;
    }
  },

  getUserGenreDistribution: async (): Promise<unknown> => {
    try {
      const response = await axios.get(`${API_URL}/user-stats/genre-distribution`, { headers: getAuthHeader() });
      return (response.data as { data: unknown }).data;
    } catch (error) {

      return null;
    }
  },

  getUserDailyViewingTime: async (): Promise<unknown> => {
    try {
      const response = await axios.get(`${API_URL}/user-stats/daily-viewing-time`, { headers: getAuthHeader() });
      return (response.data as { data: unknown }).data;
    } catch (error) {

      return null;
    }
  },

  getUserSeriesProgress: async (seriesId: string): Promise<unknown> => {
    try {
      const response = await axios.get(`${API_URL}/user-stats/series-progress/${seriesId}`, { headers: getAuthHeader() });
      return (response.data as { data: unknown }).data;
    } catch (error) {

      return null;
    }
  },

  getUserInProgressSeries: async (): Promise<unknown> => {
    try {
      const response = await axios.get(`${API_URL}/user-stats/in-progress-series`, { headers: getAuthHeader() });
      return (response.data as { data: unknown }).data;
    } catch (error) {

      return null;
    }
  },

  getUserAchievements: async (): Promise<unknown> => {
    try {
      const response = await axios.get(`${API_URL}/user-stats/achievements`, { headers: getAuthHeader() });
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
      const response = await axios.get(`${API_URL}/ratings/user`, { headers });
      const data = response.data as { success?: boolean; message?: string; data?: unknown };
      if (data.success) return data.data || null;

      return null;
    } catch (error) {

      return null;
    }
  }
};

export default statsService;
