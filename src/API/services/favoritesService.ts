/**
 * @file favoritesService.ts
 * @description Favorites API client. Maps backend movie payloads into the
 * minimal shape the UI expects.
 */
import axiosInstance from '@/API/config/axiosConfig';

export interface FavoriteMovieInput {
  id?: string;
  slug?: string;
  title?: string;
  name?: string;
  origin_name?: string;
  original_title?: string;
  thumb_url?: string;
  poster_url?: string;
  thumbnail?: string;
  year?: number;
  quality?: string;
  rating?: number;
  type?: string;
  [key: string]: unknown;
}

export interface FavoriteMovie {
  id: string;
  title: string;
  original_title: string;
  slug: string;
  thumbnail: string;
  year: number;
  quality: string;
  rating: number;
  type: string;
}

export interface FavoriteOpResult {
  success: boolean;
  message: string;
  alreadyExists?: boolean;
}

const mapFavorite = (movie: FavoriteMovieInput): FavoriteMovie => {
  const movieId = (movie.id as string) || (movie._id as string) || '';
  return {
    id: movieId,
    title: movie.title || movie.name || 'Untitled',
    original_title: movie.original_title || movie.origin_name || '',
    slug: movie.slug || '',
    thumbnail: movie.thumb_url || movie.poster_url || movie.thumbnail || '',
    year: movie.year || new Date().getFullYear(),
    quality: movie.quality || 'HD',
    rating: movie.rating || 0,
    type: movie.type || 'movie'
  };
};

const favoritesService = {
  getFavorites: async (): Promise<FavoriteMovie[]> => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('auth_token') || localStorage.getItem('token')
      : null;
    if (!token) {

      return [];
    }
    try {
      const response = await axiosInstance.get('/favorites');
      if (response.status === 200) {
        const payload = response.data as { statusCode?: number; data?: FavoriteMovieInput[]; message?: string };
        if (payload.statusCode === 200) {
          return (payload.data || []).map(mapFavorite);
        }

        return [];
      }

      return [];
    } catch (error) {

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiUrl}/favorites`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          credentials: 'include'
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json() as { statusCode?: number; data?: FavoriteMovieInput[]; message?: string };
        if (data.statusCode === 200) {
          return (data.data || []).map(mapFavorite);
        }
        return [];
      } catch (fetchError) {

        return [];
      }
    }
  },

  addToFavorites: async (movieData: FavoriteMovieInput): Promise<FavoriteOpResult> => {
    try {
      const payload: Record<string, string> = {};
      if (movieData.id) payload.movieId = movieData.id;
      else if (movieData.slug) payload.movieSlug = movieData.slug;
      else throw new Error('Movie ID or slug is required');

      const response = await axiosInstance.post('/favorites', payload);
      const data = response.data as { message?: string; data?: { exists?: boolean; alreadyExists?: boolean } };
      return {
        success: response.status === 200,
        message: data.message || 'Added to favorites',
        alreadyExists: data.data?.exists || data.data?.alreadyExists || false
      };
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };

      return {
        success: false,
        message: err.response?.data?.message || 'Could not add to favorites',
        alreadyExists: false
      };
    }
  },

  removeFromFavorites: async (movieId: string): Promise<FavoriteOpResult> => {
    try {
      const response = await axiosInstance.delete(`/favorites/${movieId}`);
      const data = response.data as { success?: boolean; message?: string };
      return {
        success: response.status === 200 && Boolean(data.success),
        message: data.message || 'Removed from favorites'
      };
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };

      return {
        success: false,
        message: err.response?.data?.message || 'Could not remove from favorites'
      };
    }
  },

  checkFavoriteStatus: async (movieSlug: string): Promise<boolean> => {
    try {
      const response = await axiosInstance.get('/favorites/check', { params: { movieSlug } });
      const data = response.data as { success?: boolean; data?: { isFavorite?: boolean } };
      if (response.status === 200 && data.success) {
        return Boolean(data.data?.isFavorite);
      }
      return false;
    } catch (error) {

      return false;
    }
  },

  getFavoritesDirect: async (): Promise<FavoriteMovie[]> => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('auth_token') || localStorage.getItem('token')
      : null;
    if (!token) {

      return [];
    }
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiUrl}/favorites`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        credentials: 'include'
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json() as { success?: boolean; data?: FavoriteMovieInput[] };
      if (data.success) {
        return (data.data || []).map(mapFavorite);
      }
      return [];
    } catch (error) {

      return [];
    }
  }
};

export default favoritesService;
