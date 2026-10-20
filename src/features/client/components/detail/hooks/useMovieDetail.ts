/**
 * @file useMovieDetail.ts
 * @description Centralized data management hook for the Movie Detail Page (/movie/[slug]).
 * Fetches real movie metadata, episode server streams, related recommendations,
 * and user interactions (favorites, ratings, comments) with robust defensive fallbacks.
 *
 * 🆕 Tích hợp Zustand (useMovieStore + useCommentStore):
 * - Cache movie detail theo slug → không gọi lại khi quay lại trang
 * - Cache related movies → không gọi lại khi quay lại
 * - Cache comments → dùng chung với homepage
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Zustand stores cho caching
import { useMovieStore } from '@/stores/useMovieStore';
import { useCommentStore } from '@/stores/useCommentStore';
import { MOVIE_CONFIG } from '@/config/movieConfig';
import { SYSTEM_CONFIG } from '@/config/systemConfig';
import { filterMoviesWithValidTrailer } from '@/utils/trailer';
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
import { pickImageSrc, POSTER_FIELDS, THUMB_FIELDS } from '@/utils/imageSource';
import { resolveImageUrl } from '@/utils/movieNormalizer';

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
  id?: string;
  name?: string;
  slug?: string;
  filename?: string;
  /** Embed URL (iframe). Normalized from the backend's camelCase `linkEmbed`. */
  link_embed?: string;
  /** HLS playlist URL. Normalized from the backend's camelCase `linkM3u8`. */
  link_m3u8?: string;
  /** Original camelCase keys are preserved for any caller still using them. */
  linkEmbed?: string;
  linkM3u8?: string;
  [key: string]: unknown;
}

/** Episode server */
export interface EpisodeServer {
  server_name?: string;
  server_data?: EpisodeServerData[];
  /** Original camelCase keys are preserved for any caller still using them. */
  serverName?: string;
  serverData?: EpisodeServerData[];
  [key: string]: unknown;
}

/**
 * Normalizes the `episodes` array from the backend into snake_case.
 *
 * ## Why this exists
 * The movie-detail API returns episode servers in **camelCase**:
 * ```json
 * [{ "serverName": "Vietsub #1", "serverData": [
 *     { "id": "...", "name": "1", "slug": "tap-1",
 *       "linkEmbed": "https://embed13.streamc.xyz/embed.php?hash=...",
 *       "linkM3u8": "" }] }]
 * ```
 * but every consumer in the app (`EpisodeDirectory`, `MovieHeroHeader`,
 * `WatchSidebarPlaylist`, `MoviePlayerSection`, `watch.tsx`) reads the
 * **snake_case** contract — `server_name` / `server_data` / `link_embed` /
 * `link_m3u8`.
 *
 * Because those interfaces all carry `[key: string]: unknown`, TypeScript
 * could not catch the mismatch, so at runtime `server.server_data` was
 * `undefined`. Symptoms: the episode directory rendered nothing, the server
 * tab showed a fallback name, and the player showed "Tập phim đang được cập
 * nhật luồng phát" despite the movie having 12 playable episodes.
 *
 * ## Why we add aliases instead of renaming
 * The camelCase keys are kept alongside the snake_case ones so that admin
 * screens (which save `server_name`/`server_data`) and any legacy caller
 * reading the raw payload keep working. Only additive changes are made.
 */
export const normalizeEpisodes = (raw: unknown): EpisodeServer[] => {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((srv): srv is Record<string, unknown> => !!srv && typeof srv === 'object')
    .map((srv) => {
      // The episode list lives under `serverData` (camelCase) or
      // `server_data` (snake_case) depending on payload vintage.
      const rawList = (srv.serverData ?? srv.server_data) as unknown;
      const serverData: EpisodeServerData[] = Array.isArray(rawList)
        ? rawList
            .filter((ep): ep is Record<string, unknown> => !!ep && typeof ep === 'object')
            .map((ep) => ({
              // Spread first so the backend's own fields (including `id`,
              // which the admin edit form keys on) are preserved as-is.
              ...ep,
              name: (ep.name as string) ?? '',
              slug: (ep.slug as string) ?? '',
              link_embed: (ep.link_embed as string) || (ep.linkEmbed as string) || '',
              link_m3u8: (ep.link_m3u8 as string) || (ep.linkM3u8 as string) || ''
            }))
        : [];

      const serverName = (srv.server_name as string) || (srv.serverName as string) || '';

      return {
        ...srv,
        server_name: serverName,
        server_data: serverData,
        // Canonical camelCase keys, in case the backend used snake_case.
        serverName: serverName,
        serverData: serverData
      } as EpisodeServer;
    });
};

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

export type MovieDetailError =
  /** Backend returned 404 — the movie truly does not exist. */
  | 'not-found'
  /** Backend returned 401/403 and we could not recover via refresh
   * (either no token at all, or the refresh token is also rejected).
   * The UI should surface a "please log in" affordance, NOT a generic
   * "try again" button, because retrying without a token will always
   * produce the same 401. */
  | 'auth-required'
  /** Anything else (5xx, network, malformed response). The UI can offer
   * a "Thử lại" button. */
  | 'request-error';

/** Hook return type */
export interface UseMovieDetailReturn {
  movie: NormalizedMovieDetail | null;
  loading: boolean;
  error: MovieDetailError | null;
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

  // Normalize episodes structure. `normalizeEpisodes` maps the backend's
  // camelCase `serverName`/`serverData`/`linkEmbed`/`linkM3u8` to the
  // snake_case contract every component in the app reads. Without this,
  // `server_data` was undefined at runtime and the episode list + player
  // stayed empty even though the API returned 12 episodes.
  const episodes: EpisodeServer[] = normalizeEpisodes(m.episodes);

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
    // Đọc poster/thumb qua helper chung thay vì chỉ 1-2 field cứng.
    // Backend có thể đặt ảnh ở `image`, `imagePoster`, `poster_path`...
    // Trước đây chỉ đọc `poster_url`/`thumb_url` nên phim có ảnh ở field
    // khác rơi về LOCAL_DEFAULT_POSTER → hiển thị dải xám placeholder.
    // `resolveImageUrl` bọc ngoài để relative path (`/uploads/x.jpg`)
    // từ backend được gắn `imageOrigin` thay vì trỏ về host hiện tại.
    poster_url: resolveImageUrl(pickImageSrc(m, POSTER_FIELDS, LOCAL_DEFAULT_POSTER)),
    thumb_url: resolveImageUrl(pickImageSrc(m, THUMB_FIELDS, LOCAL_DEFAULT_POSTER)),
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
    // Backend movie-detail DTO uses the camelCase `trailerUrl`; some
    // legacy payloads still ship the snake_case `trailer_url`. Read
    // both so we never silently drop a valid trailer field just
    // because of casing. `trailer_url` is preserved here purely for
    // the legacy branch of `resolveMovieTrailer`; the canonical
    // YouTube data now lives in the `trailer` object below.
    trailer_url: (m.trailerUrl as string)
      || (m.trailer_url as string)
      || (tmdb?.trailer_url as string)
      || '',
    // Preserve the full trailer object so TrailerModal.resolveTrailer
    // can use the `trailer.url` field directly. The resolver prefers
    // `trailer.url` (the field our backend crawler populates) and only
    // falls back to `trailer.key` when no `url` is present. Both
    // shapes are preserved here untouched so we never have to
    // duplicate the watch?v= → /embed/ conversion logic in callers.
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
  const [error, setError] = useState<MovieDetailError | null>(null);

  // Player state
  const [currentServerIndex, setCurrentServerIndex] = useState<number>(0);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState<number>(0);

  // Social interactions
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [favoriteLoading, setFavoriteLoading] = useState<boolean>(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState<boolean>(false);
  const [relatedMovies, setRelatedMovies] = useState<NormalizedMovieDetail[]>([]);

  // ---- Zustand cache selectors ----
  // Dùng selector để tránh re-render khi cache không liên quan thay đổi
  const getCachedMovie = useMovieStore((s) => s.getCachedMovie);
  const setCachedMovie = useMovieStore((s) => s.setCachedMovie);
  const getCachedRelated = useMovieStore((s) => s.getCachedRelated);
  const setCachedRelated = useMovieStore((s) => s.setCachedRelated);
  const getCachedComments = useCommentStore((s) => s.getCachedMovieComments);
  const setCachedComments = useCommentStore((s) => s.setCachedMovieComments);

  const isMountedRef = useRef<boolean>(true);
  // Module-level "request in flight" guard. Prevents the React
  // StrictMode double-mount from issuing two parallel `fetchMovie`
  // calls for the same slug (which would log the same 401 twice and
  // race the setMovie / setError state updates).
  const fetchInFlightSlug = useRef<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Fetches full movie details by slug.
   *
   * Strategy:
   *   1. Resolve the auth header via `authService.getAuthHeader()`,
   *      which transparently refreshes the access token when it is
   *      about to expire. This avoids the "401 because the JWT
   *      expired 30 seconds ago" failure mode.
   *   2. If we still get 401, classify the error as `auth-required`
   *      and do NOT retry — retrying without a valid token always
   *      returns the same 401, and an automatic retry loop would
   *      just spam the console.
   *   3. 404 → `not-found`. 5xx / network → `request-error`.
   *
   * Mock data is NEVER substituted for a real backend response —
   * that would mislead the user into thinking they are seeing a
   * real movie.
   *
   * Re-entrancy: a module-level `fetchInFlightSlug` ref prevents
   * multiple concurrent `fetchMovie` calls for the same slug from
   * running at the same time. Without this guard, React StrictMode
   * double-mount in development can issue two parallel requests and
   * spam the console with two identical 401 logs.
   */
  const fetchMovie = useCallback(async (): Promise<void> => {
    if (!slug) return;
    // Re-entrancy guard: bail if the same slug is already in flight.
    if (fetchInFlightSlug.current === slug) return;
    fetchInFlightSlug.current = slug;
    setLoading(true);
    setError(null);

    // 🆕 Cache-first: đọc từ Zustand store trước
    // Cast về đúng type của hook (NormalizedMovieDetail)
    const cached = getCachedMovie(slug) as NormalizedMovieDetail | null;
    if (cached) {
      // eslint-disable-next-line no-console
      console.log('[MovieDetail] Cache hit for:', slug);
      if (isMountedRef.current) {
        setMovie(cached);
        setLoading(false);
      }
      fetchInFlightSlug.current = null;
      return;
    }
    // eslint-disable-next-line no-console
    console.log('[MovieDetail] Cache miss → fetching API:', slug);

    // Resolve the auth header via the shared service. This transparently
    // refreshes the token if it is within 60s of expiry. Returns `{}` when
    // no token is present (the request will then 401 from the backend
    // and we will surface `auth-required`).
    const tryFetch = async (): Promise<Response> => {
      let authHeaders: Record<string, string> = { Accept: 'application/json' };
      try {
        // Dynamic import so we don't pull authService into the hook's
        // initial render path (avoids circular-dep surprises).
        const { default: authService } = await import('@/API/services/authService');
        authHeaders = { ...authHeaders, ...(await authService.getAuthHeader()) };
      } catch {
        // No auth header is fine — backend will 401 and we'll classify.
      }
      return fetch(`${API_BASE}/movies/${slug}`, { headers: authHeaders });
    };

    try {
      const res = await tryFetch();

      if (res.status === 404) {
        // Backend explicitly says the movie does not exist.
        if (isMountedRef.current) {
          setMovie(null);
          setError('not-found');
        }
        return;
      }

      // 401 / 403 → auth problem. The shared axios layer would have
      // already attempted a single silent refresh, so reaching here
      // with 401 means refresh also failed (or no token at all).
      if (res.status === 401 || res.status === 403) {
        if (isMountedRef.current) {
          setMovie(null);
          setError('auth-required');
        }
        return;
      }

      if (!res.ok) {
        // 5xx or any other non-2xx — surface as a transient error so
        // the UI can offer a retry.
        throw new Error(`Request failed (${res.status})`);
      }

      // Parse the body. We always read `responseStatus` first because
      // the backend v1 contract returns a 200 HTTP status with a
      // non-success `responseStatus.responseCode` for many failure
      // modes (notably auth failures wrapped in a 200 envelope on
      // some endpoints). We must NOT treat such a 200 as a real movie
      // payload.
      let json: Record<string, unknown> = {};
      try {
        json = await res.json();
      } catch {
        // Non-JSON body — treat as not-found.
        if (isMountedRef.current) {
          setMovie(null);
          setError('not-found');
        }
        return;
      }

      // Inspect the v1 envelope's responseCode so a 200-wrapped auth
      // failure still surfaces as `auth-required` rather than
      // "Movie not found". Codes 00000204 (Missing Bearer token) and
      // 00000403 (Forbidden) are the documented auth-error codes.
      const responseStatus = json.responseStatus as
        | { responseCode?: string; responseMessage?: string }
        | undefined;
      const responseCode = responseStatus?.responseCode;
      if (responseCode) {
        if (responseCode === '00000204' || responseCode === '00000403') {
          if (isMountedRef.current) {
            setMovie(null);
            setError('auth-required');
          }
          return;
        }
        // Any other non-success responseCode (e.g. 00000500 server
        // error, 00000404) means the request didn't actually yield a
        // movie. Treat generic errors as transient and unknown-id as
        // not-found.
        if (!responseCode.startsWith('00000')) {
          if (isMountedRef.current) {
            setMovie(null);
            setError(responseCode === '00000404' ? 'not-found' : 'request-error');
          }
          return;
        }
      }

      const raw = (json.responseData as RawMovie | undefined)
        || (json.data as RawMovie | undefined)
        || json;

      if (!raw || typeof raw !== 'object') {
        // 200 but empty body — treat as not-found per API contract.
        if (isMountedRef.current) {
          setMovie(null);
          setError('not-found');
        }
        return;
      }

      if (isMountedRef.current) {
        const normalized = normalizeMovieDetail(raw, slug);
        if (normalized) {
          // Temporary diagnostic: log the trailer fields that survived
          // normalization so we can confirm the data flow from API →
          // mapper → hook → modal. Gated by NEXT_PUBLIC_DEBUG_MOVIES.
          if (SYSTEM_CONFIG.debugMovies) {
            // eslint-disable-next-line no-console
            console.debug('[TrailerDebug] useMovieDetail normalized movie:', {
              movieId: normalized._id,
              movieSlug: normalized.slug,
              movieName: normalized.name,
              trailer_url: normalized.trailer_url,
              trailerObject: normalized.trailer
            });
          }
          setMovie(normalized);
          // 🆕 Ghi vào Zustand cache sau khi fetch thành công
          setCachedMovie(slug, normalized);
          setError(null);
          return;
        }
        // Could not normalize the payload — treat as not-found rather
        // than masking it with a fake movie.
        setMovie(null);
        setError('not-found');
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        // eslint-disable-next-line no-console
        console.warn('[useMovieDetail] fetch failed:', errorMessage);
        // Network / server error — show retry UI, do NOT fall back to
        // mock data. Mock fallback would hide real bugs and mislead
        // users into thinking they are seeing a real movie.
        setMovie(null);
        setError('request-error');
      }
    } finally {
      fetchInFlightSlug.current = null;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [slug, getCachedMovie, setCachedMovie]);

  /**
   * Fetches related movie recommendations.
   *
   * Same auth header strategy as `fetchMovie` — resolves via
   * `authService.getAuthHeader()` so the token is auto-refreshed.
   * On any failure (network, 4xx, 5xx, auth) we render an empty
   * list instead of substituting mock data so the user is never
   * misled into thinking the suggestions are real.
   */
  const fetchRelated = useCallback(async (): Promise<void> => {
    if (!slug) return;

    // 🆕 Cache-first: đọc từ Zustand store trước
    const cached = getCachedRelated(slug);
    if (cached && cached.length > 0) {
      const normalized = cached
        .map((m, idx) => normalizeMovieDetail(m as unknown as RawMovie, m.slug || `rel-${idx}`))
        .filter((m): m is NormalizedMovieDetail => m !== null);
      if (isMountedRef.current) setRelatedMovies(normalized);
      return;
    }

    const tryFetch = async (): Promise<Response> => {
      let authHeaders: Record<string, string> = { Accept: 'application/json' };
      try {
        const { default: authService } = await import('@/API/services/authService');
        authHeaders = { ...authHeaders, ...(await authService.getAuthHeader()) };
      } catch {
        // No auth header is fine — backend will 401 and we'll silently
        // leave the related list empty (no point showing a banner for a
        // non-essential rail).
      }
      return fetch(`${API_BASE}/movies/related/${slug}`, { headers: authHeaders });
    };

    try {
      const res = await tryFetch();
      if (res.ok) {
        const json = await res.json();
        const list = (json.responseData as unknown[])
          || (json.data as unknown[])
          || (json.movies as unknown[])
          || [];
        if (Array.isArray(list) && list.length > 0 && isMountedRef.current) {
          // The related rail on the detail page exposes a
          // "Xem trailer" button per item. Filter out anything
          // that does not actually have a trailer so the user
          // is never sent to a modal that immediately shows
          // "Trailer chưa được cung cấp".
          const filtered = filterMoviesWithValidTrailer(list);
          const normalized = filtered
            .map((m, idx) => normalizeMovieDetail(m as RawMovie, ((m as RawMovie).slug as string) || `rel-${idx}`))
            .filter((m): m is NormalizedMovieDetail => m !== null);
          setRelatedMovies(normalized);
          // 🆕 Ghi vào Zustand cache
          setCachedRelated(slug, filtered as unknown as import('@/stores/useMovieStore').CachedMovieItem[]);
          return;
        }
      }
      // Real API returned empty or non-2xx (including 401) — leave
      // the list empty. Do NOT inject mock data on a real failure.
      if (isMountedRef.current) setRelatedMovies([]);
    } catch {
      // Network error — leave the list empty, do NOT inject mock data.
      if (isMountedRef.current) setRelatedMovies([]);
    }
  }, [slug, getCachedRelated, setCachedRelated]);

  /**
   * Fetches comments for this specific movie. Uses the shared
   * auth-header resolver so an expired token is refreshed before
   * the request goes out. On any failure (including 401) we
   * silently leave the comments list empty — comments are not
   * critical content, so we don't surface a banner for them.
   */
  const fetchComments = useCallback(async (): Promise<void> => {
    if (!slug) return;

    // 🆕 Cache-first: đọc từ Zustand store trước
    const cached = getCachedComments(slug);
    if (cached && cached.length > 0) {
      if (isMountedRef.current) setComments(cached as Comment[]);
      return;
    }

    setCommentsLoading(true);
    try {
      let authHeaders: Record<string, string> = { Accept: 'application/json' };
      try {
        const { default: authService } = await import('@/API/services/authService');
        authHeaders = { ...authHeaders, ...(await authService.getAuthHeader()) };
      } catch {
        // No token — request will 401, list stays empty (silent).
      }
      const res = await fetch(`${API_BASE}/movies/${slug}/comments?page=1&limit=20`, { headers: authHeaders });
      if (res.ok) {
        const json = await res.json();
        const rd = json.responseData as { data?: unknown[] } | unknown[] | undefined;
        const list = (rd && !Array.isArray(rd) ? rd.data : rd)
          || (json.data as { comments?: unknown[] })?.comments
          || [];
        if (Array.isArray(list) && isMountedRef.current) {
          const typed = list as Comment[];
          setComments(typed);
          // 🆕 Ghi vào Zustand cache
          setCachedComments(slug, typed);
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
  }, [slug, getCachedComments, setCachedComments]);

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

      setComments((prev) => {
        const updated = [newCommentObj, ...prev];
        // 🆕 Cập nhật cache comments
        setCachedComments(slug, updated);
        return updated;
      });
      return true;
    } catch {
      return false;
    }
  }, [slug]);

  // Initial load on slug change. Reset the in-flight guard here so a
  // previous failed fetch for a different slug doesn't suppress the
  // fetch for the new slug.
  useEffect(() => {
    fetchInFlightSlug.current = null;
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
