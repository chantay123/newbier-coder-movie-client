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
import { filterMoviesWithValidTrailer } from '@/utils/trailer';
import {
  mockMovies,
  mockKoreanMovies,
  mockChineseMovies,
  mockAnimationMovies
} from '@/mock/mockMovies';

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

    // eslint-disable-next-line no-console

    // eslint-disable-next-line no-console

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

  // Pure real API data states initialized from ISR snapshot when available & enabled.
  // Each initializer runs the trailer-aware filter so the homepage
  // never boots up with a list that contains movies we cannot play a
  // trailer for. The same `filterMoviesWithValidTrailer` helper used
  // by the network fetchers is reused here to keep the rule in one
  // place: a movie without a valid trailer simply must not appear in
  // any rail that exposes a "Xem trailer" button.
  const [featuredMovies, setFeaturedMovies] = useState<NormalizedMovie[]>(() => {
    const list = snap && (snap.featuredMovies?.length ?? 0) > 0
      ? (snap.featuredMovies ?? [])
      : [];
    const filtered = filterMoviesWithValidTrailer(list);
    return filtered.map((m, idx) => normalizeHeroMovie(m as never, idx) as unknown as NormalizedMovie);
  });
  const [topMovies, setTopMovies] = useState<NormalizedMovie[]>(() => {
    const list = snap && (snap.topMovies?.length ?? 0) > 0
      ? (snap.topMovies ?? [])
      : [];
    const filtered = filterMoviesWithValidTrailer(list);
    return filtered.map((m, idx) => normalizeMovie(m, idx) as NormalizedMovie);
  });
  const [mostViewedMovies, setMostViewedMovies] = useState<RankedMovie[]>(() => {
    const list = snap && (snap.mostViewedMovies?.length ?? 0) > 0
      ? (snap.mostViewedMovies ?? [])
      : [];
    const filtered = filterMoviesWithValidTrailer(list);
    return filtered.map((m, idx) => ({
      ...(normalizeMovie(m, idx) as NormalizedMovie),
      rank: (m.rank as number) || idx + 1
    }));
  });
  const [upcomingMovies, setUpcomingMovies] = useState<NormalizedMovie[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState<boolean>(false);
  const [upcomingLoaded, setUpcomingLoaded] = useState<boolean>(false);
  const [animeSpotlightMovies, setAnimeSpotlightMovies] = useState<RawMovie[]>(
    () => filterMoviesWithValidTrailer(snap?.animeSpotlightMovies || [])
  );
  const [latestMovies, setLatestMovies] = useState<NormalizedMovie[]>(() => {
    const list = snap && (snap.latestMovies?.length ?? 0) > 0
      ? (snap.latestMovies ?? [])
      : [];
    const filtered = filterMoviesWithValidTrailer(list);
    return filtered.map((m, idx) => normalizeMovie(m, idx) as NormalizedMovie);
  });

  const [loading, setLoading] = useState<boolean>(() => !(snap?.featuredMovies?.length ?? 0));
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const isMountedRef = useRef<boolean>(true);
  // Counter tracks how many of the initial 4 fetches are still in
  // flight. `loading` flips off only when the counter reaches zero,
  // so a single hung fetch can no longer trap the page in skeleton
  // state forever. Also used as a hard safety net: a per-fetch
  // timeout is enforced below so the counter can never stay > 0.
  const initialFetchesPendingRef = useRef<number>(0);
  // Master timeout id so we can clear it once the page renders.
  const loadingSafetyNetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (loadingSafetyNetRef.current) {
        clearTimeout(loadingSafetyNetRef.current);
        loadingSafetyNetRef.current = null;
      }
    };
  }, []);

  /**
   * Decrements the in-flight counter and, when it reaches zero,
   * unsticks the page by setting `loading=false`. This is the single
   * point of truth for the initial-load loading state — every
   * fetcher that participates in the initial paint must call it.
   */
  const finishInitialFetch = useCallback((): void => {
    initialFetchesPendingRef.current = Math.max(0, initialFetchesPendingRef.current - 1);
    if (
      isMountedRef.current
      && initialFetchesPendingRef.current === 0
    ) {
      if (loadingSafetyNetRef.current) {
        clearTimeout(loadingSafetyNetRef.current);
        loadingSafetyNetRef.current = null;
      }
      setLoading(false);
    }
  }, []);

  /**
   * Fetches hero spotlight movies via HOME_SECTIONS bundle.
   * Falls back to local mockMovies when the API returns empty (e.g. 401).
   */
  const fetchHeroMovies = useCallback(async (): Promise<void> => {
    try {
      const heroSection = HOME_SECTIONS['hero'];
      const movies = heroSection?.load ? await heroSection.load([]) : [];
      let finalList = movies;
      if (!Array.isArray(movies) || movies.length === 0) {
        // eslint-disable-next-line no-console

        finalList = mockMovies as unknown as typeof movies;
      }
      if (isMountedRef.current && finalList.length > 0) {
        const filtered = filterMoviesWithValidTrailer(finalList);
        setFeaturedMovies(filtered.map((m, idx) => normalizeHeroMovie(m as never, idx) as unknown as NormalizedMovie));
      }
    } catch {
      if (isMountedRef.current) {
        // eslint-disable-next-line no-console

        const filtered = filterMoviesWithValidTrailer(mockMovies as unknown as RawMovie[]);
        setFeaturedMovies(filtered.map((m, idx) => normalizeHeroMovie(m as never, idx) as unknown as NormalizedMovie));
      }
    } finally {
      finishInitialFetch();
    }
  }, [finishInitialFetch]);

  /**
   * Fetches Top 10 movies via HOME_SECTIONS bundle.
   * Falls back to local mockMovies when the API returns empty (e.g. 401).
   */
  const fetchTop10Movies = useCallback(async (): Promise<void> => {
    try {
      const top10Section = HOME_SECTIONS['top10'];
      const movies = top10Section?.load ? await top10Section.load([]) : [];
      let finalList = movies;
      if (!Array.isArray(movies) || movies.length === 0) {
        // eslint-disable-next-line no-console

        finalList = mockMovies as unknown as typeof movies;
      }
      if (isMountedRef.current && finalList.length > 0) {
        const filtered = filterMoviesWithValidTrailer(finalList);
        const normalized: RankedMovie[] = filtered.slice(0, 10).map((m, idx) => ({
          ...(normalizeMovie(m as RawMovie, idx) as NormalizedMovie),
          rank: idx + 1
        }));
        setMostViewedMovies(normalized);
      }
    } catch {
      if (isMountedRef.current) {
        // eslint-disable-next-line no-console

        const filtered = filterMoviesWithValidTrailer(mockMovies as unknown as RawMovie[]);
        const normalized: RankedMovie[] = filtered.slice(0, 10).map((m, idx) => ({
          ...(normalizeMovie(m, idx) as NormalizedMovie),
          rank: idx + 1
        }));
        setMostViewedMovies(normalized);
      }
    } finally {
      finishInitialFetch();
    }
  }, [finishInitialFetch]);

  /**
   * Fetches the homepage movie list (page=1, limit=20) on first paint
   * and subsequent pages for infinite scroll.
   * Falls back to local mockMovies when the API returns empty (e.g. 401
   * Missing Bearer token on the production deploy).
   */
  const fetchLatestMovies = useCallback(async (pageNumber = 1, isLoadMore = false): Promise<void> => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      }

      // First page uses the dedicated `getHomeMovies()` which honors the
      // exact spec `GET /api/v1/movies?page=1&limit=20`. Subsequent
      // pages reuse `getMoviesPage` for pagination continuity.
      let rawMovies = pageNumber === 1
        ? await movieService.getHomeMovies()
        : await movieService.getMoviesPage(pageNumber, 24);

      // FALLBACK: backend returns empty/401 → use local mock movies.
      // This keeps the homepage visible during backend auth maintenance.
      if ((!Array.isArray(rawMovies) || rawMovies.length === 0) && pageNumber === 1) {
        // eslint-disable-next-line no-console

        rawMovies = mockMovies as unknown as RawMovie[];
      }

      if (rawMovies.length > 0 && isMountedRef.current) {
        // Drop movies that have no valid trailer BEFORE we feed them
        // into the rails. The homepage renders play buttons for every
        // movie in these lists, so a movie without a usable trailer
        // must never appear here — it would either silently no-op
        // when clicked or show a "Trailer chưa được cung cấp" panel
        // for a movie the user thought they could watch.
        const filteredRaw = filterMoviesWithValidTrailer(rawMovies);
        const normalized = filteredRaw.map((m, idx) => normalizeMovie(m as RawMovie, idx) as NormalizedMovie);

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
        setLoadingMore(false);
        // First-page requests participate in the initial loading
        // counter; load-more requests are tracked separately and
        // never affect the initial skeleton state.
        if (pageNumber === 1) {
          finishInitialFetch();
        } else {
          setLoading(false);
        }
      }
    }
  }, [finishInitialFetch]);

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
        // Same trailer-aware filter as the other rails. Upcoming
        // movies also expose a "Xem trailer" button on the card.
        const filtered = filterMoviesWithValidTrailer(result.upcomingMovies || []);
        setUpcomingMovies(filtered.map((m) => normalizeMovie(m) as NormalizedMovie));
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
   * Falls back to local mockAnimationMovies when the API returns empty (e.g. 401).
   */
  const fetchBigSlideMovies = useCallback(async (): Promise<void> => {
    try {
      const bigSlideSection = HOME_SECTIONS['big_slide'];
      const movies = bigSlideSection?.load
        ? ((await bigSlideSection.load([])) as unknown as RawMovie[])
        : undefined;
      let finalList = movies;
      if (!Array.isArray(movies) || movies.length === 0) {
        // eslint-disable-next-line no-console

        finalList = mockAnimationMovies as unknown as RawMovie[];
      }
      if (isMountedRef.current && Array.isArray(finalList) && finalList.length > 0) {
        // Anime spotlight also drives a "Xem trailer" button on its
        // card. Filter to only items with a resolvable trailer.
        const filtered = filterMoviesWithValidTrailer(finalList);
        setAnimeSpotlightMovies(filtered);
      }
    } catch {
      if (isMountedRef.current) {
        // eslint-disable-next-line no-console

        const filtered = filterMoviesWithValidTrailer(mockAnimationMovies as unknown as RawMovie[]);
        setAnimeSpotlightMovies(filtered);
      }
    } finally {
      finishInitialFetch();
    }
  }, [finishInitialFetch]);

  // Initial fetch on mount: ONLY triggered if initialSnapshot is not provided or empty.
  // We use a ref-based counter (`initialFetchesPendingRef`) plus a hard
  // 6s safety-net timeout so the page can never get stuck on a
  // Skeleton if any individual fetcher hangs. Even if the network
  // never resolves, the safety net forces `loading=false` and the
  // page renders whatever data we already have (mock fallback).
  useEffect(() => {
    if (initialSnapshot?.featuredMovies?.length) {
      // eslint-disable-next-line no-console

      return;
    }
    // eslint-disable-next-line no-console

    // We always run 4 fetches in parallel. The counter starts at 4
    // and is decremented in each fetcher's `finally` via
    // `finishInitialFetch()`. When the counter hits 0, `loading`
    // flips off.
    initialFetchesPendingRef.current = 4;

    // Hard safety net: if the counter is still > 0 after 6s, force
    // `loading=false` anyway. The fetcher's own finally will still
    // run when it eventually resolves — it will just find the
    // counter already at 0 and no-op.
    if (loadingSafetyNetRef.current) clearTimeout(loadingSafetyNetRef.current);
    loadingSafetyNetRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      if (initialFetchesPendingRef.current > 0) {
        // eslint-disable-next-line no-console

        initialFetchesPendingRef.current = 0;
        setLoading(false);
      }
    }, 6000);

    Promise.allSettled([
      fetchHeroMovies(),
      fetchTop10Movies(),
      fetchBigSlideMovies(),
      fetchLatestMovies(1, false)
    ]).then((results) => {
      // eslint-disable-next-line no-console

    });
  }, [initialSnapshot, fetchHeroMovies, fetchTop10Movies, fetchBigSlideMovies, fetchLatestMovies]);

  /**
   * Loads the next batch of movies for infinite scrolling.
   * Falls back to local mockMovies (cycling) when the API returns empty.
   */
  const loadMore = useCallback(async (): Promise<void> => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const nextPage = page + 1;
      let rawMovies = await movieService.getMoviesPage(nextPage, 24);

      if ((!Array.isArray(rawMovies) || rawMovies.length === 0) && mockMovies.length > 0) {
        // eslint-disable-next-line no-console

        // Cycle through mockMovies so infinite scroll always has data
        const cycleIdx = ((nextPage - 2) * 24) % mockMovies.length;
        const cycled: RawMovie[] = [];
        for (let i = 0; i < 24; i++) {
          cycled.push(mockMovies[(cycleIdx + i) % mockMovies.length] as unknown as RawMovie);
        }
        rawMovies = cycled;
      }

      if (rawMovies && rawMovies.length > 0 && isMountedRef.current) {
        // Same trailer-aware filter as page 1. Without this, infinite
        // scroll can keep appending movies that the homepage rails
        // will then expose play buttons for, leading to the
        // "Trailer chưa được cung cấp" panel on movie detail.
        const filteredRaw = filterMoviesWithValidTrailer(rawMovies);
        const normalized = filteredRaw.map((m, idx) => normalizeMovie(m as RawMovie, idx) as NormalizedMovie);
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
