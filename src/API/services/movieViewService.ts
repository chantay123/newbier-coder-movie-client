/**
 * @file movieViewService.ts
 * @description Records a movie view and exposes top-viewed/aggregate stats.
 *
 * The real endpoint paths never reach the client bundle: the calls use the
 * OPAQUE TOKENS of the endpoints, and the proxy resolves them server-side.
 */
import axiosClient from '@/API/config/axiosConfig';
import { apiRoute, withQuery } from '@/config/apiRoutes';

const movieViewService = {
  recordMovieView: async (movieId: string): Promise<unknown> => {
    try {
      const response = await axiosClient.post(apiRoute('movieViewsRecord'), { movieId });
      return response.data;
    } catch (error) {

      throw error;
    }
  },

  getMostViewedMovies: async (days = 1, limit = 10): Promise<unknown> => {
    try {
      const url = withQuery(apiRoute('movieViewsMostViewed'), { days, limit });
      const response = await axiosClient.get(url);
      return response.data;
    } catch (error) {

      throw error;
    }
  },

  getMovieViewStats: async (movieId: string): Promise<unknown> => {
    try {
      const response = await axiosClient.get(apiRoute('movieViewsStats', movieId));
      return response.data;
    } catch (error) {

      throw error;
    }
  }
};

export default movieViewService;
