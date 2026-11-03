/**
 * Zustand store for the user authentication and the profile.
 *
 * The store keeps the data in `localStorage` so that:
 * 1. The favorite states are kept between visits, so the heart icon is
 *    correct as soon as a page is loaded again.
 * 2. The user profile is cached, so it is not fetched again on every page
 *    change.
 * 3. The state is shared between the Navbar, the Profile page and the
 *    MovieCard (favorite status).
 *
 * Cache strategy:
 * - Auth token: NOT persisted. The token has a single source of truth
 *   (`authService` / `auth_token` / `token`), so keeping a second copy in
 *   `localStorage` only created a stale state where the store said
 *   "authenticated" while the session was over (or the other way round).
 *   The token is restored from the real storage during the rehydration.
 * - User profile: in memory only, with a TTL of 10 minutes.
 * - Favorite movies: `localStorage` with a TTL of 5 minutes and a bounded
 *   number of entries.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getMemoryAccessToken } from '@/utils/accessTokenStore';

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
 * The maximum number of movies kept in the favorite-status cache. The cache
 * is written on every favorite toggle, so without a limit it would keep one
 * entry per movie the user ever opened.
 */
const MAX_FAVORITE_STATUS_ENTRIES = 200;

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

/**
 * Reads the access token of the current tab.
 *
 * The token is kept in the MEMORY of the tab
 * (`src/utils/accessTokenStore.ts`), NOT in the Web Storage: a token in the
 * storage can be read by any script running on the page.
 *
 * @returns The token, or null when the user is not signed in.
 */
const readStoredAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return getMemoryAccessToken();
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
        // The token is cleared from `localStorage` by `authService.logout()`,
        // which is the single source of truth for the session.
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
        set((state) => {
          const favoritesCache = {
            ...state.favoritesCache,
            [movieSlug]: { data: { isFavorite }, timestamp: Date.now() }
          };

          // The cache must not grow forever: the oldest entries are dropped
          // as soon as there are too many of them.
          const keys = Object.keys(favoritesCache);
          if (keys.length > MAX_FAVORITE_STATUS_ENTRIES) {
            keys
              .sort((a, b) => favoritesCache[a].timestamp - favoritesCache[b].timestamp)
              .slice(0, keys.length - MAX_FAVORITE_STATUS_ENTRIES)
              .forEach((key) => {
                delete favoritesCache[key];
              });
          }

          return { favoritesCache };
        });
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

      // Persisted: the favorite states only. They change the UI as soon as
      // the page is loaded again.
      // Not persisted:
      // - the token and `isAuthenticated`: `authService` owns the session.
      //   Keeping a second copy here produced the "the token exists but
      //   `isAuthenticated` is false" (and the opposite) mismatches.
      // - the profile cache and the favorites list: they are fetched again
      //   from the backend.
      partialize: (state) => ({
        favoritesCache: state.favoritesCache
      }),

      // The persisted format changed: the token and `isAuthenticated` are not
      // stored anymore. The old values are dropped when the store is read.
      // The `merge` hook is used (and not only `migrate`) because the data
      // written by the previous version has no version number, so `migrate`
      // would never run for it.
      version: 2,
      migrate: (persistedState: unknown): unknown => {
        if (!persistedState || typeof persistedState !== 'object') return persistedState;
        const state = { ...(persistedState as Record<string, unknown>) };
        delete state.token;
        delete state.isAuthenticated;
        return state;
      },
      merge: (persistedState: unknown, currentState: UserStoreState & UserStoreActions) => {
        const base = currentState as unknown as Record<string, unknown>;
        if (!persistedState || typeof persistedState !== 'object') {
          return currentState;
        }
        const persisted = { ...(persistedState as Record<string, unknown>) };
        // The auth state is never restored from the storage.
        delete persisted.token;
        delete persisted.isAuthenticated;
        return { ...base, ...persisted } as unknown as UserStoreState & UserStoreActions;
      },

      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // The expired entries are dropped.
        state.clearExpiredCache();

        // The auth state is restored from the real storage, so the store can
        // never disagree with the session.
        try {
          const token = readStoredAccessToken();
          state.setToken(token);
        } catch {
          state.setToken(null);
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
