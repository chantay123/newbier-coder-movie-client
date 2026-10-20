/**
 * @file trailer.ts
 * @description Single source of truth for trailer validation and embed URL
 * resolution across the frontend. Every consumer (TrailerModal, admin live
 * preview, future inline trailers) MUST go through `resolveMovieTrailer`
 * so the same payload produces the same playability outcome on every page.
 *
 * The backend stores trailers in either legacy flat form
 * (`trailer_url: <id or url>`) or TMDB-style object form
 * (`trailer: { key, site, name, url? }`). Both shapes are accepted and
 * resolved here.
 */

/** Trailer object that mirrors the MongoDB / TMDB contract. */
export interface TrailerObject {
  key?: string;
  site?: string;
  name?: string;
  url?: string;
  [key: string]: unknown;
}

/** Loose shape of any movie payload the utility may receive. */
export interface TrailerLike {
  trailer_url?: string;
  trailerUrl?: string;
  video_url?: string;
  videoUrl?: string;
  trailerLink?: string;
  trailer?: TrailerObject | string | null;
  video?: TrailerObject | string | null;
  youtube?: TrailerObject | string | null;
  youtube_trailer?: TrailerObject | string | null;
  movie_trailer?: TrailerObject | string | null;
  name?: string;
  origin_name?: string;
  year?: number | string;
  movie?: TrailerLike;
  data?: TrailerLike;
  [key: string]: unknown;
}

/** Outcome of resolving a movie's trailer to an embed URL. */
export interface TrailerResolution {
  /** True iff an embed URL was resolved (primary pass). */
  available: boolean;
  /** Provider hint for diagnostics / future provider switching. */
  provider: 'youtube' | 'raw' | null;
  /**
   * Exact embed URL the iframe should load. Empty when no embed was
   * resolved. Never null so callers can use it directly in `<iframe src>`.
   */
  embedUrl: string;
  /**
   * Categorical reason for failure (when `available === false`). Used to
   * drive localised UI copy.
   */
  reason:
    | 'resolved'
    | 'no-data'
    | 'no-trailer'
    | 'invalid-id'
    | 'unsupported-provider';
}

/** Known trailer providers we currently know how to embed. */
const KNOWN_PROVIDERS: ReadonlySet<string> = new Set([
  'youtube',
  'youtu', // tolerate typos
]);

/**
 * Extracts a YouTube video ID from a raw string. Accepts:
 * - canonical bare keys (e.g. 'Way9Dexny3w', 11 chars)
 * - legacy 6-15 char keys (some backends store shortened IDs)
 * - full URLs (`youtube.com/watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`)
 *
 * Returns null when no URL-safe token in the supported range can be
 * identified. We accept 6-15 chars to stay compatible with real-world
 * backend payloads (canonical YouTube IDs are 11, but legacy scrapers
 * and a few internal APIs use 9-10 char IDs).
 */
export const extractYouTubeId = (input: string | undefined | null): string | null => {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim();
  if (!clean) return null;

  // 1) Already a bare YouTube key: canonical 11 chars OR legacy 6-15.
  if (/^[a-zA-Z0-9_-]{6,15}$/.test(clean)) return clean;

  // 2) Full YouTube URL variants (watch / embed / shorts / youtu.be).
  //    Match the same 6-15 char range used in step 1.
  const match = clean.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{6,15})/i
  );
  if (match?.[1]) return match[1];

  return null;
};

/**
 * Tries to extract a YouTube video ID from a trailer object. Prefers the
 * canonical `key` field; falls back to the full `url` field.
 *
 * Returns null when no valid ID (6-15 chars) can be found. Mirrors the
 * helper shown in the project guidelines so a Fresher can read the rule
 * once and apply it everywhere.
 */
export const getYouTubeVideoId = (trailer: TrailerObject | string | null | undefined): string | null => {
  if (!trailer) return null;
  if (typeof trailer === 'string') {
    return extractYouTubeId(trailer);
  }
  if (typeof trailer.key === 'string' && trailer.key.trim() !== '') {
    const fromKey = extractYouTubeId(trailer.key);
    if (fromKey) return fromKey;
  }
  if (typeof trailer.url === 'string' && trailer.url.trim() !== '') {
    return extractYouTubeId(trailer.url);
  }
  return null;
};

/** Provider-aware check: trailer is hosted on YouTube (or site omitted). */
export const isYouTubeTrailer = (trailer: TrailerObject | string | null | undefined): boolean => {
  if (!trailer || typeof trailer !== 'object') return false;
  const site = (trailer.site || '').toString().toLowerCase();
  if (!site) return true; // many backends omit `site`; treat as YouTube
  return site === 'youtube' || site === 'youtu';
};

/**
 * Builds a YouTube embed URL from a canonical 11-char video key.
 * Returns an empty string when the key is missing or invalid.
 */
export const buildYouTubeEmbedUrl = (key: string | undefined | null): string => {
  const id = extractYouTubeId(key || '');
  if (!id) return '';
  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
};

/**
 * Builds a YouTube search-results embed URL using a movie title. Used as
 * a last-resort playback path when the primary trailer fails (region
 * block, takedown, "video unavailable").
 */
const buildYouTubeSearchEmbedUrl = (movie: TrailerLike | null | undefined): string => {
  if (!movie || typeof movie !== 'object') return '';
  const searchQuery = [movie.name, movie.origin_name, movie.year]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .join(' ')
    .trim();
  if (!searchQuery) return '';
  const q = encodeURIComponent(`${searchQuery} trailer`);
  return `https://www.youtube.com/embed?listType=search&list=${q}&autoplay=1&rel=0`;
};

/** Unwraps `movie.movie` / `movie.data` if the API nested the payload. */
const unwrapSource = (m: TrailerLike): TrailerLike => {
  if (m.movie && typeof m.movie === 'object') return m.movie as TrailerLike;
  if (m.data && typeof m.data === 'object') return m.data as TrailerLike;
  return m;
};

/**
 * Resolves the movie's trailer to an embed URL. Pure, deterministic and
 * provider-aware. The same input always produces the same output.
 *
 * Resolution strategy (matches the actual backend payload shape):
 *   1. Legacy flat URL fields (`trailer_url`, `trailerUrl`, etc.) — used
 *      as a backwards-compatible fallback for older movie records and
 *      admin-entered form values. We do NOT remove these because the
 *      admin form still writes `trailer_url` directly to the database.
 *   2. TMDB-style object field (`trailer`, plus `video`, `youtube`,
 *      `youtube_trailer`, `movie_trailer` aliases). Each may be a
 *      string (bare YouTube key) or an object with
 *      `{ key, site, name, url }`. The canonical YouTube field name
 *      used by our backend crawler is `trailer.url`, so we prefer that
 *      first and only fall back to `trailer.key` when no `url` was
 *      returned. The `url` is kept verbatim in the data — this layer
 *      is the only place that converts watch?v= → /embed/.
 *   3. Provider check: only `site === 'YouTube'` (case-insensitive) or
 *      missing site is treated as YouTube. Other explicit providers
 *      (Vimeo, etc.) are flagged `unsupported-provider`; we never try
 *      to embed them as YouTube, which would silently break playback.
 *
 * Returns a `TrailerResolution`; the caller decides whether to render a
 * fallback panel or open an external search link.
 */
export const resolveMovieTrailer = (input: TrailerLike | null | undefined): TrailerResolution => {
  const empty: TrailerResolution = {
    available: false,
    provider: null,
    embedUrl: '',
    reason: 'no-data',
  };
  if (!input || typeof input !== 'object') return empty;

  const source = unwrapSource(input);

  // ── 1) Legacy flat URL fields ──────────────────────────────────────────
  const legacy =
    source.trailer_url
    || source.trailerUrl
    || source.video_url
    || source.videoUrl
    || source.trailerLink;

  if (typeof legacy === 'string' && legacy.trim() !== '') {
    const ytId = extractYouTubeId(legacy);
    if (ytId) {
      return {
        available: true,
        provider: 'youtube',
        embedUrl: buildYouTubeEmbedUrl(ytId),
        reason: 'resolved',
      };
    }
    // Already an embed URL of any kind (legacy backend / non-YouTube).
    if (legacy.includes('embed')) {
      const sep = legacy.includes('?') ? '&' : '?';
      return { available: true, provider: 'raw', embedUrl: `${legacy}${sep}autoplay=1`, reason: 'resolved' };
    }
    // Last-ditch: pass through any URL the iframe might still play.
    return { available: true, provider: 'raw', embedUrl: legacy, reason: 'resolved' };
  }

  // ── 2) Object-shaped trailer payloads (TMDB-style) ────────────────────
  const trailerObjects: (TrailerObject | string | null | undefined)[] = [
    source.trailer,
    source.video,
    source.youtube,
    source.youtube_trailer,
    source.movie_trailer,
  ];

  let sawAnyField = false;
  let sawUnsupportedProvider = false;

  for (const tRaw of trailerObjects) {
    if (tRaw === null || tRaw === undefined) continue;
    if (typeof tRaw !== 'object') {
      // Bare-string trailers (e.g. `movie.trailer = 'PRX0vwUvURg'`) only
      // count as a real field if the string is non-empty.
      if (typeof tRaw === 'string' && tRaw.trim() !== '') sawAnyField = true;
    } else {
      const t = tRaw as TrailerObject;
      const hasUsableUrl = typeof t.url === 'string' && t.url.trim() !== '';
      const hasUsableKey = typeof t.key === 'string' && t.key.trim() !== '';
      // Object trailer with no usable url AND no usable key is the same
      // as "no trailer at all" for UX purposes — we shouldn't surface
      // a misleading `invalid-id` reason for an empty payload.
      if (hasUsableUrl || hasUsableKey) sawAnyField = true;
    }

    // Branch C: trailer field is a bare string (e.g. backend stored a
    // raw YouTube key directly in `movie.trailer`).
    if (typeof tRaw === 'string' && tRaw.trim() !== '') {
      const ytId = extractYouTubeId(tRaw);
      if (ytId) {
        return {
          available: true,
          provider: 'youtube',
          embedUrl: buildYouTubeEmbedUrl(ytId),
          reason: 'resolved',
        };
      }
      continue;
    }

    if (typeof tRaw !== 'object') continue;
    const t = tRaw as TrailerObject;

    // Provider gate: empty site is treated as YouTube (matches the
    // historical behaviour and several backends that omit `site`).
    const site = (typeof t.site === 'string' ? t.site : '').toLowerCase();
    if (site && !KNOWN_PROVIDERS.has(site)) {
      sawUnsupportedProvider = true;
      // Don't return — there may be multiple trailer candidates; only
      // bail at the end if none were playable.
      continue;
    }

    // Per spec: prefer `trailer.url` first because that is the field
    // the backend crawler actually populates. The raw URL is kept
    // verbatim; we only do the watch?v= → /embed/ swap here, exactly
    // once, in this resolution layer. `trailer.key` is the secondary
    // signal — useful when a payload ships only the bare YouTube key
    // without a full URL.
    if (typeof t.url === 'string' && t.url.trim() !== '') {
      const ytId = extractYouTubeId(t.url);
      if (ytId) {
        return {
          available: true,
          provider: 'youtube',
          embedUrl: buildYouTubeEmbedUrl(ytId),
          reason: 'resolved',
        };
      }
      // URL was present but we could not extract a YouTube ID from
      // it. If it already contains `/embed/`, pass it through; this
      // keeps non-canonical embed URLs (e.g. Vimeo) playable without
      // the resolver silently rewriting them as YouTube.
      if (t.url.includes('embed')) {
        const sep = t.url.includes('?') ? '&' : '?';
        return { available: true, provider: 'raw', embedUrl: `${t.url}${sep}autoplay=1`, reason: 'resolved' };
      }
      // URL was present but unrecognised; treat as unplayable rather
      // than as if the trailer simply didn't exist.
      sawAnyField = true;
    }

    // Fallback: `trailer.key` is honoured only when no usable `url`
    // was present. Some payloads (e.g. the admin form, mock data) ship
    // a bare 11-char YouTube key in `key` with no `url` — this branch
    // keeps those movies visible in the trailer-aware lists.
    if (typeof t.key === 'string' && t.key.trim() !== '') {
      const ytId = extractYouTubeId(t.key);
      if (ytId) {
        return {
          available: true,
          provider: 'youtube',
          embedUrl: buildYouTubeEmbedUrl(ytId),
          reason: 'resolved',
        };
      }
      // Key was present but not a valid YouTube ID; remember this so
      // the failure reason is `invalid-id` and NOT `no-trailer`.
      sawAnyField = true;
    }
  }

  // ── 3) Failure modes ──────────────────────────────────────────────────
  if (sawUnsupportedProvider) {
    return { available: false, provider: null, embedUrl: '', reason: 'unsupported-provider' };
  }
  if (sawAnyField) {
    return { available: false, provider: null, embedUrl: '', reason: 'invalid-id' };
  }
  return { available: false, provider: null, embedUrl: '', reason: 'no-trailer' };
};

/**
 * Convenience predicate: does this movie payload have a trailer that
 * can actually be played?
 *
 * This is a thin wrapper over `resolveMovieTrailer` so there is only
 * one place in the codebase that decides what "playable" means. List
 * filters (homepage rails, related movies, country rails, etc.) MUST
 * use this helper — never re-implement the check with bespoke `!==
 * null` / `!== ''` conditions, which is exactly what caused the
 * bug where movies without a valid YouTube ID still appeared in
 * trailer-aware lists.
 *
 * Reuses the same resolution strategy as the modal (legacy flat URL
 * fields, then TMDB-style object fields, then provider check), so
 * filtering here and the modal there can never disagree about
 * whether a given movie has a trailer.
 */
export const hasValidTrailer = (
  input: TrailerLike | null | undefined
): boolean => {
  if (!input || typeof input !== 'object') return false;
  return resolveMovieTrailer(input).available;
};

/**
 * Pure list filter that strips movies without a valid trailer from
 * any array. Returns a new array — never mutates the input. Preserves
 * the original order. Items that are null/undefined or not objects
 * are dropped (a defensive measure; should not normally happen).
 *
 * The generic is intentionally `T` (unconstrained) so callers can
 * pass lists of any movie-like shape (homepage `NormalizedMovie`,
 * `CountryMovie`, `RadarItem`, `RankedMovie`, etc.) without having
 * to declare that their type extends `TrailerLike`. The runtime
 * check inside `hasValidTrailer` is what actually decides
 * membership.
 */
export const filterMoviesWithValidTrailer = <T,>(
  movies: readonly T[]
): T[] => {
  if (!Array.isArray(movies) || movies.length === 0) return [];
  return movies.filter((m): m is T => hasValidTrailer(m as unknown as TrailerLike));
};

/**
 * Builds a YouTube search-results embed URL using the movie's title for
 * use as a last-resort fallback when the primary embed failed to play
 * (region block, takedown, "video unavailable").
 *
 * Public so consumer components can re-use the exact same search URL
 * that the modal falls back to internally.
 */
export const buildMovieTrailerSearchEmbed = (movie: TrailerLike | null | undefined): string => {
  return buildYouTubeSearchEmbedUrl(movie);
};

/**
 * Builds a `https://www.youtube.com/results?search_query=...` URL for
 * the "Tìm trên YouTube" external fallback link.
 */
export const buildMovieTrailerSearchLink = (movie: TrailerLike | null | undefined): string => {
  if (!movie || typeof movie !== 'object') return 'https://www.youtube.com/';
  const q = [movie.name, movie.origin_name, movie.year]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .join(' ')
    .trim();
  if (!q) return 'https://www.youtube.com/';
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${q} trailer`)}`;
};
