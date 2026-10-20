/**
 * @file favoritesService.ts
 * @description Favorites API client. Maps backend movie payloads into the
 * minimal shape the UI expects.
 *
 * @section Endpoint map (verified against production on 2026-10-20)
 * The legacy `GET/POST /favorites` route does NOT exist — the backend answers
 * `404 Route not found`. The real, live routes are:
 *
 *   GET    /api/v1/users/me/favorites     → list favourites for the current user
 *   POST   /api/v1/movies/:slug/favorite  → add a movie to favourites
 *   DELETE /api/v1/movies/:slug/favorite  → remove a movie from favourites
 *
 * All three require a `Bearer` access token. Note the toggle endpoints key off
 * the movie **slug**, not its id — `useMovieDetail.ts` already calls them
 * correctly, this service now matches.
 */
import axiosInstance from '@/API/config/axiosConfig';
import { endpoints } from '@/config/API';

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

/**
 * Backend has returned favourites under several envelopes over time
 * (`data`, `favorites`, `results`, or a bare array) depending on which service
 * owns the route. Unwrap whichever one shows up so callers always get an array.
 */
const unwrapFavorites = (payload: unknown): FavoriteMovieInput[] => {
  if (Array.isArray(payload)) return payload as FavoriteMovieInput[];
  if (!payload || typeof payload !== 'object') return [];

  const record = payload as Record<string, unknown>;
  const candidates = [record.data, record.favorites, record.results, record.items];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as FavoriteMovieInput[];
    // One level deeper: { data: { favorites: [...] } }
    if (candidate && typeof candidate === 'object') {
      const nested = candidate as Record<string, unknown>;
      for (const key of ['favorites', 'movies', 'items', 'results']) {
        if (Array.isArray(nested[key])) return nested[key] as FavoriteMovieInput[];
      }
    }
  }
  return [];
};

/** Normalise the various success envelopes the toggle endpoints may return. */
const readToggleResult = (
  status: number,
  data: { success?: boolean; message?: string; data?: { exists?: boolean; alreadyExists?: boolean; isFavorite?: boolean } }
): FavoriteOpResult => {
  const ok = status === 200 || status === 201;
  return {
    success: ok && data.success !== false,
    message: data.message || (ok ? 'Cập nhật danh sách yêu thích thành công' : 'Không thể cập nhật danh sách yêu thích'),
    alreadyExists: Boolean(data.data?.exists || data.data?.alreadyExists)
  };
};

const favoritesService = {
  /**
   * Fetch every movie the signed-in user has favourited.
   * Returns `[]` for guests so callers can render an empty state without
   * branching on auth themselves.
   */
  getFavorites: async (): Promise<FavoriteMovie[]> => {
    try {
      const response = await axiosInstance.get(endpoints.favorites.getAll());
      return unwrapFavorites(response.data).map(mapFavorite);
    } catch {
      return [];
    }
  },

  /**
   * Add a movie to the user's favourites.
   * The backend keys the toggle off the slug, so callers must pass one.
   */
  addToFavorites: async (movieData: FavoriteMovieInput): Promise<FavoriteOpResult> => {
    const slug = movieData.slug;
    if (!slug) {
      return { success: false, message: 'Thiếu slug phim, không thể yêu thích', alreadyExists: false };
    }
    try {
      const response = await axiosInstance.post(endpoints.favorites.add(slug));
      return readToggleResult(response.status, response.data);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        message: err.response?.data?.message || 'Không thể thêm vào danh sách yêu thích',
        alreadyExists: false
      };
    }
  },

  /**
   * Remove a movie from the user's favourites.
   * Accepts a slug (preferred, matches the toggle route) and falls back to
   * an id when the caller only has one — the UI may key rows by id.
   */
  removeFromFavorites: async (movieIdOrSlug: string, slug?: string): Promise<FavoriteOpResult> => {
    const target = slug || movieIdOrSlug;
    if (!target) {
      return { success: false, message: 'Thiếu định danh phim, không thể xóa yêu thích' };
    }
    try {
      const response = await axiosInstance.delete(endpoints.favorites.remove(target));
      return readToggleResult(response.status, response.data);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        message: err.response?.data?.message || 'Không thể xóa khỏi danh sách yêu thích'
      };
    }
  },

  /**
   * Whether a single movie is currently favourited.
   * The list endpoint returns the whole collection, so we cache it briefly and
   * answer from the slug list instead of hitting a missing `/check` route.
   */
  checkFavoriteStatus: async (movieSlug: string): Promise<boolean> => {
    if (!movieSlug) return false;
    try {
      const response = await axiosInstance.get(endpoints.favorites.getAll());
      const list = unwrapFavorites(response.data);
      return list.some((item) => item.slug === movieSlug);
    } catch {
      return false;
    }
  },

  /**
   * Same list as `getFavorites` but via plain `fetch`.
   * Kept for callers that need to bypass the axios interceptors.
   */
  getFavoritesDirect: async (): Promise<FavoriteMovie[]> => {
    try {
      const response = await axiosInstance.get(endpoints.favorites.getAll());
      return unwrapFavorites(response.data).map(mapFavorite);
    } catch {
      return [];
    }
  }
};

export default favoritesService;