/**
 * systemConfig.ts
 *
 * The single source of truth for the system-wide configuration. It groups the
 * API URLs, the network timeout, the data mode and the global UI and
 * pagination standards.
 */

import { LOCAL_DEFAULT_BACKDROP, LOCAL_DEFAULT_POSTER } from './movieFallbackConfig';
import { AUTH_CONFIG } from './authConfig';
import { getApiBaseUrl, getApiOrigin } from './apiBase';

// Global system configuration.
export const SYSTEM_CONFIG = {
  // Application information.
  appName: 'NewbieCoder Movies',
  appVersion: '1.0.0',

  // The active language (defaults to 'vi').
  locale: process.env.NEXT_PUBLIC_LOCALE || 'vi',

  // Root URL of the backend, resolved through the shared `getApiBaseUrl()`
  // (always ends with `/api/v1`, see src/config/apiBase.ts).
  apiBaseUrl: getApiBaseUrl(),

  // Data loading mode:
  // - 'api_only': only the real API is called, an empty list is returned on
  //   failure
  dataMode: process.env.NEXT_PUBLIC_DATA_MODE || 'api_only',

  // Turns the snapshot mechanism of the home page on or off.
  enableHomepageSnapshot: process.env.NEXT_PUBLIC_ENABLE_HOMEPAGE_SNAPSHOT === 'true',

  // Flag for the mock data.
  useMockData: process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true',

  // Flag for the image and movie payload diagnostic logs.
  debugMovies: process.env.NEXT_PUBLIC_DEBUG_MOVIES === 'true',

  // Global HTTP timeout in milliseconds.
  networkTimeoutMs: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '8000', 10),

  // Default UI configuration and pagination.
  ui: {
    itemsPerPage: 20,
    defaultPoster: LOCAL_DEFAULT_POSTER,
    defaultBackdrop: LOCAL_DEFAULT_BACKDROP,
    heroAutoPlayInterval: parseInt(process.env.NEXT_PUBLIC_HERO_AUTOPLAY_INTERVAL || '6000', 10),
    heroDescLimit: parseInt(process.env.NEXT_PUBLIC_HERO_DESC_LIMIT || '220', 10)
  },

  // Origin used to build the URL of relative images.
  imageOrigin: getApiOrigin(),

  // Configuration of the external TMDB API.
  // `apiKey` has NO hardcoded fallback: the key must be configured through the
  // environment (NEXT_PUBLIC_TMDB_API_KEY). The real key used to be embedded
  // as a default value in the bundle, so anyone opening DevTools could read
  // it.
  //
  // NOTE: `NEXT_PUBLIC_TMDB_IMAGE_URL` is set with a size in many
  // environments (`https://image.tmdb.org/t/p/w500`). Keeping that value would
  // break the places that append a size themselves, such as
  // `${imageBaseUrl}/w500${path}` or `getImageUrl(path, 'w185')`, because they
  // would produce `.../t/p/w500/w500/...` and `.../t/p/w500/w185/...`. The
  // base is therefore always normalized back to `/t/p`, and the size is added
  // by the caller.
  tmdb: {
    apiKey: process.env.NEXT_PUBLIC_TMDB_API_KEY || '',
    authToken: process.env.NEXT_PUBLIC_TMDB_AUTH_TOKEN || '',
    baseUrl: (process.env.NEXT_PUBLIC_TMDB_BASE_URL || 'https://api.themoviedb.org/3').replace(/\/+$/, ''),
    imageBaseUrl: (process.env.NEXT_PUBLIC_TMDB_IMAGE_URL || 'https://image.tmdb.org/t/p')
      .replace(/\/+$/, '')
      .replace(/\/(?:w\d+|h\d+|original)$/i, ''),
    imageSizes: {
      avatar: 'w185',
      poster: 'w500',
      backdrop: 'w1280',
      original: 'original'
    },
    /**
     * Builds a TMDB image URL for a given size, with a fallback.
     *
     * @param path - The image path returned by TMDB.
     * @param size - The image size, for example `w500`.
     * @param fallback - The value returned when no path is given.
     * @returns The full image URL, or the fallback.
     */
    getImageUrl: (path: string | null | undefined, size: string = 'w500', fallback: string = '/placeholder.jpg') => {
      if (!path) return fallback;
      if (path.startsWith('http')) return path;
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      const base = (process.env.NEXT_PUBLIC_TMDB_IMAGE_URL || 'https://image.tmdb.org/t/p')
        .replace(/\/+$/, '')
        .replace(/\/(?:w\d+|h\d+|original)$/i, '');
      return `${base}/${size}${cleanPath}`;
    }
  },

  // YouTube configuration.
  // The embed/watch base URLs are stable third-party endpoints, not an
  // environment-specific configuration, so they stay hardcoded here.
  youtube: {
    embedBaseUrl: 'https://www.youtube.com/embed',
    watchBaseUrl: 'https://www.youtube.com/watch?v=',
    /**
     * Builds the embed URL of a YouTube video.
     *
     * @param videoKey - The YouTube video key.
     * @param params - Extra query parameters for the embed player.
     * @returns The embed URL, or an empty string when there is no video key.
     */
    getEmbedUrl: (videoKey: string, params: string = 'autoplay=1&rel=0&modestbranding=1') => {
      if (!videoKey) return '';
      return `https://www.youtube.com/embed/${videoKey}?${params}`;
    }
  },

  // Authentication and asset configuration.
  auth: AUTH_CONFIG
} as const;

export const TMDB_CONFIG = SYSTEM_CONFIG.tmdb;
export const YOUTUBE_CONFIG = SYSTEM_CONFIG.youtube;
export { AUTH_CONFIG };

export default SYSTEM_CONFIG;
