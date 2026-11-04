
/**
 * @file useMovieStore.ts
 * @description The Zustand store that caches the movie data of the client.
 *
 * WHY THE CACHE EXISTS
 * The API is called again every time the user comes back to a page, and
 * every component (MovieCard, MovieDetail, the home rails...) would ask for
 * its own copy of the same data. The store keeps one copy in memory, so:
 * 1. the backend is called less often;
 * 2. every component reads the same data.
 *
 * THE CACHE IS IN MEMORY ONLY
 * The entries are NOT written to `localStorage`, because reading the Web
 * Storage is synchronous and it blocks the first render of the page.
 *
 * THE LIFETIME OF AN ENTRY
 * - A movie detail lives 5 minutes, because a movie changes often.
 * - The movies of the home page live 2 minutes, because the ranking of the
 *   home page changes often.
 */

import { create } from 'zustand';

/**
 * A movie that was already normalized by `useMovieDetail.normalizeMovieDetail`.
 */
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

/** A movie item used by the home page rails. */
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

/** A cache entry with the moment it was written. */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/** The home page cache, one entry per section key. */
interface HomeCacheEntry {
  movies: CachedMovieItem[];
  timestamp: number;
}

// ============================================================
// STORE STATE
// ============================================================

interface MovieStoreState {
  // ---- Movie detail cache ----
  /** The cached movie details, by slug, with a 5 minute TTL. */
  movieCache: Record<string, CacheEntry<CachedMovieDetail>>;

  // ---- Related movies cache ----
  /** The cached related movies, by movie slug. */
  relatedCache: Record<string, CacheEntry<CachedMovieItem[]>>;

  // ---- Home page movies cache ----
  /** The cached movies, by section key: 'hero' | 'top10' | 'latest' | 'bigSlide'. */
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
  // --- Movie detail ---
  /**
   * Reads a movie from the cache.
   *
   * @param slug - The slug of the movie.
   * @returns The cached movie, or `null` when it is missing or expired.
   */
  getCachedMovie: (slug: string) => CachedMovieDetail | null;

  /** Saves a movie in the cache. */
  setCachedMovie: (slug: string, movie: CachedMovieDetail) => void;

  /** Removes a movie from the cache. */
  invalidateMovie: (slug: string) => void;

  // --- Related movies ---
  /** Reads the related movies from the cache. */
  getCachedRelated: (slug: string) => CachedMovieItem[] | null;
  /** Saves the related movies in the cache. */
  setCachedRelated: (slug: string, related: CachedMovieItem[]) => void;

  // --- Home page ---
  /** Reads the cached movies of a home page section. */
  getCachedHomeMovies: (section: string) => CachedMovieItem[] | null;
  /** Saves the movies of a home page section in the cache. */
  setCachedHomeMovies: (section: string, movies: CachedMovieItem[]) => void;

  // --- Loading ---
  setLoadingMovie: (slug: string, loading: boolean) => void;
  setLoadingRelated: (slug: string, loading: boolean) => void;
  setLoadingHome: (section: string, loading: boolean) => void;

  // --- Error ---
  setMovieError: (slug: string, error: string | null) => void;
  setHomeError: (section: string, error: string | null) => void;

  // --- Utility ---
  /** Removes every expired entry from the cache. */
  clearExpiredCache: () => void;
  /** Removes every entry from the cache. */
  clearAllCache: () => void;
}

// ============================================================
// CONSTANTS
// ============================================================

/** The TTL of a movie detail: 5 minutes. */
const MOVIE_DETAIL_TTL_MS = 5 * 60 * 1000;

/** The TTL of the home page movies: kept in memory only, never persisted. */
const HOME_MOVIES_TTL_MS = 2 * 60 * 1000;

/**
 * Tells whether a cache entry is too old to be used.
 *
 * @param timestamp - The moment the entry was written.
 * @param ttlMs - The lifetime of the entry in milliseconds.
 * @returns `true` when the entry is expired.
 */
const isExpired = (timestamp: number, ttlMs: number): boolean => {
  return Date.now() - timestamp > ttlMs;
};

// ============================================================
// STORE
// ============================================================

// The home page cache is NOT persisted because:
// 1. Reading `localStorage` is synchronous and it blocks the first render.
// 2. The home page data changes often, so persisting it is not useful.
// 3. When the user comes back to the page, the data is still cached in the
//    component state.

/**
 * The store of the movie cache.
 *
 * It exposes the cache of the movie details, of the related movies and of
 * the home page sections, together with their loading and error states.
 */
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
          // The entry is expired, so it is removed from the cache.
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

      /** Removes the expired entries from the cache. */
      clearExpiredCache: (): void => {
        const now = Date.now();

        set((state) => {
          // The movie detail entries that are still valid.
          const movieCache = Object.fromEntries(
            Object.entries(state.movieCache).filter(
              ([, entry]) => !isExpired(entry.timestamp, MOVIE_DETAIL_TTL_MS)
            )
          );

          // The related movie entries that are still valid.
          const relatedCache = Object.fromEntries(
            Object.entries(state.relatedCache).filter(
              ([, entry]) => !isExpired(entry.timestamp, MOVIE_DETAIL_TTL_MS)
            )
          );

          // The home page entries that are still valid.
          const homeCache = Object.fromEntries(
            Object.entries(state.homeCache).filter(
              ([, entry]) => !isExpired(entry.timestamp, HOME_MOVIES_TTL_MS)
            )
          );

          return { movieCache, relatedCache, homeCache };
        });
      },

      /** Removes every entry from the cache. */
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
