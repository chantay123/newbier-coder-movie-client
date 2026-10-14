/**
 * @file userStatsService.ts
 * @description Per-user stats helpers (used by profile / dashboard).
 */
import axiosInstance from '@/API/config/axiosConfig';

export interface UserWatchTime {
  hours: number;
  minutes: number;
  displayText: string;
}

export interface UserWatchStats {
  totalWatchedMovies: number;
  totalWatchedSeries: number;
  totalWatchTime: UserWatchTime;
  favoriteGenres: { name: string; count: number }[];
  recentHistory: unknown[];
}

export type WeeklyActivity = Record<string, number>;

export type GenreDistribution = { name: string; count: number }[];

const emptyWatchStats: UserWatchStats = {
  totalWatchedMovies: 0,
  totalWatchedSeries: 0,
  totalWatchTime: { hours: 0, minutes: 0, displayText: '0h 0m' },
  favoriteGenres: [],
  recentHistory: []
};

const emptyWeek: WeeklyActivity = {
  Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0
};

export const getUserWatchStats = async (): Promise<UserWatchStats> => {
  try {
    const response = await axiosInstance.get('/api/user-stats/watch-stats');
    const data = (response.data as { data?: UserWatchStats }).data;
    return data || emptyWatchStats;
  } catch (error) {
    console.error('Error fetching user watch stats:', error);
    return emptyWatchStats;
  }
};

export const getUserActivityByWeek = async (): Promise<WeeklyActivity> => {
  try {
    const response = await axiosInstance.get('/api/user-stats/activity-week');
    const data = (response.data as { data?: WeeklyActivity }).data;
    return data || emptyWeek;
  } catch (error) {
    console.error('Error fetching user activity by week:', error);
    return emptyWeek;
  }
};

export const getUserGenreDistribution = async (): Promise<GenreDistribution> => {
  try {
    const response = await axiosInstance.get('/api/user-stats/genre-distribution');
    const data = (response.data as { data?: GenreDistribution }).data;
    return data || [];
  } catch (error) {
    console.error('Error fetching user genre distribution:', error);
    return [];
  }
};
