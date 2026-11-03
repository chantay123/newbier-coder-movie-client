/**
 * @file localStorageCleanup.ts
 * @description One-off cleanup of the legacy per-image LocalStorage keys.
 *
 * History:
 * The search page used to persist a "the poster already loaded" flag for
 * every single movie it rendered:
 *
 *   localStorage.setItem(`img_loaded_${movieId}`, 'true');
 *
 * The flag was never read back, so every visited movie left a permanent
 * key behind (`img_loaded_<id>`). After browsing a few pages the storage
 * was filled with hundreds of useless entries.
 *
 * The flag now lives in the React state of the page that renders the
 * posters (see `src/pages/client/search/index.tsx`), so nothing is
 * written to LocalStorage any more.
 *
 * This module removes the leftovers that previous versions created. It
 * only touches the keys that start with `img_loaded_`; every other key
 * (`user`, `auth_token`, `comment-cache`, `movie_watch_progress_*`, ...)
 * is left untouched. `localStorage.clear()` is never used.
 */

/** Prefix of the legacy per-image keys that must be removed. */
export const LEGACY_IMAGE_LOADED_PREFIX = 'img_loaded_';

/**
 * Marker that tells the cleanup it already ran, so the storage is not
 * scanned again on every page load.
 */
const CLEANUP_MARKER_KEY = 'app_legacy_img_loaded_cleanup_v1';

/**
 * The legacy token keys of the previous authentication implementation.
 *
 * The access token and the refresh token used to be written to the Web
 * Storage. They now live in an encrypted `HttpOnly` cookie (server side)
 * and in the memory of the tab, so the leftovers are removed on the first
 * run of the new version.
 */
const LEGACY_TOKEN_KEYS = [
  'auth_token',
  'token',
  'authToken',
  'refresh_token',
  'backendToken'
] as const;

/**
 * Removes the legacy token keys from LocalStorage and SessionStorage.
 *
 * @returns The number of keys that were removed.
 */
export function cleanupLegacyTokenKeys(): number {
  if (typeof window === 'undefined') return 0;

  let removed = 0;

  try {
    const storage = window.localStorage;
    if (storage) {
      LEGACY_TOKEN_KEYS.forEach((key) => {
        if (storage.getItem(key) !== null) {
          storage.removeItem(key);
          removed += 1;
        }
      });
    }
  } catch {
    /* LocalStorage can be disabled */
  }

  try {
    const storage = window.sessionStorage;
    if (storage) {
      LEGACY_TOKEN_KEYS.forEach((key) => {
        if (storage.getItem(key) !== null) {
          storage.removeItem(key);
          removed += 1;
        }
      });
    }
  } catch {
    /* SessionStorage can be disabled */
  }

  return removed;
}

/**
 * Removes every legacy `img_loaded_*` key from LocalStorage.
 *
 * @returns The number of keys that were removed.
 */
export function cleanupLegacyImageLoadedKeys(): number {
  if (typeof window === 'undefined') return 0;

  let storage: Storage;
  try {
    storage = window.localStorage;
    if (!storage) return 0;
  } catch {
    /* LocalStorage can be disabled (private mode, blocked cookies) */
    return 0;
  }

  try {
    if (storage.getItem(CLEANUP_MARKER_KEY) === '1') return 0;

    // Collect first, then remove: removing while iterating shifts the
    // index of the remaining keys.
    const staleKeys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && key.startsWith(LEGACY_IMAGE_LOADED_PREFIX)) staleKeys.push(key);
    }

    staleKeys.forEach((key) => {
      try {
        storage.removeItem(key);
      } catch {
        /* ignore a single failing key */
      }
    });

    try {
      storage.setItem(CLEANUP_MARKER_KEY, '1');
    } catch {
      /* the marker is optional, the cleanup still worked */
    }

    return staleKeys.length;
  } catch {
    return 0;
  }
}
