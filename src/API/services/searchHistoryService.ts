/**
 * @file searchHistoryService.ts
 * @description Per-user search history (saved queries + filters).
 */
import axiosInstance from '@/API/config/axiosConfig';
import { apiPath } from '@/config/apiPaths';

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
      const response = await axiosInstance.post(apiPath(`searchHistoryList`), { query, filters });
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

      const err = error as { response?: { data?: unknown }; message?: string };
      return { success: false, error: err.response?.data || err.message };
    }
  },

  getSearchHistory: async (limit = 8): Promise<SearchHistoryResult> => {
    try {
      const response = await axiosInstance.get(apiPath(`searchHistoryList`) + `?limit=${limit}`);
      const data = response.data as { success?: boolean; data?: { searchHistory?: SearchHistoryItem[] } };
      if (data?.success) {
        return {
          success: true,
          searchHistory: data.data?.searchHistory || []
        };
      }
      return { success: false, searchHistory: [] };
    } catch (error) {

      return { success: false, searchHistory: [] };
    }
  },

  deleteSearchHistoryItem: async (id: string): Promise<unknown> => {
    try {
      const response = await axiosInstance.delete(apiPath(`searchHistoryById`, id));
      return response.data;
    } catch (error) {

      const err = error as { response?: { data?: unknown }; message?: string };
      return { success: false, error: err.response?.data || err.message };
    }
  },

  clearSearchHistory: async (): Promise<unknown> => {
    try {
      const response = await axiosInstance.delete(apiPath(`searchHistoryList`));
      return response.data;
    } catch (error) {

      const err = error as { response?: { data?: unknown }; message?: string };
      return { success: false, error: err.response?.data || err.message };
    }
  }
};

export default searchHistoryService;
