/**
 * The central configuration for the movie page, the hero banner and the
 * data providers.
 *
 * It stays in sync with `SYSTEM_CONFIG` and `movieFallbackConfig`.
 */

import { SYSTEM_CONFIG } from './systemConfig';
import {
  LOCAL_DEFAULT_BACKDROP,
  LOCAL_DEFAULT_POSTER,
  MOVIE_FALLBACK_DEFAULTS
} from './movieFallbackConfig';
import { RT } from './apiRoutes';

export {
  HERO_FALLBACK_BACKDROPS,
  LOCAL_DEFAULT_BACKDROP,
  LOCAL_DEFAULT_POSTER,
  MOVIE_FALLBACK_DEFAULTS,
  resolveMovieBackdrop,
  resolveMovieSubTitle,
  resolveMovieCategories,
  resolveMovieYear,
  resolveMovieQuality,
  normalizeHeroMovie,
  resolveMovieActors,
  resolveMovieDirectors,
  resolveImageUrl
} from './movieFallbackConfig';

/**
 * The movie configuration. It is kept in sync with the global
 * `SYSTEM_CONFIG`.
 */
export const MOVIE_CONFIG = {
  useMockData: SYSTEM_CONFIG.useMockData,
  apiBaseUrl: SYSTEM_CONFIG.apiBaseUrl,
  dataMode: SYSTEM_CONFIG.dataMode,

  hero: {
    maxDescriptionLength: SYSTEM_CONFIG.ui.heroDescLimit,
    autoPlayInterval: SYSTEM_CONFIG.ui.heroAutoPlayInterval,
    defaultYear: String(MOVIE_FALLBACK_DEFAULTS.year)
  },

  categories: {
    new: {
      id: 'new',
      title: 'Phim mới',
      // The OPAQUE TOKEN of the endpoint. The real path lives on the
      // server, so it never reaches the client bundle.
      endpoint: RT.moviesLatest
    },
    series: {
      id: 'series',
      title: 'Phim bộ',
      endpoint: RT.formatsSeriesMovies
    },
    single: {
      id: 'single',
      title: 'Phim lẻ',
      endpoint: RT.formatsSingleMovies
    }
  },

  ui: {
    defaultPoster: LOCAL_DEFAULT_POSTER,
    defaultBackdrop: LOCAL_DEFAULT_BACKDROP,
    itemsPerPage: SYSTEM_CONFIG.ui.itemsPerPage
  }
} as const;

/**
 * Returns the API endpoint configured for a category.
 *
 * @param categoryKey - The key that identifies the category.
 * @returns The full or the relative API endpoint.
 */
export const getCategoryEndpoint = (categoryKey: string): string => {
  const category = (MOVIE_CONFIG.categories as Record<string, { endpoint: string }>)[categoryKey];
  return category ? category.endpoint : MOVIE_CONFIG.categories.new.endpoint;
};

/**
 * Tells whether the mock data mode is enabled.
 *
 * @returns `true` when the mock data has to be used.
 */
export const isMockModeActive = (): boolean => {
  return MOVIE_CONFIG.useMockData;
};

export default MOVIE_CONFIG;
