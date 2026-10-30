/**
 * The admin service for the movies: list, search, create, toggle the
 * visibility and delete.
 *
 * API MODE: the backend is called directly.
 * Fallback: the mock data is used when the API is not available.
 */
import axiosInstance from '@/API/config/axiosConfig';
import { MOCK_ADMIN_MOVIES, MockMovieItem } from '@/mock/admin/mockMovies';
import { apiRoute } from '@/config/apiRoutes';

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
  isHidden?: boolean;
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
    if (filters.category && !m.category.some((c) => c.id === filters.category)) return false;
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
  isHidden: m.status === 'inactive'
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
    pagination: buildPagination(total, page, limit)
  };
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
  try {
    // The API is called on the endpoint `/movies`, because the backend has
    // no `/admin/movies` route.
    const response = await axiosInstance.get(apiRoute(`moviesList`), {
      params: {
        page,
        limit,
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

    // The response format of the backend is normalized.
    if (response.data) {
      const moviesData = response.data.movies || response.data.data?.movies || [];
      return {
        movies: moviesData.map((m: Record<string, unknown>) => ({
          _id: m._id || m.id,
          name: m.name,
          origin_name: m.origin_name || m.originName || '',
          slug: m.slug,
          thumb_url: m.thumb_url || m.thumbUrl || m.thumbnail,
          poster_url: m.poster_url || m.posterUrl || m.poster,
          year: m.year,
          type: m.type,
          status: m.status,
          quality: m.quality,
          lang: m.lang || m.language,
          rating: m.rating,
          vote_count: m.vote_count || m.voteCount,
          views: m.views || m.view,
          view_count: m.view_count || m.views || m.view,
          category: m.category,
          country: m.country,
          time: m.time,
          episode_current: m.episode_current || m.episodeCurrent,
          episode_total: m.episode_total || m.episodeTotal,
          isHidden: m.isHidden || m.status === 'inactive'
        })),
        pagination: response.data.pagination || buildPagination(
          Array.isArray(moviesData) ? moviesData.length : 0,
          page,
          limit
        )
      };
    }

    throw new Error('Unexpected response format');
  } catch (error) {
    console.warn('[AdminMovies] API unavailable, using mock data:', error);
    return getMockResponse(page, limit, sortField, sortDirection, category, status, search, year, type);
  }
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
  if (!search.trim()) {
    return { movies: [], pagination: buildPagination(0, page, limit) };
  }

  try {
    // The search is tried through the API first.
    const response = await axiosInstance.get(apiRoute(`moviesSearch`), {
      params: {
        page,
        limit,
        q: search,
        ...(category ? { categoryId: category } : {}),
        ...(status && status !== 'all' ? { status } : {}),
        ...(year ? { year } : {}),
        ...(type ? { type } : {})
      }
    });

    if (response.data) {
      const moviesData = response.data.movies || response.data.data?.movies || [];
      return {
        movies: moviesData.map((m: Record<string, unknown>) => ({
          _id: m._id || m.id,
          name: m.name,
          origin_name: m.origin_name || m.originName || '',
          slug: m.slug,
          thumb_url: m.thumb_url || m.thumbUrl,
          poster_url: m.poster_url || m.posterUrl,
          year: m.year,
          type: m.type,
          status: m.status,
          isHidden: m.isHidden
        })),
        pagination: response.data.pagination || buildPagination(
          Array.isArray(moviesData) ? moviesData.length : 0,
          page,
          limit
        )
      };
    }

    throw new Error('Search response format unexpected');
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
    return {
      movies: slice.map(toAdminMovie),
      pagination: buildPagination(total, page, limit)
    };
  }
};

export const checkElasticsearchStatus = async (): Promise<ElasticsearchStatus> => {
  try {
    const response = await axiosInstance.get(apiRoute(`searchStatus`), { timeout: 5000 });
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
  try {
    await axiosInstance.delete(apiRoute(`moviesDetail`, movieId));
  } catch (error) {
    // The delete falls back to the mock when the API fails.
    console.warn('[AdminMovies] Delete API unavailable, mock delete:', movieId);
    const idx = mockStore.findIndex((m) => m._id === movieId);
    if (idx >= 0) mockStore.splice(idx, 1);
  }
};

export const toggleMovieVisibility = async (movieId: string): Promise<{ movie: AdminMovie; isHidden: boolean }> => {
  try {
    const response = await axiosInstance.patch(apiRoute(`moviesVisibility`, movieId));
    return {
      movie: response.data.movie || { _id: movieId, name: '', origin_name: '', slug: '' },
      isHidden: response.data.isHidden ?? true
    };
  } catch (error) {
    // The toggle of the visibility falls back to the mock when the API
    // fails.
    console.warn('[AdminMovies] Toggle visibility API unavailable, mock toggle:', movieId);
    const idx = mockStore.findIndex((m) => m._id === movieId);
    if (idx < 0) throw new Error(`Movie ${movieId} not found`);
    
    const flipped: MockMovieItem = {
      ...mockStore[idx],
      status: mockStore[idx].status === 'active' ? 'inactive' : 'active',
      updatedAt: new Date().toISOString()
    };
    mockStore[idx] = flipped;
    return { movie: toAdminMovie(flipped), isHidden: flipped.status !== 'active' };
  }
};

export const createMovieByAdmin = async (
  movieData: Record<string, unknown>
): Promise<{ movie: AdminMovie; success: boolean }> => {
  try {
    const response = await axiosInstance.post(apiRoute(`moviesList`), movieData);
    return {
      movie: response.data.movie,
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
