/**
 * @file movieViewService.ts
 * @description Records a movie view and exposes top-viewed/aggregate stats.
 */
import axiosClient from '@/API/config/axiosConfig';

const movieViewService = {
  recordMovieView: async (movieId: string): Promise<unknown> => {
    try {
      const response = await axiosClient.post('/movie-views/record', { movieId });
      return response.data;
    } catch (error) {
      console.error('Error recording movie view:', error);
      throw error;
    }
  },

  getMostViewedMovies: async (days = 1, limit = 10): Promise<unknown> => {
    try {
      const response = await axiosClient.get(`/movie-views/most-viewed?days=${days}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error getting most viewed movies:', error);
      throw error;
    }
  },

  getMovieViewStats: async (movieId: string): Promise<unknown> => {
    try {
      const response = await axiosClient.get(`/movie-views/stats/${movieId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting movie view stats:', error);
      throw error;
    }
  }
};

export default movieViewService;
