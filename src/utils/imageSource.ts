/**
 * @file imageSource.ts
 * @description Defensive helpers để chọn URL ảnh an toàn cho <img src>.
 * Tập trung logic "chỉ chấp nhận http(s) / data:image" tại đây, tránh
 * rải helper lặp lại ở mỗi component.
 */

const HTTP_OR_DATA_RE = /^(https?:\/\/|data:image\/)/i;

/**
 * Trả về URL ảnh hợp lệ đầu tiên trong danh sách candidate fields.
 * Chỉ chấp nhận http(s) hoặc data:image. Mọi giá trị khác (rỗng,
 * undefined, đường dẫn tương đối thiếu host, chuỗi không có scheme)
 * đều bị loại.
 *
 * @param movie Loose-shape movie object (backend raw payload)
 * @param fields Danh sách key ưu tiên, theo thứ tự
 * @param fallback URL trả về khi không tìm được candidate nào hợp lệ
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
    const v = raw.trim();
    if (!v) continue;
    if (HTTP_OR_DATA_RE.test(v)) return v;
  }
  return fallback;
};

/** Backdrop candidates — ưu tiên backdrop → poster → thumb. */
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

/** Poster candidates — ưu tiên poster → thumb. */
export const POSTER_FIELDS: readonly string[] = [
  'poster_url',
  'posterUrl',
  'thumb_url',
  'thumbUrl',
  'imagePoster',
  'poster_path',
  'posterPath'
];

/** Thumbnail (nhỏ) candidates — ưu tiên thumb → poster. */
export const THUMB_FIELDS: readonly string[] = [
  'thumb_url',
  'thumbUrl',
  'poster_url',
  'posterUrl',
  'imagePoster',
  'poster_path',
  'posterPath'
];

/** Default fallback URLs cho các rail. */
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
 * @param movie Raw or normalized movie object (either casing works)
 * @param kind 'poster' prefers poster→thumb, 'thumb' prefers thumb→poster
 * @param fallback URL used when no valid candidate exists
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
 * backend field is missing. Returns `''` when nothing usable is found so
 * the caller can chain its own fallback.
 */
export const normalizeImageUrl = (raw: unknown): string => {
  if (typeof raw !== 'string') return '';
  const v = raw.trim();
  if (!v || v === 'undefined' || v === 'null') return '';
  return v;
};
