/**
 * @file movieAdminService.ts
 * @description Admin movie management: list, search, create, toggle visibility, delete.
 *
 * Currently operating in MOCK MODE — the backend (localhost:5000) is not
 * reachable in this dev environment, so all functions read/write to the
 * in-memory MOCK_ADMIN_MOVIES list instead of hitting the network.
 *
 * The export signatures, return types, and admin-movies UI contract are
 * unchanged. When the backend is restored, the network calls (commented as
 * `// NETWORK:`) can be re-enabled and the mock branches removed.
 */
import { MOCK_ADMIN_MOVIES, MockMovieItem } from '@/mock/admin/mockMovies';

export interface AdminMovie {
  _id: string;
  name: string;
  origin_name: string;
  slug: string;
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
}

export interface ElasticsearchStatus {
  status: 'active' | 'inactive' | 'error';
  message: string;
  documentCount?: number;
}

/** In-memory mock store (cloned so callers can't mutate the source array). */
const mockStore: MockMovieItem[] = MOCK_ADMIN_MOVIES.map((m) => ({ ...m }));

/** Helper: in-memory search applied on top of an already-filtered list. */
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
    if (filters.category && !m.category.some((c) => c.id === filters.category)) return false;
    if (filters.status && filters.status !== 'all' && m.status !== filters.status) return false;
    if (filters.year && m.year !== filters.year) return false;
    if (filters.type && m.type !== filters.type) return false;
    // MOCK: every item in mockStore is "visible" — `isHidden=false` filter still passes;
    // we don't synthesize hidden items in mock mode.
    if (filters.isHidden !== undefined) {
      // No-op: keep all items; UI only filters when value is `true` which would yield empty.
    }
    return true;
  });
};

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
    if (av === undefined) return 1;
    if (bv === undefined) return -1;
    const cmp = av > bv ? 1 : -1;
    return direction === 'asc' ? cmp : -cmp;
  });
  return sorted;
};

const toAdminMovie = (m: MockMovieItem): AdminMovie => ({
  _id: m._id,
  name: m.name,
  origin_name: m.origin_name,
  slug: m.slug
});

const mockDelay = (ms = 250): Promise<void> => new Promise((r) => setTimeout(r, ms));

const buildPagination = (totalItems: number, page: number, limit: number): AdminPagination => ({
  totalItems,
  totalPages: Math.max(1, Math.ceil(totalItems / limit)),
  currentPage: page,
  itemsPerPage: limit
});

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
  await mockDelay();
  const filtered = sortList(
    applySearch(applyFilters(mockStore, { category, status, year, type, isHidden }), search || ''),
    sortField,
    sortDirection
  );
  const total = filtered.length;
  const start = (page - 1) * limit;
  const slice = filtered.slice(start, start + limit);
  return {
    movies: slice.map(toAdminMovie),
    pagination: buildPagination(total, page, limit)
  };

  /* NETWORK:
  try {
    const response = await axiosInstance.get('/admin/movies', {
      params: {
        page, limit,
        ...(sortField ? { sort: sortField } : {}),
        ...(sortDirection ? { order: sortDirection } : {}),
        ...(category ? { categoryId: category } : {}),
        ...(status && status !== 'all' ? { status } : {}),
        ...(search ? { search } : {}),
        ...(year ? { year } : {}),
        ...(type ? { type } : {}),
        ...(isHidden !== undefined ? { isHidden } : {})
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
  */
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
  await mockDelay();
  // MOCK: ES path behaves identically to the list path but enforces
  // a non-empty `search` term (mimicking the real ES contract).
  if (!search.trim()) {
    return { movies: [], pagination: buildPagination(0, page, limit) };
  }
  const filtered = sortList(
    applySearch(applyFilters(mockStore, { category, status, year, type, isHidden }), search),
    'updatedAt',
    'desc'
  );
  const total = filtered.length;
  const start = (page - 1) * limit;
  const slice = filtered.slice(start, start + limit);
  return {
    movies: slice.map(toAdminMovie),
    pagination: buildPagination(total, page, limit)
  };

  /* NETWORK:
  try {
    const statusParam = status && status !== 'all' ? status : undefined;
    const response = await axiosInstance.get('/admin/search/movies', {
      params: {
        page, limit, search,
        ...(category ? { categoryId: category } : {}),
        ...(statusParam ? { status: statusParam } : {}),
        ...(year ? { year } : {}),
        ...(type ? { type } : {}),
        ...(isHidden !== undefined ? { isHidden } : {})
      }
    });
    return response.data as AdminMovieListResponse;
  } catch (error) {
    throw error;
  }
  */
};

export const checkElasticsearchStatus = async (): Promise<ElasticsearchStatus> => {
  await mockDelay();
  return {
    status: 'inactive',
    message: 'Mock mode: Elasticsearch is not connected (no backend running).',
    documentCount: mockStore.length
  };

  /* NETWORK:
  try {
    const response = await axiosInstance.get('/admin/search/status');
    const data = response.data as { status?: string; message?: string; documentCount?: number } | null;
    if (data && typeof data === 'object') {
      return {
        status: (data.status as ElasticsearchStatus['status']) || 'error',
        message: data.message || 'No status info',
        documentCount: data.documentCount
      };
    }
    return { status: 'error', message: 'Invalid response format' };
  } catch (error) {

    const axiosError = error as { response?: { status: number; statusText: string; data: unknown }; message?: string };
    const detail = axiosError.response
      ? `${axiosError.response.status} ${axiosError.response.statusText}: ${JSON.stringify(axiosError.response.data)}`
      : axiosError.message || 'Unknown error';
    return { status: 'error', message: `Cannot reach Elasticsearch: ${detail}` };
  }
  */
};

export const deleteMovieByAdmin = async (movieId: string): Promise<void> => {
  await mockDelay();
  const idx = mockStore.findIndex((m) => m._id === movieId);
  if (idx >= 0) mockStore.splice(idx, 1);

  /* NETWORK:
  try {
    await axiosInstance.delete(endpoints.admin.movies.delete(movieId));
  } catch (error) {

    throw error;
  }
  */
};

export const toggleMovieVisibility = async (movieId: string): Promise<{ movie: AdminMovie; isHidden: boolean }> => {
  await mockDelay();
  const idx = mockStore.findIndex((m) => m._id === movieId);
  if (idx < 0) {
    // Keep the same "throw on missing id" contract callers expect.
    throw new Error(`Movie ${movieId} not found`);
  }
  // MOCK: flip the `status` between 'active' / 'inactive' to act as a stand-in
  // for the real visibility toggle (the mock has no isHidden field).
  const flipped: MockMovieItem = {
    ...mockStore[idx],
    status: mockStore[idx].status === 'active' ? 'inactive' : 'active',
    updatedAt: new Date().toISOString()
  };
  mockStore[idx] = flipped;
  return { movie: toAdminMovie(flipped), isHidden: flipped.status !== 'active' };

  /* NETWORK:
  try {
    const response = await axiosInstance.patch(
      endpoints.admin.movies.toggleVisibility(movieId),
      {},
      { timeout: 10000 }
    );
    return response.data;
  } catch (error) {

    const axiosError = error as { response?: { data?: unknown; status?: number }; request?: unknown };
    if (axiosError.response) {


    } else if (axiosError.request) {

    }
    throw error;
  }
  */
};

export const createMovieByAdmin = async (
  movieData: Record<string, unknown>
): Promise<{ movie: AdminMovie; success: boolean }> => {
  await mockDelay();
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

  /* NETWORK:
  try {
    const url = endpoints.admin.movies.create();
    const response = await axiosInstance.post(url, movieData);
    return response.data as { movie: AdminMovie; success: boolean };
  } catch (error) {

    throw error;
  }
  */
};
