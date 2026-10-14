/**
 * @file upcomingMovieService.ts
 * @description Public upcoming-movie reads (list / by-id / by-slug / by-category).
 */
const API_URL = (process.env.NEXT_PUBLIC_CORE_API_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

export interface UpcomingMovie {
  _id: string;
  name: string;
  origin_name?: string;
  thumb_url: string;
  poster_url: string;
  release_date: string | Date;
  formattedReleaseDate?: string;
  daysUntilRelease?: number;
  countdownText?: string;
  [key: string]: unknown;
}

export interface UpcomingPagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

export interface UpcomingListResult {
  success: boolean;
  upcomingMovies: UpcomingMovie[];
  pagination?: UpcomingPagination;
}

const emptyList = (): UpcomingListResult => ({
  success: false,
  upcomingMovies: [],
  pagination: { currentPage: 1, totalPages: 1, totalCount: 0 }
});

const formatMovie = (movie: UpcomingMovie): UpcomingMovie => {
  const releaseDate = new Date(movie.release_date);
  return {
    ...movie,
    formattedReleaseDate: releaseDate.toLocaleDateString('en-GB'),
    daysUntilRelease: Math.ceil((releaseDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    countdownText: getCountdownText(releaseDate)
  };
};

/** Human-readable countdown label for a future release date. */
function getCountdownText(releaseDate: Date): string {
  const daysDiff = Math.ceil((releaseDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysDiff <= 0) return 'Released';
  if (daysDiff === 1) return 'Releases tomorrow';
  if (daysDiff <= 7) return `Releases in ${daysDiff} days`;
  if (daysDiff <= 30) {
    const weeks = Math.ceil(daysDiff / 7);
    return `Releases in ${weeks} weeks`;
  }
  const months = Math.ceil(daysDiff / 30);
  return `Releases in ${months} months`;
}

const fetchJson = async (url: string, init?: RequestInit): Promise<unknown> => {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

const upcomingMovieService = {
  getUpcomingMovies: async (page = 1, limit = 10): Promise<UpcomingListResult> => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 1200) : null;
    const data = await fetchJson(
      `${API_URL}/upcoming-movies?page=${page}&limit=${limit}`,
      controller ? { signal: controller.signal } : undefined
    );
    if (timeoutId) clearTimeout(timeoutId);

    if (!data || typeof data !== 'object') return emptyList();
    const payload = data as { success?: boolean; upcomingMovies?: UpcomingMovie[]; currentPage?: number; totalPages?: number; totalCount?: number };
    if (payload.success && Array.isArray(payload.upcomingMovies)) {
      const processed = payload.upcomingMovies
        .map(formatMovie)
        .sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime());
      return {
        success: true,
        upcomingMovies: processed,
        pagination: {
          currentPage: payload.currentPage || 1,
          totalPages: payload.totalPages || 1,
          totalCount: payload.totalCount || processed.length
        }
      };
    }
    return emptyList();
  },

  getUpcomingMovieById: async (movieId: string): Promise<{ success: boolean; upcomingMovie: UpcomingMovie | null }> => {
    const data = await fetchJson(`${API_URL}/admin/upcoming-movies/${movieId}`);
    if (!data || typeof data !== 'object') return { success: false, upcomingMovie: null };
    const payload = data as { success?: boolean; upcomingMovie?: UpcomingMovie };
    if (payload.success && payload.upcomingMovie) {
      return { success: true, upcomingMovie: formatMovie(payload.upcomingMovie) };
    }
    return { success: false, upcomingMovie: null };
  },

  getUpcomingMovieBySlug: async (slug: string): Promise<{ success: boolean; movie: UpcomingMovie | null }> => {
    const data = await fetchJson(`${API_URL}/upcoming-movies/${slug}`);
    if (!data || typeof data !== 'object') return { success: false, movie: null };
    return data as { success: boolean; movie: UpcomingMovie | null };
  },

  getUpcomingMoviesByCategory: async (categorySlug: string, page = 1, limit = 10): Promise<{ success: boolean; upcomingMovies: UpcomingMovie[] }> => {
    const data = await fetchJson(`${API_URL}/upcoming-movies/category/${categorySlug}?page=${page}&limit=${limit}`);
    if (!data || typeof data !== 'object') return { success: false, upcomingMovies: [] };
    return data as { success: boolean; upcomingMovies: UpcomingMovie[] };
  }
};

export default upcomingMovieService;
