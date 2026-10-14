/**
 * @file searchHistoryService.ts
 * @description Per-user search history (saved queries + filters).
 */
import axiosInstance from '@/API/config/axiosConfig';

export interface SearchHistoryFilters {
  [key: string]: unknown;
}

export interface SearchHistoryItem {
  id?: string;
  _id?: string;
  query: string;
  filters?: SearchHistoryFilters;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface SearchHistoryResult {
  success: boolean;
  searchHistory?: SearchHistoryItem[];
  savedItem?: SearchHistoryItem;
  message?: string;
  error?: unknown;
}

const searchHistoryService = {
  saveSearchHistory: async (query: string, filters: SearchHistoryFilters = {}): Promise<unknown> => {
    try {
      const response = await axiosInstance.post('/search-history', { query, filters });
      const data = response.data as { success?: boolean; savedItem?: SearchHistoryItem; data?: SearchHistoryItem; message?: string };
      if (data?.success) {
        return {
          success: true,
          savedItem: data.savedItem || data.data,
          message: data.message
        } as SearchHistoryResult;
      }
      return response.data;
    } catch (error) {
      console.error('Error saving search history:', error);
      const err = error as { response?: { data?: unknown }; message?: string };
      return { success: false, error: err.response?.data || err.message };
    }
  },

  getSearchHistory: async (limit = 8): Promise<SearchHistoryResult> => {
    try {
      const response = await axiosInstance.get(`/search-history?limit=${limit}`);
      const data = response.data as { success?: boolean; data?: { searchHistory?: SearchHistoryItem[] } };
      if (data?.success) {
        return {
          success: true,
          searchHistory: data.data?.searchHistory || []
        };
      }
      return { success: false, searchHistory: [] };
    } catch (error) {
      console.error('Error fetching search history:', error);
      return { success: false, searchHistory: [] };
    }
  },

  deleteSearchHistoryItem: async (id: string): Promise<unknown> => {
    try {
      const response = await axiosInstance.delete(`/search-history/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting search history item:', error);
      const err = error as { response?: { data?: unknown }; message?: string };
      return { success: false, error: err.response?.data || err.message };
    }
  },

  clearSearchHistory: async (): Promise<unknown> => {
    try {
      const response = await axiosInstance.delete('/search-history');
      return response.data;
    } catch (error) {
      console.error('Error clearing search history:', error);
      const err = error as { response?: { data?: unknown }; message?: string };
      return { success: false, error: err.response?.data || err.message };
    }
  }
};

export default searchHistoryService;
