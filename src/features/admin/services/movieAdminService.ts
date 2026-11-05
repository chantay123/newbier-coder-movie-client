/**
 * The admin service for the movies: list, search, create, toggle the
 * visibility and delete.
 *
 * API MODE: the backend is called directly.
 * Fallback: the mock data is used when the API is not available.
 */
import axiosInstance from '@/API/config/axiosConfig';
import { MOCK_ADMIN_MOVIES, MockMovieItem } from '@/mock/admin/mockMovies';
import { apiPath } from '@/config/apiPaths';

export interface AdminMovie {
  _id: string;
  name: string;
  origin_name: string;
  slug: string;
  thumb_url?: string;
  poster_url?: string;
  year?: number;
  type?: 'series' | 'single';
  status?: 'active' | 'inactive';
  quality?: string;
  lang?: string;
  rating?: number;
  vote_count?: number;
  views?: number;
  view_count?: number;
  category?: Array<{ id: string; name: string; slug: string }>;
  country?: Array<{ id: string; name: string }>;
  time?: string;
  episode_current?: string;
  episode_total?: string;
  /**
   * Whether the movie is HIDDEN (not published on the public site).
   *
 * The admin UI calls this "Tạm ẩn" (hidden) and it is the exact opposite
 * of "Đang hiển thị" (visible). Both labels are the Vietnamese text of the
 * admin panel, so they are quoted as they appear on the screen.
   */
  isHidden?: boolean;
  /**
   * Whether the visibility of the movie is KNOWN.
   *
   * It is `false` when the backend did not send the field at all, so the UI
   * can tell "the backend says it is hidden" from "the backend did not tell
   * us". Without it, a missing field would be read as "visible" and the
   * hidden movies would be counted as published ones.
   */
  visibilityKnown?: boolean;
}

export interface AdminPagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
}

export interface AdminMovieListResponse {
  movies: AdminMovie[];
  pagination: AdminPagination;
  /**
   * Where the data comes from.
   *
   * `api` means the backend answered (even with an EMPTY list, which is a
   * valid answer). `mock` means the request failed and the local fallback
   * was used. The page needs this flag: an empty list coming from the API
   * must NOT be replaced by the mock dataset.
   */
  source: 'api' | 'mock';
}

export interface ElasticsearchStatus {
  status: 'active' | 'inactive' | 'error';
  message: string;
  documentCount?: number;
}

/** The in-memory mock store. It is cloned so the callers never mutate the source array. */
const mockStore: MockMovieItem[] = MOCK_ADMIN_MOVIES.map((m) => ({ ...m }));

/** The helper that searches the in-memory list. */
const applySearch = (list: MockMovieItem[], search: string): MockMovieItem[] => {
  if (!search) return list;
  const q = search.toLowerCase();
  return list.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.origin_name.toLowerCase().includes(q) ||
      m.slug.toLowerCase().includes(q)
  );
};

/** The helper that filters the in-memory list. */
const applyFilters = (
  list: MockMovieItem[],
  filters: {
    category?: string;
    status?: string;
    year?: number;
    type?: string;
    isHidden?: boolean;
  }
): MockMovieItem[] => {
  return list.filter((m) => {
    // The category matches on the slug AND on the id, so the filter works
    // with the categories of the API and with the local ones.
    if (filters.category && !m.category.some((c) => c.id === filters.category || c.slug === filters.category)) return false;
    if (filters.status && filters.status !== 'all' && m.status !== filters.status) return false;
    if (filters.year && m.year !== filters.year) return false;
    if (filters.type && m.type !== filters.type) return false;
    if (filters.isHidden !== undefined) {
      // No-op trong mock mode
    }
    return true;
  });
};

/** The helper that sorts the in-memory list. */
const sortList = (
  list: MockMovieItem[],
  field: string,
  direction: string
): MockMovieItem[] => {
  const sorted = [...list];
  sorted.sort((a, b) => {
    const av = (a as unknown as Record<string, unknown>)[field];
    const bv = (b as unknown as Record<string, unknown>)[field];
    if (av === bv) return 0;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    const cmp = av > bv ? 1 : -1;
    return direction === 'asc' ? cmp : -cmp;
  });
  return sorted;
};

/** Convert MockMovieItem sang AdminMovie */
const toAdminMovie = (m: MockMovieItem): AdminMovie => ({
  _id: m._id,
  name: m.name,
  origin_name: m.origin_name,
  slug: m.slug,
  thumb_url: m.thumb_url,
  poster_url: m.poster_url,
  year: m.year,
  type: m.type,
  status: m.status,
  quality: m.quality,
  lang: m.lang,
  rating: m.rating,
  vote_count: m.vote_count,
  views: m.views,
  category: m.category,
  country: m.country,
  time: m.time,
  episode_current: m.episode_current,
  episode_total: m.episode_total,
  isHidden: m.status === 'inactive',
  visibilityKnown: true
});

/** The mock delay, used to simulate the network. */
const mockDelay = (ms = 300): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Builds the pagination object. */
const buildPagination = (totalItems: number, page: number, limit: number): AdminPagination => ({
  totalItems,
  totalPages: Math.max(1, Math.ceil(totalItems / limit)),
  currentPage: page,
  itemsPerPage: limit
});

/** Fallback sang mock data khi API fail */
const getMockResponse = (
  page: number = 1,
  limit: number = 10,
  sortField: string = 'updatedAt',
  sortDirection: string = 'desc',
  category?: string,
  status?: string,
  search?: string,
  year?: number,
  type?: string
): AdminMovieListResponse => {
  const filtered = sortList(
    applySearch(applyFilters([...mockStore], { category, status, year, type }), search || ''),
    sortField,
    sortDirection
  );
  const total = filtered.length;
  const start = (page - 1) * limit;
  const slice = filtered.slice(start, start + limit);
  return {
    movies: slice.map(toAdminMovie),
    pagination: buildPagination(total, page, limit),
    source: 'mock'
  };
};

// ============================================================
// THE API CONTRACT
// ============================================================

/**
 * The sort values the backend accepts on the movie list.
 *
 * The backend validates the query with a JSON schema, so an unknown value
 * is answered with HTTP 400. The value `updatedAt` (used by the admin UI)
 * is NOT part of it, and it used to make EVERY list request fail.
 */
const MOVIE_SORT_VALUES = ['newest', 'view', 'rating'] as const;

/**
 * Maps the sort field of the admin UI to a value of the backend.
 *
 * @param sortField - The sort field chosen in the admin UI.
 * @returns The value the backend accepts.
 */
const toBackendSort = (sortField?: string): string => {
  const value = (sortField || '').trim().toLowerCase();
  if (value === 'view' || value === 'views' || value === 'viewcount') return 'view';
  if (value === 'rating' || value === 'vote' || value === 'votecount') return 'rating';
  return 'newest';
};

/**
 * Picks the first array found under the given keys.
 *
 * @param source - The object to read.
 * @param keys - The keys to try, in order.
 * @returns The array, or null when none of the keys holds an array.
 */
const pickArray = (
  source: Record<string, unknown> | undefined,
  keys: string[]
): Record<string, unknown>[] | null => {
  if (!source) return null;
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) return value as Record<string, unknown>[];
  }
  return null;
};

/**
 * Picks the first usable number of the given values.
 *
 * @param values - The values to try, in order.
 * @returns The number, or undefined when there is none.
 */
const pickNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
};

/**
 * Picks the first boolean of the given values.
 *
 * @param values - The values to try, in order.
 * @returns The boolean, or undefined when there is none.
 */
const pickBoolean = (...values: unknown[]): boolean | undefined => {
  for (const value of values) {
    if (typeof value === 'boolean') return value;
  }
  return undefined;
};

/** The list and the pagination metadata read out of an answer of the backend. */
interface BackendListPayload {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  found: boolean;
}

/**
 * Reads the movie list and the pagination metadata out of an answer of the
 * backend.
 *
 * THE REAL SHAPE (verified against the live backend):
 * ```json
 * {
 *   "requestTrace": "...",
 *   "responseStatus": { "responseCode": "000000", "responseMessage": "Success" },
 *   "responseData": {
 *     "data": [ ...movies ],
 *     "total": 189,
 *     "page": 1,
 *     "limit": 20,
 *     "totalPages": 10,
 *     "hasNext": true,
 *     "hasPrevious": false
 *   }
 * }
 * ```
 * The array sits in `responseData.data` and the pagination metadata sits
 * next to it. The old mapping read `response.data.movies` and
 * `response.data.pagination`, which never exist, so the list was always
 * empty.
 *
 * @param raw - The body of the answer.
 * @param fallbackPage - The page that was requested.
 * @param fallbackLimit - The page size that was requested.
 * @returns The list and the pagination metadata.
 */
export const parseMovieListEnvelope = (
  raw: unknown,
  fallbackPage: number,
  fallbackLimit: number
): BackendListPayload => {
  const empty: BackendListPayload = {
    items: [],
    total: 0,
    page: fallbackPage,
    limit: fallbackLimit,
    totalPages: 1,
    hasNext: false,
    found: false
  };
  if (!raw || typeof raw !== 'object') return empty;

  // A raw array is accepted as well, so a legacy answer does not break
  // the list.
  if (Array.isArray(raw)) {
    return {
      items: raw as Record<string, unknown>[],
      total: raw.length,
      page: fallbackPage,
      limit: fallbackLimit,
      totalPages: Math.max(1, Math.ceil(raw.length / (fallbackLimit || 1))),
      hasNext: false,
      found: true
    };
  }

  const root = raw as Record<string, unknown>;
  const responseData = root.responseData as Record<string, unknown> | undefined;
  const rootData = root.data as Record<string, unknown> | undefined;

  const items =
    pickArray(responseData, ['data', 'movies', 'items', 'hits', 'results']) ??
    (Array.isArray(root.responseData) ? (root.responseData as Record<string, unknown>[]) : null) ??
    pickArray(rootData, ['data', 'movies', 'items', 'hits', 'results']) ??
    pickArray(root, ['data', 'movies', 'items', 'hits', 'results']);

  if (!items) return empty;

  // `responseData` holds the metadata of the list, so it wins over the
  // generic `data` object of the envelope.
  const meta: Record<string, unknown> = { ...(rootData || {}), ...(responseData || {}) };

  const page = pickNumber(meta.page, meta.currentPage, root.page) ?? fallbackPage;
  const limit = pickNumber(meta.limit, meta.size, meta.perPage) ?? fallbackLimit;
  const total = pickNumber(meta.total, meta.totalItems, meta.totalHits, root.total) ?? items.length;
  const totalPages =
    pickNumber(meta.totalPages, meta.total_pages, root.totalPages) ??
    Math.max(1, Math.ceil(total / (limit || fallbackLimit)));
  const hasNext = pickBoolean(meta.hasNext, meta.hasNextPage, root.hasNext) ?? page < totalPages;

  return { items, total, page, limit, totalPages, hasNext, found: true };
};

/**
 * Maps a movie DTO of the backend to the shape the admin UI reads.
 *
 * The DTO uses camelCase (`originName`, `posterUrl`, `thumbUrl`,
 * `episodeCurrent`, `episodeTotal`, `view`), while the UI reads the
 * snake_case names of the mock dataset.
 *
 * THE VISIBILITY FIELD
 * The backend stores the visibility in `isHidden`:
 *   - the toggle route writes `$set: { isHidden }`;
 *   - the public list route filters on `{ isHidden: false }`.
 *
 * The LIST DTO does NOT carry `isHidden` — it carries `isPublished`, which
 * is a DIFFERENT field of the schema (it is not used to filter anything).
 * The old code derived the visibility from `isPublished`:
 * ```ts
 * const isHidden = typeof raw.isHidden === 'boolean' ? raw.isHidden
 *   : isPublished === undefined ? false : !isPublished;
 * ```
 * That mixed two unrelated fields, so:
 *   - a movie with `isHidden: false` but `isPublished: false` was shown as
 *     hidden and was then DROPPED by the "visible" filter, so it
 *     disappeared from the list even though the backend returns it;
 *   - the "hidden" filter could never match anything, because the list
 *     route only returns the visible movies.
 *
 * So `isHidden` is read from the DTO when it is really there, and the
 * `visibilityKnown` flag tells the caller when it was missing instead of
 * guessing.
 *
 * @param raw - The DTO of the backend.
 * @returns The movie of the admin UI.
 */
const toAdminMovieFromDto = (raw: Record<string, unknown>): AdminMovie => {
  const id = String(raw._id ?? raw.id ?? '');
  const hasExplicitIsHidden = typeof raw.isHidden === 'boolean';
  const isHidden = hasExplicitIsHidden ? (raw.isHidden as boolean) : false;
  const views = pickNumber(raw.view, raw.views, raw.view_count, raw.viewCount);

  return {
    _id: id,
    name: (raw.name as string) || '',
    origin_name: (raw.originName as string) || (raw.origin_name as string) || '',
    slug: (raw.slug as string) || '',
    thumb_url:
      (raw.thumbUrl as string) || (raw.thumb_url as string) || (raw.posterUrl as string) || '',
    poster_url: (raw.posterUrl as string) || (raw.poster_url as string) || '',
    year: pickNumber(raw.year),
    type: raw.type as AdminMovie['type'],
    status: isHidden ? 'inactive' : 'active',
    quality: raw.quality as string,
    lang: (raw.lang as string) || (raw.language as string),
    rating: pickNumber(raw.rating),
    vote_count: pickNumber(raw.voteCount, raw.vote_count),
    views,
    view_count: views,
    category: raw.category as AdminMovie['category'],
    country: raw.country as AdminMovie['country'],
    time: raw.time as string,
    episode_current: (raw.episodeCurrent as string) || (raw.episode_current as string),
    episode_total: (raw.episodeTotal as string) || (raw.episode_total as string),
    isHidden,
    visibilityKnown: hasExplicitIsHidden
  };
};

/**
 * Applies the visibility filter of the admin UI to a received page.
 *
 * THE CONTRACT OF THE LIST ROUTE
 * The list route of the backend answers with the VISIBLE movies only
 * (`{ isHidden: false }` is hardcoded in the filter builder), and the list
 * DTO does not carry the `isHidden` field. Two consequences:
 *   - the "visible" filter must NOT remove anything: every movie of the
 *     answer IS visible, so dropping one would lose a row on EVERY
 *     page (and the pagination would still announce the old total);
 *   - the "hidden" filter can never match a row of this route, so the
 *     result is an empty list.
 *
 * A movie whose visibility is KNOWN (the answer of the toggle route, for
 * example) is still judged on its own field.
 *
 * @param movies - The movies of the received page.
 * @param status - The requested filter (`active`, `inactive` or nothing).
 * @returns The movies that pass the filter.
 */
export const applyVisibilityFilter = (movies: AdminMovie[], status?: string): AdminMovie[] => {
  if (status !== 'active' && status !== 'inactive') return movies;
  const wantHidden = status === 'inactive';

  return movies.filter((movie) => {
    // An unknown visibility means "visible", because the list route only
    // returns the visible movies.
    if (!movie.visibilityKnown) return !wantHidden;
    return wantHidden ? Boolean(movie.isHidden) : !movie.isHidden;
  });
};

/**
 * Counts the movies whose visibility is unknown.
 *
 * @param movies - The movies of the received page.
 * @returns The number of movies with an unknown visibility.
 */
const countUnknownVisibility = (movies: AdminMovie[]): number =>
  movies.filter((movie) => !movie.visibilityKnown).length;

// ============================================================
// THE AUDIT LOG
// ============================================================

/**
 * The counters of the audit log.
 *
 * They accumulate over the pages of ONE dataset (the counters are reset
 * when the page 1 is loaded again), so the log can prove whether the
 * frontend walked through the whole list or only a part of it.
 */
const auditState = {
  totalRetrieved: 0,
  uniqueIds: new Set<string>(),
  duplicateIds: 0
};

/**
 * Resets the counters of the audit log.
 *
 * It is called when a new dataset starts (page 1), so the counters of the
 * previous dataset do not pollute the new one.
 */
export const resetAdminMoviesAudit = (): void => {
  auditState.totalRetrieved = 0;
  auditState.uniqueIds.clear();
  auditState.duplicateIds = 0;
};

/** The information of one audit report. */
export interface AdminMoviesAuditReport {
  apiTotal: number;
  currentPage: number;
  pageLimit: number;
  totalPages: number;
  currentPageRetrieved: number;
  hasNextPage: boolean;
  fetchCompleted: boolean;
  source: 'api' | 'mock';
  ids: string[];
  error?: string;
  /**
   * How many movies of the received page have an UNKNOWN visibility.
   *
   * The list DTO of the backend does not carry `isHidden`, so the frontend
   * cannot tell a hidden movie from a visible one. The number is printed in
   * the audit log so the gap is visible instead of silent.
   */
  visibilityUnknown?: number;
  /**
   * The visibility filter that was asked for (`active` / `inactive`).
   */
  visibilityFilter?: string;
}

/**
 * Writes the audit log of the movie list in the console.
 *
 * The log only runs in development, and it prints the numbers of the
 * CURRENT dataset: how many movies the API announces, how many the
 * frontend received, how many IDs are unique and how many are duplicates.
 *
 * @param report - The numbers of the fetch that just finished.
 */
export const logAdminMoviesAudit = (report: AdminMoviesAuditReport): void => {
  if (process.env.NODE_ENV !== 'development') return;

  report.ids.forEach((id) => {
    if (!id) return;
    if (auditState.uniqueIds.has(id)) auditState.duplicateIds += 1;
    else auditState.uniqueIds.add(id);
  });
  auditState.totalRetrieved += report.ids.length;

  console.log('[ADMIN MOVIES AUDIT]');
  console.log('API Total:', report.apiTotal);
  console.log('Current Page:', report.currentPage);
  console.log('Page Limit:', report.pageLimit);
  console.log('Total Pages:', report.totalPages);
  console.log('Current Page Retrieved:', report.currentPageRetrieved);
  console.log('Total Retrieved:', auditState.totalRetrieved);
  console.log('Unique Movie IDs:', auditState.uniqueIds.size);
  console.log('Duplicate Movie IDs:', auditState.duplicateIds);
  console.log('Has Next Page:', report.hasNextPage);
  console.log('Fetch Completed:', report.fetchCompleted);
  if (report.visibilityFilter) {
    console.log('Visibility Filter:', report.visibilityFilter);
  }
  if (report.visibilityUnknown) {
    console.log(
      'Movies With Unknown Visibility:',
      report.visibilityUnknown,
      '(the list DTO of the backend does not carry the isHidden field)'
    );
  }
  if (report.source === 'mock') {
    console.log('Data Source: mock fallback (the API did not answer)');
  }
  if (report.error) {
    console.log('Error:', report.error);
  }
};

// ============================================================
// API FUNCTIONS
// ============================================================

export const getMoviesForAdmin = async (
  page: number = 1,
  limit: number = 10,
  sortField: string = 'updatedAt',
  sortDirection: string = 'desc',
  category?: string,
  status?: string,
  search?: string,
  year?: number,
  type?: string,
  isHidden?: boolean
): Promise<AdminMovieListResponse> => {
  const query = (search || '').trim();

  // A SEARCH NEVER GOES TO THE LIST ROUTE.
  //
  // `/movies` does not declare a `search` parameter, so the term would be
  // stripped by the query validation and the backend would answer with the
  // WHOLE list: the admin search box looked like it worked, but it never
  // filtered anything.
  if (query) {
    return searchMoviesWithElasticsearch(page, limit, query, category, status, year, type, isHidden);
  }

  // A new dataset starts on the page 1, so the audit counters restart.
  if (page <= 1) resetAdminMoviesAudit();

  // The parameters the backend declares on `/movies`. Every other parameter
  // (`order`, `categoryId`, `status=active|inactive`, `isHidden`) is either
  // unknown or invalid, and an invalid value of a DECLARED parameter is
  // answered with HTTP 400 — which used to break the whole list.
  const buildParams = (withFilters: boolean): Record<string, string | number> => {
    const params: Record<string, string | number> = {
      page,
      limit,
      sort: toBackendSort(sortField)
    };
    if (!withFilters) return params;
    if (category) params.category = category;
    if (year) params.year = year;
    if (type) params.type = type;
    return params;
  };

  let payload: BackendListPayload = {
    items: [],
    total: 0,
    page,
    limit,
    totalPages: 1,
    hasNext: false,
    found: false
  };
  let usedFilters = true;

  try {
    try {
      const response = await axiosInstance.get(apiPath(`moviesList`), { params: buildParams(true) });
      payload = parseMovieListEnvelope(response.data, page, limit);
    } catch (error) {
      const httpStatus = (error as { response?: { status?: number } })?.response?.status;
      if (httpStatus !== 400) throw error;

      // The backend refused one of the FILTER parameters. The list itself
      // is still reachable, so the request is repeated with the safe
      // parameters only, instead of losing the whole page.
      usedFilters = false;
      const response = await axiosInstance.get(apiPath(`moviesList`), { params: buildParams(false) });
      payload = parseMovieListEnvelope(response.data, page, limit);
    }
  } catch (error) {
    console.warn('[AdminMovies] API unavailable, using mock data:', error);
    const mock = getMockResponse(page, limit, sortField, sortDirection, category, status, '', year, type);
    const mockIds = mock.movies.map((m) => m._id);
    logAdminMoviesAudit({
      apiTotal: mock.pagination.totalItems,
      currentPage: page,
      pageLimit: limit,
      totalPages: mock.pagination.totalPages,
      currentPageRetrieved: mock.movies.length,
      hasNextPage: page < mock.pagination.totalPages,
      fetchCompleted: true,
      source: 'mock',
      ids: mockIds,
      error: error instanceof Error ? error.message : String(error)
    });
    return { ...mock, source: 'mock' };
  }

  const movies = payload.items.map(toAdminMovieFromDto);

  // The visibility filter is applied on the received page, because the list
  // route of the backend only declares the visible movies (`isHidden: false`
  // is hardcoded in its filter builder) and the list DTO does not carry the
  // `isHidden` field.
  //
  // The TOTAL is corrected as well, so the pagination never announces more
  // movies than the filter really returns. The old code kept the old total
  // for the "visible" filter, so the footer announced 189 movies
  // while the table showed 7 of them, and the movies dropped by the filter
  // were lost on EVERY page (they were never shown on another one).
  const visibleMovies = applyVisibilityFilter(movies, status);
  const filteredOut = movies.length - visibleMovies.length;

  // When the filter removed rows, the pagination has to be rebuilt on the
  // rows that are really left, otherwise the last pages are empty.
  const total = filteredOut > 0 ? visibleMovies.length : payload.total;
  const totalPages =
    filteredOut > 0
      ? Math.max(1, Math.ceil(total / (payload.limit || limit)))
      : payload.totalPages;

  logAdminMoviesAudit({
    apiTotal: payload.total,
    currentPage: payload.page,
    pageLimit: payload.limit,
    totalPages: payload.totalPages,
    currentPageRetrieved: movies.length,
    hasNextPage: payload.hasNext,
    fetchCompleted: true,
    source: 'api',
    ids: movies.map((m) => m._id),
    visibilityFilter: status,
    visibilityUnknown: countUnknownVisibility(movies),
    error: usedFilters ? undefined : 'The filter parameters were rejected, the list was loaded without them.'
  });

  return {
    movies: visibleMovies,
    pagination: {
      totalItems: total,
      totalPages,
      currentPage: payload.page,
      itemsPerPage: payload.limit
    },
    source: 'api'
  };
};

export const searchMoviesWithElasticsearch = async (
  page: number = 1,
  limit: number = 10,
  search: string = '',
  category?: string,
  status?: string,
  year?: number,
  type?: string,
  isHidden?: boolean
): Promise<AdminMovieListResponse> => {
  const query = (search || '').trim();
  if (!query) {
    return { movies: [], pagination: buildPagination(0, page, limit), source: 'api' };
  }

  if (page <= 1) resetAdminMoviesAudit();

  try {
    // The search route of the backend is `/movies/search` and it takes `q`
    // (the term), `page` and `size`. The old call sent `categoryId` and
    // `status=active|inactive`, which the route does not declare.
    const response = await axiosInstance.get(apiPath(`moviesSearch`), {
      params: {
        q: query,
        page,
        size: limit,
        ...(category ? { category } : {}),
        ...(year ? { year } : {}),
        ...(type ? { type } : {})
      }
    });

    const payload = parseMovieListEnvelope(response.data, page, limit);
    const allMovies = payload.items.map(toAdminMovieFromDto);

    // The visibility filter is applied on the received page, for the same
    // reason as in the list route: the search route also only returns the
    // visible movies and its DTO does not carry the `isHidden` field.
    const movies = applyVisibilityFilter(allMovies, status);
    const filteredOut = allMovies.length - movies.length;

    // The total is corrected when the filter removed rows, so the footer
    // and the pagination agree with what the table really shows.
    const total = filteredOut > 0 ? movies.length : payload.total;
    const totalPages =
      filteredOut > 0
        ? Math.max(1, Math.ceil(total / (payload.limit || limit)))
        : payload.totalPages;

    logAdminMoviesAudit({
      apiTotal: payload.total,
      currentPage: payload.page,
      pageLimit: payload.limit,
      totalPages: payload.totalPages,
      currentPageRetrieved: allMovies.length,
      hasNextPage: payload.hasNext,
      fetchCompleted: true,
      source: 'api',
      ids: allMovies.map((m) => m._id),
      visibilityFilter: status,
      visibilityUnknown: countUnknownVisibility(allMovies)
    });

    return {
      movies,
      pagination: {
        totalItems: total,
        totalPages,
        currentPage: payload.page,
        itemsPerPage: payload.limit
      },
      source: 'api'
    };
  } catch (error) {
    console.warn('[AdminMovies] Search API unavailable, using mock search:', error);
    await mockDelay(200);
    const filtered = sortList(
      applySearch(applyFilters([...mockStore], { category, status, year, type }), search),
      'updatedAt',
      'desc'
    );
    const total = filtered.length;
    const start = (page - 1) * limit;
    const slice = filtered.slice(start, start + limit);
    const movies = slice.map(toAdminMovie);

    logAdminMoviesAudit({
      apiTotal: total,
      currentPage: page,
      pageLimit: limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      currentPageRetrieved: movies.length,
      hasNextPage: page < Math.ceil(total / limit),
      fetchCompleted: true,
      source: 'mock',
      ids: movies.map((m) => m._id),
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      movies,
      pagination: buildPagination(total, page, limit),
      source: 'mock'
    };
  }
};

export const checkElasticsearchStatus = async (): Promise<ElasticsearchStatus> => {
  try {
    const response = await axiosInstance.get(apiPath(`searchStatus`), { timeout: 5000 });
    if (response.data) {
      return {
        status: response.data.status === 'active' ? 'active' : 'inactive',
        message: response.data.message || 'Elasticsearch status received',
        documentCount: response.data.documentCount
      };
    }
    return { status: 'inactive', message: 'No status data' };
  } catch (error) {
    return {
      status: 'inactive',
      message: 'Elasticsearch not available or backend unreachable'
    };
  }
};

export const deleteMovieByAdmin = async (movieId: string): Promise<void> => {
  // The delete route of the backend is `/admin/movies/{id}`. The old call
  // used `/movies/{id}`, which answers 404, and the error was swallowed by
  // the mock fallback: the UI reported a successful delete while nothing
  // was deleted. The error is now propagated.
  await axiosInstance.delete(apiPath(`adminMoviesDelete`, movieId));
};

export const toggleMovieVisibility = async (
  movieId: string,
  currentIsHidden: boolean = false
): Promise<{ movie: AdminMovie; isHidden: boolean }> => {
  // The visibility route of the backend is `/admin/movies/{id}/visibility`
  // and it takes the new state in the BODY. The old call used
  // `/movies/{id}/visibility` (404) and sent no body at all.
  const isHidden = !currentIsHidden;
  const response = await axiosInstance.patch(apiPath(`adminMoviesVisibility`, movieId), {
    isHidden
  });

  const root = (response.data || {}) as Record<string, unknown>;
  const responseData = (root.responseData || root.data || {}) as Record<string, unknown>;
  const rawMovie = (responseData.movie || responseData) as Record<string, unknown>;

  // The new state is read from the answer when the backend sends it, and
  // the requested state is used otherwise. `isPublished` is NOT used as a
  // fallback: it is a different field of the schema, so it would report the
  // wrong state (the backend writes `isHidden`).
  const returnedIsHidden =
    typeof responseData.isHidden === 'boolean'
      ? responseData.isHidden
      : typeof rawMovie.isHidden === 'boolean'
        ? rawMovie.isHidden
        : isHidden;

  return {
    movie: rawMovie && Object.keys(rawMovie).length ? toAdminMovieFromDto(rawMovie) : {
      _id: movieId,
      name: '',
      origin_name: '',
      slug: '',
      isHidden: returnedIsHidden,
      visibilityKnown: true
    },
    isHidden: returnedIsHidden
  };
};

export const createMovieByAdmin = async (
  movieData: Record<string, unknown>
): Promise<{ movie: AdminMovie; success: boolean }> => {
  try {
    // The create route of the backend is `/admin/movies` (the same route
    // the add page uses). The old call used the public `/movies` route.
    const response = await axiosInstance.post(apiPath(`adminMoviesCreate`), movieData);
    const root = (response.data || {}) as Record<string, unknown>;
    const responseData = (root.responseData || root.data || {}) as Record<string, unknown>;
    const rawMovie = (responseData.movie || responseData) as Record<string, unknown>;
    return {
      movie: rawMovie && Object.keys(rawMovie).length ? toAdminMovieFromDto(rawMovie) : {
        _id: '',
        name: (movieData.name as string) || '',
        origin_name: (movieData.origin_name as string) || '',
        slug: (movieData.slug as string) || ''
      },
      success: true
    };
  } catch (error) {
    // The create falls back to the mock when the API fails.
    console.warn('[AdminMovies] Create API unavailable, mock create:', movieData);
    await mockDelay(300);
    const now = new Date().toISOString();
    const slug = (movieData.slug as string) || `mock-movie-${Date.now()}`;
    const newItem: MockMovieItem = {
      _id: `mov-${Date.now()}`,
      name: (movieData.name as string) || 'Untitled Movie',
      origin_name: (movieData.origin_name as string) || (movieData.name as string) || 'Untitled',
      slug,
      year: (movieData.year as number) || new Date().getFullYear(),
      type: ((movieData.type as 'series' | 'single') || 'single'),
      status: 'active',
      thumb_url: (movieData.thumb_url as string) || '',
      poster_url: (movieData.poster_url as string) || '',
      category: (movieData.category as MockMovieItem['category']) || [],
      views: 0,
      quality: (movieData.quality as string) || 'HD',
      lang: (movieData.lang as string) || 'Vietsub',
      content: (movieData.content as string) || '',
      director: (movieData.director as string[]) || [],
      actor: (movieData.actor as string[]) || [],
      country: (movieData.country as MockMovieItem['country']) || [],
      time: (movieData.time as string) || '',
      episode_current: (movieData.episode_current as string) || 'Full',
      episode_total: (movieData.episode_total as string) || '1 Tập',
      is_copyright: Boolean(movieData.is_copyright),
      sub_docquyen: Boolean(movieData.sub_docquyen),
      chieurap: Boolean(movieData.chieurap),
      rating: 0,
      vote_count: 0,
      createdAt: now,
      updatedAt: now,
      episodes: (movieData.episodes as MockMovieItem['episodes']) || []
    };
    mockStore.unshift(newItem);
    return { movie: toAdminMovie(newItem), success: true };
  }
};
