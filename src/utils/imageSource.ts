/**
 * imageSource.ts
 *
 * Defensive helpers that pick a safe image URL for an `<img src>`.
 *
 * The "only accept http(s) / data:image" rule lives here, so the same helper
 * is not duplicated in every component.
 */

import { getApiOrigin } from '@/config/apiBase';

const HTTP_OR_DATA_RE = /^(https?:\/\/|data:image\/|blob:)/i;
const PROTOCOL_RELATIVE_RE = /^\/\//;
const ROOT_RELATIVE_RE = /^\/[^/]/;

/**
 * Turns a relative image path into an absolute URL based on the backend
 * origin.
 *
 * WHY THIS EXISTS (the "images do not show" bug)
 * Backend v1 returns uploaded images as **root relative paths**:
 * ```json
 * { "posterUrl": "/uploads/movies/abc.jpg" }
 * ```
 * `pickImageSrc` used to accept only `http(s)://` or `data:image/`, so every
 * `/uploads/...` URL was rejected and the card fell back to the placeholder,
 * even though the backend really had an image. This helper adds the missing
 * resolve step instead of throwing the value away.
 *
 * @param raw - The image path or URL taken from the API.
 * @returns The absolute image URL, or an empty string when the value cannot
 *          be used.
 */
const toAbsoluteImageUrl = (raw: string): string => {
  const v = raw.trim();
  if (!v) return '';

  // Already an absolute URL or a data/blob URL, so it is kept as is.
  if (HTTP_OR_DATA_RE.test(v)) return v;

  // Protocol relative: //cdn.example.com/a.jpg
  if (PROTOCOL_RELATIVE_RE.test(v)) {
    const proto = (typeof window !== 'undefined' && window.location?.protocol) || 'https:';
    return `${proto}${v}`;
  }

  // Root relative path: /uploads/a.jpg -> {backend origin}/uploads/a.jpg
  if (ROOT_RELATIVE_RE.test(v)) {
    const origin = resolveImageOrigin();
    if (origin) return `${origin}${v}`;
    // Without a configured origin the value is returned unchanged, so the
    // browser resolves it against the current domain. That is usually correct
    // when the image lives in /public.
    return v;
  }

  // Garbage values: "undefined", "null", "N/A"...
  if (/^(undefined|null|n\/a|nan)$/i.test(v)) return '';

  // Neither a scheme nor a slash, so the value cannot be guessed and is
  // dropped.
  return '';
};

/**
 * The backend origin, used to build the URL of relative images.
 *
 * The work is delegated to `getApiOrigin()` in `config/apiBase.ts`, the single
 * place that reads the environment, so no module resolves `NEXT_PUBLIC_*` in
 * its own way.
 *
 * @returns The backend origin, or an empty string.
 */
const resolveImageOrigin = (): string => getApiOrigin();

/**
 * Returns the first valid image URL found in a list of candidate fields.
 *
 * Accepted values: absolute URLs (http/https/data/blob), protocol relative
 * URLs, and **root relative paths** (`/uploads/...`). The last case is joined
 * with the backend origin through {@link toAbsoluteImageUrl}.
 *
 * @param movie - The loosely typed movie object (the raw backend payload).
 * @param fields - The candidate keys, in priority order.
 * @param fallback - The URL returned when no candidate is valid.
 * @returns The resolved image URL, or the fallback.
 */
export const pickImageSrc = (
  movie: Record<string, unknown> | null | undefined,
  fields: readonly string[],
  fallback: string
): string => {
  if (!movie || typeof movie !== 'object') return fallback;
  for (const key of fields) {
    const raw = movie[key];
    if (typeof raw !== 'string') continue;
    const resolved = toAbsoluteImageUrl(raw);
    if (resolved) return resolved;
  }
  return fallback;
};

/** Backdrop candidates, in priority order: backdrop -> poster -> thumb. */
export const BACKDROP_FIELDS: readonly string[] = [
  'backdrop_url',
  'backdropUrl',
  'poster_url',
  'posterUrl',
  'thumb_url',
  'thumbUrl',
  'imagePoster',
  'poster_path',
  'posterPath'
];

/** Poster candidates, in priority order: poster -> thumb -> other common keys. */
export const POSTER_FIELDS: readonly string[] = [
  'poster_url',
  'posterUrl',
  'poster',
  'thumb_url',
  'thumbUrl',
  'thumb',
  'imagePoster',
  'image_poster',
  'poster_path',
  'posterPath',
  'image',
  'imageUrl',
  'image_url',
  'thumbnail'
];

/** Thumbnail (small) candidates, in priority order: thumb -> poster. */
export const THUMB_FIELDS: readonly string[] = [
  'thumb_url',
  'thumbUrl',
  'thumb',
  'poster_url',
  'posterUrl',
  'poster',
  'imagePoster',
  'image_poster',
  'poster_path',
  'posterPath',
  'image',
  'imageUrl',
  'image_url',
  'thumbnail'
];

/** Default fallback URLs for the rails. */
export const FALLBACK_BACKDROP = '/img/placeholder-backdrop.svg';
export const FALLBACK_POSTER = '/img/placeholder-poster.svg';

/**
 * Returns a movie's poster URL, accepting BOTH the snake_case and the
 * camelCase contract.
 *
 * ## Why this exists
 * The v1 backend returns movie images in **camelCase**:
 * ```json
 * { "posterUrl": "https://img.nguonc.com/images/img-....jpg",
 *   "thumbUrl":  "https://img.nguonc.com/images/img-....jpg" }
 * ```
 * but the browse pages (`/browse/movies`, `/browse/series`,
 * `/browse/schedule`) only ever read `poster_url` / `thumb_url`. Because
 * `MovieItem` has no index signature, TypeScript stayed silent and
 * `poster_url` was `undefined` at runtime, so every card silently fell
 * back to `/img/Phim.png` and the whole grid rendered image-less.
 *
 * Rather than duplicating the fallback chain in every page, this helper
 * centralizes "read a poster off a loosely-typed movie object".
 *
 * @param movie - The raw or normalized movie object (either casing works).
 * @param kind - 'poster' prefers poster then thumb, 'thumb' prefers thumb then poster.
 * @param fallback - The URL used when no valid candidate exists.
 * @returns The resolved image URL, or the fallback.
 */
export const pickMovieImage = (
  movie: Record<string, unknown> | null | undefined,
  kind: 'poster' | 'thumb' = 'poster',
  fallback: string = FALLBACK_POSTER
): string => {
  if (!movie || typeof movie !== 'object') return fallback;
  const fields = kind === 'thumb' ? THUMB_FIELDS : POSTER_FIELDS;
  return pickImageSrc(movie, fields, fallback);
};

/**
 * Same as {@link pickMovieImage} but for a plain string already stored on a
 * field: it guards against the classic `undefined` / `null` /
 * `"undefined"` / `""` values that template literals produce when a
 * backend field is missing.
 *
 * @param raw - The raw value to clean.
 * @returns The cleaned URL, or an empty string when nothing usable is found,
 *          so the caller can chain its own fallback.
 */
export const normalizeImageUrl = (raw: unknown): string => {
  if (typeof raw !== 'string') return '';
  const v = raw.trim();
  if (!v || v === 'undefined' || v === 'null') return '';
  return v;
};
