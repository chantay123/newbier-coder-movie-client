/**
 * @file useHomeData.js
 * @description Centralized data management hook for the Homepage.
 * Seamlessly integrates with HOME_SECTIONS to provide zero-flicker instant render,
 * clean state updates, and resilient fallbacks.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  normalizeHeroMovie,
  resolveMovieBackdrop,
  resolveImageUrl,
  LOCAL_DEFAULT_POSTER
} from '@/config/movieConfig';
import { SYSTEM_CONFIG } from '@/config/systemConfig';
import { HOME_SECTIONS } from '@/config/homeSectionsConfig';
import movieService from '@/API/services/movieService';
import upcomingMovieService from '@/API/services/upcomingMovieService';

// Module-level guard so the diagnostic only fires once per page load,
// even if the home page re-mounts or re-fetches.
let didLogHomeDiagnostic = false;

/**
 * Normalizes movie data from various backend API formats into standard schema.
 * All image fields are run through `resolveImageUrl` so relative paths
 * returned by the API (e.g. `/uploads/poster.jpg`) get the proper origin
 * prepended instead of being requested from the current page host.
 *
 * @param {Object} movie - Raw movie object from API.
 * @param {number} [index=0] - Item index for diversified fallback backdrops.
 * @returns {Object} Normalized movie object.
 */
const normalizeMovie = (movie, index = 0) => {
  if (!movie) return null;

  // Discover all candidate field names the backend might use for posters
  // and thumbs. We never overwrite a real URL with a placeholder unless
  // EVERY field is empty — this protects against future schema drift.
  const resolveFirstUsable = (candidates) => {
    for (const c of candidates) {
      const r = resolveImageUrl(c);
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
  const backdrop = resolveMovieBackdrop(movie, index) || LOCAL_DEFAULT_BACKDROP;

  // Controlled diagnostic (gated by NEXT_PUBLIC_DEBUG_MOVIES=true).
  // Logs ONLY the FIRST movie's raw fields and the resolved URLs, once
  // per page load, so we can identify the real cause of broken images
  // without spamming the console.
  if (SYSTEM_CONFIG.debugMovies && index === 0 && !didLogHomeDiagnostic) {
    didLogHomeDiagnostic = true;
    // eslint-disable-next-line no-console
    console.log('[debug-movies] RAW movie keys:', movie ? Object.keys(movie) : null);
    // eslint-disable-next-line no-console
    console.log('[debug-movies] RAW image fields (movie[0]):', {
      poster_url: movie?.poster_url,
      thumb_url: movie?.thumb_url,
      backdrop_url: movie?.backdrop_url,
      // Common alternative field names so we can spot them in one glance:
      poster: movie?.poster,
      thumb: movie?.thumb,
      backdrop: movie?.backdrop,
      image: movie?.image,
      imageUrl: movie?.imageUrl,
      posterUrl: movie?.posterUrl,
      backdropUrl: movie?.backdropUrl,
      thumbUrl: movie?.thumbUrl,
      tmdb_poster_path: movie?.tmdb?.poster_path,
      tmdb_backdrop_path: movie?.tmdb?.backdrop_path,
      nested: movie?.images && typeof movie.images === 'object' ? Object.keys(movie.images) : null
    });
    // eslint-disable-next-line no-console
    console.log('[debug-movies] RESOLVED image URLs (movie[0]):', {
      poster_url: poster,
      thumb_url: thumb,
      backdrop_url: backdrop
    });
  }

  return {
    ...movie,
    _id: movie._id || movie.id || `movie-${index}`,
    name: movie.name || 'Phim Đang Cập Nhật',
    poster_url: poster,
    thumb_url: thumb,
    backdrop_url: backdrop
  };
};

export const useHomeData = (initialSnapshot = null) => {
  const isSnapshotEnabled = process.env.NEXT_PUBLIC_ENABLE_HOMEPAGE_SNAPSHOT === 'true';
  const effectiveSnapshot = isSnapshotEnabled ? initialSnapshot : null;

  // Pure real API data states initialized from ISR snapshot when available & enabled
  const [featuredMovies, setFeaturedMovies] = useState(() =>
    effectiveSnapshot?.featuredMovies?.length > 0
      ? effectiveSnapshot.featuredMovies.map((m, idx) => normalizeHeroMovie(m, idx))
      : []
  );
  const [topMovies, setTopMovies] = useState(() =>
    effectiveSnapshot?.topMovies?.length > 0
      ? effectiveSnapshot.topMovies.map((m, idx) => normalizeMovie(m, idx))
      : []
  );
  const [mostViewedMovies, setMostViewedMovies] = useState(() =>
    effectiveSnapshot?.mostViewedMovies?.length > 0
      ? effectiveSnapshot.mostViewedMovies.map((m, idx) => ({ ...normalizeMovie(m, idx), rank: m.rank || idx + 1 }))
      : []
  );
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [upcomingLoaded, setUpcomingLoaded] = useState(false);
  const [animeSpotlightMovies, setAnimeSpotlightMovies] = useState(() =>
    effectiveSnapshot?.animeSpotlightMovies || []
  );
  const [latestMovies, setLatestMovies] = useState(() =>
    effectiveSnapshot?.latestMovies?.length > 0
      ? effectiveSnapshot.latestMovies.map((m, idx) => normalizeMovie(m, idx))
      : []
  );

  const [loading, setLoading] = useState(() => !effectiveSnapshot?.featuredMovies?.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Fetches hero spotlight movies via HOME_SECTIONS bundle.
   */
  const fetchHeroMovies = useCallback(async () => {
    try {
      const movies = await HOME_SECTIONS.hero.load([]);
      if (isMountedRef.current && movies.length > 0) {
        setFeaturedMovies(movies.map((m, idx) => normalizeHeroMovie(m, idx)));
      }
    } catch {
      // Fallback is gracefully handled inside HOME_SECTIONS.hero.load
    }
  }, []);

  /**
   * Fetches Top 10 movies via HOME_SECTIONS bundle.
   */
  const fetchTop10Movies = useCallback(async () => {
    try {
      const movies = await HOME_SECTIONS.top10.load([]);
      if (isMountedRef.current && movies.length > 0) {
        const normalized = movies.map((m, idx) => ({
          ...normalizeMovie(m, idx),
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
  const fetchLatestMovies = useCallback(async (pageNumber = 1, isLoadMore = false) => {
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
        const normalized = rawMovies.map((m, idx) => normalizeMovie(m, idx));

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
  const loadUpcoming = useCallback(async () => {
    if (upcomingLoaded || upcomingLoading) return;
    setUpcomingLoading(true);

    const startTime = Date.now();
    const MIN_LOADING_TIME = 1500;
    const MAX_TIMEOUT = 8000;

    let timeoutTriggered = false;
    const timeoutTimer = setTimeout(() => {
      timeoutTriggered = true;
    }, MAX_TIMEOUT);

    try {
      const result = await upcomingMovieService.getUpcomingMovies(1, 15);
      clearTimeout(timeoutTimer);

      if (timeoutTriggered) return;

      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_LOADING_TIME) {
        await new Promise((resolve) => setTimeout(resolve, MIN_LOADING_TIME - elapsed));
      }

      if (result?.success && result.upcomingMovies?.length > 0 && isMountedRef.current) {
        setUpcomingMovies(result.upcomingMovies.map(normalizeMovie));
      } else if (isMountedRef.current) {
        setUpcomingMovies([]);
      }
    } catch {
      clearTimeout(timeoutTimer);
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_LOADING_TIME) {
        await new Promise((resolve) => setTimeout(resolve, MIN_LOADING_TIME - elapsed));
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
  const fetchBigSlideMovies = useCallback(async () => {
    try {
      const movies = await HOME_SECTIONS.big_slide?.load([]);
      if (isMountedRef.current && Array.isArray(movies) && movies.length > 0) {
        setAnimeSpotlightMovies(movies);
      }
    } catch {
      // Fallback handled gracefully
    }
  }, []);

  // Initial fetch on mount: ONLY triggered if initialSnapshot is not provided or empty (saves 100% initial queries)
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
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const nextPage = page + 1;
      const rawMovies = await movieService.getMoviesPage(nextPage, 24);

      if (rawMovies && rawMovies.length > 0 && isMountedRef.current) {
        const normalized = rawMovies.map((m, idx) => normalizeMovie(m, idx));
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
