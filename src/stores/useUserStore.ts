/**
 * @file useUserStore.ts
 * @description Zustand store cho user authentication và profile — cache trong localStorage:
 * 1. Lưu auth token và user info
 * 2. Cache user profile để không fetch lại khi chuyển trang
 * 3. Chia sẻ state giữa Navbar, Profile, MovieCard (favorite status)
 *
 * Cache strategy:
 * - Auth token: localStorage (persist vĩnh viễn)
 * - User profile: localStorage + TTL 10 phút
 * - Favorite movies: localStorage + TTL 5 phút
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================
// TYPES
// ============================================================

/** User profile data */
export interface UserProfile {
  _id: string;
  id?: string;
  username?: string;
  email?: string;
  displayName?: string;
  display_name?: string;
  avatar?: string;
  avatar_url?: string;
  role?: string;
  createdAt?: string;
  [key: string]: unknown;
}

/** Favorite movie item */
export interface FavoriteItem {
  _id: string;
  slug: string;
  name: string;
  poster_url?: string;
  thumb_url?: string;
  year?: number | string;
  type?: string;
  addedAt?: string;
  [key: string]: unknown;
}

/** Trạng thái favorite của 1 phim */
export interface FavoriteStatusData {
  isFavorite: boolean;
}

/** Cache entry */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// ============================================================
// STORE STATE
// ============================================================

interface UserStoreState {
  // ---- Auth ----
  /** Token để gửi API (null = chưa login) */
  token: string | null;

  /** User đã login chưa */
  isAuthenticated: boolean;

  // ---- Profile ----
  /** User profile cache */
  profileCache: CacheEntry<UserProfile> | null;

  // ---- Favorites ----
  /** Favorite movies cache theo slug: movieSlug -> { isFavorite, timestamp } */
  favoritesCache: Record<string, CacheEntry<FavoriteStatusData>>; // movieSlug -> cache
  favoritesList: CacheEntry<FavoriteItem[]> | null;

  // ---- Loading states ----
  isLoadingProfile: boolean;
  isLoadingFavorites: boolean;
}

// ============================================================
// STORE ACTIONS
// ============================================================

interface UserStoreActions {
  // --- Auth ---
  setToken: (token: string | null) => void;
  logout: () => void;

  // --- Profile ---
  getCachedProfile: () => UserProfile | null;
  setCachedProfile: (profile: UserProfile) => void;
  clearProfile: () => void;

  // --- Favorites ---
  getFavoriteStatus: (movieSlug: string) => boolean | null;
  setFavoriteStatus: (movieSlug: string, isFavorite: boolean) => void;

  getCachedFavoritesList: () => FavoriteItem[] | null;
  setCachedFavoritesList: (favorites: FavoriteItem[]) => void;
  invalidateFavoritesList: () => void;

  // --- Loading ---
  setLoadingProfile: (loading: boolean) => void;
  setLoadingFavorites: (loading: boolean) => void;

  // --- Utility ---
  clearExpiredCache: () => void;
  clearAllCache: () => void;
}

// ============================================================
// CONSTANTS
// ============================================================

/** TTL: 10 phút cho user profile */
const PROFILE_TTL_MS = 10 * 60 * 1000;

/** TTL: 5 phút cho favorite status */
const FAVORITE_STATUS_TTL_MS = 5 * 60 * 1000;

/** TTL: 2 phút cho favorites list */
const FAVORITES_LIST_TTL_MS = 2 * 60 * 1000;

const isExpired = (timestamp: number, ttlMs: number): boolean => {
  return Date.now() - timestamp > ttlMs;
};

// ============================================================
// STORE
// ============================================================

export const useUserStore = create<UserStoreState & UserStoreActions>()(
  persist(
    (set, get) => ({
      // ---- Initial State ----
      token: null,
      isAuthenticated: false,
      profileCache: null,
      favoritesCache: {},
      favoritesList: null,
      isLoadingProfile: false,
      isLoadingFavorites: false,

      // ============================================================
      // AUTH
      // ============================================================

      setToken: (token: string | null): void => {
        set({
          token,
          isAuthenticated: !!token
        });
      },

      logout: (): void => {
        set({
          token: null,
          isAuthenticated: false,
          profileCache: null,
          favoritesCache: {},
          favoritesList: null
        });
        // Xóa token khỏi localStorage (persist sẽ tự làm)
      },

      // ============================================================
      // PROFILE
      // ============================================================

      getCachedProfile: (): UserProfile | null => {
        const cache = get().profileCache;
        if (!cache) return null;
        if (isExpired(cache.timestamp, PROFILE_TTL_MS)) {
          set({ profileCache: null });
          return null;
        }
        return cache.data;
      },

      setCachedProfile: (profile: UserProfile): void => {
        set({ profileCache: { data: profile, timestamp: Date.now() } });
      },

      clearProfile: (): void => {
        set({ profileCache: null });
      },

      // ============================================================
      // FAVORITES
      // ============================================================

      /**
       * Lấy favorite status của 1 phim.
       * @returns true/false nếu có cache, null nếu chưa cache
       */
      getFavoriteStatus: (movieSlug: string): boolean | null => {
        const entry = get().favoritesCache[movieSlug];
        if (!entry) return null;
        if (isExpired(entry.timestamp, FAVORITE_STATUS_TTL_MS)) {
          set((state) => {
            const { [movieSlug]: _, ...rest } = state.favoritesCache;
            return { favoritesCache: rest };
          });
          return null;
        }
        return entry.data.isFavorite;
      },

      setFavoriteStatus: (movieSlug: string, isFavorite: boolean): void => {
        set((state) => ({
          favoritesCache: {
            ...state.favoritesCache,
            [movieSlug]: { data: { isFavorite }, timestamp: Date.now() }
          }
        }));
      },

      getCachedFavoritesList: (): FavoriteItem[] | null => {
        const cache = get().favoritesList;
        if (!cache) return null;
        if (isExpired(cache.timestamp, FAVORITES_LIST_TTL_MS)) {
          set({ favoritesList: null });
          return null;
        }
        return cache.data;
      },

      setCachedFavoritesList: (favorites: FavoriteItem[]): void => {
        set({ favoritesList: { data: favorites, timestamp: Date.now() } });
      },

      invalidateFavoritesList: (): void => {
        set({ favoritesList: null });
      },

      // ============================================================
      // LOADING STATES
      // ============================================================

      setLoadingProfile: (loading: boolean): void => {
        set({ isLoadingProfile: loading });
      },

      setLoadingFavorites: (loading: boolean): void => {
        set({ isLoadingFavorites: loading });
      },

      // ============================================================
      // UTILITY
      // ============================================================

      clearExpiredCache: (): void => {
        const now = Date.now();

        set((state) => {
          // Filter profile
          const profileCache = state.profileCache && !isExpired(state.profileCache.timestamp, PROFILE_TTL_MS)
            ? state.profileCache : null;

          // Filter favorites cache
          const favoritesCache = Object.fromEntries(
            Object.entries(state.favoritesCache).filter(
              ([, entry]) => !isExpired(entry.timestamp, FAVORITE_STATUS_TTL_MS)
            )
          );

          // Filter favorites list
          const favoritesList = state.favoritesList && !isExpired(state.favoritesList.timestamp, FAVORITES_LIST_TTL_MS)
            ? state.favoritesList : null;

          return { profileCache, favoritesCache, favoritesList };
        });
      },

      clearAllCache: (): void => {
        set({
          profileCache: null,
          favoritesCache: {},
          favoritesList: null
        });
      }
    }),
    {
      // ===== PERSIST CONFIG =====
      name: 'user-store',
      storage: createJSONStorage(() => localStorage),

      // Persist: token + favoritesCache (favorite status cần persist
      // vì nó ảnh hưởng UI ngay lập tức khi load lại trang)
      // KHÔNG persist: profileCache, favoritesList (sẽ fetch lại)
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        favoritesCache: state.favoritesCache
      }),

      onRehydrateStorage: () => (state) => {
        if (state) {
          state.clearExpiredCache();
        }
      }
    }
  )
);

// Selector helpers (dùng trong component để tránh re-render không cần thiết)
export const useIsAuthenticated = () => useUserStore((state) => state.isAuthenticated);
export const useToken = () => useUserStore((state) => state.token);
export const useUserProfile = () => useUserStore((state) => state.getCachedProfile());

export default useUserStore;
