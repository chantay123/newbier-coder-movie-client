/**
 * @file useCommentStore.ts
 * @description Zustand store cho comments — cache trong localStorage:
 * 1. Cache comments theo movie slug
 * 2. Cache top comments + live buzz cho homepage
 * 3. Dùng chung cho cả homepage và movie detail page
 *
 * Cấu trúc comments:
 * - Movie comments: /movies/{slug}/comments → array
 * - Top comments: /comments/top?period=week|month → { comments, total }
 * - Live buzz: /comments/live-buzz → { comments }
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================
// TYPES
// ============================================================

/** Comment item (dùng chung cho cả 3 loại) */
export interface CommentItem {
  _id: string;
  content: string;
  user_name?: string; // alias for display name
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

/** Top comment response */
export interface TopCommentsResponse {
  comments: CommentItem[];
  total: number;
  period: string;
}

/** Live buzz response */
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

/** Cache entry */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// ============================================================
// STORE STATE
// ============================================================

interface CommentStoreState {
  // Movie comments theo slug
  movieComments: Record<string, CacheEntry<CommentItem[]>>;

  // Homepage comments
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

/** TTL: 3 phút cho movie comments */
const MOVIE_COMMENTS_TTL_MS = 3 * 60 * 1000;

/** TTL: 2 phút cho top comments */
const TOP_COMMENTS_TTL_MS = 2 * 60 * 1000;

/** TTL: 30 giây cho live buzz (cập nhật liên tục) */
const LIVE_BUZZ_TTL_MS = 30 * 1000;

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
        set((state) => ({
          movieComments: {
            ...state.movieComments,
            [slug]: { data: comments, timestamp: Date.now() }
          }
        }));
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
          // Filter movieComments
          const movieComments = Object.fromEntries(
            Object.entries(state.movieComments).filter(
              ([, entry]) => !isExpired(entry.timestamp, MOVIE_COMMENTS_TTL_MS)
            )
          );

          return {
            movieComments,
            // Reset expired top comments
            topCommentsWeek: state.topCommentsWeek && !isExpired(state.topCommentsWeek.timestamp, TOP_COMMENTS_TTL_MS)
              ? state.topCommentsWeek : null,
            topCommentsMonth: state.topCommentsMonth && !isExpired(state.topCommentsMonth.timestamp, TOP_COMMENTS_TTL_MS)
              ? state.topCommentsMonth : null,
            topCommentsAll: state.topCommentsAll && !isExpired(state.topCommentsAll.timestamp, TOP_COMMENTS_TTL_MS)
              ? state.topCommentsAll : null,
            // Reset expired live buzz
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

      // Chỉ persist comments data, KHÔNG persist loading states
      partialize: (state) => ({
        movieComments: state.movieComments,
        topCommentsWeek: state.topCommentsWeek,
        topCommentsMonth: state.topCommentsMonth,
        topCommentsAll: state.topCommentsAll,
        liveBuzz: state.liveBuzz
      }),

      onRehydrateStorage: () => (state) => {
        if (state) {
          state.clearExpiredCache();
        }
      }
    }
  )
);

export default useCommentStore;
