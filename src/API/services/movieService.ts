/**
 * @file movieService.ts
 * @description Movie API Service an toàn & resilient, không bao giờ ném exception ra ngoài.
 * Tự động chuẩn hoá envelope backend và fallback rỗng mượt mà.
 */

import { MOVIE_CONFIG } from '@/config/movieConfig';
import { SYSTEM_CONFIG } from '@/config/systemConfig';
import {
  resolveCountryTaxonomy,
  resolveCategoryTaxonomy
} from '@/config/taxonomyConfig';

/** Movie entity thô từ backend */
export interface RawMovie {
  [key: string]: unknown;
}

/** Phản hồi backend dạng envelope chuẩn v1 */
export interface EnvelopeResponse<T = unknown> {
  responseStatus?: { responseCode?: string; responseMessage?: string };
  responseData?: T;
  data?: T;
  movies?: T;
  [key: string]: unknown;
}

/** Tùy chọn fetch */
export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
  timeout?: number;
}

/** Lấy base URL từ movieConfig (nguồn duy nhất từ env) */
const getBaseUrl = (): string => MOVIE_CONFIG.apiBaseUrl;

/**
 * Chuẩn hoá movie list từ nhiều envelope backend khác nhau về một Array sạch.
 * Hỗ trợ: Fastify Enterprise ({ responseData: [...] } hoặc { responseData: { data: [...] } }),
 * legacy ({ data: { movies: [...] } }), và raw array.
 *
 * @param json Raw JSON response
 * @returns Mảng phim đã chuẩn hoá
 */
export const extractMovieList = (json: unknown): RawMovie[] => {
  if (!json) return [];
  if (Array.isArray(json)) return json as RawMovie[];

  const env = json as EnvelopeResponse<unknown>;

  if (Array.isArray(env.responseData)) return env.responseData as RawMovie[];
  if (Array.isArray((env.responseData as { data?: unknown[] } | undefined)?.data)) {
    return (env.responseData as { data: unknown[] }).data as RawMovie[];
  }
  if (Array.isArray((env.data as { movies?: unknown[] } | undefined)?.movies)) {
    return (env.data as { movies: unknown[] }).movies as RawMovie[];
  }
  if (Array.isArray(env.data)) return env.data as RawMovie[];
  if (Array.isArray(env.movies)) return env.movies as RawMovie[];
  return [];
};

/**
 * Safe HTTP Fetcher (Zero-Crash & Resilient).
 * Không bao giờ throw exception ra ngoài, không spam log đỏ.
 * Trả về dữ liệu đã chuẩn hoá hoặc fallback an toàn.
 *
 * @param endpoint API path
 * @param options Custom fetch options (headers, signal, timeout)
 * @param fallback Giá trị trả về khi request fail hoặc trả non-200
 * @returns Promise resolve dữ liệu hoặc fallback
 */
export async function safeFetchJson<T = unknown>(
  endpoint: string,
  options: FetchOptions = {},
  fallback: T | null = null
): Promise<T | null> {
  const base = getBaseUrl();
  if (!base) return fallback;

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    const controller = new AbortController();
    const timeoutMs = options.timeout || 8000;
    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => controller.abort(), timeoutMs);
    const signal = options.signal || controller.signal;

    // Đọc token một lần. Multi-storage lookup sẽ lãng phí và có thể chặn UI.
    const token = (typeof window !== 'undefined')
      ? (localStorage.getItem('auth_token') || localStorage.getItem('token'))
      : null;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers || {})
    };
    if (token && token !== 'undefined' && token !== 'null') {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Controlled diagnostic
      if (SYSTEM_CONFIG.debugMovies && endpoint.includes('/movies')) {
        // eslint-disable-next-line no-console
        console.log('[debug-movies] NON-OK', url, 'status', response.status);
      }
      return fallback;
    }

    const json = (await response.json()) as EnvelopeResponse;

    if (SYSTEM_CONFIG.debugMovies && /\/movies(\?|$|\/)/.test(endpoint)) {
      // eslint-disable-next-line no-console
      console.log('[debug-movies] RESPONSE', {
        endpoint,
        url,
        topLevelKeys: json && typeof json === 'object' ? Object.keys(json) : null,
        envelopeResponseData: json?.responseData
          ? {
              type: Array.isArray(json.responseData) ? 'array' : typeof json.responseData,
              keys: Array.isArray(json.responseData) ? null : Object.keys(json.responseData)
            }
          : null,
        count: Array.isArray(json?.responseData)
          ? json.responseData.length
          : (Array.isArray((json?.responseData as { data?: unknown[] } | undefined)?.data)
              ? ((json.responseData as { data: unknown[] }).data).length
              : null),
        firstMovie: ((json?.responseData as unknown[] | undefined)?.[0]
          ?? (json?.responseData as { data?: unknown[] } | undefined)?.data?.[0]
          ?? (json?.data as unknown[] | undefined)?.[0]
          ?? (json?.movies as unknown[] | undefined)?.[0]
          ?? (Array.isArray(json) ? (json as unknown[])[0] : null)
          ?? null) as RawMovie | null
      });
    }

    return json as unknown as T;
  } catch (err) {
    if (SYSTEM_CONFIG.debugMovies && endpoint.includes('/movies')) {
      // eslint-disable-next-line no-console
      console.log('[debug-movies] FETCH ERROR', url, (err as Error)?.message || err);
    }
    return fallback;
  }
}

/**
 * Fetch một endpoint và trích xuất mảng phim đã chuẩn hoá.
 *
 * @param endpoint API path
 * @param limit Số lượng tối đa trả về
 * @param options Fetch options
 * @returns Promise resolve mảng phim
 */
export async function safeFetchMovieList(
  endpoint: string,
  limit?: number,
  options: FetchOptions = {}
): Promise<RawMovie[]> {
  const json = await safeFetchJson<unknown>(endpoint, options, []);
  const list = extractMovieList(json);
  return typeof limit === 'number' && limit > 0 ? list.slice(0, limit) : list;
}

/** Service object chính cho movie API */
const movieService = {
  /** Lấy phim mới nhất cho Hero spotlight */
  getHeroMovies: (limit = 6, signal?: AbortSignal): Promise<RawMovie[]> =>
    safeFetchMovieList('/movies/latest', limit, { signal }),

  /** Lấy phim thịnh hành */
  getTrendingMovies: (signal?: AbortSignal): Promise<RawMovie[]> =>
    safeFetchMovieList('/movies/trending', undefined, { signal }),

  /** Lấy phim đánh giá cao */
  getTopRatedMovies: (signal?: AbortSignal): Promise<RawMovie[]> =>
    safeFetchMovieList('/movies/top-rated', undefined, { signal }),

  /** Lấy phim theo trang & giới hạn */
  getMoviesPage: (page = 1, limit = 10, signal?: AbortSignal): Promise<RawMovie[]> =>
    safeFetchMovieList(`/movies?page=${page}&limit=${limit}`, limit, { signal }),

  /** Lấy phim mới (không giới hạn) */
  getLatestMovies: (signal?: AbortSignal): Promise<RawMovie[]> =>
    safeFetchMovieList('/movies', undefined, { signal }),

  /**
   * Lấy danh sách phim trang chủ theo spec: `GET /api/v1/movies?page=1&limit=20`.
   * Trả về mảng phim chuẩn hoá (hoặc [] khi fail).
   */
  getHomeMovies: (signal?: AbortSignal): Promise<RawMovie[]> =>
    safeFetchMovieList('/movies?page=1&limit=20', 20, { signal }),

  /**
   * Lấy phim theo slug quốc gia với fallback đa tầng:
   * 1. Query slug backend đã đăng ký từ taxonomyConfig
   * 2. Search keyword fallback từ taxonomyConfig
   * 3. Filter client-side từ danh sách tổng quát
   */
  getMoviesByCountry: async (countrySlug: string, limit = 20, signal?: AbortSignal): Promise<RawMovie[]> => {
    if (!countrySlug) return [];

    const meta = resolveCountryTaxonomy(countrySlug);
    const variants: string[] = meta?.backendSlugs || [countrySlug];

    // Tier 1: Query backend /countries/{slug}/movies
    for (const v of variants) {
      const list = await safeFetchMovieList(
        `/countries/${encodeURIComponent(v)}/movies`,
        limit,
        { signal }
      );
      if (Array.isArray(list) && list.length > 0) return list;
    }

    // Tier 2: Search keyword fallback
    const keyword = meta?.searchKeyword;
    if (keyword) {
      const searchList = await safeFetchMovieList(
        `/movies/search?q=${encodeURIComponent(keyword)}`,
        limit,
        { signal }
      );
      if (Array.isArray(searchList) && searchList.length > 0) return searchList;
    }

    // Tier 3: Fetch general movies and filter client-side
    const all = await safeFetchMovieList('/movies?page=1&limit=50', undefined, { signal });
    if (Array.isArray(all) && all.length > 0) {
      const firstSlugToken = countrySlug.split('-')[0] || '';
      const filtered = all.filter((m) => {
        const countryList = (m.country as unknown[] | undefined) || (m.countries as unknown[] | undefined) || [];
        return countryList.some?.((c) => {
          const country = c as { slug?: string; name?: string };
          const s = (country.slug || '').toLowerCase();
          const n = (country.name || '').toLowerCase();
          return s.includes(countrySlug) || n.includes(firstSlugToken);
        });
      });
      if (filtered.length > 0) {
        return typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
      }
    }

    return [];
  },

  /**
   * Lấy phim theo slug thể loại với fallback đa tầng:
   * 1. Query slug backend đã đăng ký từ taxonomyConfig
   * 2. Search keyword fallback
   * 3. Legacy endpoint: `/movies/category/${slug}`
   */
  getMoviesByCategory: async (categorySlug: string, limit = 20, signal?: AbortSignal): Promise<RawMovie[]> => {
    if (!categorySlug) return [];

    const meta = resolveCategoryTaxonomy(categorySlug);
    const variants: string[] = meta?.backendSlugs || [categorySlug];

    // Tier 1: Query backend /categories/{slug}/movies
    for (const v of variants) {
      const list = await safeFetchMovieList(
        `/categories/${encodeURIComponent(v)}/movies`,
        limit,
        { signal }
      );
      if (Array.isArray(list) && list.length > 0) return list;
    }

    // Tier 2: Search keyword fallback
    const keyword = meta?.searchKeyword;
    if (keyword) {
      const searchList = await safeFetchMovieList(
        `/movies/search?q=${encodeURIComponent(keyword)}`,
        limit,
        { signal }
      );
      if (Array.isArray(searchList) && searchList.length > 0) return searchList;
    }

    // Tier 3: Legacy endpoint fallback
    return safeFetchMovieList(`/movies/category/${categorySlug}`, limit, { signal });
  },

  /** Lấy chi tiết phim theo slug */
  getMovieDetails: (slug: string, signal?: AbortSignal): Promise<EnvelopeResponse | null> =>
    safeFetchJson<EnvelopeResponse>(`/movies/${slug}`, { signal }, null),

  /**
   * Multi-source fallback resolution cho Top 10 movies.
   */
  getTop10Movies: async (signal?: AbortSignal): Promise<RawMovie[]> => {
    // 1. Trending
    let movies = await movieService.getTrendingMovies(signal);
    if (Array.isArray(movies) && movies.length > 0) return movies.slice(0, 10);

    // 2. Top rated
    movies = await movieService.getTopRatedMovies(signal);
    if (Array.isArray(movies) && movies.length > 0) return movies.slice(0, 10);

    // 3. General movies page
    movies = await movieService.getMoviesPage(1, 10, signal);
    if (Array.isArray(movies) && movies.length > 0) return movies.slice(0, 10);

    return [];
  },

  /**
   * Tìm kiếm phim với query và filter.
   */
  searchMovies: async (
    query: string,
    filters: { category?: string; country?: string; year?: string; type?: string; duration?: string } = {},
    page = 1,
    size = 20
  ): Promise<{ hits: RawMovie[]; total: number; maxScore: number }> => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    params.append('page', String(page));
    params.append('size', String(size));
    if (filters.category) params.append('category', filters.category);
    if (filters.country) params.append('country', filters.country);
    if (filters.year) params.append('year', filters.year);
    if (filters.type) params.append('type', filters.type);
    if (filters.duration) params.append('duration', filters.duration);
    params.append('search_description', 'true');
    params.append('search_all_fields', 'true');

    const result = await safeFetchJson<EnvelopeResponse<{ hits?: RawMovie[]; total?: number; maxScore?: number }>>(
      `/search?${params.toString()}`,
      {},
      { hits: [], total: 0, maxScore: 0 }
    );
    const fallbackList = result?.hits || [];
    const list = extractMovieList(result) || fallbackList;

    return {
      hits: Array.isArray(list) ? list : [],
      total: (result as { total?: number } | null)?.total || list.length,
      maxScore: (result as { maxScore?: number } | null)?.maxScore || 0
    };
  },

  /**
   * Lấy phim mới nhất với metadata phân trang.
   */
  getNewestMovies: async (page = 1, size = 20): Promise<{ items: RawMovie[]; pagination: { currentPage: number; totalPages: number; totalItems: number } }> => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('size', String(size));
    params.append('sort', 'newest');

    const result = await safeFetchJson<EnvelopeResponse>(`/movies?${params.toString()}`, {}, null);
    const items = extractMovieList(result);

    return {
      items,
      pagination: (result as { pagination?: { currentPage: number; totalPages: number; totalItems: number } } | null)?.pagination || {
        currentPage: page,
        totalPages: Math.ceil(items.length / size) || 1,
        totalItems: items.length
      }
    };
  }
};

export default movieService;
