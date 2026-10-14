/**
 * @file upcomingMovieAdminService.ts
 * @description Admin CRUD for upcoming movies (releases, scheduling).
 */
import axiosInstance from '@/config/axiosAdminConfig';
import type { AxiosResponse } from 'axios';

export interface UpcomingMovie {
  _id?: string;
  name: string;
  origin_name: string;
  content: string;
  type: string;
  status: string;
  thumb_url: string;
  poster_url: string;
  trailer_url: string;
  year: number;
  quality: string;
  lang: string;
  category: Array<{ id: string; name: string; slug: string }>;
  country: Array<{ id: string; name: string; slug: string }>;
  actor: string[];
  director: string[];
  release_date: string | Date;
  is_released: boolean;
  chieurap: boolean;
  isHidden: boolean;
}

export const getUpcomingMovies = async (
  page = 1,
  limit = 10,
  search = '',
  filters: Record<string, unknown> = {}
): Promise<AxiosResponse> => {
  return axiosInstance.get('/admin/upcoming-movies', { params: { page, limit, search, ...filters } });
};

export const getUpcomingMovieById = async (id: string): Promise<AxiosResponse> =>
  axiosInstance.get(`/admin/upcoming-movies/${id}`);

export const createUpcomingMovie = async (movieData: Partial<UpcomingMovie>): Promise<AxiosResponse> =>
  axiosInstance.post('/admin/upcoming-movies', movieData);

export const updateUpcomingMovie = async (id: string, movieData: Partial<UpcomingMovie>): Promise<AxiosResponse> =>
  axiosInstance.put(`/admin/upcoming-movies/${id}`, movieData);

export const deleteUpcomingMovie = async (id: string): Promise<AxiosResponse> =>
  axiosInstance.delete(`/admin/upcoming-movies/${id}`);

export const releaseUpcomingMovie = async (id: string): Promise<AxiosResponse> =>
  axiosInstance.put(`/admin/upcoming-movies/${id}/release`);
