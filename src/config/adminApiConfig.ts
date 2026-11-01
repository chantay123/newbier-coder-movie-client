/**
 * @file adminApiConfig.ts
 * @description Centralized API configuration and endpoints map for the Admin module.
 * Eliminates all hardcoded API strings across admin services and components.
 * ConfigMap values are dynamically resolved from environment variables with safe fallbacks.
 */

const stripTrailingSlash = (url: string | undefined | null): string =>
  url ? String(url).replace(/\/+$/, '') : '';

/**
 * Base REST API URL for Admin services.
 * Respects NEXT_PUBLIC_CORE_API_URL first, followed by NEXT_PUBLIC_API_URL, and defaults to local.
 */
export const ADMIN_BASE_API_URL: string = (() => {
  const adminUrl = stripTrailingSlash(process.env.NEXT_PUBLIC_ADMIN_API_URL);
  if (adminUrl) return adminUrl;
  const coreUrl = stripTrailingSlash(process.env.NEXT_PUBLIC_CORE_API_URL);
  if (coreUrl) return coreUrl;
  const standardUrl = stripTrailingSlash(process.env.NEXT_PUBLIC_API_URL);
  if (standardUrl) return standardUrl;
  return 'https://core-movie-service.onrender.com/api/v1';
})();

/**
 * Helper to build safe query strings without leaving undefined/null values.
 * @param base Base URL
 * @param params Query parameters key-value object
 * @returns Fully formatted URL with query string
 */
export function buildQueryUrl(
  base: string,
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  if (!params) return base;
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `${base}?${queryString}` : base;
}

/**
 * Admin API ConfigMap.
 * Immutable dictionary containing endpoints for all admin microservices and taxonomies.
 */
export const ADMIN_API_CONFIG_MAP = Object.freeze({
  years: {
    /** Primary GET /api/v1/years */
    list: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
      buildQueryUrl(`${ADMIN_BASE_API_URL}/years`, { ...params, _t: Date.now() }),
    /** Standard GET /api/v1/years alias */
    adminList: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
      buildQueryUrl(`${ADMIN_BASE_API_URL}/years`, { ...params, _t: Date.now() }),
    /** Public GET /api/v1/years */
    publicList: () => `${ADMIN_BASE_API_URL}/years`,
    /** Alternate GET /api/v1/movies/years */
    moviesYears: () => `${ADMIN_BASE_API_URL}/movies/years`,
    /** POST /api/v1/admin/years - Create new release year */
    create: () => `${ADMIN_BASE_API_URL}/admin/years`,
    /** GET /api/v1/admin/years/:id - Get release year details */
    detail: (id: string) => `${ADMIN_BASE_API_URL}/admin/years/${encodeURIComponent(id)}`,
    /** PUT/PATCH /api/v1/admin/years/:id - Update release year */
    update: (id: string) => `${ADMIN_BASE_API_URL}/admin/years/${encodeURIComponent(id)}`,
    /** DELETE /api/v1/admin/years/:id - Remove release year */
    delete: (id: string) => `${ADMIN_BASE_API_URL}/admin/years/${encodeURIComponent(id)}`,
    /** PATCH /api/v1/admin/years/:id/status - Toggle active/inactive status */
    toggleStatus: (id: string) => `${ADMIN_BASE_API_URL}/admin/years/${encodeURIComponent(id)}/status`,
  },
  actors: {
    /** Primary GET /api/v1/admin/actors */
    list: (params?: { page?: number; limit?: number; search?: string; gender?: string; isActive?: boolean }) =>
      buildQueryUrl(`${ADMIN_BASE_API_URL}/admin/actors`, { ...params, _t: Date.now() }),
    /** POST /api/v1/admin/actors - Create new actor */
    create: () => `${ADMIN_BASE_API_URL}/admin/actors`,
    /** GET /api/v1/admin/actors/:id - Get actor details */
    detail: (id: string) => `${ADMIN_BASE_API_URL}/admin/actors/${encodeURIComponent(id)}`,
    /** PUT /api/v1/admin/actors/:id - Update actor */
    update: (id: string) => `${ADMIN_BASE_API_URL}/admin/actors/${encodeURIComponent(id)}`,
    /** DELETE /api/v1/admin/actors/:id - Remove actor */
    delete: (id: string) => `${ADMIN_BASE_API_URL}/admin/actors/${encodeURIComponent(id)}`,
  },
} as const);

export type AdminApiConfigMap = typeof ADMIN_API_CONFIG_MAP;
