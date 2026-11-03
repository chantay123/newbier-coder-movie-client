/**
 * @file historyService.ts
 * @description Watch-history API client (add/list/delete).
 *
 * @section Endpoint map (verified against production on 2026-10-20)
 * The legacy `/history/*` routes do NOT exist — the backend answers
 * `404 Route not found`. The real, live routes are all under `/users/me`:
 *
 *   GET    /api/v1/users/me/history       → list watch history (paged)
 *   POST   /api/v1/users/me/history       → record / update a watch entry
 *   DELETE /api/v1/users/me/history/:id   → remove one entry
 *   DELETE /api/v1/users/me/history       → clear the whole history
 *
 * All require a `Bearer` access token. There is no watch-session or
 * total-watch-time route on the deployed backend, so those helpers degrade to
 * no-ops instead of firing requests that would 404.
 */
import axiosInstance from '@/API/config/axiosConfig';
import { endpoints } from '@/config/API';
import { getStoredAccessToken } from './authService';

export interface HistoryMovieInput {
  id?: string;
  movieId?: string;
  slug?: string;
  movieSlug?: string;
  name?: string;
  movieName?: string;
  thumb_url?: string;
  poster_url?: string;
  thumbnail?: string;
  episodeName?: string;
  serverIndex?: number;
  episodeIndex?: number;
  [key: string]: unknown;
}

export interface HistoryItem {
  id?: string;
  _id?: string;
  movieId?: string;
  movieSlug?: string;
  name?: string;
  thumb_url?: string;
  poster_url?: string;
  thumbnail?: string;
  episodeName?: string;
  serverIndex?: number;
  episodeIndex?: number;
  watchedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface HistoryListResponse {
  total: number;
  page: number;
  pages: number;
  histories: HistoryItem[];
}

export interface WatchSessionStartData {
  movieId?: string;
  movieSlug?: string;
  episodeName?: string;
  serverIndex?: number;
  episodeIndex?: number;
  [key: string]: unknown;
}

export interface WatchPositionData {
  sessionId?: string;
  currentTime?: number;
  duration?: number;
  [key: string]: unknown;
}

export interface TotalWatchTime {
  totalWatchTimeSeconds: number;
  totalWatchTimeFormatted: string;
  totalWatchTimeHours: number;
  totalWatchTimeMinutes: number;
  totalMoviesWatched: number;
  totalSeriesWatched: number;
  totalMoviesCompleted: number;
}

const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return getStoredAccessToken();
};

const emptyHistory = (page: number): HistoryListResponse => ({
  total: 0, page, pages: 1, histories: []
});

const emptyList = (): HistoryListResponse => ({ total: 0, page: 1, pages: 0, histories: [] });

const emptyWatchTime = (): TotalWatchTime => ({
  totalWatchTimeSeconds: 0,
  totalWatchTimeFormatted: '0h 0m 0s',
  totalWatchTimeHours: 0,
  totalWatchTimeMinutes: 0,
  totalMoviesWatched: 0,
  totalSeriesWatched: 0,
  totalMoviesCompleted: 0
});

/**
 * Pull the array of history rows out of whichever envelope the backend used.
 * Deploys have shipped this as `{ data: {...} }`, `{ data: [...] }`,
 * `{ histories: [...] }`, and a bare array — accept all of them.
 */
const extractRows = (raw: unknown): HistoryItem[] => {
  if (Array.isArray(raw)) return raw as HistoryItem[];
  if (!raw || typeof raw !== 'object') return [];

  const record = raw as Record<string, unknown>;
  for (const key of ['histories', 'history', 'items', 'results', 'movies']) {
    if (Array.isArray(record[key])) return record[key] as HistoryItem[];
  }
  const nested = record.data;
  if (Array.isArray(nested)) return nested as HistoryItem[];
  if (nested && typeof nested === 'object') return extractRows(nested);
  return [];
};

const normalizeList = (raw: unknown, page: number): HistoryListResponse => {
  const rows = extractRows(raw);
  if (rows.length === 0) {
    // Preserve server-reported totals for the empty case (e.g. total: 0, pages: 1)
    const meta = (raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}) as Record<string, unknown>;
    const nestedMeta = (meta.data && typeof meta.data === 'object' ? meta.data : meta) as Record<string, unknown>;
    return {
      total: typeof nestedMeta.total === 'number' ? nestedMeta.total : 0,
      page: typeof nestedMeta.page === 'number' ? nestedMeta.page : page,
      pages: typeof nestedMeta.pages === 'number' ? nestedMeta.pages : (nestedMeta.total === 0 ? 1 : 0),
      histories: []
    };
  }

  const meta = (raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}) as Record<string, unknown>;
  const nestedMeta = (meta.data && typeof meta.data === 'object' ? meta.data : meta) as Record<string, unknown>;
  return {
    total: typeof nestedMeta.total === 'number' ? nestedMeta.total : rows.length,
    page: typeof nestedMeta.page === 'number' ? nestedMeta.page : page,
    pages: typeof nestedMeta.pages === 'number' ? nestedMeta.pages : 1,
    histories: rows
  };
};

const historyService = {
  /** Record (or refresh) a watch entry for the signed-in user. */
  addToHistory: async (movieData: HistoryMovieInput): Promise<unknown> => {
    if (!getAuthToken()) throw new Error('Login required to save watch history');
    try {
      const response = await axiosInstance.post(endpoints.history.add(), movieData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Same as `addToHistory` — the deployed backend only accepts the collection
   * route and keys the entry off the movie slug/id in the body, so there is no
   * per-movie URL to hit.
   */
  addToHistoryById: async (movieId: string, additionalData: HistoryMovieInput = {}): Promise<unknown> => {
    if (!getAuthToken()) throw new Error('Login required to save watch history');
    try {
      const payload: HistoryMovieInput = { movieId, ...additionalData };
      const response = await axiosInstance.post(endpoints.history.addById(movieId), payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /** Paged watch history for the signed-in user. */
  getUserHistory: async (limit = 10, page = 1, filter = 'all', sort = 'newest', searchQuery = ''): Promise<HistoryListResponse> => {
    if (!getAuthToken()) return emptyList();
    let url = endpoints.history.getAll(limit, page);
    if (filter !== 'all') url += `&filter=${encodeURIComponent(filter)}`;
    url += `&sort=${encodeURIComponent(sort)}`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
    try {
      const response = await axiosInstance.get(url);
      return normalizeList(response.data, page);
    } catch (error) {
      return emptyList();
    }
  },

  /** Watch history for an arbitrary user id (admin / profile views). */
  getUserHistoryById: async (userId: string, limit = 10, page = 1, filter = 'all', sort = 'newest'): Promise<HistoryListResponse> => {
    if (!getAuthToken()) return emptyList();
    const url = `${endpoints.history.getUserHistory(userId, limit, page)}&filter=${encodeURIComponent(filter)}&sort=${encodeURIComponent(sort)}`;
    try {
      const response = await axiosInstance.get(url);
      return normalizeList(response.data, page);
    } catch (error) {
      return emptyList();
    }
  },

  /** Remove a single history entry by its id. */
  deleteHistory: async (historyId: string): Promise<unknown> => {
    if (!getAuthToken()) throw new Error('Login required to delete history');
    try {
      const response = await axiosInstance.delete(endpoints.history.delete(historyId));
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /** Wipe the signed-in user's entire watch history. */
  clearAllHistory: async (): Promise<unknown> => {
    if (!getAuthToken()) throw new Error('Login required to clear history');
    try {
      const response = await axiosInstance.delete(endpoints.history.clear());
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ---- Watch-session tracking -------------------------------------------------
  // The deployed backend exposes no `/history/watch-session/*` routes (all 404),
  // so these resolve to a resolved no-op rather than a request that would fail.

  startWatchSession: async (_data: WatchSessionStartData): Promise<null> => null,

  endWatchSession: async (_data: WatchSessionStartData): Promise<null> => null,

  updateWatchPosition: async (_data: WatchPositionData): Promise<null> => null,

  /** No totals route on the deployed backend — returns zeros instead of throwing. */
  getTotalWatchTime: async (): Promise<TotalWatchTime> => {
    if (!getAuthToken()) throw new Error('Login required to view stats');
    return emptyWatchTime();
  }
};

export default historyService;