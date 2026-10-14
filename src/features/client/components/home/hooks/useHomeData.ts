/**
 * @file useHomeData.ts
 * @description Centralized data management hook for the Homepage.
 * Tích hợp HOME_SECTIONS để render không nhấp nháy, cập nhật state sạch,
 * fallback bền bỉ.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  normalizeHeroMovie,
  resolveImageUrl
} from '@/config/movieConfig';
import { SYSTEM_CONFIG } from '@/config/systemConfig';
import { HOME_SECTIONS } from '@/config/homeSectionsConfig';
import {
  resolveMovieBackdrop,
  LOCAL_DEFAULT_BACKDROP,
  LOCAL_DEFAULT_POSTER
} from '@/config/movieFallbackConfig';
import movieService from '@/API/services/movieService';
import upcomingMovieService from '@/API/services/upcomingMovieService';

/** Phim thô từ backend - loose shape, mọi field đều optional */
export type RawMovie = Record<string, unknown>;

/** Movie sau khi đã normalize về schema chuẩn */
export interface NormalizedMovie extends RawMovie {
  _id: string;
  name: string;
  poster_url: string;
  thumb_url: string;
  backdrop_url: string;
}

/** Movie với rank cho Top 10 */
export interface RankedMovie extends NormalizedMovie {
  rank: number;
}

/** Initial snapshot từ ISR/SSR */
export interface HomeDataSnapshot {
  featuredMovies?: RawMovie[];
  topMovies?: RawMovie[];
  mostViewedMovies?: RawMovie[];
  latestMovies?: RawMovie[];
  animeSpotlightMovies?: RawMovie[];
  [key: string]: unknown;
}

/** Hook return type */
export interface UseHomeDataReturn {
  featuredMovies: NormalizedMovie[];
  topMovies: NormalizedMovie[];
  mostViewedMovies: RankedMovie[];
  upcomingMovies: NormalizedMovie[];
  upcomingLoading: boolean;
  upcomingLoaded: boolean;
  loadUpcoming: () => Promise<void>;
  animeSpotlightMovies: RawMovie[];
  latestMovies: NormalizedMovie[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  page: number;
  loadMore: () => Promise<void>;
  fetchHeroMovies: () => Promise<void>;
  fetchTop10Movies: () => Promise<void>;
  fetchBigSlideMovies: () => Promise<void>;
  fetchMostViewed: () => Promise<void>;
}

// Module-level guard so the diagnostic only fires once per page load,
// even if the home page re-mounts or re-fetches.
let didLogHomeDiagnostic = false;

/**
 * Chuẩn hoá movie data từ nhiều format backend về schema chuẩn.
 * Mọi image field đều qua `resolveImageUrl` để relative path từ API
 * (e.g. `/uploads/poster.jpg`) được gắn origin thay vì host hiện tại.
 *
 * @param movie Raw movie object from API
 * @param index Item index cho diversified fallback backdrops
 * @returns Normalized movie object
 */
const normalizeMovie = (movie: RawMovie | null | undefined, index = 0): NormalizedMovie | null => {
  if (!movie) return null;

  // Lấy candidate field đầu tiên resolve được
  const resolveFirstUsable = (candidates: unknown[]): string => {
    for (const c of candidates) {
      const r = resolveImageUrl(c as string | null | undefined);
      if (r) return r;
    }
    return '';
  };

  const posterCandidates = [
    movie.poster_url, movie.poster, movie.posterUrl, movie.image
  ];
  const thumbCandidates = [
    movie.thumb_url, movie.thumb, movie.thumbUrl, movie.thumbnail
  ];

  const posterResolved = resolveFirstUsable(posterCandidates);
  const thumbResolved = resolveFirstUsable(thumbCandidates);
  const poster = posterResolved || thumbResolved || LOCAL_DEFAULT_POSTER;
  const thumb = thumbResolved || posterResolved || poster || LOCAL_DEFAULT_POSTER;
  const backdrop = resolveMovieBackdrop(movie as never, index) || LOCAL_DEFAULT_BACKDROP;

  // Controlled diagnostic (gated by NEXT_PUBLIC_DEBUG_MOVIES=true).
  // Logs ONLY the FIRST movie's raw fields and the resolved URLs, once
  // per page load.
  if (SYSTEM_CONFIG.debugMovies && index === 0 && !didLogHomeDiagnostic) {
    didLogHomeDiagnostic = true;
    // eslint-disable-next-line no-console
    console.log('[debug-movies] RAW movie keys:', movie ? Object.keys(movie) : null);
    // eslint-disable-next-line no-console
    console.log('[debug-movies] RAW image fields (movie[0]):', {
      poster_url: movie?.poster_url,
      thumb_url: movie?.thumb_url,
      backdrop_url: movie?.backdrop_url,
      poster: movie?.poster,
      thumb: movie?.thumb,
      backdrop: movie?.backdrop,
      image: movie?.image,
      imageUrl: movie?.imageUrl,
      posterUrl: movie?.posterUrl,
      backdropUrl: movie?.backdropUrl,
      thumbUrl: movie?.thumbUrl,
      tmdb_poster_path: (movie?.tmdb as Record<string, unknown> | undefined)?.poster_path,
      tmdb_backdrop_path: (movie?.tmdb as Record<string, unknown> | undefined)?.backdrop_path,
      nested: movie?.images && typeof movie.images === 'object' ? Object.keys(movie.images as object) : null
    });
    // eslint-disable-next-line no-console
    console.log('[debug-movies] RESOLVED image URLs (movie[0]):', {
      poster_url: poster,
      thumb_url: thumb,
      backdrop_url: backdrop
    });
  }

  const id = (movie._id as string) || (movie.id as string) || `movie-${index}`;
  const name = (movie.name as string) || 'Phim Đang Cập Nhật';

  return {
    ...movie,
    _id: id,
    name,
    poster_url: poster,
    thumb_url: thumb,
    backdrop_url: backdrop
  };
};

export const useHomeData = (initialSnapshot: HomeDataSnapshot | null = null): UseHomeDataReturn => {
  const isSnapshotEnabled = process.env.NEXT_PUBLIC_ENABLE_HOMEPAGE_SNAPSHOT === 'true';
  const effectiveSnapshot: HomeDataSnapshot | null = isSnapshotEnabled ? initialSnapshot : null;
  const snap = effectiveSnapshot as HomeDataSnapshot | null;

  // Pure real API data states initialized from ISR snapshot when available & enabled
  const [featuredMovies, setFeaturedMovies] = useState<NormalizedMovie[]>(() =>
    snap && (snap.featuredMovies?.length ?? 0) > 0
      ? (snap.featuredMovies ?? []).map((m, idx) => normalizeHeroMovie(m as never, idx) as unknown as NormalizedMovie)
      : []
  );
  const [topMovies, setTopMovies] = useState<NormalizedMovie[]>(() =>
    snap && (snap.topMovies?.length ?? 0) > 0
      ? (snap.topMovies ?? []).map((m, idx) => normalizeMovie(m, idx) as NormalizedMovie)
      : []
  );
  const [mostViewedMovies, setMostViewedMovies] = useState<RankedMovie[]>(() =>
    snap && (snap.mostViewedMovies?.length ?? 0) > 0
      ? (snap.mostViewedMovies ?? []).map((m, idx) => ({
          ...(normalizeMovie(m, idx) as NormalizedMovie),
          rank: (m.rank as number) || idx + 1
        }))
      : []
  );
  const [upcomingMovies, setUpcomingMovies] = useState<NormalizedMovie[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState<boolean>(false);
  const [upcomingLoaded, setUpcomingLoaded] = useState<boolean>(false);
  const [animeSpotlightMovies, setAnimeSpotlightMovies] = useState<RawMovie[]>(
    () => (snap?.animeSpotlightMovies || []) as RawMovie[]
  );
  const [latestMovies, setLatestMovies] = useState<NormalizedMovie[]>(() =>
    snap && (snap.latestMovies?.length ?? 0) > 0
      ? (snap.latestMovies ?? []).map((m, idx) => normalizeMovie(m, idx) as NormalizedMovie)
      : []
  );

  const [loading, setLoading] = useState<boolean>(() => !(snap?.featuredMovies?.length ?? 0));
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Fetches hero spotlight movies via HOME_SECTIONS bundle.
   */
  const fetchHeroMovies = useCallback(async (): Promise<void> => {
    try {
      const heroSection = HOME_SECTIONS['hero'];
      const movies = heroSection?.load ? await heroSection.load([]) : [];
      if (isMountedRef.current && movies.length > 0) {
        setFeaturedMovies(movies.map((m, idx) => normalizeHeroMovie(m as never, idx) as unknown as NormalizedMovie));
      }
    } catch {
      // Fallback is gracefully handled inside HOME_SECTIONS.hero.load
    }
  }, []);

  /**
   * Fetches Top 10 movies via HOME_SECTIONS bundle.
   */
  const fetchTop10Movies = useCallback(async (): Promise<void> => {
    try {
      const top10Section = HOME_SECTIONS['top10'];
      const movies = top10Section?.load ? await top10Section.load([]) : [];
      if (isMountedRef.current && movies.length > 0) {
        const normalized: RankedMovie[] = movies.map((m, idx) => ({
          ...(normalizeMovie(m as RawMovie, idx) as NormalizedMovie),
          rank: idx + 1
        }));
        setMostViewedMovies(normalized);
      }
    } catch {
      // Fallback is gracefully handled inside HOME_SECTIONS.top10.load
    }
  }, []);

  /**
   * Fetches the homepage movie list (page=1, limit=20) on first paint
   * and subsequent pages for infinite scroll.
   */
  const fetchLatestMovies = useCallback(async (pageNumber = 1, isLoadMore = false): Promise<void> => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      // First page uses the dedicated `getHomeMovies()` which honors the
      // exact spec `GET /api/v1/movies?page=1&limit=20`. Subsequent
      // pages reuse `getMoviesPage` for pagination continuity.
      const rawMovies = pageNumber === 1
        ? await movieService.getHomeMovies()
        : await movieService.getMoviesPage(pageNumber, 24);

      if (rawMovies.length > 0 && isMountedRef.current) {
        const normalized = rawMovies.map((m, idx) => normalizeMovie(m as RawMovie, idx) as NormalizedMovie);

        if (pageNumber === 1) {
          setTopMovies(normalized.slice(0, 12));
          setLatestMovies(normalized);
        } else {
          setLatestMovies((prev) => [...prev, ...normalized]);
        }
      }
    } catch {
      // Retain existing state silently
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  /**
   * Lazily loads upcoming movies on demand with a deliberate loading buffer.
   */
  const loadUpcoming = useCallback(async (): Promise<void> => {
    if (upcomingLoaded || upcomingLoading) return;
    setUpcomingLoading(true);

    const startTime = Date.now();
    const MIN_LOADING_TIME = 1500;
    const MAX_TIMEOUT = 8000;

    let timeoutTriggered = false;
    const timeoutTimer: ReturnType<typeof setTimeout> = setTimeout(() => {
      timeoutTriggered = true;
    }, MAX_TIMEOUT);

    try {
      const result = await upcomingMovieService.getUpcomingMovies(1, 15) as {
        success?: boolean;
        upcomingMovies?: RawMovie[];
      };
      clearTimeout(timeoutTimer);

      if (timeoutTriggered) return;

      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_LOADING_TIME) {
        await new Promise<void>((resolve) => setTimeout(resolve, MIN_LOADING_TIME - elapsed));
      }

      if (result?.success && (result.upcomingMovies?.length ?? 0) > 0 && isMountedRef.current) {
        setUpcomingMovies((result.upcomingMovies || []).map((m) => normalizeMovie(m) as NormalizedMovie));
      } else if (isMountedRef.current) {
        setUpcomingMovies([]);
      }
    } catch {
      clearTimeout(timeoutTimer);
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_LOADING_TIME) {
        await new Promise<void>((resolve) => setTimeout(resolve, MIN_LOADING_TIME - elapsed));
      }

      if (!timeoutTriggered && isMountedRef.current) {
        setUpcomingMovies([]);
      }
    } finally {
      if (isMountedRef.current) {
        setUpcomingLoading(false);
        setUpcomingLoaded(true);
      }
    }
  }, [upcomingLoaded, upcomingLoading]);

  /**
   * Fetches Anime Spotlight movies via HOME_SECTIONS bundle.
   */
  const fetchBigSlideMovies = useCallback(async (): Promise<void> => {
    try {
      const bigSlideSection = HOME_SECTIONS['big_slide'];
      const movies = bigSlideSection?.load
        ? ((await bigSlideSection.load([])) as unknown as RawMovie[])
        : undefined;
      if (isMountedRef.current && Array.isArray(movies) && movies.length > 0) {
        setAnimeSpotlightMovies(movies);
      }
    } catch {
      // Fallback handled gracefully
    }
  }, []);

  // Initial fetch on mount: ONLY triggered if initialSnapshot is not provided or empty
  useEffect(() => {
    if (!initialSnapshot?.featuredMovies?.length) {
      fetchHeroMovies();
      fetchTop10Movies();
      fetchBigSlideMovies();
      fetchLatestMovies(1, false);
    }
  }, [initialSnapshot, fetchHeroMovies, fetchTop10Movies, fetchBigSlideMovies, fetchLatestMovies]);

  /**
   * Loads the next batch of movies for infinite scrolling.
   */
  const loadMore = useCallback(async (): Promise<void> => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const nextPage = page + 1;
      const rawMovies = await movieService.getMoviesPage(nextPage, 24);

      if (rawMovies && rawMovies.length > 0 && isMountedRef.current) {
        const normalized = rawMovies.map((m, idx) => normalizeMovie(m as RawMovie, idx) as NormalizedMovie);
        setLatestMovies((prev) => [...prev, ...normalized]);
        setPage(nextPage);
      } else if (isMountedRef.current) {
        setHasMore(false);
      }
    } catch {
      if (isMountedRef.current) {
        setHasMore(false);
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingMore(false);
      }
    }
  }, [page, loadingMore, hasMore]);

  return {
    featuredMovies,
    topMovies,
    mostViewedMovies,
    upcomingMovies,
    upcomingLoading,
    upcomingLoaded,
    loadUpcoming,
    animeSpotlightMovies,
    latestMovies,
    loading,
    loadingMore,
    hasMore,
    page,
    loadMore,
    fetchHeroMovies,
    fetchTop10Movies,
    fetchBigSlideMovies,
    fetchMostViewed: fetchTop10Movies
  };
};

export default useHomeData;
