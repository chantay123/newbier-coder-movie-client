/**
 * userStatsService.ts
 *
 * Per-user stats helpers (used by profile / dashboard).
 */
import axiosInstance from '@/API/config/axiosConfig';
import { apiPath } from '@/config/apiPaths';

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
    // NOTE: `axiosInstance` already has a base URL that ends with `/api/v1`.
    // The calls below used to use '/api/user-stats/...', so the real request
    // was `/api/v1/api/user-stats/...` and answered 404 "Route not found".
    const response = await axiosInstance.get(apiPath(`userStatsWatch`));
    const data = (response.data as { data?: UserWatchStats }).data;
    return data || emptyWatchStats;
  } catch (error) {

    return emptyWatchStats;
  }
};

export const getUserActivityByWeek = async (): Promise<WeeklyActivity> => {
  try {
    const response = await axiosInstance.get(apiPath(`userStatsActivityWeek`));
    const data = (response.data as { data?: WeeklyActivity }).data;
    return data || emptyWeek;
  } catch (error) {

    return emptyWeek;
  }
};

export const getUserGenreDistribution = async (): Promise<GenreDistribution> => {
  try {
    const response = await axiosInstance.get(apiPath(`userStatsGenreDistribution`));
    const data = (response.data as { data?: GenreDistribution }).data;
    return data || [];
  } catch (error) {

    return [];
  }
};
