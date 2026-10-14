/**
 * @file movieAdminService.ts
 * @description Admin movie management: list, search, create, toggle visibility, delete.
 */
import axiosInstance from '@/API/config/axiosConfig';
import { endpoints } from '@/config/API';

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
    // Pass params via axios `params` so they are properly URL-encoded and
    // merged with the instance's baseURL. Previously this function
    // concatenated raw `&sort=...` onto an absolute URL returned by
    // `endpoints.admin.movies.getAll(...)`, which (a) bypassed the
    // configured baseURL entirely and (b) would have broken the moment
    // we had multiple sort/filter params with the same name.
    const response = await axiosInstance.get('/admin/movies', {
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
    return response.data;
  } catch (error) {
    // axiosConfig interceptor already logs the upstream `[API] ...`
    // diagnostic. Re-throw so callers can distinguish "endpoint
    // missing" (404) from "network down" (no response) instead of
    // getting a fake empty list.
    throw error;
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
    // axiosConfig interceptor already logged the diagnostic. We re-throw
    // so the page can surface a real error rather than silently showing
    // an empty list.
    throw error;
  }
};

export const checkElasticsearchStatus = async (): Promise<ElasticsearchStatus> => {
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
    console.error('Error checking Elasticsearch status:', error);
    const axiosError = error as { response?: { status: number; statusText: string; data: unknown }; message?: string };
    const detail = axiosError.response
      ? `${axiosError.response.status} ${axiosError.response.statusText}: ${JSON.stringify(axiosError.response.data)}`
      : axiosError.message || 'Unknown error';
    return { status: 'error', message: `Cannot reach Elasticsearch: ${detail}` };
  }
};

export const deleteMovieByAdmin = async (movieId: string): Promise<void> => {
  try {
    await axiosInstance.delete(endpoints.admin.movies.delete(movieId));
  } catch (error) {
    console.error(`Error deleting movie ${movieId}:`, error);
    throw error;
  }
};

export const toggleMovieVisibility = async (movieId: string): Promise<unknown> => {
  try {
    const response = await axiosInstance.patch(
      endpoints.admin.movies.toggleVisibility(movieId),
      {},
      { timeout: 10000 }
    );
    return response.data;
  } catch (error) {
    console.error(`Error toggling visibility for movie ${movieId}:`, error);
    const axiosError = error as { response?: { data?: unknown; status?: number }; request?: unknown };
    if (axiosError.response) {
      console.error('Error response data:', axiosError.response.data);
      console.error('Error response status:', axiosError.response.status);
    } else if (axiosError.request) {
      console.error('Error request:', axiosError.request);
    }
    throw error;
  }
};

export const createMovieByAdmin = async (
  movieData: Record<string, unknown>
): Promise<{ movie: AdminMovie; success: boolean }> => {
  try {
    const url = endpoints.admin.movies.create();
    const response = await axiosInstance.post(url, movieData);
    return response.data as { movie: AdminMovie; success: boolean };
  } catch (error) {
    console.error('Error creating movie:', error);
    throw error;
  }
};
