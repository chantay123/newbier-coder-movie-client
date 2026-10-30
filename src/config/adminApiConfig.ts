/**
 * @file adminApiConfig.ts
 * @description Centralized API configuration and endpoints map for the Admin module.
 * Eliminates all hardcoded API strings across admin services and components.
 *
 * WHY THE ENDPOINTS ARE RELATIVE PATHS
 * The endpoints are relative paths, so the shared axios instance joins them
 * with its own `baseURL`. The base URL is resolved by `getApiBaseUrl()`,
 * which returns the same-origin proxy prefix in the browser and the real
 * backend URL on the server. That keeps the backend host out of the client
 * bundle and makes the browser talk to the same origin only.
 *
 * The paths themselves live in `src/config/apiPaths.ts`, the single source
 * of truth for every backend endpoint.
 */

import { apiPath, withQuery } from './apiPaths';

/**
 * Helper to build safe query strings without leaving undefined/null values.
 * @param base Base path
 * @param params Query parameters key-value object
 * @returns Fully formatted path with query string
 */
export function buildQueryUrl(
  base: string,
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  return withQuery(base, params as Record<string, string | number | undefined | null>);
}

/**
 * Admin API ConfigMap.
 * Immutable dictionary containing endpoints for all admin microservices and taxonomies.
 */
export const ADMIN_API_CONFIG_MAP = Object.freeze({
  years: {
    /** GET /years - Public list of release years */
    list: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
      buildQueryUrl(apiPath('taxonomyYears'), { ...params, _t: Date.now() }),
    /** GET /years - Standard alias */
    adminList: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
      buildQueryUrl(apiPath('taxonomyYears'), { ...params, _t: Date.now() }),
    /** GET /years - Public list without a query string */
    publicList: () => apiPath('taxonomyYears'),
    /** GET /movies/years - Alternate listing */
    moviesYears: () => apiPath('moviesYears'),
    /** POST /admin/years - Create new release year */
    create: () => apiPath('adminYearsList'),
    /** GET /admin/years/:id - Get release year details */
    detail: (id: string) => apiPath('adminYearsById', id),
    /** PUT/PATCH /admin/years/:id - Update release year */
    update: (id: string) => apiPath('adminYearsById', id),
    /** DELETE /admin/years/:id - Remove release year */
    delete: (id: string) => apiPath('adminYearsById', id),
    /** PATCH /admin/years/:id/status - Toggle active/inactive status */
    toggleStatus: (id: string) => apiPath('adminYearsToggleStatus', id),
  },
} as const);

export type AdminApiConfigMap = typeof ADMIN_API_CONFIG_MAP;
