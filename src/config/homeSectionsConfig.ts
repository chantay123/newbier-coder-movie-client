/**
 * The registry of the home page sections and of their fallback strategy.
 *
 * The file gathers the layout order, the custom props, the UI labels and
 * the load moment of every section.
 *
 * ARCHITECTURE - BATCHED SEQUENTIAL LOADING:
 * - Every section declares `loadAfterScroll`.
 * - `loadAfterScroll: false`: the section loads in the same batch as the
 *   previous one.
 * - `loadAfterScroll: true`: it is a stop point, the section only loads
 *   when the user scrolls to it.
 * - `BATCH_LOADING_CONFIG.delayMs`: the waiting time (2000ms by default)
 *   with a spinner before a batch is revealed.
 */

import movieService from '@/API/services/movieService';
import { SYSTEM_CONFIG } from './systemConfig';

/**
 * The default waiting time (ms) before a batch is revealed when the scroll
 * breakpoint is reached.
 *
 * It was reduced from 2000ms to 1200ms to improve the perceived performance.
 */
export const BATCH_LOADING_CONFIG = {
  delayMs: 1200
} as const;

/** The dictionary of the UI labels. */
export const HOME_I18N = {
  vi: {
    heroTitle: 'Phim Nổi Bật',
    recommendedTitle: 'Phim Đề Cử Cho Bạn',
    top10Title: 'Phim Được Xem Nhiều Nhất',
    top10Badge: 'TOP 10',
    countryTitle: 'Phim Hàn Quốc & Trung Quốc Đặc Sắc',
    koreanRailTitle: 'Phim Hàn Quốc Mới',
    koreanRailBadge: 'K-DRAMA',
    chineseRailTitle: 'Phim Trung Quốc Mới',
    chineseRailBadge: 'C-DRAMA',
    bigSlideTitle: 'Tiêu Điểm Anime',
    bigSlideBadge: 'ANIME SPOTLIGHT',
    animationTitle: 'Phim Hoạt Hình & Anime',
    animationBadge: 'ANIME & CARTOON',
    latestTitle: 'Phim Mới Cập Nhật',
    radarTitle: 'Radar Xu Hướng Thể Loại',
    communityTitle: 'Cộng Đồng Thảo Luận Trực Tuyến',
    upcomingTitle: 'Phim Sắp Chiếu Đáng Chờ Đợi',
    loadMoreContent: 'Tải thêm nội dung',
    loadingContent: 'Đang tải nội dung...',
    infiniteLoading: 'Đang tải thêm nội dung...',
    allLoaded: 'Đã hiển thị toàn bộ nội dung'
  },
  en: {
    heroTitle: 'Featured Spotlight',
    recommendedTitle: 'Recommended For You',
    top10Title: 'Most Viewed Movies',
    top10Badge: 'TOP 10',
    countryTitle: 'K-Drama & C-Drama Highlights',
    koreanRailTitle: 'Trending Korean Drama',
    koreanRailBadge: 'K-DRAMA',
    chineseRailTitle: 'Trending Chinese Drama',
    chineseRailBadge: 'C-DRAMA',
    bigSlideTitle: 'Anime Spotlight',
    bigSlideBadge: 'ANIME SPOTLIGHT',
    animationTitle: 'Animation & Anime Showcase',
    animationBadge: 'ANIME & CARTOON',
    latestTitle: 'Recently Added Movies',
    radarTitle: 'Genre Trending Radar',
    communityTitle: 'Live Community Discussion',
    upcomingTitle: 'Anticipated Upcoming Releases',
    loadMoreContent: 'Load more content',
    loadingContent: 'Loading content...',
    infiniteLoading: 'Loading more movies...',
    allLoaded: 'All content loaded'
  }
} as const;

export type LocaleKey = keyof typeof HOME_I18N;
type Locale = typeof HOME_I18N[LocaleKey];

/** The current language. It is kept in sync with `SYSTEM_CONFIG`. */
export const CURRENT_LOCALE = (SYSTEM_CONFIG.locale || 'vi') as LocaleKey;

/**
 * Translates a UI label.
 *
 * @param key - The key of the label inside the locale dictionary.
 * @returns The translated text, or the key itself when it is missing.
 */
export const t = (key: keyof Locale): string => HOME_I18N[CURRENT_LOCALE]?.[key] || key;

/** The supported card sizes. */
export type CardSize = 'sm' | 'md' | 'lg';

/** The loader function of a section. */
export type SectionLoader = (
  mock?: unknown[],
  page?: number,
  limit?: number
) => Promise<unknown[]>;

/** The custom options of a section. */
export interface SectionOverrides {
  id: string;
  enabled?: boolean;
  isFullWidth?: boolean;
  minHeight?: number;
  cardSize?: CardSize;
  limit?: number;
  loadAfterScroll?: boolean;
  delayMs?: number;
  badge?: string;
  title?: string;
  categorySlug?: string;
  autoPlayInterval?: number;
  viewAllHref?: string;
  rails?: RailItem[];
  load?: SectionLoader;
  defaultPeriod?: string;
  defaultCategory?: string;
}

/** A rail item of the country section. */
export interface RailItem {
  id: string;
  countrySlug?: string;
  categorySlug?: string;
  limit?: number;
  title: string;
  badge: string;
  viewAllHref?: string;
  load: (fallback?: unknown[]) => Promise<unknown[]>;
}

/** A complete section. */
export interface HomeSection {
  id: string;
  enabled: boolean;
  isFullWidth: boolean;
  minHeight: number;
  cardSize: 'sm' | 'md' | 'lg';
  limit: number;
  loadAfterScroll: boolean;
  delayMs: number;
  badge?: string;
  title?: string;
  categorySlug?: string;
  autoPlayInterval?: number;
  viewAllHref?: string;
  rails?: RailItem[];
  load?: (mock?: unknown[], page?: number, limit?: number) => Promise<unknown[]>;
  defaultPeriod?: string;
  defaultCategory?: string;
}

/**
 * Builds a section config from the default schema.
 *
 * @param options - The custom options of the section. Every missing value
 *                  falls back to the default of the schema.
 * @returns The complete section.
 */
export function defineSection(options: SectionOverrides): HomeSection {
  return {
    id: options.id,
    enabled: options.enabled ?? true,
    isFullWidth: options.isFullWidth ?? false,
    minHeight: options.minHeight ?? 320,
    cardSize: options.cardSize ?? 'md',
    limit: options.limit ?? 20,
    loadAfterScroll: options.loadAfterScroll ?? false,
    delayMs: options.delayMs ?? BATCH_LOADING_CONFIG.delayMs,
    badge: options.badge,
    title: options.title,
    categorySlug: options.categorySlug,
    autoPlayInterval: options.autoPlayInterval,
    viewAllHref: options.viewAllHref,
    rails: options.rails,
    load: options.load,
    defaultPeriod: options.defaultPeriod,
    defaultCategory: options.defaultCategory
  };
}

/**
 * Runs the steps one after the other and returns the first list with data.
 *
 * @param steps - The loaders to try, in order.
 * @param fallback - The data used when the API mode is `mock_only` or when
 *                   every step failed and the mode allows the mock data.
 * @returns The first non-empty list, or the fallback.
 */
export async function fetchFirstAvailable(
  steps: Array<() => Promise<unknown[]>> = [],
  fallback: unknown[] = []
): Promise<unknown[]> {
  const mode = SYSTEM_CONFIG.dataMode || 'api_only';
  if (mode === 'mock_only') return fallback;

  for (const step of steps) {
    try {
      const data = await step();
      if (Array.isArray(data) && data.length > 0) return data;
    } catch {
      // The error is ignored and the next fallback step is tried.
    }
  }

  return mode === 'api_only' ? [] : fallback;
}

/** The registry of the home page sections. */
export const HOME_SECTIONS: Record<string, HomeSection> = {
  // === BATCH 1: loaded as soon as the page opens ===
  hero: defineSection({
    id: 'hero',
    isFullWidth: true,
    minHeight: 520,
    limit: 6,
    loadAfterScroll: false,
    load: (mock = []) => fetchFirstAvailable([
      () => movieService.getHeroMovies(6),
      () => movieService.getMoviesPage(1, 6)
    ], mock)
  }),

  carousel_3d: defineSection({
    id: 'carousel_3d',
    isFullWidth: true,
    minHeight: 380,
    loadAfterScroll: false
  }),

  recommended: defineSection({
    id: 'recommended',
    minHeight: 320,
    limit: 12,
    loadAfterScroll: false,
    load: (mock = []) => fetchFirstAvailable([
      () => movieService.getMoviesPage(1, 12)
    ], mock)
  }),

  top10: defineSection({
    id: 'top10',
    minHeight: 280,
    limit: 10,
    badge: t('top10Badge'),
    loadAfterScroll: false,
    load: (mock = []) => fetchFirstAvailable([
      () => movieService.getTrendingMovies(),
      () => movieService.getTopRatedMovies(),
      () => movieService.getMoviesPage(1, 10)
    ], mock)
  }),

  // === BATCH 2: loaded when the user scrolls to them (breakpoint 1) ===
  country: defineSection({
    id: 'country',
    minHeight: 320,
    loadAfterScroll: true,
    delayMs: 1200,
    rails: [
      {
        id: 'korean',
        countrySlug: 'han-quoc',
        limit: 20,
        title: t('koreanRailTitle'),
        badge: t('koreanRailBadge'),
        viewAllHref: '/country/han-quoc',
        load: (fallback = []) => fetchFirstAvailable([
          () => movieService.getMoviesByCountry('han-quoc', 20)
        ], fallback)
      },
      {
        id: 'chinese',
        countrySlug: 'trung-quoc',
        limit: 20,
        title: t('chineseRailTitle'),
        badge: t('chineseRailBadge'),
        viewAllHref: '/country/trung-quoc',
        load: (fallback = []) => fetchFirstAvailable([
          () => movieService.getMoviesByCountry('trung-quoc', 20)
        ], fallback)
      }
    ]
  }),

  big_slide: defineSection({
    id: 'big_slide',
    minHeight: 360,
    title: t('bigSlideTitle'),
    badge: t('bigSlideBadge'),
    categorySlug: 'hoat-hinh',
    limit: 6,
    autoPlayInterval: 7000,
    viewAllHref: '/genre/hoat-hinh',
    loadAfterScroll: false,
    load: (mock = []) => fetchFirstAvailable([
      () => movieService.getMoviesByCategory('hoat-hinh', 6),
      () => movieService.getHeroMovies(6)
    ], mock)
  }),

  animation: defineSection({
    id: 'animation',
    minHeight: 320,
    title: t('animationTitle'),
    badge: t('animationBadge'),
    categorySlug: 'hoat-hinh',
    limit: 20,
    viewAllHref: '/genre/hoat-hinh',
    loadAfterScroll: false,
    load: (mock = []) => fetchFirstAvailable([
      () => movieService.getMoviesByCategory('hoat-hinh', 20)
    ], mock)
  }),

  // === BATCH 3: loaded when the user scrolls to them (breakpoint 2) ===
  latest: defineSection({
    id: 'latest',
    minHeight: 480,
    limit: 24,
    loadAfterScroll: true,
    delayMs: 1200,
    load: ((page: number = 1, limit: number = 24) =>
      movieService.getMoviesPage(page, limit)) as SectionOverrides['load']
  } as SectionOverrides),

  radar: defineSection({
    id: 'radar',
    enabled: false,
    minHeight: 320,
    title: t('radarTitle'),
    defaultPeriod: 'week',
    defaultCategory: 'views',
    loadAfterScroll: false
  }),

  community: defineSection({
    id: 'community',
    enabled: false,
    minHeight: 320,
    title: t('communityTitle'),
    limit: 10,
    loadAfterScroll: false
  }),

  // === BATCH 4: the last sections, loaded lazily ===
  upcoming: defineSection({
    id: 'upcoming',
    enabled: false,
    minHeight: 320,
    limit: 15,
    loadAfterScroll: true,
    delayMs: 1200
  })
};

/**
 * The display order of the sections.
 *
 * Change the array to change the order, and remove an id to hide a section
 * temporarily.
 */
export const HOME_SECTION_ORDER: readonly string[] = [
  'hero',
  'carousel_3d',
  'recommended',
  'top10',
  'country',
  'big_slide',
  'animation',
  'latest',
  'radar',
  'community',
  'upcoming'
];

export default HOME_SECTIONS;
