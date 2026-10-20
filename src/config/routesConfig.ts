/**
 * @file routesConfig.ts
 * @description Tập trung khai báo các route và cấu hình tính năng theo route.
 */

/**
 * Khai báo route tiêu chuẩn của ứng dụng.
 */
export const ROUTES = {
  HOME: '/',
  MOVIES: '/browse/movies',
  SERIES: '/browse/series',
  SCHEDULE: '/browse/schedule',
  SEARCH: '/search',
  PREMIUM: '/user/premium',
  PROFILE: '/profile',
  NO_ACCESS: '/noaccess',
  NOT_FOUND: '/404',
  MAINTENANCE: '/maintenance',
  SERVICE_UNAVAILABLE: '/503',
  AUTH_PREFIX: '/auth/',
  ADMIN_PREFIX: '/admin/',
  ACCOUNT_PREFIX: '/account/',
  PAYMENT_PREFIX: '/payment/',
  MOVIE_PREFIX: '/movie/'
} as const;

/**
 * Các route hiển thị full-bleed cinematic hero banner, không có padding đầu trang mặc định.
 */
export const FULL_BLEED_ROUTES: readonly string[] = [
  ROUTES.HOME,
  ROUTES.MOVIE_PREFIX
];

/**
 * Kiểm tra một pathname có nên render full-bleed hay không.
 *
 * @param pathname Đường dẫn hiện tại (ví dụ '/' hoặc '/movie/batman')
 * @returns True nếu route có hero banner full-bleed
 */
export const isFullBleedRoute = (pathname: string | null | undefined): boolean => {
  if (!pathname) return false;
  return pathname === ROUTES.HOME || pathname.startsWith(ROUTES.MOVIE_PREFIX);
};

/**
 * Các route mặc định không hiển thị quảng cáo banner.
 */
export const DEFAULT_AD_EXCLUDED_PATHS: readonly string[] = [
  ROUTES.AUTH_PREFIX,
  ROUTES.ADMIN_PREFIX,
  ROUTES.ACCOUNT_PREFIX,
  ROUTES.PAYMENT_PREFIX,
  ROUTES.NO_ACCESS,
  ROUTES.NOT_FOUND,
  ROUTES.MAINTENANCE,
  ROUTES.SERVICE_UNAVAILABLE,
  ROUTES.PROFILE,
  ROUTES.PREMIUM,
  ROUTES.SEARCH
];

/**
 * Lấy danh sách route cần ẩn quảng cáo.
 * Ưu tiên cấu hình từ biến môi trường trên cấu hình mặc định.
 *
 * @returns Mảng các route prefix cần loại khỏi quảng cáo
 */
export const getAdExcludedPaths = (): string[] => {
  const envConfig = process.env.NEXT_PUBLIC_AD_EXCLUDED_PATHS;
  if (envConfig && typeof envConfig === 'string') {
    return envConfig
      .split(',')
      .map((path) => path.trim())
      .filter(Boolean);
  }
  return [...DEFAULT_AD_EXCLUDED_PATHS];
};

/**
 * Kiểm tra xem quảng cáo có nên hiển thị cho pathname hiện tại không.
 *
 * @param pathname Đường dẫn hiện tại (ví dụ '/admin/dashboard')
 * @param hideHomepageAds Cờ từ AdContext để ẩn quảng cáo trang chủ
 * @returns True nếu quảng cáo được phép hiển thị, False nếu cần ẩn
 */
export const isAdVisibleForPath = (pathname: string | null | undefined, hideHomepageAds: boolean): boolean => {
  if (hideHomepageAds) return false;
  if (!pathname) return false;

  const excludedPaths = getAdExcludedPaths();
  const isExcluded = excludedPaths.some((prefix) => pathname.startsWith(prefix));

  return !isExcluded;
};
