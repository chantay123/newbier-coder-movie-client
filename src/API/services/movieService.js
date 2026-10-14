/**
 * @file movieService.js
 * @description Safe & Resilient Movie API Service with zero uncaught exceptions.
 * Automatically handles backend envelope normalization and graceful empty fallbacks.
 */

import { MOVIE_CONFIG } from '@/config/movieConfig';
import { SYSTEM_CONFIG } from '@/config/systemConfig';
import {
  resolveCountryTaxonomy,
  resolveCategoryTaxonomy
} from '@/config/taxonomyConfig';

/**
 * Resolves API Base URL from centralized movieConfig (strictly via environment).
 */
const getBaseUrl = () => MOVIE_CONFIG.apiBaseUrl;

/**
 * Normalizes movie lists from various backend envelope schemas into a clean Array.
 * Supports Fastify Enterprise ({ responseData: [...] } or { responseData: { data: [...] } }),
 * legacy ({ data: { movies: [...] } }), and raw arrays.
 *
 * @param {Object|Array} json - Raw JSON response.
 * @returns {Array<Object>} Normalized array of movies.
 */
export const extractMovieList = (json) => {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.responseData)) return json.responseData;
  if (Array.isArray(json.responseData?.data)) return json.responseData.data;
  if (Array.isArray(json.data?.movies)) return json.data.movies;
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.movies)) return json.movies;
  return [];
};

/**
 * Safe HTTP Fetcher (Zero-Crash & Resilient).
 * Never throws uncaught errors and never spams red logs into the console.
 * Returns normalized data or safe fallback directly.
 *
 * Behavior:
 *   - Adds a Bearer token (if one is present in storage) to every request.
 *     Several `/api/v1/*` endpoints on the production backend require
 *     auth (verified — 401 without a token). We attach the token only
 *     when it is present so this stays safe for unauthenticated calls.
 *   - On non-2xx responses, returns `fallback` without throwing.
 *   - On network errors / timeouts / aborts, returns `fallback` quietly.
 *
 * @param {string} endpoint - API path (e.g. '/movies?page=1&limit=20')
 * @param {Object} [options={}] - Custom fetch options (headers, signal, timeout)
 * @param {*} [fallback=null] - Value returned when request fails or returns non-200
 * @returns {Promise<*>}
 */
export async function safeFetchJson(endpoint, options = {}, fallback = null) {
  const base = getBaseUrl();
  if (!base) return fallback;

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    const controller = new AbortController();
    const timeoutMs = options.timeout || 8000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const signal = options.signal || controller.signal;

    // Read the token once per call. Multiple storage lookups would be
    // wasteful and we don't want to block the UI on storage churn.
    const token = (typeof window !== 'undefined')
      ? (localStorage.getItem('auth_token') || localStorage.getItem('token'))
      : null;

    const headers = {
      Accept: 'application/json',
      ...(options.headers || {}),
    };
    if (token && token !== 'undefined' && token !== 'null') {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Controlled diagnostic: when NEXT_PUBLIC_DEBUG_MOVIES=true,
      // log the failing request for /movies endpoints so we can see
      // the real error from the backend.
      if (SYSTEM_CONFIG.debugMovies && endpoint.includes('/movies')) {
        // eslint-disable-next-line no-console
        console.log('[debug-movies] NON-OK', url, 'status', response.status);
      }
      // Graceful non-200 handling: returns fallback without throwing Error
      return fallback;
    }

    const json = await response.json();

    // Controlled diagnostic: when NEXT_PUBLIC_DEBUG_MOVIES=true and the
    // endpoint is one of the home-page movie endpoints, log a compact
    // view of the response so the shape can be inspected in DevTools.
    if (SYSTEM_CONFIG.debugMovies && /\/movies(\?|$|\/)/.test(endpoint)) {
      // eslint-disable-next-line no-console
      console.log('[debug-movies] RESPONSE', {
        endpoint,
        url,
        topLevelKeys: json && typeof json === 'object' ? Object.keys(json) : null,
        envelopeResponseData: json?.responseData
          ? { type: Array.isArray(json.responseData) ? 'array' : typeof json.responseData, keys: Array.isArray(json.responseData) ? null : Object.keys(json.responseData) }
          : null,
        count: Array.isArray(json?.responseData)
          ? json.responseData.length
          : (Array.isArray(json?.responseData?.data) ? json.responseData.data.length : null),
        firstMovie: json?.responseData?.[0]
          ?? json?.responseData?.data?.[0]
          ?? json?.data?.[0]
          ?? json?.movies?.[0]
          ?? json?.[0]
          ?? null
      });
    }

    return json;
  } catch (err) {
    if (SYSTEM_CONFIG.debugMovies && endpoint.includes('/movies')) {
      // eslint-disable-next-line no-console
      console.log('[debug-movies] FETCH ERROR', url, err?.message || err);
    }
    // Network abort, timeout, or unreachable host -> returns fallback quietly
    return fallback;
  }
}

/**
 * Fetches an endpoint and extracts a normalized Array of movies.
 * 
 * @param {string} endpoint - API path
 * @param {number} [limit] - Maximum items to return
 * @param {Object} [options={}] - Fetch options
 * @returns {Promise<Array<Object>>}
 */
export async function safeFetchMovieList(endpoint, limit, options = {}) {
  const json = await safeFetchJson(endpoint, options, []);
  const list = extractMovieList(json);
  return typeof limit === 'number' && limit > 0 ? list.slice(0, limit) : list;
}

const movieService = {
  /**
   * Fetches latest movies for Hero spotlight.
   */
  getHeroMovies: (limit = 6, signal) =>
    safeFetchMovieList('/movies/latest', limit, { signal }),

  /**
   * Fetches trending movies (phim thịnh hành).
   */
  getTrendingMovies: (signal) =>
    safeFetchMovieList('/movies/trending', undefined, { signal }),

  /**
   * Fetches top rated movies (phim đánh giá cao).
   */
  getTopRatedMovies: (signal) =>
    safeFetchMovieList('/movies/top-rated', undefined, { signal }),

  /**
   * Fetches movies by page and limit.
   */
  getMoviesPage: (page = 1, limit = 10, signal) =>
    safeFetchMovieList(`/movies?page=${page}&limit=${limit}`, limit, { signal }),

  /**
   * Fetches latest movies.
   */
  getLatestMovies: (signal) =>
    safeFetchMovieList('/movies', undefined, { signal }),

  /**
   * Fetches the homepage movie list per spec: `GET /api/v1/movies?page=1&limit=20`.
   * Returns a normalized array of movies (or [] on any failure). The
   * safeFetchJson layer attaches the Bearer token automatically when one
   * is present (production endpoint requires auth — verified).
   *
   * @param {AbortSignal} [signal] - Optional signal for cancellation.
   * @returns {Promise<Array<Object>>} Up to 20 normalized movies.
   */
  getHomeMovies: (signal) =>
    safeFetchMovieList('/movies?page=1&limit=20', 20, { signal }),

  /**
   * Fetches movies by country slug (e.g. 'han-quoc', 'trung-quoc') with multi-tier fallback:
   * 1. Query registered backend slug variants from taxonomyConfig
   * 2. Search query fallback from taxonomyConfig
   * 3. General movies page with client-side country tag filter
   */
  getMoviesByCountry: async (countrySlug, limit = 20, signal) => {
    if (!countrySlug) return [];

    const meta = resolveCountryTaxonomy(countrySlug);
    const variants = meta?.backendSlugs || [countrySlug];

    // Tier 1: Query backend /countries/{slug}/movies
    for (const v of variants) {
      const list = await safeFetchMovieList(`/countries/${encodeURIComponent(v)}/movies`, limit, { signal });
      if (Array.isArray(list) && list.length > 0) return list;
    }

    // Tier 2: Search keyword fallback
    const keyword = meta?.searchKeyword;
    if (keyword) {
      const searchList = await safeFetchMovieList(`/movies/search?q=${encodeURIComponent(keyword)}`, limit, { signal });
      if (Array.isArray(searchList) && searchList.length > 0) return searchList;
    }

    // Tier 3: Fetch general movies and filter client-side
    const all = await safeFetchMovieList('/movies?page=1&limit=50', undefined, { signal });
    if (Array.isArray(all) && all.length > 0) {
      const filtered = all.filter((m) => {
        const countryList = m.country || m.countries || [];
        return countryList.some?.((c) => {
          const s = (c.slug || '').toLowerCase();
          const n = (c.name || '').toLowerCase();
          return s.includes(countrySlug) || n.includes(countrySlug.split('-')[0]);
        });
      });
      if (filtered.length > 0) {
        return typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
      }
    }

    return [];
  },

  /**
   * Fetches movies by category slug (e.g. 'hoat-hinh', 'hanh-dong') with multi-tier fallback:
   * 1. Query registered backend slug variants from taxonomyConfig
   * 2. Search query fallback from taxonomyConfig
   * 3. Legacy endpoint fallback: `/movies/category/${slug}`
   */
  getMoviesByCategory: async (categorySlug, limit = 20, signal) => {
    if (!categorySlug) return [];

    const meta = resolveCategoryTaxonomy(categorySlug);
    const variants = meta?.backendSlugs || [categorySlug];

    // Tier 1: Query backend /categories/{slug}/movies
    for (const v of variants) {
      const list = await safeFetchMovieList(`/categories/${encodeURIComponent(v)}/movies`, limit, { signal });
      if (Array.isArray(list) && list.length > 0) return list;
    }

    // Tier 2: Search keyword fallback
    const keyword = meta?.searchKeyword;
    if (keyword) {
      const searchList = await safeFetchMovieList(`/movies/search?q=${encodeURIComponent(keyword)}`, limit, { signal });
      if (Array.isArray(searchList) && searchList.length > 0) return searchList;
    }

    // Tier 3: Legacy endpoint fallback
    return safeFetchMovieList(`/movies/category/${categorySlug}`, limit, { signal });
  },

  /**
   * Fetches full movie details by slug.
   */
  getMovieDetails: (slug, signal) =>
    safeFetchJson(`/movies/${slug}`, { signal }, null),

  /**
   * Multi-source fallback resolution for Top 10 movies.
   */
  getTop10Movies: async (signal) => {
    // 1. Attempt trending
    let movies = await movieService.getTrendingMovies(signal);
    if (Array.isArray(movies) && movies.length > 0) return movies.slice(0, 10);

    // 2. Attempt top-rated
    movies = await movieService.getTopRatedMovies(signal);
    if (Array.isArray(movies) && movies.length > 0) return movies.slice(0, 10);

    // 3. Fallback to general movies page
    movies = await movieService.getMoviesPage(1, 10, signal);
    if (Array.isArray(movies) && movies.length > 0) return movies.slice(0, 10);

    return [];
  },

  /**
   * Searches movies with query and filters.
   */
  searchMovies: async (query, filters = {}, page = 1, size = 20) => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    params.append('page', page);
    params.append('size', size);
    if (filters.category) params.append('category', filters.category);
    if (filters.country) params.append('country', filters.country);
    if (filters.year) params.append('year', filters.year);
    if (filters.type) params.append('type', filters.type);
    if (filters.duration) params.append('duration', filters.duration);
    params.append('search_description', 'true');
    params.append('search_all_fields', 'true');

    const result = await safeFetchJson(`/search?${params.toString()}`, {}, { hits: [], total: 0 });
    const list = extractMovieList(result) || result?.hits || [];

    return {
      hits: Array.isArray(list) ? list : [],
      total: result?.total || list.length,
      maxScore: result?.maxScore || 0
    };
  },

  /**
   * Fetches newest movies with pagination metadata.
   */
  getNewestMovies: async (page = 1, size = 20) => {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('size', size);
    params.append('sort', 'newest');

    const result = await safeFetchJson(`/movies?${params.toString()}`, {}, null);
    const items = extractMovieList(result);

    return {
      items,
      pagination: result?.pagination || {
        currentPage: page,
        totalPages: Math.ceil(items.length / size) || 1,
        totalItems: items.length
      }
    };
  }
};

export default movieService;