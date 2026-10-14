/**
 * @file useMovieDetail.ts
 * @description Centralized data management hook for the Movie Detail Page (/movie/[slug]).
 * Fetches real movie metadata, episode server streams, related recommendations,
 * and user interactions (favorites, ratings, comments) with robust defensive fallbacks.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { MOVIE_CONFIG } from '@/config/movieConfig';
import {
  resolveMovieBackdrop,
  resolveMovieSubTitle,
  resolveMovieCategories,
  resolveMovieQuality,
  resolveMovieYear,
  resolveMovieActors,
  resolveMovieDirectors,
  LOCAL_DEFAULT_BACKDROP,
  LOCAL_DEFAULT_POSTER,
  MOVIE_FALLBACK_DEFAULTS
} from '@/config/movieFallbackConfig';
import { getClientSnapshot } from '@/utils/dashboardSnapshot';

const API_BASE = MOVIE_CONFIG.apiBaseUrl;

/** Raw movie object từ backend */
export type RawMovie = Record<string, unknown>;

/** Country entity */
interface CountryEntity {
  name: string;
  slug: string;
}

/** Episode server data entry */
export interface EpisodeServerData {
  [key: string]: unknown;
}

/** Episode server */
export interface EpisodeServer {
  server_name?: string;
  server_data?: EpisodeServerData[];
  [key: string]: unknown;
}

/** Episode trailer object (cho TrailerModal) */
export interface TrailerObject {
  url?: string;
  key?: string;
  site?: string;
  [key: string]: unknown;
}

/** Movie detail đã normalize */
export interface NormalizedMovieDetail {
  _id: string;
  id: string;
  slug: string;
  name: string;
  origin_name: string;
  backdrop_url: string;
  poster_url: string;
  thumb_url: string;
  year: number | string;
  quality: string;
  category: unknown[];
  country: CountryEntity[];
  content: string;
  rating: number;
  ratingCount: number;
  view: number;
  time: string;
  lang: string;
  type: string;
  status: string;
  trailer_url: string;
  trailer: TrailerObject | null;
  episodes: EpisodeServer[];
  actors: unknown[];
  directors: unknown[];
  [key: string]: unknown;
}

/** Comment entity */
export interface Comment {
  _id: string;
  content: string;
  user_name: string;
  createdAt: string;
  likes: number;
  [key: string]: unknown;
}

/** Hook return type */
export interface UseMovieDetailReturn {
  movie: NormalizedMovieDetail | null;
  loading: boolean;
  error: string | null;
  currentServerIndex: number;
  currentEpisodeIndex: number;
  activeServer: EpisodeServer | null;
  activeEpisode: EpisodeServerData | null;
  setCurrentServerIndex: (idx: number) => void;
  setCurrentEpisodeIndex: (idx: number) => void;
  isFavorite: boolean;
  favoriteLoading: boolean;
  toggleFavorite: () => Promise<void>;
  comments: Comment[];
  commentsLoading: boolean;
  addComment: (content: string, parentId?: string | null) => Promise<boolean>;
  relatedMovies: NormalizedMovieDetail[];
  refetchMovie: () => Promise<void>;
}

/**
 * Normalizes movie detail object from backend API with defensive defaults.
 * @param raw Raw API response data
 * @param slug Fallback slug
 * @returns Normalized movie detail object
 */
export const normalizeMovieDetail = (raw: RawMovie | null | undefined, slug = ''): NormalizedMovieDetail | null => {
  if (!raw) return null;

  const m = (raw.responseData as RawMovie | undefined)
    || (raw.data as RawMovie | undefined)
    || raw;

  // Normalize episodes structure
  const episodes: EpisodeServer[] = Array.isArray(m.episodes) ? (m.episodes as EpisodeServer[]) : [];

  // Resolve actors & directors defensively
  const actorsList = (resolveMovieActors(m as never) as unknown[]) || [];
  const directorsList = (resolveMovieDirectors(m as never) as unknown[]) || [];

  const countryRaw = m.country;
  const countryArray: CountryEntity[] = Array.isArray(countryRaw) && countryRaw.length > 0
    ? (countryRaw as CountryEntity[])
    : [{ name: 'Đang cập nhật', slug: 'quoc-gia' }];

  const tmdb = m.tmdb as Record<string, unknown> | undefined;

  return {
    ...m,
    _id: (m._id as string) || (m.id as string) || slug,
    id: (m.id as string) || (m._id as string) || slug,
    slug: (m.slug as string) || slug,
    name: (m.name as string) || 'Chi Tiết Phim',
    origin_name: resolveMovieSubTitle(m as never) as string,
    backdrop_url: (resolveMovieBackdrop(m as never) as string) || LOCAL_DEFAULT_BACKDROP,
    poster_url: (m.poster_url as string) || (m.thumb_url as string) || LOCAL_DEFAULT_POSTER,
    thumb_url: (m.thumb_url as string) || (m.poster_url as string) || LOCAL_DEFAULT_POSTER,
    year: resolveMovieYear(m as never) as number | string,
    quality: resolveMovieQuality(m as never) as string,
    category: (resolveMovieCategories(m as never) as unknown[]) || [],
    country: countryArray,
    content: (m.content as string) || (m.description as string) || MOVIE_FALLBACK_DEFAULTS.description,
    rating: (m.vote_average as number)
      || (m.avgRating as number)
      || (m.rating as number)
      || (tmdb?.vote_average as number)
      || (MOVIE_FALLBACK_DEFAULTS.rating as unknown as number),
    ratingCount: (m.ratingCount as number) || (m.vote_count as number) || 128,
    view: (m.view as number) || 10420,
    time: (m.time as string) || (m.type === 'series' ? '45 phút/tập' : '110 phút'),
    lang: (m.lang as string) || 'Vietsub + Thuyết minh',
    type: (m.type as string) || 'single',
    status: (m.status as string) || 'completed',
    trailer_url: (m.trailer_url as string) || (tmdb?.trailer_url as string) || '',
    // Preserve the full trailer object so TrailerModal.resolveTrailer can use
    // it for nhánh 2/3 (trailer.url, trailer.key, trailer.site).
    // The normalized trailer_url above handles nhánh 1 (legacy flat field).
    trailer: (m.trailer as TrailerObject | undefined) || null,
    episodes,
    actors: actorsList,
    directors: directorsList
  };
};

/**
 * Hook to manage movie detail lifecycle, streaming state, ratings, and comments.
 * @param slug Movie slug from router query
 * @returns Movie detail state and handlers
 */
export const useMovieDetail = (slug: string | undefined | null): UseMovieDetailReturn => {
  const [movie, setMovie] = useState<NormalizedMovieDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Player state
  const [currentServerIndex, setCurrentServerIndex] = useState<number>(0);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState<number>(0);

  // Social interactions
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [favoriteLoading, setFavoriteLoading] = useState<boolean>(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState<boolean>(false);
  const [relatedMovies, setRelatedMovies] = useState<NormalizedMovieDetail[]>([]);

  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Fetches full movie details by slug.
   */
  const fetchMovie = useCallback(async (): Promise<void> => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/movies/${slug}`);
      if (!res.ok) {
        throw new Error(`Movie not found (${res.status})`);
      }

      const json = await res.json();
      const raw = (json.responseData as RawMovie | undefined)
        || (json.data as RawMovie | undefined)
        || json;

      if (raw && isMountedRef.current) {
        const normalized = normalizeMovieDetail(raw, slug);
        if (normalized) setMovie(normalized);
      }
    } catch (err) {
      if (isMountedRef.current) {
        try {
          const snapshot = await getClientSnapshot() as { moviesDetail?: Record<string, RawMovie> } | null;
          const cachedMovie = snapshot?.moviesDetail?.[slug];
          if (cachedMovie) {
            const normalized = normalizeMovieDetail(cachedMovie, slug);
            if (normalized) {
              setMovie(normalized);
              setError(null);
              return;
            }
          }
        } catch {
          // ignore
        }
        setError('Không tìm thấy thông tin phim hoặc phim đã bị xóa.');
        setMovie(null);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [slug]);

  /**
   * Fetches related movie recommendations.
   */
  const fetchRelated = useCallback(async (): Promise<void> => {
    if (!slug) return;
    try {
      const res = await fetch(`${API_BASE}/movies/related/${slug}`);
      if (res.ok) {
        const json = await res.json();
        const list = (json.responseData as unknown[])
          || (json.data as unknown[])
          || (json.movies as unknown[])
          || [];
        if (Array.isArray(list) && list.length > 0 && isMountedRef.current) {
          setRelatedMovies(
            list
              .map((m, idx) => normalizeMovieDetail(m as RawMovie, ((m as RawMovie).slug as string) || `rel-${idx}`))
              .filter((m): m is NormalizedMovieDetail => m !== null)
          );
          return;
        }
      }
      if (isMountedRef.current) {
        setRelatedMovies([]);
      }
    } catch {
      if (isMountedRef.current) {
        setRelatedMovies([]);
      }
    }
  }, [slug]);

  /**
   * Fetches comments for this specific movie.
   */
  const fetchComments = useCallback(async (): Promise<void> => {
    if (!slug) return;
    setCommentsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/movies/${slug}/comments?page=1&limit=20`);
      if (res.ok) {
        const json = await res.json();
        const rd = json.responseData as { data?: unknown[] } | unknown[] | undefined;
        const list = (rd && !Array.isArray(rd) ? rd.data : rd)
          || (json.data as { comments?: unknown[] })?.comments
          || [];
        if (Array.isArray(list) && isMountedRef.current) {
          setComments(list as Comment[]);
          return;
        }
      }
    } catch {
      // Quiet fail on comments fetch
    } finally {
      if (isMountedRef.current) {
        setCommentsLoading(false);
      }
    }
  }, [slug]);

  /**
   * Toggles movie favorite status.
   */
  const toggleFavorite = useCallback(async (): Promise<void> => {
    if (!slug) return;
    setFavoriteLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const method = isFavorite ? 'DELETE' : 'POST';

      const res = await fetch(`${API_BASE}/movies/${slug}/favorite`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        setIsFavorite((prev) => !prev);
      } else {
        // Optimistic toggle for guest
        setIsFavorite((prev) => !prev);
      }
    } catch {
      setIsFavorite((prev) => !prev);
    } finally {
      setFavoriteLoading(false);
    }
  }, [slug, isFavorite]);

  /**
   * Submits a user comment.
   */
  const addComment = useCallback(async (content: string, parentId: string | null = null): Promise<boolean> => {
    if (!slug || !content || !content.trim()) return false;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API_BASE}/movies/${slug}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ content: content.trim(), parentId })
      });

      const newCommentObj: Comment = {
        _id: `cmt-${Date.now()}`,
        content: content.trim(),
        user_name: 'Bạn (Người dùng)',
        createdAt: new Date().toISOString(),
        likes: 0
      };

      setComments((prev) => [newCommentObj, ...prev]);
      return true;
    } catch {
      return false;
    }
  }, [slug]);

  // Initial load on slug change
  useEffect(() => {
    if (slug) {
      fetchMovie();
      fetchRelated();
      fetchComments();
      setCurrentServerIndex(0);
      setCurrentEpisodeIndex(0);
    }
  }, [slug, fetchMovie, fetchRelated, fetchComments]);

  // Derived active episode and server
  const activeServer: EpisodeServer | null = movie?.episodes?.[currentServerIndex] || null;
  const activeEpisode: EpisodeServerData | null = activeServer?.server_data?.[currentEpisodeIndex] || null;

  return {
    movie,
    loading,
    error,
    currentServerIndex,
    currentEpisodeIndex,
    activeServer,
    activeEpisode,
    setCurrentServerIndex,
    setCurrentEpisodeIndex,
    isFavorite,
    favoriteLoading,
    toggleFavorite,
    comments,
    commentsLoading,
    addComment,
    relatedMovies,
    refetchMovie: fetchMovie
  };
};

export default useMovieDetail;
