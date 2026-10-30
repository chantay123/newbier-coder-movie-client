/**
 * The central declaration of the routes and of the feature flags per route.
 */

/**
 * The standard routes of the application.
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
 * The routes that show a full-bleed cinematic hero banner, without the
 * default top padding.
 */
export const FULL_BLEED_ROUTES: readonly string[] = [
  ROUTES.HOME,
  ROUTES.MOVIE_PREFIX
];

/**
 * Tells whether a pathname has to be rendered as full-bleed.
 *
 * @param pathname - The current path, for example "/" or "/movie/batman".
 * @returns `true` when the route has a full-bleed hero banner.
 */
export const isFullBleedRoute = (pathname: string | null | undefined): boolean => {
  if (!pathname) return false;
  return pathname === ROUTES.HOME || pathname.startsWith(ROUTES.MOVIE_PREFIX);
};

/**
 * The routes that do not show a banner advertisement by default.
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
 * Returns the list of routes where the advertisement has to be hidden.
 *
 * The environment variable takes priority over the default configuration.
 *
 * @returns The route prefixes that are excluded from the advertisements.
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
 * Tells whether the advertisement can be shown on the current path.
 *
 * @param pathname - The current path, for example "/admin/dashboard".
 * @param hideHomepageAds - The flag sent by `AdContext` to hide the
 *                          advertisements of the home page.
 * @returns `true` when the advertisement is allowed, `false` when it has
 *          to be hidden.
 */
export const isAdVisibleForPath = (pathname: string | null | undefined, hideHomepageAds: boolean): boolean => {
  if (hideHomepageAds) return false;
  if (!pathname) return false;

  const excludedPaths = getAdExcludedPaths();
  const isExcluded = excludedPaths.some((prefix) => pathname.startsWith(prefix));

  return !isExcluded;
};
