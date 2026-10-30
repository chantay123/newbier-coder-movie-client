/**
 * Zustand store for the user authentication and the profile.
 *
 * The store keeps the data in `localStorage` so that:
 * 1. The auth token and the user info are kept between visits.
 * 2. The user profile is cached, so it is not fetched again on every page
 *    change.
 * 3. The state is shared between the Navbar, the Profile page and the
 *    MovieCard (favorite status).
 *
 * Cache strategy:
 * - Auth token: `localStorage`, persisted forever.
 * - User profile: `localStorage` with a TTL of 10 minutes.
 * - Favorite movies: `localStorage` with a TTL of 5 minutes.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================
// TYPES
// ============================================================

/** The data of the user profile. */
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

/** A favorite movie. */
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

/** The favorite state of one movie. */
export interface FavoriteStatusData {
  isFavorite: boolean;
}

/** A cache entry. */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// ============================================================
// STORE STATE
// ============================================================

interface UserStoreState {
  // ---- Auth ----
  /** The token sent with the API requests (`null` means not signed in). */
  token: string | null;

  /** `true` when the user is signed in. */
  isAuthenticated: boolean;

  // ---- Profile ----
  /** The cached user profile. */
  profileCache: CacheEntry<UserProfile> | null;

  // ---- Favorites ----
  /** The cached favorite state of each movie, by slug. */
  favoritesCache: Record<string, CacheEntry<FavoriteStatusData>>;
  /** The cached list of favorite movies. */
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

/** The TTL of the user profile: 10 minutes. */
const PROFILE_TTL_MS = 10 * 60 * 1000;

/** The TTL of the favorite status: 5 minutes. */
const FAVORITE_STATUS_TTL_MS = 5 * 60 * 1000;

/** The TTL of the favorites list: 2 minutes. */
const FAVORITES_LIST_TTL_MS = 2 * 60 * 1000;

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
        // The token is cleared from `localStorage` by the persist middleware.
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
       * Reads the favorite state of one movie.
       *
       * @param movieSlug - The slug of the movie.
       * @returns `true` or `false` when the state is cached, `null` when it
       *          is not cached yet.
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
          // The profile is kept only when it is still valid.
          const profileCache = state.profileCache && !isExpired(state.profileCache.timestamp, PROFILE_TTL_MS)
            ? state.profileCache : null;

          // The favorite states that are still valid.
          const favoritesCache = Object.fromEntries(
            Object.entries(state.favoritesCache).filter(
              ([, entry]) => !isExpired(entry.timestamp, FAVORITE_STATUS_TTL_MS)
            )
          );

          // The favorites list is kept only when it is still valid.
          const favoritesList = state.favoritesList && !isExpired(state.favoritesList.timestamp, FAVORITES_LIST_TTL_MS)
            ? state.favoritesList : null;

          return { profileCache, favoritesCache, favoritesList };
        });
      },

      /** Removes every entry from the cache. */
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

      // Persisted: the token and the favorite states. The favorite state
      // has to be persisted because it changes the UI as soon as the page
      // is loaded again.
      // Not persisted: the profile cache and the favorites list, because
      // they are fetched again from the backend.
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

// The selector helpers keep the components from re-rendering when they only
// need one small part of the state.
export const useIsAuthenticated = () => useUserStore((state) => state.isAuthenticated);
export const useToken = () => useUserStore((state) => state.token);
export const useUserProfile = () => useUserStore((state) => state.getCachedProfile());

export default useUserStore;
