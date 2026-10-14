/**
 * @file movieCrawlService.ts
 * @description Movie catalog crawl proxy used by the admin crawler modal.
 */
import axiosInstance from '@/API/config/axiosConfig';
import { endpoints } from '@/config/API';

export interface CrawlResponse {
  message: string;
  data: {
    allMovies?: unknown[];
    errors?: unknown[];
    totalCrawled?: number;
    totalErrors?: number;
  };
}

const errorMessage = (err: unknown, fallback: string): string => {
  const axiosError = err as { response?: { data?: { message?: string } } };
  return axiosError.response?.data?.message || fallback;
};

class MovieCrawlService {
  async crawlMovies(page: number = 1): Promise<CrawlResponse> {
    try {
      const response = await axiosInstance.post(`${endpoints.crawl.movies()}?page=${page}`);
      return response.data as CrawlResponse;
    } catch (error) {
      throw new Error(errorMessage(error, 'Failed to crawl movies'));
    }
  }

  async crawlAllMovies(): Promise<CrawlResponse> {
    try {
      const response = await axiosInstance.post(endpoints.crawl.moviesAll());
      return response.data as CrawlResponse;
    } catch (error) {
      throw new Error(errorMessage(error, 'Failed to crawl all movies'));
    }
  }
}

export default new MovieCrawlService();
