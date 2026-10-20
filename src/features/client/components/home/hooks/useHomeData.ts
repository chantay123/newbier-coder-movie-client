/**
 * @file useHomeData.ts
 * @description Centralized data management hook for the Homepage.
 * Tích hợp HOME_SECTIONS để render không nhấp nháy, cập nhật state sạch,
 * fallback bền bỉ.
 *
 * 🆕 Tích hợp Zustand (useMovieStore):
 * - Cache homepage movies theo section ('hero', 'top10', 'bigSlide', 'latest')
 * - Đọc từ cache trước → chỉ fetch khi cache miss hoặc hết hạn
 * - Tránh gọi lại API khi user quay lại trang chủ
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Zustand store cho movie caching
import { useMovieStore } from '@/stores/useMovieStore';
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

  // CHỈ HIỂN THỊ PHIM CÓ ẢNH THẬT: nếu cả poster lẫn thumb đều rỗng
  // từ API, trả null để caller filterMovies có thể bỏ qua. Trước đây
  // code fallback về LOCAL_DEFAULT_POSTER, gây ra "dải xám" (placeholder
  // SVG) trên trang chủ. Yêu cầu mới: phim không có ảnh → ẩn hoàn toàn.
  //
  // Chấp nhận 3 dạng URL có thể hiển thị:
  //   1. http(s)://…            — URL tuyệt đối từ CDN/backend
  //   2. data:image/…           — base64 inline
  //   3. /uploads/…, /img/…     — host-relative (khi `imageOrigin` env
  //      rỗng, `resolveImageUrl` giữ nguyên relative path). Trường hợp
  //      này vẫn load được trong trình duyệt nên KHÔNG được coi là
  //      "không có ảnh" — nếu không, phim sẽ bị ẩn oan khi env thiếu.
  const hasRealPoster = (v: string): boolean => {
    if (!v) return false;
    const s = v.trim();
    if (/^https?:\/\//i.test(s)) return true;
    if (/^data:image\//i.test(s)) return true;
    if (/^\/uploads\//i.test(s) || /^\/img\//i.test(s)) return true;
    return false;
  };
  const posterHasReal = hasRealPoster(posterResolved);
  const thumbHasReal = hasRealPoster(thumbResolved);
  if (!posterHasReal && !thumbHasReal) {
    return null;
  }

  const poster = posterResolved || thumbResolved || LOCAL_DEFAULT_POSTER;
  const thumb = thumbResolved || posterResolved || poster || LOCAL_DEFAULT_POSTER;
  const backdrop = resolveMovieBackdrop(movie as never, index) || LOCAL_DEFAULT_BACKDROP;

  // Controlled diagnostic (gated by NEXT_PUBLIC_DEBUG_MOVIES=true).
  // Logs ONLY the FIRST movie's raw fields and the resolved URLs, once
  // per page load.
  if (SYSTEM_CONFIG.debugMovies && index === 0 && !didLogHomeDiagnostic) {
    didLogHomeDiagnostic = true;
    // DEBUG: uncomment below lines when you need to diagnose movie data
    // console.log('[HomeData] First movie raw:', JSON.stringify(movie, null, 2));
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

/**
 * Áp dụng `normalizeMovie` cho mảng phim, **đồng thời loại bỏ phim thiếu
 * poster** (mà `normalizeMovie` giờ trả về `null`). Giữ nguyên thứ tự.
 *
 * Dùng ở mọi call-site setTopMovies / setMostViewedMovies / setLatestMovies
 * / setUpcomingMovies để áp dụng đồng bộ triết lý "không có ảnh thật
 * thì ẩn phim" mà không phải sửa từng call-site.
 */
const normalizeAndCompact = <T>(
  movies: readonly T[],
  rankOffset?: (index: number) => number
): NormalizedMovie[] => {
  const out: NormalizedMovie[] = [];
  movies.forEach((m, idx) => {
    const norm = normalizeMovie(m as unknown as RawMovie, idx);
    if (!norm) return;
    out.push(rankOffset ? { ...norm, rank: rankOffset(idx) } : norm);
  });
  return out;
};

/**
 * Tương tự `normalizeAndCompact` nhưng dùng `normalizeHeroMovie` cho
 * HeroBanner. Cùng triết lý bỏ phim không có ảnh thật (cả poster và
 * thumb đều là placeholder local).
 */
const compactHeroMovies = (movies: readonly unknown[]): NormalizedMovie[] => {
  const out: NormalizedMovie[] = [];
  movies.forEach((m, idx) => {
    const norm = normalizeHeroMovie(m as never, idx) as unknown as NormalizedMovie | null;
    if (!norm) return;
    const isLocal = (v: unknown): boolean => typeof v === 'string' && v.startsWith('/img/');
    if (isLocal(norm.poster_url) && isLocal(norm.thumb_url)) return;
    out.push(norm);
  });
  return out;
};


export const useHomeData = (initialSnapshot: HomeDataSnapshot | null = null): UseHomeDataReturn => {
  const isSnapshotEnabled = process.env.NEXT_PUBLIC_ENABLE_HOMEPAGE_SNAPSHOT === 'true';
  const effectiveSnapshot: HomeDataSnapshot | null = isSnapshotEnabled ? initialSnapshot : null;
  const snap = effectiveSnapshot as HomeDataSnapshot | null;

  // ---- Zustand cache selectors ----
  // Dùng selector để tránh re-render toàn component khi cache không liên quan thay đổi
  const getHomeCache = useMovieStore((s) => s.getCachedHomeMovies);
  const setHomeCache = useMovieStore((s) => s.setCachedHomeMovies);
  const setHomeLoading = useMovieStore((s) => s.setLoadingHome);

  // Pure real API data states initialized from ISR snapshot when available & enabled.
  // Each initializer runs the trailer-aware filter so the homepage
  // never boots up with a list that contains movies we cannot play a
  // trailer for. The same `filterMoviesWithValidTrailer` helper used
  // by the network fetchers is reused here to keep the rule in one
  // place: a movie without a valid trailer simply must not appear in
  // any rail that exposes a "Xem trailer" button.
  //
  // 🆕 Cache-first: kiểm tra Zustand store trước, fallback về snapshot
  const [featuredMovies, setFeaturedMovies] = useState<NormalizedMovie[]>(() => {
    const cached = getHomeCache('hero');
    if (cached && cached.length > 0) {
      return compactHeroMovies(filterMoviesWithValidTrailer(cached));
    }
    const list = snap && (snap.featuredMovies?.length ?? 0) > 0
      ? (snap.featuredMovies ?? [])
      : [];
    const filtered = filterMoviesWithValidTrailer(list);
    return compactHeroMovies(filtered);
  });
  const [topMovies, setTopMovies] = useState<NormalizedMovie[]>(() => {
    const cached = getHomeCache('top10');
    if (cached && cached.length > 0) {
      return normalizeAndCompact(cached);
    }
    const list = snap && (snap.topMovies?.length ?? 0) > 0
      ? (snap.topMovies ?? [])
      : [];
    const filtered = filterMoviesWithValidTrailer(list);
    return normalizeAndCompact(filtered);
  });
  const [mostViewedMovies, setMostViewedMovies] = useState<RankedMovie[]>(() => {
    const cached = getHomeCache('mostViewed');
    if (cached && cached.length > 0) {
      return normalizeAndCompact(cached, (idx) => idx + 1) as unknown as RankedMovie[];
    }
    const list = snap && (snap.mostViewedMovies?.length ?? 0) > 0
      ? (snap.mostViewedMovies ?? [])
      : [];
    const filtered = filterMoviesWithValidTrailer(list);
    return normalizeAndCompact(filtered, (idx) => {
      const r = (list[idx] as { rank?: number } | undefined)?.rank;
      return (typeof r === 'number' ? r : idx) + 1;
    }) as unknown as RankedMovie[];
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
    return normalizeAndCompact(filtered);
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
   *
   * 🆕 Cache: ghi kết quả vào Zustand store sau khi fetch thành công
   */
  const fetchHeroMovies = useCallback(async (): Promise<void> => {
    try {
      const heroSection = HOME_SECTIONS['hero'];
      const movies = heroSection?.load ? await heroSection.load([]) : [];
      let finalList = movies;
      if (!Array.isArray(movies) || movies.length === 0) {
        finalList = mockMovies as unknown as typeof movies;
      }
      if (isMountedRef.current && finalList.length > 0) {
        const filtered = filterMoviesWithValidTrailer(finalList);

        // Theo yêu cầu: chỉ hiển thị phim CÓ trailer. Không fallback về
        // danh sách không-trailer. Nếu lọc ra 0 phim thì Hero render
        // null (xử lý ở HeroBanner khi `!activeMovie`). Lấy tối đa 6 phim
        // đầu tiên pass qua filter để giữ layout carousel gọn gàng.
        const finalHeroList = filtered.slice(0, 6);

        // Tránh setState khi danh sách rỗng để React không re-render vô ích.
        if (finalHeroList.length > 0) {
          setFeaturedMovies(compactHeroMovies(finalHeroList));
          // 🆕 Ghi cache cho section 'hero'
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setHomeCache('hero', finalHeroList as any);
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        const filtered = filterMoviesWithValidTrailer(mockMovies as unknown as RawMovie[]);
        setFeaturedMovies(compactHeroMovies(filtered));
      }
    } finally {
      finishInitialFetch();
    }
  }, [finishInitialFetch, getHomeCache, setHomeCache]);

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
        finalList = mockMovies as unknown as typeof movies;
      }
      if (isMountedRef.current && finalList.length > 0) {
        const filtered = filterMoviesWithValidTrailer(finalList);
        const compact = normalizeAndCompact(filtered.slice(0, 10));
        const normalized: RankedMovie[] = compact.map((m, idx) => ({
          ...m,
          rank: idx + 1
        }));
        setMostViewedMovies(normalized);
        // 🆕 Ghi cache
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setHomeCache('mostViewed', normalized as any);
        setTopMovies(compact);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setHomeCache('top10', compact as any);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const filtered = filterMoviesWithValidTrailer(mockMovies as unknown as RawMovie[]);
        const normalized: RankedMovie[] = normalizeAndCompact(filtered.slice(0, 10)).map((m, idx) => ({
          ...m,
          rank: idx + 1
        }));
        setMostViewedMovies(normalized);
      }
    } finally {
      finishInitialFetch();
    }
  }, [finishInitialFetch, setHomeCache]);

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
        // normalizeAndCompact đồng thời bỏ phim không có ảnh thật
        // (poster_url + thumb_url đều rỗng/trả về local placeholder).
        const normalized = normalizeAndCompact(filteredRaw);

        if (pageNumber === 1) {
          setTopMovies(normalized.slice(0, 12));
          setLatestMovies(normalized);
          // 🆕 Ghi cache cho section 'latest'
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setHomeCache('latest', normalized as any);
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
    const MIN_LOADING_TIME = 300;
    const MAX_TIMEOUT = 5000;

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
        setUpcomingMovies(normalizeAndCompact(filtered));
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
        finalList = mockAnimationMovies as unknown as RawMovie[];
      }
      if (isMountedRef.current && Array.isArray(finalList) && finalList.length > 0) {
        // Anime spotlight also drives a "Xem trailer" button on its
        // card. Filter to only items with a resolvable trailer.
        const filtered = filterMoviesWithValidTrailer(finalList);
        setAnimeSpotlightMovies(filtered);
        // 🆕 Ghi cache cho section 'bigSlide'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setHomeCache('bigSlide', filtered as any);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const filtered = filterMoviesWithValidTrailer(mockAnimationMovies as unknown as RawMovie[]);
        setAnimeSpotlightMovies(filtered);
      }
    } finally {
      finishInitialFetch();
    }
  }, [finishInitialFetch, setHomeCache]);

  // Initial fetch on mount: ONLY triggered if initialSnapshot is not provided or empty.
  // We use a ref-based counter (`initialFetchesPendingRef`) plus a hard
  // 6s safety-net timeout so the page can never get stuck on a
  // Skeleton if any individual fetcher hangs. Even if the network
  // never resolves, the safety net forces `loading=false` and the
  // page renders whatever data we already have (mock fallback).
  //
  // 🆕 Cache-first: kiểm tra Zustand cache trước.
  // Nếu tất cả sections đã có cache → skip fetch, loading = false ngay.
  useEffect(() => {
    if (initialSnapshot?.featuredMovies?.length) {
      // eslint-disable-next-line no-console

      return;
    }

    // 🆕 Cache-first: đếm xem có bao nhiêu sections đã có cache
    const cachedHero = getHomeCache('hero');
    const cachedTop10 = getHomeCache('top10');
    const cachedBigSlide = getHomeCache('bigSlide');
    const cachedLatest = getHomeCache('latest');

    const hasAllCache = cachedHero && cachedTop10 && cachedBigSlide && cachedLatest;
    if (hasAllCache) {
      return; // loading = false (đã init từ cache ở trên)
    }
    // eslint-disable-next-line no-console

    // We always run 4 fetches in parallel. The counter starts at 4
    // and is decremented in each fetcher's `finally` via
    // `finishInitialFetch()`. When the counter hits 0, `loading`
    // flips off.
    initialFetchesPendingRef.current = 4;

    // Hard safety net: if the counter is still > 0 after 3s, force
    // `loading=false` anyway. The fetcher's own finally will still
    // run when it eventually resolves — it will just find the
    // counter already at 0 and no-op.
    if (loadingSafetyNetRef.current) clearTimeout(loadingSafetyNetRef.current);
    loadingSafetyNetRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      if (initialFetchesPendingRef.current > 0) {
        initialFetchesPendingRef.current = 0;
        setLoading(false);
      }
    }, 3000);

    Promise.allSettled([
      fetchHeroMovies(),
      fetchTop10Movies(),
      fetchBigSlideMovies(),
      fetchLatestMovies(1, false)
    ]);
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
        // Bỏ phim không có ảnh thật để không xuất hiện dải xám
        // placeholder ở trang chủ.
        const normalized = normalizeAndCompact(filteredRaw);
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
