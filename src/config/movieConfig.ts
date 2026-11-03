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
import { AP } from './apiPaths';

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
      // The relative path of the endpoint. The base URL is added by the
      // shared API layer, so the backend host never reaches the client.
      endpoint: AP.moviesLatest
    },
    series: {
      id: 'series',
      title: 'Phim bộ',
      endpoint: AP.formatsSeriesMovies
    },
    single: {
      id: 'single',
      title: 'Phim lẻ',
      endpoint: AP.formatsSingleMovies
    }
  },

  ui: {
    defaultPoster: LOCAL_DEFAULT_POSTER,
    defaultBackdrop: LOCAL_DEFAULT_BACKDROP,
    itemsPerPage: SYSTEM_CONFIG.ui.itemsPerPage
  }
} as const;

/**
 * Tells whether the mock data mode is enabled.
 *
 * @returns `true` when the mock data has to be used.
 */
export const isMockModeActive = (): boolean => {
  return MOVIE_CONFIG.useMockData;
};

export default MOVIE_CONFIG;
