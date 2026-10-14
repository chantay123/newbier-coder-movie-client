/**
 * @file radarService.ts
 * @description Trending radar + grid rankings API client. Returns live data or
 * clean empty structures when the backend is unreachable.
 */
import { safeFetchJson } from '@/API/services/movieService';

export type RadarPeriod = 'week' | 'month';
export type RadarCategory = 'discussed' | 'favorite' | 'views';

export interface RadarItem {
  id?: string;
  slug?: string;
  name?: string;
  thumb_url?: string;
  poster_url?: string;
  rating?: number;
  views?: number;
  [key: string]: unknown;
}

export interface RadarPayload {
  discussed: RadarItem[];
  favorite: RadarItem[];
  breakthrough: RadarItem[];
  views: RadarItem[];
  genres: RadarItem[];
  period: string;
}

export const radarService = {
  getTrendingRadar: async ({ period = 'week' }: { period?: RadarPeriod } = {}): Promise<RadarPayload> => {
    try {
      const result = await safeFetchJson(`/movies/trending-radar?period=${period}`, {}, null) as { data?: RadarPayload & { breakthrough?: RadarItem[] } } | null;
      const data = result?.data || (result as unknown as RadarPayload | null) || null;
      if (data && data.discussed && data.genres) {
        const breakthrough = data.views || data.breakthrough || [];
        return {
          discussed: data.discussed,
          favorite: data.favorite || [],
          views: breakthrough,
          breakthrough,
          genres: data.genres,
          period
        };
      }
    } catch {
      // Quietly handled
    }
    return {
      discussed: [],
      favorite: [],
      views: [],
      breakthrough: [],
      genres: [],
      period
    };
  },

  getTopRankingsGrid: async ({ category = 'discussed', period = 'week', limit = 50 }: { category?: RadarCategory; period?: RadarPeriod; limit?: number } = {}): Promise<RadarItem[]> => {
    try {
      const result = await safeFetchJson(
        `/movies/rankings-grid?category=${category}&period=${period}&limit=${limit}`,
        {},
        null
      ) as { data?: RadarItem[]; movies?: RadarItem[] } | RadarItem[] | null;
      const items = (result && typeof result === 'object' && 'data' in result ? result.data : null)
        || (result && typeof result === 'object' && 'movies' in result ? result.movies : null)
        || (Array.isArray(result) ? result : null);
      if (Array.isArray(items) && items.length > 0) {
        return items.slice(0, limit);
      }
    } catch {
      // Handled silently
    }
    return [];
  }
};

export default radarService;
