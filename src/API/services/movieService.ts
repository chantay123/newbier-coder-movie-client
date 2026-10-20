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
import { pickMovieImage } from '@/utils/imageSource';

// Lazy import authService để tránh circular dependency giữa auth và movie.
const getAuthService = async (): Promise<{
  refreshToken: () => Promise<string>;
  logout: () => Promise<void>;
} | null> => {
  try {
    const mod = await import('./authService');
    return (mod.default || mod) as { refreshToken: () => Promise<string>; logout: () => Promise<void> };
  } catch {
    return null;
  }
};

/**
 * Decode JWT exp (chỉ đọc payload, KHÔNG verify signature).
 * Trả về timestamp (ms) khi token hết hạn, hoặc null nếu không parse được.
 */
const readJwtExp = (token: string | null): number | null => {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const payload = JSON.parse(json) as { exp?: number };
    return payload?.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

/**
 * Đảm bảo token còn hạn trước khi gửi request.
 * - Token còn > 60s: trả về ngay
 * - Token sắp hết hạn (≤ 60s): gọi refresh TRƯỚC
 * - Single-flight: nếu nhiều request cùng lúc, chỉ refresh 1 lần
 * - Refresh fail: trả token cũ (để request fail tự nhiên với 401)
 */
let _tokenRefreshInFlight: Promise<string | null> | null = null;

const ensureFreshToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;

  const token =
    localStorage.getItem('auth_token')
    || localStorage.getItem('token')
    || (window.sessionStorage && window.sessionStorage.getItem('auth_token'))
    || (window.sessionStorage && window.sessionStorage.getItem('token'))
    || null;

  if (!token) return null;

  const exp = readJwtExp(token);
  if (!exp) return token;

  const msUntilExpiry = exp - Date.now();
  if (msUntilExpiry > 60_000) return token;

  if (_tokenRefreshInFlight) return _tokenRefreshInFlight;

  const refreshPromise = (async (): Promise<string | null> => {
    const auth = await getAuthService();
    if (!auth) return token;
    try {
      return await auth.refreshToken();
    } catch (refreshErr) {
      const err = refreshErr as { code?: string; message?: string };
      if (SYSTEM_CONFIG.debugMovies) {
        // eslint-disable-next-line no-console

      }
      return token;
    }
  })();

  _tokenRefreshInFlight = refreshPromise.finally(() => {
    _tokenRefreshInFlight = null;
  });

  return _tokenRefreshInFlight;
};

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
 * Adds snake_case image aliases to a raw movie object.
 *
 * The v1 backend returns images in camelCase (`posterUrl`/`thumbUrl`),
 * but the browse pages render `poster_url`/`thumb_url`. Aliasing here —
 * in the single choke point every list endpoint funnels through — means
 * `/browse/schedule`, the category/country rails, and the home rails all
 * get real posters instead of silently falling back to a placeholder.
 *
 * Original keys are preserved, so any caller reading camelCase still works.
 */
const withImageAliases = (m: RawMovie): RawMovie => {
  const poster = pickMovieImage(m, 'poster', '');
  const thumb = pickMovieImage(m, 'thumb', '');
  if (!poster && !thumb) return m;
  return {
    ...m,
    poster_url: poster || thumb,
    thumb_url: thumb || poster
  };
};

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
  if (Array.isArray(json)) return (json as RawMovie[]).map(withImageAliases);

  const env = json as Record<string, unknown>;

  const tryArray = (v: unknown): RawMovie[] | null =>
    Array.isArray(v) ? (v as RawMovie[]).map(withImageAliases) : null;

  // 1. Direct envelope arrays
  let found = tryArray(env.responseData)
    || tryArray((env.responseData as { data?: unknown[] } | undefined)?.data)
    || tryArray((env.responseData as { items?: unknown[] } | undefined)?.items)
    || tryArray((env.responseData as { movies?: unknown[] } | undefined)?.movies)
    || tryArray((env.responseData as { results?: unknown[] } | undefined)?.results)
    || tryArray((env.data as { data?: unknown[] } | undefined)?.data)
    || tryArray((env.data as { items?: unknown[] } | undefined)?.items)
    || tryArray((env.data as { movies?: unknown[] } | undefined)?.movies)
    || tryArray((env.data as { results?: unknown[] } | undefined)?.results)
    || tryArray(env.data)
    || tryArray(env.movies)
    || tryArray(env.items)
    || tryArray(env.results);
  if (found) return found;

  // 2. Sometimes the API returns the array directly nested one level deep
  //    under responseData (e.g. { responseData: { items: [...] } })
  for (const key of Object.keys(env)) {
    const v = (env as Record<string, unknown>)[key];
    if (v && typeof v === 'object') {
      const arr = tryArray((v as { data?: unknown[] }).data)
        || tryArray((v as { items?: unknown[] }).items)
        || tryArray((v as { movies?: unknown[] }).movies)
        || tryArray((v as { results?: unknown[] }).results);
      if (arr) return arr;
    }
  }
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

    // Đảm bảo token còn hạn trước khi gửi (proactive refresh).
    // - Đọc từ localStorage + sessionStorage (authService.login lưu vào
    //   sessionStorage khi user KHÔNG tick Remember me).
    // - Nếu token sắp hết hạn (≤ 60s) → gọi /auth/refresh-token TRƯỚC.
    // - Nếu refresh fail → trả token cũ, request sẽ fail tự nhiên với 401.
    const token = await ensureFreshToken();

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

    // [DEBUG] Log response status of every fetch
    // eslint-disable-next-line no-console
    console.log('[safeFetchJson]', url, '→', response.status);

    if (!response.ok) {
      // Controlled diagnostic - log an toàn (endpoint, status, message),
      // TUYỆT ĐỐI không log token/cookie/header Authorization.
      if (SYSTEM_CONFIG.debugMovies) {
        // eslint-disable-next-line no-console

      }
      return fallback;
    }

    const json = (await response.json()) as EnvelopeResponse;

    if (SYSTEM_CONFIG.debugMovies && /\/movies(\?|$|\/)/.test(endpoint)) {
      // eslint-disable-next-line no-console

    }

    return json as unknown as T;
  } catch (err) {
    if (SYSTEM_CONFIG.debugMovies && endpoint.includes('/movies')) {
      // eslint-disable-next-line no-console

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
  /**
   * Lấy phim mới nhất cho Hero spotlight. Over-fetch (gấp 4 lần hoặc
   * tối thiểu 24 phim) để sau khi filter trailer vẫn còn đủ phim hiển thị.
   *
   * CHỈ HIỂN THỊ PHIM CÓ TRAILER: đa số phim mới nhất trả về từ
   * `/movies/latest` đều có `trailer: null` (xem payload thật: 6 phim
   * đầu đều null, phim thứ 7-8 mới có trailer). Nếu lấy đúng `limit=6`
   * rồi filter sẽ ra 0 phim, khiến HeroBannerSkeleton kẹt vĩnh viễn.
   */
  getHeroMovies: (limit = 6, signal?: AbortSignal): Promise<RawMovie[]> =>
    safeFetchMovieList('/movies/latest', Math.max(limit * 4, 24), { signal }),

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

    // Over-fetch: chỉ một phần nhỏ phim có `trailer`, và caller (Country
    // rail) thường lọc trailer sau đó. Lấy gấp 4 lần để đảm bảo vẫn
    // còn đủ dữ liệu sau filter, tránh rail rỗng.
    const fetchLimit = Math.max(limit * 4, 40);

    // Tier 1: Query backend /countries/{slug}/movies
    for (const v of variants) {
      const list = await safeFetchMovieList(
        `/countries/${encodeURIComponent(v)}/movies`,
        fetchLimit,
        { signal }
      );
      if (Array.isArray(list) && list.length > 0) return list;
    }

    // Tier 2: Search keyword fallback
    const keyword = meta?.searchKeyword;
    if (keyword) {
      const searchList = await safeFetchMovieList(
        `/movies/search?q=${encodeURIComponent(keyword)}`,
        fetchLimit,
        { signal }
      );
      if (Array.isArray(searchList) && searchList.length > 0) return searchList;
    }

    // Tier 3: Fetch general movies and filter client-side.
    //
    // LỖI CŨ: dùng `countrySlug.split('-')[0]` = "han" / "trung" làm
    // keyword match — quá ngắn, trùng với nhiều chuỗi không liên quan
    // (ví dụ "trung" match cả "trung-thu-2024", "han" match cả "hanh"),
    // dẫn tới danh sách gồm phim các nước khác, một số không có
    // poster hợp lệ → hiển thị ảnh lỗi.
    //
    // SỬA: match cả `slug` đầy đủ VÀ `name` đầy đủ của country object
    // (case-insensitive), đồng thời kiểm tra cả slug cuối cùng phân
    // tách bằng dấu "-". Ví dụ "han-quoc" sẽ match `country.slug ===
    // "han-quoc"` hay `country.name` chứa "hàn" / "han quoc".
    const all = await safeFetchMovieList('/movies?page=1&limit=100', undefined, { signal });
    if (Array.isArray(all) && all.length > 0) {
      const slugTokens = countrySlug.split('-').filter(Boolean);
      const filtered = all.filter((m) => {
        const countryList = (m.country as unknown[] | undefined) || (m.countries as unknown[] | undefined) || [];
        return countryList.some?.((c) => {
          const country = c as { slug?: string; name?: string };
          const s = (country.slug || '').toLowerCase();
          const n = (country.name || '').toLowerCase();
          // Ưu tiên match exact slug trước, rồi đến mọi token trong slug
          // xuất hiện trong country.slug, cuối cùng mới tới country.name.
          if (s === countrySlug) return true;
          if (slugTokens.every((tok) => s.includes(tok))) return true;
          if (n.includes(countrySlug)) return true;
          return false;
        });
      });
      if (filtered.length > 0) {
        return typeof limit === 'number' ? filtered.slice(0, fetchLimit) : filtered;
      }
    }

    return [];
  },

  /**
   * Lấy phim theo slug thể loại với fallback đa tầng:
   * 1. Query slug backend đã đăng ký từ taxonomyConfig
   * 2. Search keyword fallback từ taxonomyConfig
   * 3. (REMOVED) Legacy endpoint `/movies/category/${slug}` - backend trả 404
   *    cho route này, gây log lỗi không cần thiết. Nếu cả Tier 1 và Tier 2
   *    không trả về phim, trả [] thay vì gọi thêm endpoint không tồn tại.
   */
  getMoviesByCategory: async (categorySlug: string, limit = 20, signal?: AbortSignal): Promise<RawMovie[]> => {
    if (!categorySlug) return [];

    const meta = resolveCategoryTaxonomy(categorySlug);
    const variants: string[] = meta?.backendSlugs || [categorySlug];

    // Over-fetch: chỉ một phần nhỏ phim có `trailer`, và caller thường lọc
    // trailer sau đó. Lấy gấp 3x để đảm bảo vẫn còn đủ dữ liệu sau filter.
    const fetchLimit = Math.max(limit * 3, 24);

    // Tier 1: Query backend /categories/{slug}/movies
    for (const v of variants) {
      const list = await safeFetchMovieList(
        `/categories/${encodeURIComponent(v)}/movies`,
        fetchLimit,
        { signal }
      );
      if (Array.isArray(list) && list.length > 0) return list;
    }

    // Tier 2: Search keyword fallback
    const keyword = meta?.searchKeyword;
    if (keyword) {
      const searchList = await safeFetchMovieList(
        `/movies/search?q=${encodeURIComponent(keyword)}`,
        fetchLimit,
        { signal }
      );
      if (Array.isArray(searchList) && searchList.length > 0) return searchList;
    }

    // Không fallback sang /movies/category/${slug} nữa - endpoint đó 404
    // trên backend. Trả về mảng rỗng cho an toàn.
    return [];
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
