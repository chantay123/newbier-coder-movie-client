/**
 * @file historyService.ts
 * @description Watch-history API client (add/list/delete + watch-session tracking).
 */
import axiosInstance from '@/API/config/axiosConfig';

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
  return localStorage.getItem('auth_token') || localStorage.getItem('token');
};

const emptyHistory = (page: number): HistoryListResponse => ({
  total: 0, page, pages: 1, histories: []
});

const normalizeList = (raw: unknown, page: number): HistoryListResponse => {
  if (!raw || typeof raw !== 'object') return emptyHistory(page);
  const data = raw as { data?: HistoryListResponse; histories?: HistoryItem[]; total?: number; pages?: number };
  if (data.data) {
    return {
      total: data.data.total || 0,
      page: data.data.page || page,
      pages: data.data.pages || 1,
      histories: data.data.histories || []
    };
  }
  if (Array.isArray(data.histories)) {
    return {
      total: data.total || data.histories.length,
      page,
      pages: data.pages || 1,
      histories: data.histories
    };
  }
  return emptyHistory(page);
};

const historyService = {
  addToHistory: async (movieData: HistoryMovieInput): Promise<unknown> => {
    if (!getAuthToken()) throw new Error('Login required to save watch history');
    try {
      const response = await axiosInstance.post('/history', movieData);
      return response.data;
    } catch (error) {
      console.error('Error adding movie to history:', error);
      throw error;
    }
  },

  addToHistoryById: async (movieId: string, additionalData: HistoryMovieInput = {}): Promise<unknown> => {
    if (!getAuthToken()) throw new Error('Login required to save watch history');
    try {
      const response = await axiosInstance.post(`/history/${movieId}`, additionalData);
      return response.data;
    } catch (error) {
      console.error('Error adding movie to history by ID:', error);
      throw error;
    }
  },

  getUserHistory: async (limit = 10, page = 1, filter = 'all', sort = 'newest', searchQuery = ''): Promise<HistoryListResponse> => {
    if (!getAuthToken()) return { total: 0, page: 1, pages: 0, histories: [] };
    let url = `/history?limit=${limit}&page=${page}`;
    if (filter !== 'all') url += `&filter=${filter}`;
    url += `&sort=${sort}`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
    try {
      const response = await axiosInstance.get(url);
      return normalizeList(response.data, page);
    } catch (error) {
      console.error('Error fetching user history:', error);
      return { total: 0, page: 1, pages: 0, histories: [] };
    }
  },

  getUserHistoryById: async (userId: string, limit = 10, page = 1, filter = 'all', sort = 'newest'): Promise<HistoryListResponse> => {
    if (!getAuthToken()) return { total: 0, page: 1, pages: 0, histories: [] };
    const url = `/history/users/${userId}?limit=${limit}&page=${page}&filter=${filter}&sort=${sort}`;
    try {
      const response = await axiosInstance.get(url);
      return normalizeList(response.data, page);
    } catch (error) {
      console.error('Error fetching user history by ID:', error);
      return { total: 0, page: 1, pages: 0, histories: [] };
    }
  },

  deleteHistory: async (historyId: string): Promise<unknown> => {
    if (!getAuthToken()) throw new Error('Login required to delete history');
    try {
      const response = await axiosInstance.delete(`/history/${historyId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting history:', error);
      throw error;
    }
  },

  clearAllHistory: async (): Promise<unknown> => {
    if (!getAuthToken()) throw new Error('Login required to clear history');
    try {
      const response = await axiosInstance.delete('/history/clear');
      return response.data;
    } catch (error) {
      console.error('Error clearing history:', error);
      throw error;
    }
  },

  startWatchSession: async (data: WatchSessionStartData): Promise<unknown> => {
    if (!getAuthToken()) throw new Error('Login required to track watch time');
    try {
      const response = await axiosInstance.post('/history/watch-session/start', data);
      return response.data;
    } catch (error) {
      console.error('Error starting watch session:', error);
      throw error;
    }
  },

  endWatchSession: async (data: WatchSessionStartData): Promise<unknown> => {
    if (!getAuthToken()) throw new Error('Login required to track watch time');
    try {
      const response = await axiosInstance.post('/history/watch-session/end', data);
      return response.data;
    } catch (error) {
      console.error('Error ending watch session:', error);
      throw error;
    }
  },

  updateWatchPosition: async (data: WatchPositionData): Promise<unknown> => {
    if (!getAuthToken()) throw new Error('Login required to update watch position');
    try {
      const response = await axiosInstance.put('/history/watch-session/update', data);
      return response.data;
    } catch (error) {
      console.error('Error updating watch position:', error);
      throw error;
    }
  },

  getTotalWatchTime: async (): Promise<TotalWatchTime> => {
    if (!getAuthToken()) {
      throw new Error('Login required to view stats');
    }
    try {
      const response = await axiosInstance.get('/history/total-watch-time');
      return (response.data as { data: TotalWatchTime }).data;
    } catch (error) {
      console.error('Error getting total watch time:', error);
      return {
        totalWatchTimeSeconds: 0,
        totalWatchTimeFormatted: '0h 0m 0s',
        totalWatchTimeHours: 0,
        totalWatchTimeMinutes: 0,
        totalMoviesWatched: 0,
        totalSeriesWatched: 0,
        totalMoviesCompleted: 0
      };
    }
  }
};

export default historyService;
