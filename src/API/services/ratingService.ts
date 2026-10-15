/**
 * @file ratingService.ts
 * @description Movie rating API client. Uses fetch (not the shared axios
 * instance) because some endpoints are public and don't need credentials.
 */
import { API_URL } from '@/config/API';

const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

const getUserId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userId');
};

const authHeader = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
});

export interface RatingServiceResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface MovieRatingStats {
  averageRating: number;
  ratingCount: number;
}

export interface UserRatingItem {
  _id: string;
  userId: string;
  movieId: string;
  movieSlug?: string;
  rating: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

const ratingService = {
  getUserRatings: async (): Promise<RatingServiceResponse<UserRatingItem[]>> => {
    const token = getAuthToken();
    const userId = getUserId();
    if (!token || !userId) {
      return { success: false, message: 'Authentication info not found', data: [] };
    }
    try {
      const res = await fetch(`${API_URL}/ratings/user/${userId}`, {
        method: 'GET',
        headers: authHeader(token)
      });
      if (!res.ok) throw new Error(`Failed to fetch user ratings: ${res.status}`);
      return await res.json() as RatingServiceResponse<UserRatingItem[]>;
    } catch (error) {

      return { success: false, message: (error as Error).message, data: [] };
    }
  },

  getUserMovieRating: async (movieSlug: string): Promise<RatingServiceResponse<{ rating: number }>> => {
    const token = getAuthToken();
    const userId = getUserId();
    if (!token || !userId) {
      return { success: false, message: 'Authentication info not found' };
    }
    try {
      const res = await fetch(`${API_URL}/ratings/user/${userId}/movie/${movieSlug}`, {
        method: 'GET',
        headers: authHeader(token)
      });
      if (res.status === 404) return { success: true, data: { rating: 0 } };
      if (!res.ok) throw new Error(`Failed to fetch user movie rating: ${res.status}`);
      return await res.json() as RatingServiceResponse<{ rating: number }>;
    } catch (error) {

      return { success: false, message: (error as Error).message, data: { rating: 0 } };
    }
  },

  createOrUpdateRating: async (movieSlug: string, rating: number): Promise<RatingServiceResponse> => {
    const token = getAuthToken();
    if (!token) return { success: false, message: 'Authentication token not found' };
    try {
      const res = await fetch(`${API_URL}/ratings`, {
        method: 'POST',
        headers: authHeader(token),
        body: JSON.stringify({ movieSlug, rating })
      });
      if (!res.ok) throw new Error(`Failed to create/update rating: ${res.status}`);
      return await res.json() as RatingServiceResponse;
    } catch (error) {

      return { success: false, message: (error as Error).message };
    }
  },

  deleteRating: async (ratingId: string): Promise<RatingServiceResponse> => {
    const token = getAuthToken();
    if (!token) return { success: false, message: 'Authentication token not found' };
    try {
      const res = await fetch(`${API_URL}/ratings/${ratingId}`, {
        method: 'DELETE',
        headers: authHeader(token)
      });
      if (!res.ok) throw new Error(`Failed to delete rating: ${res.status}`);
      return await res.json() as RatingServiceResponse;
    } catch (error) {

      return { success: false, message: (error as Error).message };
    }
  },

  getMovieRatingStats: async (movieSlug: string): Promise<RatingServiceResponse<MovieRatingStats>> => {
    try {
      const res = await fetch(`${API_URL}/ratings/stats/${movieSlug}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error(`Failed to fetch rating stats: ${res.status}`);
      return await res.json() as RatingServiceResponse<MovieRatingStats>;
    } catch (error) {

      return { success: false, message: (error as Error).message, data: { averageRating: 0, ratingCount: 0 } };
    }
  },

  getMovieRatings: async (movieId: string): Promise<RatingServiceResponse<UserRatingItem[]>> => {
    try {
      const res = await fetch(`${API_URL}/ratings/movie/${movieId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error(`Failed to fetch movie ratings: ${res.status}`);
      return await res.json() as RatingServiceResponse<UserRatingItem[]>;
    } catch (error) {

      return { success: false, message: (error as Error).message, data: [] };
    }
  }
};

export default ratingService;
