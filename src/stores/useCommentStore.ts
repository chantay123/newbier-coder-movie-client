/**
 * Zustand store for the comments.
 *
 * The store keeps the data in `localStorage` so that:
 * 1. The comments of each movie are cached by slug.
 * 2. The top comments and the live buzz of the home page are cached.
 * 3. The same store is used by the home page and by the movie detail page.
 *
 * The comment endpoints:
 * - Movie comments: `/movies/{slug}/comments` returns an array.
 * - Top comments: `/comments/top?period=week|month` returns
 *   `{ comments, total }`.
 * - Live buzz: `/comments/live-buzz` returns `{ comments }`.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================
// TYPES
// ============================================================

/** A comment item. The same shape is used by the three comment endpoints. */
export interface CommentItem {
  _id: string;
  content: string;
  user_name?: string; // The alias of the display name.
  displayName?: string;
  createdAt?: string;
  created_at?: string;
  likes?: number;
  likes_count?: number;
  replies_count?: number;
  movie?: {
    slug?: string;
    name?: string;
    thumb_url?: string;
    poster_url?: string;
    rating?: number;
  };
  user?: {
    name?: string;
    badge?: string;
  };
  parent_comment?: {
    user_name?: string;
  };
  [key: string]: unknown;
}

/** The response of the top comments endpoint. */
export interface TopCommentsResponse {
  comments: CommentItem[];
  total: number;
  period: string;
}

/** The response of the live buzz endpoint. */
export interface LiveBuzzResponse {
  comments: {
    _id: string;
    user_name?: string;
    movie_name?: string;
    movie_slug?: string;
    time_ago?: string;
    snippet?: string;
    [key: string]: unknown;
  }[];
}

/** A cache entry. */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// ============================================================
// STORE STATE
// ============================================================

interface CommentStoreState {
  // The movie comments, by slug.
  movieComments: Record<string, CacheEntry<CommentItem[]>>;

  // The home page comments.
  topCommentsWeek: CacheEntry<TopCommentsResponse> | null;
  topCommentsMonth: CacheEntry<TopCommentsResponse> | null;
  topCommentsAll: CacheEntry<TopCommentsResponse> | null;
  liveBuzz: CacheEntry<LiveBuzzResponse> | null;

  // Loading states
  isLoadingMovieComments: Record<string, boolean>;
  isLoadingTopComments: boolean;
  isLoadingLiveBuzz: boolean;
}

// ============================================================
// STORE ACTIONS
// ============================================================

interface CommentStoreActions {
  // Movie comments
  getCachedMovieComments: (slug: string) => CommentItem[] | null;
  setCachedMovieComments: (slug: string, comments: CommentItem[]) => void;

  // Top comments
  getCachedTopComments: (period: 'week' | 'month' | 'all') => TopCommentsResponse | null;
  setCachedTopComments: (period: 'week' | 'month' | 'all', data: TopCommentsResponse) => void;

  // Live buzz
  getCachedLiveBuzz: () => LiveBuzzResponse | null;
  setCachedLiveBuzz: (data: LiveBuzzResponse) => void;

  // Loading
  setLoadingMovieComments: (slug: string, loading: boolean) => void;
  setLoadingTopComments: (loading: boolean) => void;
  setLoadingLiveBuzz: (loading: boolean) => void;

  // Utility
  clearExpiredCache: () => void;
  clearAllCache: () => void;
  clearMovieComments: (slug: string) => void;
}

// ============================================================
// CONSTANTS
// ============================================================

/** The TTL of the movie comments: 3 minutes. */
const MOVIE_COMMENTS_TTL_MS = 3 * 60 * 1000;

/** The TTL of the top comments: 2 minutes. */
const TOP_COMMENTS_TTL_MS = 2 * 60 * 1000;

/** The TTL of the live buzz: 30 seconds, because it updates continuously. */
const LIVE_BUZZ_TTL_MS = 30 * 1000;

/**
 * The maximum number of movies kept in the comment cache. The cache is
 * written on every comment fetch, so without a limit it would keep one
 * entry per movie the user ever opened.
 */
const MAX_MOVIE_COMMENT_ENTRIES = 30;

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

export const useCommentStore = create<CommentStoreState & CommentStoreActions>()(
  persist(
    (set, get) => ({
      // ---- Initial State ----
      movieComments: {},
      topCommentsWeek: null,
      topCommentsMonth: null,
      topCommentsAll: null,
      liveBuzz: null,
      isLoadingMovieComments: {},
      isLoadingTopComments: false,
      isLoadingLiveBuzz: false,

      // ============================================================
      // MOVIE COMMENTS
      // ============================================================

      getCachedMovieComments: (slug: string): CommentItem[] | null => {
        const entry = get().movieComments[slug];
        if (!entry) return null;
        if (isExpired(entry.timestamp, MOVIE_COMMENTS_TTL_MS)) {
          set((state) => {
            const { [slug]: _, ...rest } = state.movieComments;
            return { movieComments: rest };
          });
          return null;
        }
        return entry.data;
      },

      setCachedMovieComments: (slug: string, comments: CommentItem[]): void => {
        set((state) => {
          const movieComments = {
            ...state.movieComments,
            [slug]: { data: comments, timestamp: Date.now() }
          };

          // The cache must not grow forever: the oldest entries are dropped
          // as soon as there are too many of them.
          const keys = Object.keys(movieComments);
          if (keys.length > MAX_MOVIE_COMMENT_ENTRIES) {
            keys
              .sort((a, b) => movieComments[a].timestamp - movieComments[b].timestamp)
              .slice(0, keys.length - MAX_MOVIE_COMMENT_ENTRIES)
              .forEach((key) => {
                delete movieComments[key];
              });
          }

          return { movieComments };
        });
      },

      clearMovieComments: (slug: string): void => {
        set((state) => {
          const { [slug]: _, ...rest } = state.movieComments;
          return { movieComments: rest };
        });
      },

      // ============================================================
      // TOP COMMENTS
      // ============================================================

      getCachedTopComments: (period: 'week' | 'month' | 'all'): TopCommentsResponse | null => {
        const cache = period === 'week'
          ? get().topCommentsWeek
          : period === 'month'
            ? get().topCommentsMonth
            : get().topCommentsAll;

        if (!cache) return null;
        if (isExpired(cache.timestamp, TOP_COMMENTS_TTL_MS)) {
          if (period === 'week') set({ topCommentsWeek: null });
          else if (period === 'month') set({ topCommentsMonth: null });
          else set({ topCommentsAll: null });
          return null;
        }
        return cache.data;
      },

      setCachedTopComments: (period: 'week' | 'month' | 'all', data: TopCommentsResponse): void => {
        const entry: CacheEntry<TopCommentsResponse> = { data, timestamp: Date.now() };
        if (period === 'week') set({ topCommentsWeek: entry });
        else if (period === 'month') set({ topCommentsMonth: entry });
        else set({ topCommentsAll: entry });
      },

      // ============================================================
      // LIVE BUZZ
      // ============================================================

      getCachedLiveBuzz: (): LiveBuzzResponse | null => {
        const cache = get().liveBuzz;
        if (!cache) return null;
        if (isExpired(cache.timestamp, LIVE_BUZZ_TTL_MS)) {
          set({ liveBuzz: null });
          return null;
        }
        return cache.data;
      },

      setCachedLiveBuzz: (data: LiveBuzzResponse): void => {
        set({ liveBuzz: { data, timestamp: Date.now() } });
      },

      // ============================================================
      // LOADING STATES
      // ============================================================

      setLoadingMovieComments: (slug: string, loading: boolean): void => {
        set((state) => ({
          isLoadingMovieComments: {
            ...state.isLoadingMovieComments,
            [slug]: loading
          }
        }));
      },

      setLoadingTopComments: (loading: boolean): void => {
        set({ isLoadingTopComments: loading });
      },

      setLoadingLiveBuzz: (loading: boolean): void => {
        set({ isLoadingLiveBuzz: loading });
      },

      // ============================================================
      // UTILITY
      // ============================================================

      clearExpiredCache: (): void => {
        const now = Date.now();

        set((state) => {
          // The movie comment entries that are still valid.
          const movieComments = Object.fromEntries(
            Object.entries(state.movieComments).filter(
              ([, entry]) => !isExpired(entry.timestamp, MOVIE_COMMENTS_TTL_MS)
            )
          );

          return {
            movieComments,
            // The expired top comments are reset to `null`.
            topCommentsWeek: state.topCommentsWeek && !isExpired(state.topCommentsWeek.timestamp, TOP_COMMENTS_TTL_MS)
              ? state.topCommentsWeek : null,
            topCommentsMonth: state.topCommentsMonth && !isExpired(state.topCommentsMonth.timestamp, TOP_COMMENTS_TTL_MS)
              ? state.topCommentsMonth : null,
            topCommentsAll: state.topCommentsAll && !isExpired(state.topCommentsAll.timestamp, TOP_COMMENTS_TTL_MS)
              ? state.topCommentsAll : null,
            // The expired live buzz is reset to `null`.
            liveBuzz: state.liveBuzz && !isExpired(state.liveBuzz.timestamp, LIVE_BUZZ_TTL_MS)
              ? state.liveBuzz : null
          };
        });
      },

      clearAllCache: (): void => {
        set({
          movieComments: {},
          topCommentsWeek: null,
          topCommentsMonth: null,
          topCommentsAll: null,
          liveBuzz: null
        });
      }
    }),
    {
      // ===== PERSIST CONFIG =====
      name: 'comment-cache',
      storage: createJSONStorage(() => localStorage),

      // Only the comment data is persisted. The loading states are not,
      // because a page that is reloaded must show the loading state again.
      // The live buzz is NOT persisted: it is a continuous feed with a 30
      // second TTL, so keeping it in `localStorage` only produced writes
      // that were outdated a few seconds later.
      partialize: (state) => ({
        movieComments: state.movieComments,
        topCommentsWeek: state.topCommentsWeek,
        topCommentsMonth: state.topCommentsMonth,
        topCommentsAll: state.topCommentsAll
      }),

      onRehydrateStorage: () => (state) => {
        if (state) {
          state.clearExpiredCache();
        }
      },

      // The persisted format changed: the live buzz is not stored anymore.
      // The old value is dropped when the store is read. The `merge` hook is
      // used (and not only `migrate`) because the data written by the
      // previous version has no version number, so `migrate` would never run
      // for it.
      version: 2,
      migrate: (persistedState: unknown): unknown => {
        if (!persistedState || typeof persistedState !== 'object') return persistedState;
        const state = { ...(persistedState as Record<string, unknown>) };
        delete state.liveBuzz;
        return state;
      },
      merge: (persistedState: unknown, currentState: CommentStoreState & CommentStoreActions) => {
        const base = currentState as unknown as Record<string, unknown>;
        if (!persistedState || typeof persistedState !== 'object') {
          return currentState;
        }
        const persisted = { ...(persistedState as Record<string, unknown>) };
        // The live buzz is an in-memory cache only.
        delete persisted.liveBuzz;
        return { ...base, ...persisted } as unknown as CommentStoreState & CommentStoreActions;
      }
    }
  )
);

export default useCommentStore;
