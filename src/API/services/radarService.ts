/**
 * @file radarService.ts
 * @description Trending radar + grid rankings API client. Returns live data or
 * clean empty structures when the backend is unreachable.
 */
import { safeFetchJson } from '@/API/services/movieService';
import { filterMoviesWithValidTrailer } from '@/utils/trailer';
import { apiPath } from '@/config/apiPaths';

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
  // Optional trailer fields. The radar endpoint may or may not
  // include them depending on the backend payload — keep them
  // optional and structurally aligned with `@/utils/trailer` so the
  // homepage and rankings pages share the same `hasValidTrailer`
  // helper for filtering.
  trailer_url?: string;
  trailerUrl?: string;
  video_url?: string;
  videoUrl?: string;
  trailerLink?: string;
  trailer?: { key?: string; site?: string; name?: string; url?: string } | string | null;
  video?: { key?: string; site?: string; name?: string; url?: string } | string | null;
  youtube?: { key?: string; site?: string; name?: string; url?: string } | string | null;
  youtube_trailer?: { key?: string; site?: string; name?: string; url?: string } | string | null;
  movie_trailer?: { key?: string; site?: string; name?: string; url?: string } | string | null;
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
      const result = await safeFetchJson(apiPath(`moviesTrendingRadar`) + `?period=${period}`, {}, null) as { data?: RadarPayload & { breakthrough?: RadarItem[] } } | null;
      const data = result?.data || (result as unknown as RadarPayload | null) || null;
      if (data && data.discussed && data.genres) {
        const breakthrough = data.views || data.breakthrough || [];
        // Drop movies without a valid trailer from the bento chart
        // and the runner-up rows so we never expose a "Xem trailer"
        // button that opens an unplayable modal.
        return {
          discussed: filterMoviesWithValidTrailer(data.discussed),
          favorite: filterMoviesWithValidTrailer(data.favorite || []),
          views: filterMoviesWithValidTrailer(breakthrough),
          breakthrough: filterMoviesWithValidTrailer(breakthrough),
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
        apiPath(`moviesRankingsGrid`) + `?category=${category}&period=${period}&limit=${limit}`,
        {},
        null
      ) as { data?: RadarItem[]; movies?: RadarItem[] } | RadarItem[] | null;
      const items = (result && typeof result === 'object' && 'data' in result ? result.data : null)
        || (result && typeof result === 'object' && 'movies' in result ? result.movies : null)
        || (Array.isArray(result) ? result : null);
      if (Array.isArray(items) && items.length > 0) {
        // The rankings grid also has a per-card "Trailer" button.
        // Filter so the user is never shown a card that opens a
        // modal with no playable trailer.
        const filtered = filterMoviesWithValidTrailer(items);
        return filtered.slice(0, limit);
      }
    } catch {
      // Handled silently
    }
    return [];
  }
};

export default radarService;
