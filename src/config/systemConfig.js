/**
 * @file systemConfig.js
 * @description Single Source of Truth for Global Application Environment and System Settings.
 * Centralizes API base URLs, network timeouts, data modes, and global UI pagination standards.
 */

import {
  LOCAL_DEFAULT_BACKDROP,
  LOCAL_DEFAULT_POSTER
} from './movieFallbackConfig';
import { AUTH_CONFIG } from './authConfig';

/**
 * Global System Configuration.
 */
export const SYSTEM_CONFIG = {
  // Application identity
  appName: 'NewbieCoder Movies',
  appVersion: '1.0.0',

  // Active locale (defaults to 'vi')
  locale: process.env.NEXT_PUBLIC_LOCALE || 'vi',

  // Base API endpoint for backend service - strictly read from environment
  apiBaseUrl: (
    process.env.NEXT_PUBLIC_CORE_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ''
  ).replace(/\/+$/, ''),

  // Data fetching strategy mode:
  // - 'api_only': Strict live API, empty array if failed
  dataMode: process.env.NEXT_PUBLIC_DATA_MODE || 'api_only',

  // Homepage Snapshot mechanism toggle
  enableHomepageSnapshot: process.env.NEXT_PUBLIC_ENABLE_HOMEPAGE_SNAPSHOT === 'true',

  // Flag indicating whether to use mock data
  useMockData: process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true',

  // Diagnostic logging gate for image / movie payload debugging.
  // When set to 'true', safeFetchJson and the home-page normalizer
  // will print one-time logs describing the raw movie object and the
  // resolved image URLs. Set to 'false' (or leave unset) to silence.
  debugMovies: process.env.NEXT_PUBLIC_DEBUG_MOVIES === 'true',

  // Global HTTP Request Timeout in milliseconds
  networkTimeoutMs: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '8000', 10),

  // UI pagination and display defaults
  ui: {
    itemsPerPage: 20,
    defaultPoster: LOCAL_DEFAULT_POSTER,
    defaultBackdrop: LOCAL_DEFAULT_BACKDROP,
    heroAutoPlayInterval: parseInt(process.env.NEXT_PUBLIC_HERO_AUTOPLAY_INTERVAL || '6000', 10),
    heroDescLimit: parseInt(process.env.NEXT_PUBLIC_HERO_DESC_LIMIT || '220', 10)
  },

  // Image Asset Origin
  // Backend may return image URLs as either:
  //   - absolute URLs (https://...) — used as-is
  //   - protocol-relative URLs (//cdn.example.com/...) — prefixed with current protocol
  //   - host-relative paths (/uploads/poster.jpg) — combined with this origin
  // We extract the origin from the configured core API URL so we never
  // double-prefix an already-absolute URL.
  imageOrigin: (() => {
    const raw = process.env.NEXT_PUBLIC_CORE_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
    try {
      // Handles both 'https://host/api/v1' and 'https://host:5000/api'.
      // new URL throws when the string is not a valid absolute URL.
      return new URL(raw).origin;
    } catch {
      return '';
    }
  })(),

  // TMDB External API Configuration
  tmdb: {
    apiKey: process.env.NEXT_PUBLIC_TMDB_API_KEY || '5739ebb7d66fa1dd775f806325ab4067',
    authToken: process.env.NEXT_PUBLIC_TMDB_AUTH_TOKEN || '',
    baseUrl: (process.env.NEXT_PUBLIC_TMDB_BASE_URL || 'https://api.themoviedb.org/3').replace(/\/+$/, ''),
    imageBaseUrl: (process.env.NEXT_PUBLIC_TMDB_IMAGE_URL || 'https://image.tmdb.org/t/p').replace(/\/+$/, ''),
    imageSizes: {
      avatar: 'w185',
      poster: 'w500',
      backdrop: 'w1280',
      original: 'original'
    },
    // Helper to get formatted TMDB image URL with fallback
    getImageUrl: (path, size = 'w500', fallback = '/img/default-poster.jpg') => {
      if (!path) return fallback;
      if (path.startsWith('http')) return path;
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      const base = (process.env.NEXT_PUBLIC_TMDB_IMAGE_URL || 'https://image.tmdb.org/t/p').replace(/\/+$/, '');
      return `${base}/${size}${cleanPath}`;
    }
  },

  // YouTube Configuration
  youtube: {
    embedBaseUrl: 'https://www.youtube.com/embed',
    watchBaseUrl: 'https://www.youtube.com/watch?v=',
    getEmbedUrl: (videoKey, params = 'autoplay=1&rel=0&modestbranding=1') => {
      if (!videoKey) return '';
      return `https://www.youtube.com/embed/${videoKey}?${params}`;
    }
  },

  // Authentication & Artwork Configuration
  auth: AUTH_CONFIG
};

export const TMDB_CONFIG = SYSTEM_CONFIG.tmdb;
export const YOUTUBE_CONFIG = SYSTEM_CONFIG.youtube;
export { AUTH_CONFIG };

export default SYSTEM_CONFIG;
