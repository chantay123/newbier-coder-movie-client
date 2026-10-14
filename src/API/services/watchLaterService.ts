/**
 * @file watchLaterService.ts
 * @description "Watch later" (a.k.a. save-for-later) list API client.
 */
import axiosInstance from '@/API/config/axiosConfig';

interface WatchLaterMovieRecord {
  _id?: string;
  id?: string;
  slug?: string;
  name?: string;
  origin_name?: string;
  original_title?: string;
  thumb_url?: string;
  poster_url?: string;
  year?: number | string;
  quality?: string;
  lang?: string;
  type?: string;
  tmdb?: { type?: string; id?: string };
  imdb?: { id?: string };
  modified?: { time?: string };
  createdAt?: string;
}

const mapMovie = (item: WatchLaterMovieRecord): WatchLaterMovieInput => {
  const tmdbId = item.tmdb?.id ?? '';
  const rawYear = item.year;
  const yearNum = typeof rawYear === 'number' ? rawYear : (typeof rawYear === 'string' ? Number(rawYear) : undefined);
  return {
    id: item._id ?? item.id ?? '',
    slug: item.slug ?? '',
    title: item.name ?? '',
    name: item.name ?? '',
    origin_name: item.origin_name ?? '',
    original_title: item.original_title ?? '',
    thumb_url: item.thumb_url ?? '',
    poster_url: item.poster_url ?? '',
    year: Number.isFinite(yearNum) ? yearNum : undefined,
    quality: item.quality ?? '',
    lang: item.lang ?? '',
    type: item.tmdb?.type ?? item.type ?? '',
    tmdb: { type: item.tmdb?.type ?? item.type ?? '', id: tmdbId },
    imdb: { id: item.imdb?.id ?? '' },
    modified: { time: item.modified?.time ?? item.createdAt ?? '' }
  };
};

export interface WatchLaterMovieInput {
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

export interface WatchLaterMovie {
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

export interface WatchLaterOpResult {
  success: boolean;
  message: string;
  alreadyExists?: boolean;
}

const mapWatchLater = (movie: WatchLaterMovieInput): WatchLaterMovie => {
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

const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token') || localStorage.getItem('token');
};

const watchLaterService = {
  getWatchLaterList: async (): Promise<WatchLaterMovie[]> => {
    const token = getAuthToken();
    if (!token) {
      console.error('[SERVICE] No auth token. Cannot call watch-later list API.');
      return [];
    }
    try {
      const response = await axiosInstance.get('/watchlater');
      if (response.status === 200) {
        const payload = response.data as { statusCode?: number; data?: WatchLaterMovieInput[]; message?: string };
        if (payload.statusCode === 200) {
          return (payload.data || []).map(mapMovie) as unknown as WatchLaterMovie[];
        }
        return [];
      }
      return [];
    } catch (error) {
      console.error('[SERVICE] Failed to fetch watch-later list:', error);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiUrl}/watchlater`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          credentials: 'include'
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json() as { statusCode?: number; data?: WatchLaterMovieInput[] };
        if (data.statusCode === 200) {
          return (data.data || []).map(mapMovie) as unknown as WatchLaterMovie[];
        }
        return [];
      } catch (fetchError) {
        console.error('[SERVICE] Both methods failed:', fetchError);
        return [];
      }
    }
  },

  addToWatchLater: async (movieData: WatchLaterMovieInput): Promise<WatchLaterOpResult> => {
    try {
      const payload: Record<string, string> = {};
      if (movieData.id) payload.movieId = movieData.id;
      else if (movieData.slug) payload.movieSlug = movieData.slug;
      else throw new Error('Movie ID or slug is required');

      const response = await axiosInstance.post('/watchlater', payload);
      const data = response.data as { message?: string; data?: { exists?: boolean; alreadyExists?: boolean } };
      return {
        success: response.status === 200,
        message: data.message || 'Added to watch-later list',
        alreadyExists: data.data?.exists || data.data?.alreadyExists || false
      };
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        message: err.response?.data?.message || 'Could not add to watch-later list',
        alreadyExists: false
      };
    }
  },

  removeFromWatchLater: async (movieId: string): Promise<WatchLaterOpResult> => {
    try {
      const response = await axiosInstance.delete(`/watchlater/${movieId}`);
      const data = response.data as { success?: boolean; message?: string };
      return {
        success: response.status === 200 && Boolean(data.success),
        message: data.message || 'Removed from watch-later list'
      };
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        message: err.response?.data?.message || 'Could not remove from watch-later list'
      };
    }
  },

  checkWatchLaterStatus: async (movieSlug: string): Promise<boolean> => {
    try {
      const response = await axiosInstance.get('/watchlater/check', { params: { movieSlug } });
      const data = response.data as { success?: boolean; data?: { isInWatchLater?: boolean } };
      if (response.status === 200 && data.success) {
        return Boolean(data.data?.isInWatchLater);
      }
      return false;
    } catch (error) {
      console.error('Check watch-later status failed:', error);
      return false;
    }
  },

  getWatchLaterListDirect: async (): Promise<WatchLaterMovie[]> => {
    const token = getAuthToken();
    if (!token) {
      console.error('No auth token. Cannot call watch-later list API.');
      return [];
    }
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiUrl}/watchlater`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        credentials: 'include'
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json() as { success?: boolean; data?: WatchLaterMovieInput[] };
      if (data.success) return (data.data || []).map(mapMovie) as unknown as WatchLaterMovie[];
      return [];
    } catch (error) {
      console.error('Direct watch-later fetch failed:', error);
      return [];
    }
  }
};

export default watchLaterService;
