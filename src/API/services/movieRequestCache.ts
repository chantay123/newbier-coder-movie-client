/**
 * movieRequestCache.ts
 *
 * A tiny in-memory cache WITH single-flight for the movie list requests.
 *
 * WHY THIS FILE EXISTS
 * The same list is asked for from several places on the home page:
 * - the `big_slide` section and the `animation` section both load the
 *   "hoat-hinh" category;
 * - the country rails are PRELOADED by the page (so the data is ready when
 *   the user scrolls down) AND loaded again by the rail component itself;
 * - React StrictMode runs every effect twice in development.
 *
 * Every one of those call sites used to produce its own HTTP request, even
 * though the backend answers the exact same payload. This module makes the
 * duplicates impossible: the first caller starts the request and the others
 * wait for the SAME promise.
 *
 * THE RULES
 * - The cache lives in RAM only. It is never written to `localStorage`,
 *   because reading the Web Storage is synchronous and it blocks the first
 *   render of the page.
 * - An EMPTY result is NOT cached. A backend that answers 401 or 500 must
 *   not freeze the page for the whole TTL — the next attempt has to be able
 *   to retry.
 * - The TTL is short (2 minutes), because the ranking of the home page
 *   changes often.
 * - The cached value is the FULL list. The caller applies its own limit
 *   AFTER reading the cache, so two callers with a different limit share
 *   one request instead of two.
 */

/** The lifetime of a cached list: 2 minutes. */
export const MOVIE_REQUEST_TTL_MS = 2 * 60 * 1000;

/**
 * The lifetime of a FAILED request: 15 seconds.
 *
 * WHY A SHORT NEGATIVE CACHE
 * An empty list is the symptom of a failed request (401, 404, 500). It is
 * not cached for the full TTL, otherwise a temporary outage would freeze
 * the page for 2 minutes. But it IS cached for a few seconds, because
 * several callers ask for the same endpoint at the same time, and without
 * this short cache they would each send their own failing request.
 *
 * 15 seconds is short enough for the next attempt (a new login, a token
 * refresh) to work, and long enough to absorb the burst of duplicate
 * calls that happens when the page mounts.
 */
export const MOVIE_REQUEST_ERROR_TTL_MS = 15 * 1000;

/** A cached value with the moment it was written. */
interface CacheEntry {
  timestamp: number;
  data: unknown;
  /** The lifetime of THIS entry, which is shorter for a failed request. */
  ttlMs: number;
}

/** The cached values, by key. */
const cache = new Map<string, CacheEntry>();

/** The requests that are currently in flight, by key. */
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Tells whether a cache entry is still fresh.
 *
 * @param entry - The cache entry.
 * @returns `true` when the entry can still be used.
 */
const isFresh = (entry: CacheEntry): boolean =>
  Date.now() - entry.timestamp <= entry.ttlMs;

/**
 * Runs a request through the shared cache.
 *
 * The behavior, in order:
 * 1. A fresh cache entry exists → it is returned, no request is sent.
 * 2. The same request is already in flight → the caller awaits that
 *    promise, so the request is sent only once.
 * 3. Otherwise the request is sent, and the result is cached:
 *    - a NON-EMPTY result is cached for the full TTL;
 *    - an EMPTY result (a failed request) is cached for the SHORT TTL, so
 *      the burst of duplicate calls that happens when the page mounts is
 *      absorbed, without freezing the page for the whole TTL.
 *
 * @param key - The cache key. It must describe the endpoint AND its query
 *              string, because two different queries answer two different
 *              payloads.
 * @param fetcher - The function that performs the actual request.
 * @param ttlMs - The lifetime of the cached value in milliseconds.
 * @returns The cached value, or the fresh result of the request.
 */
export const cachedRequest = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = MOVIE_REQUEST_TTL_MS
): Promise<T> => {
  const hit = cache.get(key);
  if (hit && isFresh(hit)) {
    return hit.data as T;
  }

  // The same request is already running: the caller joins it instead of
  // starting a second one.
  const pending = inFlight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = (async (): Promise<T> => {
    try {
      const data = await fetcher();

      // An empty list is the symptom of a failed request (401, 404, 500).
      // It is cached for the SHORT TTL only: the burst of duplicate calls
      // is absorbed, but the page is not frozen for the whole TTL.
      const isEmptyList = Array.isArray(data) && data.length === 0;
      cache.set(key, {
        timestamp: Date.now(),
        data,
        ttlMs: isEmptyList ? MOVIE_REQUEST_ERROR_TTL_MS : ttlMs
      });

      return data;
    } catch {
      // The shared promise NEVER rejects. A rejection would become an
      // unhandled rejection for the callers that only wait for the
      // in-flight entry, and the movie services expect a fallback instead
      // of an exception (that is the contract of `safeFetchJson`).
      return [] as unknown as T;
    } finally {
      // The entry is removed in every case, so a failed request never
      // blocks the next attempt.
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise as Promise<unknown>);

  return promise;
};

/**
 * Removes one entry (or every entry) from the cache.
 *
 * It is used after a write operation, so the next read shows the new data
 * instead of the stale one.
 *
 * @param key - The key to remove. When it is omitted, the whole cache is
 *              cleared.
 */
export const invalidateMovieCache = (key?: string): void => {
  if (!key) {
    cache.clear();
    return;
  }
  cache.delete(key);
};

/**
 * The number of cached entries. It is only used by the diagnostics.
 */
export const getMovieCacheSize = (): number => cache.size;

export default cachedRequest;
