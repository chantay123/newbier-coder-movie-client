/**
 * movieSnapshotCache.ts
 *
 * A small in-browser cache (localStorage) that stores a "snapshot" of a movie.
 * It is used to repair the Favorites and Watch History screens.
 *
 * ---------------------------------------------------------------------------
 * THE PROBLEM
 * ---------------------------------------------------------------------------
 * `GET /users/me/favorites` returns rows that only contain a foreign key:
 *
 *   { "_id": "...", "movieId": "665f...", "createdAt": "..." }
 *
 * There is no title and no poster in that payload. Rendering these rows
 * directly leaves every card on its default values ("Untitled" plus a
 * placeholder image), which is exactly the "movie name and image do not
 * show" bug this module fixes.
 *
 * ---------------------------------------------------------------------------
 * THE SOLUTION
 * ---------------------------------------------------------------------------
 * When the user clicks "Favorite" on the movie detail page, the full movie
 * object is already available in the browser. We use that moment to save a
 * small snapshot into localStorage, keyed by BOTH `id` and `slug`, so a later
 * lookup succeeds no matter which key the caller has.
 *
 * The Favorites page reads the snapshot first, so the correct title and
 * poster appear immediately without waiting for an API call.
 *
 * ---------------------------------------------------------------------------
 * IMPORTANT NOTES
 * ---------------------------------------------------------------------------
 * This cache is only a speed-up layer, NOT the source of truth. When a
 * snapshot is missing, the caller (favoritesService) fetches the real data
 * from `/movies/:slug`.
 *
 * Additional rules:
 * - Entries older than 30 days are dropped so localStorage does not grow.
 * - At most 300 entries are kept; the oldest ones are removed first.
 * - Every read and write is wrapped in try/catch. If localStorage is blocked
 *   (private mode, storage quota reached) the cache is skipped instead of
 *   crashing the app.
 */

/** localStorage key used to persist the cache. Change it to reset all entries. */
const STORAGE_KEY = 'movie_snapshot_cache_v1';

/**
 * The minimum set of fields required to render one movie card.
 * Only these fields are stored to keep localStorage small.
 */
export interface MovieSnapshot {
  id: string;
  slug: string;
  name: string;
  origin_name: string;
  posterUrl: string;
  thumbUrl: string;
  year: number | string;
  quality: string;
  type: string;
  /** Timestamp of the write in milliseconds. Used to detect stale entries. */
  savedAt: number;
}

/** Entries older than 30 days are treated as expired. */
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Maximum number of entries kept, so localStorage never fills up. */
const MAX_ENTRIES = 300;

/** The whole cache is shaped as { any_lookup_key: snapshot }. */
type CacheShape = Record<string, MovieSnapshot>;

/**
 * Reads the entire cache from localStorage.
 *
 * Expired entries are dropped while reading. An empty object is returned when
 * the code runs on the server (no `window`), when nothing is stored yet, when
 * the stored JSON is broken, or when localStorage is blocked.
 *
 * @returns Every valid snapshot, keyed by its lookup key.
 */
const readAll = (): CacheShape => {
  // Next.js renders on the server during SSR, where localStorage does not exist.
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};

    const now = Date.now();
    const clean: CacheShape = {};
    for (const [key, value] of Object.entries(parsed as CacheShape)) {
      if (!value || typeof value !== 'object') continue;
      // Skip stale entries so the cache does not keep growing forever.
      if (typeof value.savedAt === 'number' && now - value.savedAt > TTL_MS) continue;
      clean[key] = value;
    }
    return clean;
  } catch {
    // Broken JSON or disabled storage: treat the cache as empty.
    return {};
  }
};

/**
 * Writes the cache to localStorage.
 *
 * When the entry count exceeds MAX_ENTRIES, only the newest entries are kept
 * and the oldest ones are dropped.
 *
 * @param cache - The complete cache to persist.
 * @returns Nothing. Storage failures are swallowed on purpose.
 */
const writeAll = (cache: CacheShape): void => {
  if (typeof window === 'undefined') return;
  try {
    const entries = Object.entries(cache);
    let trimmed = cache;
    if (entries.length > MAX_ENTRIES) {
      // Sort by savedAt descending, so the newest entry comes first.
      const sorted = entries.sort((a, b) => (b[1].savedAt || 0) - (a[1].savedAt || 0));
      trimmed = Object.fromEntries(sorted.slice(0, MAX_ENTRIES));
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage quota reached or private mode: skip the write. The cache is not
    // on the critical path, so it must never block the main app flow.
  }
};

/**
 * Reads a non-empty string from an object, trying several possible keys.
 *
 * Backend endpoints do not use the same field name everywhere (`poster_url`
 * vs `posterUrl`, `name` vs `title`), so every candidate key is tried until a
 * usable string is found.
 *
 * @param source - The object to read from.
 * @param keys - Candidate keys, ordered by priority.
 * @returns The first non-empty trimmed string, or an empty string.
 */
const readStr = (source: Record<string, unknown>, keys: readonly string[]): string => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return '';
};

/**
 * Converts any movie object into a MovieSnapshot.
 *
 * The source can be a raw API response or an already normalized movie.
 *
 * @param movie - The movie to convert. May be null or undefined.
 * @returns The snapshot, or null when the movie lacks the minimum data
 *          needed to render a card: at least one identifier (id or slug) and
 *          at least one of title or poster.
 */
export const toMovieSnapshot = (movie: Record<string, unknown> | null | undefined): MovieSnapshot | null => {
  if (!movie || typeof movie !== 'object') return null;

  const id = readStr(movie, ['_id', 'id', 'movieId', 'movie_id']);
  const slug = readStr(movie, ['slug']);
  const name = readStr(movie, ['name', 'title', 'movieName', 'movie_name', 'original_title']);
  const posterUrl = readStr(movie, [
    'poster_url', 'posterUrl', 'poster', 'thumb_url', 'thumbUrl', 'thumb', 'image', 'imageUrl'
  ]);
  const thumbUrl = readStr(movie, [
    'thumb_url', 'thumbUrl', 'thumb', 'poster_url', 'posterUrl', 'poster', 'image', 'imageUrl'
  ]);

  if (!id && !slug) return null;
  if (!name && !posterUrl) return null;

  const yearRaw = movie.year ?? movie.releaseYear ?? movie.release_year;
  const year =
    typeof yearRaw === 'number' || typeof yearRaw === 'string'
      ? yearRaw
      : 0;

  return {
    id: id || slug,
    slug,
    name,
    origin_name: readStr(movie, ['origin_name', 'original_title', 'originalName']),
    posterUrl,
    thumbUrl,
    year,
    quality: readStr(movie, ['quality', 'qualityName', 'quality_name']),
    type: readStr(movie, ['type', 'format', 'category']),
    savedAt: Date.now()
  };
};

/**
 * Stores a movie snapshot in the cache.
 *
 * The snapshot is saved under BOTH `id` and `slug`, so a later lookup works
 * with either key. This matters because the Favorites page may only know the
 * `movieId`, while other pages only have the `slug`.
 *
 * @param movie - The movie to remember. May be null or undefined.
 * @returns Nothing. Movies without enough data are silently ignored.
 */
export const rememberMovie = (movie: Record<string, unknown> | null | undefined): void => {
  const snapshot = toMovieSnapshot(movie);
  if (!snapshot) return;

  const cache = readAll();
  const keys = new Set<string>();
  if (snapshot.id) keys.add(snapshot.id);
  if (snapshot.slug) keys.add(snapshot.slug);
  if (!keys.size) return;

  for (const key of keys) cache[key] = snapshot;
  writeAll(cache);
};

/**
 * Looks up a snapshot using a list of candidate keys.
 *
 * Each key is tried in order until one matches.
 *
 * @param keys - Lookup keys, for example `favorite.movieId` and `favorite.slug`.
 * @returns The matching snapshot, or null when no key matches. A null result
 *          means the caller must fetch the real data from the API.
 */
export const recallMovie = (...keys: Array<string | undefined | null>): MovieSnapshot | null => {
  const cache = readAll();
  for (const key of keys) {
    if (!key) continue;
    const hit = cache[key];
    if (hit) return hit;
  }
  return null;
};

/**
 * Removes a movie snapshot from the cache.
 *
 * Used when the user removes a movie from their favorites.
 *
 * @param keys - Lookup keys. Multiple keys are accepted because a snapshot is
 *               stored under both the id and the slug.
 * @returns Nothing. The cache is only written back when something changed.
 */
export const forgetMovie = (...keys: Array<string | undefined | null>): void => {
  const cache = readAll();
  let changed = false;
  for (const key of keys) {
    if (!key) continue;
    if (cache[key]) {
      delete cache[key];
      changed = true;
    }
  }
  // Only write when something changed, to avoid useless localStorage writes.
  if (changed) writeAll(cache);
};

export default { rememberMovie, recallMovie, forgetMovie, toMovieSnapshot };
