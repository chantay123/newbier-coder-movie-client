/**
 * @file watchlistService.ts
 * @description Watchlist API client (a separate "to-watch" list).
 */
import authService from './authService';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface WatchlistMovieInput {
  id?: string;
  movieId?: string;
  slug?: string;
  movieSlug?: string;
  [key: string]: unknown;
}

export interface WatchlistMovie {
  id?: string;
  _id?: string;
  title?: string;
  name?: string;
  slug?: string;
  thumb_url?: string;
  poster_url?: string;
  thumbnail?: string;
  [key: string]: unknown;
}

export interface WatchlistOpResult {
  success: boolean;
  message: string;
  alreadyExists?: boolean;
}

const watchlistService = {
  getWatchlist: async (): Promise<WatchlistMovie[]> => {
    try {
      const headers = await authService.getAuthHeader();
      const response = await fetch(`${API_URL}/watchlist`, {
        headers: { ...headers, Accept: 'application/json' }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error in watchlist response:', errorData);
        throw new Error((errorData as { message?: string }).message || 'Failed to load watchlist');
      }
      const data = await response.json() as { data?: { movies?: WatchlistMovie[] }; movies?: WatchlistMovie[] };
      if (data.data?.movies) return data.data.movies;
      if (data.movies) return data.movies;
      return [];
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      return [];
    }
  },

  addToWatchlist: async (movieData: WatchlistMovieInput): Promise<WatchlistOpResult> => {
    try {
      const headers = await authService.getAuthHeader();
      const response = await fetch(`${API_URL}/watchlist/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
        body: JSON.stringify(movieData)
      });
      const data = await response.json() as { message?: string; data?: { alreadyExists?: boolean } };
      if (!response.ok) {
        return { success: false, message: data.message || 'Failed to add to watchlist' };
      }
      return {
        success: true,
        message: data.message || 'Added to watchlist',
        alreadyExists: data.data?.alreadyExists || false
      };
    } catch (error) {
      const err = error as Error;
      return { success: false, message: err.message || 'Something went wrong. Please try again.' };
    }
  },

  isInWatchlist: async (movieId: string): Promise<boolean> => {
    try {
      const headers = await authService.getAuthHeader();
      const response = await fetch(`${API_URL}/watchlist/check/${movieId}`, {
        headers: { ...headers, Accept: 'application/json' }
      });
      const data = await response.json() as { data?: { isInWatchlist?: boolean }; isInWatchlist?: boolean };
      if (!response.ok) return false;
      return Boolean(data.data?.isInWatchlist || data.isInWatchlist);
    } catch (error) {
      console.error('Error checking watchlist:', error);
      return false;
    }
  },

  removeFromWatchlist: async (movieId: string): Promise<WatchlistOpResult> => {
    try {
      const headers = await authService.getAuthHeader();
      const response = await fetch(`${API_URL}/watchlist/remove/${movieId}`, {
        method: 'DELETE',
        headers: { ...headers, Accept: 'application/json' }
      });
      const data = await response.json() as { message?: string };
      if (!response.ok) {
        return { success: false, message: data.message || 'Failed to remove from watchlist' };
      }
      return { success: true, message: data.message || 'Removed from watchlist' };
    } catch (error) {
      const err = error as Error;
      return { success: false, message: err.message || 'Something went wrong. Please try again.' };
    }
  },

  clearWatchlist: async (): Promise<WatchlistOpResult> => {
    try {
      const headers = await authService.getAuthHeader();
      const response = await fetch(`${API_URL}/watchlist/clear`, {
        method: 'DELETE',
        headers: { ...headers, Accept: 'application/json' }
      });
      const data = await response.json() as { message?: string };
      if (!response.ok) {
        return { success: false, message: data.message || 'Failed to clear watchlist' };
      }
      return { success: true, message: data.message || 'Watchlist cleared' };
    } catch (error) {
      const err = error as Error;
      return { success: false, message: err.message || 'Something went wrong. Please try again.' };
    }
  }
};

export default watchlistService;
