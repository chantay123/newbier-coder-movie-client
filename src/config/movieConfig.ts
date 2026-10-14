/**
 * @file movieConfig.ts
 * @description Cấu hình tập trung cho trang phim, hero banner, và data providers.
 * Đồng bộ với SYSTEM_CONFIG và movieFallbackConfig.
 */

import { SYSTEM_CONFIG } from './systemConfig';
import {
  LOCAL_DEFAULT_BACKDROP,
  LOCAL_DEFAULT_POSTER,
  MOVIE_FALLBACK_DEFAULTS
} from './movieFallbackConfig';

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
 * Cấu hình phim, đồng bộ với SYSTEM_CONFIG toàn cục.
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
      endpoint: 'movies/latest'
    },
    series: {
      id: 'series',
      title: 'Phim bộ',
      endpoint: 'formats/series/movies'
    },
    single: {
      id: 'single',
      title: 'Phim lẻ',
      endpoint: 'formats/single/movies'
    }
  },

  ui: {
    defaultPoster: LOCAL_DEFAULT_POSTER,
    defaultBackdrop: LOCAL_DEFAULT_BACKDROP,
    itemsPerPage: SYSTEM_CONFIG.ui.itemsPerPage
  }
} as const;

/**
 * Lấy endpoint API đã cấu hình cho một category.
 *
 * @param categoryKey Khóa định danh category
 * @returns Endpoint API đầy đủ hoặc tương đối
 */
export const getCategoryEndpoint = (categoryKey: string): string => {
  const category = (MOVIE_CONFIG.categories as Record<string, { endpoint: string }>)[categoryKey];
  return category ? category.endpoint : MOVIE_CONFIG.categories.new.endpoint;
};

/**
 * Kiểm tra mock data mode có đang bật không.
 *
 * @returns True nếu nên dùng mock data
 */
export const isMockModeActive = (): boolean => {
  return MOVIE_CONFIG.useMockData;
};

export default MOVIE_CONFIG;
