/**
 * @file searchSuggestionService.ts
 * @description Auto-complete suggestions endpoint for the search box.
 */
import axiosInstance from '@/API/config/axiosConfig';

export interface SuggestionResult {
  success: boolean;
  suggestions: string[];
  error?: unknown;
}

const searchSuggestionService = {
  getSuggestions: async (query: string, limit = 5): Promise<SuggestionResult> => {
    if (!query || query.trim().length < 2) {
      return { success: true, suggestions: [] };
    }
    try {
      const response = await axiosInstance.get(
        `/search/suggestions?q=${encodeURIComponent(query.trim())}&limit=${limit}`
      );
      const data = response.data as { success?: boolean; suggestions?: string[] };
      if (data?.success) {
        return { success: true, suggestions: data.suggestions || [] };
      }
      return { success: false, suggestions: [] };
    } catch (error) {

      const err = error as { response?: { data?: unknown }; message?: string };
      return { success: false, suggestions: [], error: err.response?.data || err.message };
    }
  }
};

export default searchSuggestionService;
