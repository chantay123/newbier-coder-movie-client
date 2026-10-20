/**
 * @file useMovieStore.ts
 * @description Zustand store cho movie data — cache trong localStorage để:
 * 1. Không gọi lại API khi user quay lại trang đã xem
 * 2. Chia sẻ data giữa các component (MovieCard, MovieDetail, HomeRails...)
 *
 * Cache strategy: localStorage + in-memory Map
 * - Đọc từ localStorage khi store khởi tạo ( hydration )
 * - Ghi vào localStorage mỗi khi data thay đổi
 * - TTL: 5 phút cho movie detail (vì phim hay thay đổi)
 * - TTL: 2 phút cho homepage movies (vì ranking thay đổi thường xuyên)
 */

import { create } from 'zustand';

// ============================================================
// TYPES
// ============================================================

/** Thông tin phim đã normalize (từ useMovieDetail.normalizeMovieDetail) */
export interface CachedMovieDetail {
  _id: string;
  slug: string;
  name: string;
  poster_url: string;
  thumb_url: string;
  backdrop_url: string;
  year: number | string;
  quality: string;
  type: string;
  content: string;
  rating: number;
  ratingCount: number;
  view: number;
  trailer_url: string;
  episodes?: unknown[];
  category?: unknown[];
  country?: { name: string; slug: string }[];
  [key: string]: unknown;
}

/** Movie item cho homepage rails */
export interface CachedMovieItem {
  _id: string;
  slug: string;
  name: string;
  poster_url: string;
  thumb_url: string;
  year?: number | string;
  quality?: string;
  type?: string;
  rating?: number;
  view?: number;
  [key: string]: unknown;
}

/** Cache entry với timestamp */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/** Homepage cache theo section key */
interface HomeCacheEntry {
  movies: CachedMovieItem[];
  timestamp: number;
}

// ============================================================
// STORE STATE
// ============================================================

interface MovieStoreState {
  // ---- Movie Detail Cache ----
  /** Cache movie chi tiết theo slug, có TTL 5 phút */
  movieCache: Record<string, CacheEntry<CachedMovieDetail>>;

  // ---- Related Movies Cache ----
  /** Cache phim liên quan theo movie slug */
  relatedCache: Record<string, CacheEntry<CachedMovieItem[]>>;

  // ---- Homepage Movies Cache ----
  /** Cache movies theo section key: 'hero' | 'top10' | 'latest' | 'bigSlide' */
  homeCache: Record<string, HomeCacheEntry>;

  // ---- Loading states ----
  isLoadingMovie: Record<string, boolean>;
  isLoadingRelated: Record<string, boolean>;
  isLoadingHome: Record<string, boolean>;

  // ---- Error states ----
  movieError: Record<string, string | null>;
  homeError: Record<string, string | null>;
}

// ============================================================
// STORE ACTIONS
// ============================================================

interface MovieStoreActions {
  // --- Movie Detail ---
  /** Lấy movie từ cache (null nếu hết hạn hoặc chưa có) */
  getCachedMovie: (slug: string) => CachedMovieDetail | null;

  /** Set movie vào cache */
  setCachedMovie: (slug: string, movie: CachedMovieDetail) => void;

  /** Xóa movie khỏi cache */
  invalidateMovie: (slug: string) => void;

  // --- Related Movies ---
  getCachedRelated: (slug: string) => CachedMovieItem[] | null;
  setCachedRelated: (slug: string, related: CachedMovieItem[]) => void;

  // --- Homepage ---
  getCachedHomeMovies: (section: string) => CachedMovieItem[] | null;
  setCachedHomeMovies: (section: string, movies: CachedMovieItem[]) => void;

  // --- Loading ---
  setLoadingMovie: (slug: string, loading: boolean) => void;
  setLoadingRelated: (slug: string, loading: boolean) => void;
  setLoadingHome: (section: string, loading: boolean) => void;

  // --- Error ---
  setMovieError: (slug: string, error: string | null) => void;
  setHomeError: (section: string, error: string | null) => void;

  // --- Utility ---
  clearExpiredCache: () => void;
  clearAllCache: () => void;
}

// ============================================================
// CONSTANTS
// ============================================================

/** TTL cho movie detail: 5 phút */
const MOVIE_DETAIL_TTL_MS = 5 * 60 * 1000;

/** TTL cho homepage movies: chỉ dùng trong bộ nhớ, không persist */
const HOME_MOVIES_TTL_MS = 2 * 60 * 1000;

/** Kiểm tra cache có hết hạn không */
const isExpired = (timestamp: number, ttlMs: number): boolean => {
  return Date.now() - timestamp > ttlMs;
};

// ============================================================
// STORE
// ============================================================

// Homepage cache KHÔNG persist vì:
// 1. localStorage read đồng bộ → chặn initial render
// 2. Homepage data thay đổi thường xuyên → persist không cần thiết
// 3. User quay lại trang → data vẫn được cache trong component state

export const useMovieStore = create<MovieStoreState & MovieStoreActions>()(
  (set, get) => ({
      // ---- Initial State ----
      movieCache: {},
      relatedCache: {},
      homeCache: {},
      isLoadingMovie: {},
      isLoadingRelated: {},
      isLoadingHome: {},
      movieError: {},
      homeError: {},

      // ============================================================
      // MOVIE DETAIL
      // ============================================================

      getCachedMovie: (slug: string): CachedMovieDetail | null => {
        const entry = get().movieCache[slug];
        if (!entry) return null;
        if (isExpired(entry.timestamp, MOVIE_DETAIL_TTL_MS)) {
          // Hết hạn → xóa
          set((state) => {
            const { [slug]: _, ...rest } = state.movieCache;
            return { movieCache: rest };
          });
          return null;
        }
        return entry.data;
      },

      setCachedMovie: (slug: string, movie: CachedMovieDetail): void => {
        set((state) => ({
          movieCache: {
            ...state.movieCache,
            [slug]: { data: movie, timestamp: Date.now() }
          }
        }));
      },

      invalidateMovie: (slug: string): void => {
        set((state) => {
          const { [slug]: _, ...rest } = state.movieCache;
          return { movieCache: rest };
        });
      },

      // ============================================================
      // RELATED MOVIES
      // ============================================================

      getCachedRelated: (slug: string): CachedMovieItem[] | null => {
        const entry = get().relatedCache[slug];
        if (!entry) return null;
        if (isExpired(entry.timestamp, MOVIE_DETAIL_TTL_MS)) {
          set((state) => {
            const { [slug]: _, ...rest } = state.relatedCache;
            return { relatedCache: rest };
          });
          return null;
        }
        return entry.data;
      },

      setCachedRelated: (slug: string, related: CachedMovieItem[]): void => {
        set((state) => ({
          relatedCache: {
            ...state.relatedCache,
            [slug]: { data: related, timestamp: Date.now() }
          }
        }));
      },

      // ============================================================
      // HOMEPAGE MOVIES
      // ============================================================

      getCachedHomeMovies: (section: string): CachedMovieItem[] | null => {
        const entry = get().homeCache[section];
        if (!entry) return null;
        if (isExpired(entry.timestamp, HOME_MOVIES_TTL_MS)) {
          set((state) => {
            const { [section]: _, ...rest } = state.homeCache;
            return { homeCache: rest };
          });
          return null;
        }
        return entry.movies;
      },

      setCachedHomeMovies: (section: string, movies: CachedMovieItem[]): void => {
        set((state) => ({
          homeCache: {
            ...state.homeCache,
            [section]: { movies, timestamp: Date.now() }
          }
        }));
      },

      // ============================================================
      // LOADING STATES
      // ============================================================

      setLoadingMovie: (slug: string, loading: boolean): void => {
        set((state) => ({
          isLoadingMovie: {
            ...state.isLoadingMovie,
            [slug]: loading
          }
        }));
      },

      setLoadingRelated: (slug: string, loading: boolean): void => {
        set((state) => ({
          isLoadingRelated: {
            ...state.isLoadingRelated,
            [slug]: loading
          }
        }));
      },

      setLoadingHome: (section: string, loading: boolean): void => {
        set((state) => ({
          isLoadingHome: {
            ...state.isLoadingHome,
            [section]: loading
          }
        }));
      },

      // ============================================================
      // ERROR STATES
      // ============================================================

      setMovieError: (slug: string, error: string | null): void => {
        set((state) => ({
          movieError: {
            ...state.movieError,
            [slug]: error
          }
        }));
      },

      setHomeError: (section: string, error: string | null): void => {
        set((state) => ({
          homeError: {
            ...state.homeError,
            [section]: error
          }
        }));
      },

      // ============================================================
      // UTILITY
      // ============================================================

      /** Xóa cache hết hạn (gọi định kỳ hoặc khi cần) */
      clearExpiredCache: (): void => {
        const now = Date.now();

        set((state) => {
          // Filter movieCache
          const movieCache = Object.fromEntries(
            Object.entries(state.movieCache).filter(
              ([, entry]) => !isExpired(entry.timestamp, MOVIE_DETAIL_TTL_MS)
            )
          );

          // Filter relatedCache
          const relatedCache = Object.fromEntries(
            Object.entries(state.relatedCache).filter(
              ([, entry]) => !isExpired(entry.timestamp, MOVIE_DETAIL_TTL_MS)
            )
          );

          // Filter homeCache
          const homeCache = Object.fromEntries(
            Object.entries(state.homeCache).filter(
              ([, entry]) => !isExpired(entry.timestamp, HOME_MOVIES_TTL_MS)
            )
          );

          return { movieCache, relatedCache, homeCache };
        });
      },

      /** Xóa toàn bộ cache */
      clearAllCache: (): void => {
        set({
          movieCache: {},
          relatedCache: {},
          homeCache: {},
          movieError: {},
          homeError: {}
        });
      }
    })
);

export default useMovieStore;
