/**
 * @file homeSectionsConfig.ts
 * @description Hệ thống đăng ký Section và chiến lược Fallback cho trang chủ.
 * Gom các layout orders, props tuỳ chỉnh, nhãn text và thời điểm load cho từng section.
 *
 * ARCHITECTURE - BATCHED SEQUENTIAL LOADING:
 * - Mỗi section khai báo `loadAfterScroll`.
 * - `loadAfterScroll: false`: Tải cùng batch với section trước đó.
 * - `loadAfterScroll: true`: Điểm dừng - chờ user scroll tới mới load.
 * - `BATCH_LOADING_CONFIG.delayMs`: Thời gian chờ (mặc định 2000ms) với spinner trước khi reveal batch.
 */

import movieService from '@/API/services/movieService';
import { SYSTEM_CONFIG } from './systemConfig';

/** Thời gian chờ mặc định (ms) trước khi reveal batch khi scroll breakpoint */
export const BATCH_LOADING_CONFIG = {
  delayMs: 2000
} as const;

/** Dictionary ngôn ngữ UI. */
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

/** Ngôn ngữ hiện tại, đồng bộ với SYSTEM_CONFIG */
export const CURRENT_LOCALE = (SYSTEM_CONFIG.locale || 'vi') as LocaleKey;

/** Hàm dịch theo key i18n */
export const t = (key: keyof Locale): string => HOME_I18N[CURRENT_LOCALE]?.[key] || key;

/** Loại card size hỗ trợ */
export type CardSize = 'sm' | 'md' | 'lg';

/** Hàm loader của section */
export type SectionLoader = (
  mock?: unknown[],
  page?: number,
  limit?: number
) => Promise<unknown[]>;

/** Options tuỳ chỉnh cho mỗi section */
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

/** Item rail cho section country */
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

/** Section đầy đủ */
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

/** Factory tạo section config với default schema */
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

/** Fetcher tuần tự - trả về mảng đầu tiên có dữ liệu */
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
      // Bỏ qua, chuyển sang bước fallback tiếp theo
    }
  }

  return mode === 'api_only' ? [] : fallback;
}

/** Hệ thống đăng ký các Section cho trang chủ */
export const HOME_SECTIONS: Record<string, HomeSection> = {
  // === BATCH 1: Tải ngay khi mở trang ===
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

  // === BATCH 2: Tải khi scroll tới (breakpoint 1) ===
  country: defineSection({
    id: 'country',
    minHeight: 320,
    loadAfterScroll: true,
    delayMs: 2000,
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

  // === BATCH 3: Tải khi scroll tới (breakpoint 2) ===
  latest: defineSection({
    id: 'latest',
    minHeight: 480,
    limit: 24,
    loadAfterScroll: true,
    delayMs: 2000,
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

  // === BATCH 4: SECTION CUỐI - LAZY ===
  upcoming: defineSection({
    id: 'upcoming',
    enabled: false,
    minHeight: 320,
    limit: 15,
    loadAfterScroll: true,
    delayMs: 2000
  })
};

/** Thứ tự hiển thị section. Đổi array để đổi thứ tự, xoá ID để ẩn section tạm thời. */
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
