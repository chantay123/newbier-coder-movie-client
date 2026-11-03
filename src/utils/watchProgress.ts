/**
 * @file watchProgress.ts
 * @description Local watch-progress manager. Persists last watched episode,
 * server index, and timestamp per movie slug to enable instant resume and
 * proximity-based episode navigation. All operations are no-ops during SSR.
 *
 * ---------------------------------------------------------------------------
 * STORAGE RULES
 * ---------------------------------------------------------------------------
 * - One key per movie: `movie_watch_progress_<slug>` (the resume payload).
 * - One index key: `movie_recent_watches` (the ordered list of the recently
 *   watched movies). It only stores `{ slug, updatedAt }`, so the heavy
 *   payload (title, poster, episode names) lives in ONE place only: the
 *   per-movie key. The list used to duplicate the whole payload, which
 *   doubled the storage usage for no benefit.
 * - The number of movies is bounded:
 *   * `MAX_RECENT_ITEMS` entries in the recent list.
 *   * `MAX_PROGRESS_KEYS` per-movie keys. The keys that are not part of the
 *     recent list are dropped first (oldest first), so a movie the user is
 *     still following is never removed.
 *   * A movie that has not been watched for `PROGRESS_TTL_MS` is expired and
 *     dropped during the cleanup.
 * - Writes are skipped when the payload did not change, so watching a movie
 *   does not hammer `localStorage`.
 */

const STORAGE_PREFIX = 'movie_watch_progress_';
const RECENT_LIST_KEY = 'movie_recent_watches';
const PINNED_PREFIX = 'movie_pinned_ep_';
const MAX_RECENT_ITEMS = 50;

/** The maximum number of `movie_watch_progress_*` keys kept in the storage. */
const MAX_PROGRESS_KEYS = 60;

/** The maximum number of `movie_pinned_ep_*` keys kept in the storage. */
const MAX_PINNED_KEYS = 100;

/**
 * A watch progress older than 180 days is considered expired. It is only
 * removed during the cleanup, never while the user is watching.
 */
const PROGRESS_TTL_MS = 180 * 24 * 60 * 60 * 1000;

const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export interface WatchProgressPayload {
  slug: string;
  serverIndex: number;
  episodeIndex: number;
  epSlug: string;
  epName: string;
  movieName: string;
  posterUrl: string;
  updatedAt: number;
}

/** One entry of the `movie_recent_watches` index. */
interface RecentWatchIndexEntry {
  slug: string;
  updatedAt: number;
}

export interface PinnedEpisode {
  episodeIndex: number;
  epSlug?: string;
  epName?: string;
  serverIndex?: number;
  updatedAt?: number;
  [key: string]: unknown;
}

/**
 * Tells whether two watch progress payloads hold the same information.
 *
 * @param a - The stored payload.
 * @param b - The new payload.
 * @returns `true` when nothing relevant changed.
 */
const isSameProgress = (a: WatchProgressPayload, b: WatchProgressPayload): boolean =>
  a.serverIndex === b.serverIndex &&
  a.episodeIndex === b.episodeIndex &&
  a.epSlug === b.epSlug &&
  a.epName === b.epName &&
  a.movieName === b.movieName &&
  a.posterUrl === b.posterUrl;

/**
 * Reads the recent-watch index.
 *
 * Legacy entries (which stored the whole payload) are still accepted, so the
 * data written by a previous version of the app is not lost.
 *
 * @returns The index entries, newest first.
 */
const readRecentIndex = (): RecentWatchIndexEntry[] => {
  try {
    const raw = window.localStorage.getItem(RECENT_LIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const entries: RecentWatchIndexEntry[] = [];
    for (const item of parsed as Array<Record<string, unknown>>) {
      if (!item || typeof item !== 'object') continue;
      const slug = typeof item.slug === 'string' ? item.slug : '';
      if (!slug) continue;
      const updatedAt = typeof item.updatedAt === 'number' ? item.updatedAt : 0;
      entries.push({ slug, updatedAt });
    }
    return entries;
  } catch {
    return [];
  }
};

/**
 * Writes the recent-watch index.
 *
 * @param entries - The index entries, newest first.
 * @returns Nothing. Storage failures are swallowed on purpose.
 */
const writeRecentIndex = (entries: RecentWatchIndexEntry[]): void => {
  try {
    window.localStorage.setItem(RECENT_LIST_KEY, JSON.stringify(entries));
  } catch {
    /* quota reached or storage disabled */
  }
};

/**
 * Moves the legacy entries of the recent list to their own key.
 *
 * Before the optimization, the `movie_recent_watches` list stored the whole
 * payload of every movie, which duplicated the `movie_watch_progress_*` keys.
 * The list now only stores `{ slug, updatedAt }`, and the payload lives in
 * one place only: the per-movie key. This function migrates the entries
 * written by the previous version.
 *
 * @returns Nothing. Storage failures are swallowed on purpose.
 */
const migrateLegacyRecentEntries = (): void => {
  try {
    const raw = window.localStorage.getItem(RECENT_LIST_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return;

    let changed = false;
    for (const item of parsed as Array<Record<string, unknown>>) {
      if (!item || typeof item !== 'object') continue;
      const slug = typeof item.slug === 'string' ? item.slug : '';
      if (!slug) continue;
      // Not a legacy entry: it only holds the slug and the timestamp.
      if (typeof item.episodeIndex !== 'number') continue;

      const key = `${STORAGE_PREFIX}${slug}`;
      if (window.localStorage.getItem(key)) continue;

      const migrated: WatchProgressPayload = {
        slug,
        serverIndex: Number(item.serverIndex) || 0,
        episodeIndex: Number(item.episodeIndex) || 0,
        epSlug: typeof item.epSlug === 'string' ? item.epSlug : '',
        epName: typeof item.epName === 'string' ? item.epName : '',
        movieName: typeof item.movieName === 'string' ? item.movieName : '',
        posterUrl: typeof item.posterUrl === 'string' ? item.posterUrl : '',
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now()
      };
      window.localStorage.setItem(key, JSON.stringify(migrated));
      changed = true;
    }

    if (changed) {
      // The list is rewritten in the new (light) format.
      writeRecentIndex(readRecentIndex());
    }
  } catch {
    /* broken JSON or storage disabled */
  }
};

/**
 * Lists the per-movie progress keys with their last update time.
 *
 * @returns The key/value pairs of every `movie_watch_progress_*` entry.
 */
const listProgressEntries = (): Array<{ key: string; updatedAt: number }> => {
  const result: Array<{ key: string; updatedAt: number }> = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
      let updatedAt = 0;
      try {
        const raw = window.localStorage.getItem(key);
        const parsed = raw ? (JSON.parse(raw) as { updatedAt?: number }) : null;
        if (parsed && typeof parsed.updatedAt === 'number') updatedAt = parsed.updatedAt;
      } catch {
        updatedAt = 0;
      }
      result.push({ key, updatedAt });
    }
  } catch {
    /* storage disabled */
  }
  return result;
};

/**
 * Removes the expired and the surplus watch-progress keys.
 *
 * The keys that belong to the recent list are always kept, so the "continue
 * watching" feature never loses a movie the user is following. The orphan
 * keys (movies that already left the recent list) are dropped first, oldest
 * first, and only then the oldest entries overall are removed.
 *
 * @returns Nothing. Storage failures are swallowed on purpose.
 */
const pruneWatchProgress = (): void => {
  try {
    const entries = listProgressEntries();
    if (!entries.length) return;

    const now = Date.now();
    const recentSlugs = new Set(readRecentIndex().map((entry) => entry.slug));

    // 1. Drop the expired entries.
    const alive: Array<{ key: string; updatedAt: number; slug: string }> = [];
    for (const entry of entries) {
      const slug = entry.key.slice(STORAGE_PREFIX.length);
      if (entry.updatedAt > 0 && now - entry.updatedAt > PROGRESS_TTL_MS) {
        window.localStorage.removeItem(entry.key);
        continue;
      }
      alive.push({ key: entry.key, updatedAt: entry.updatedAt, slug });
    }

    if (alive.length <= MAX_PROGRESS_KEYS) return;

    // 2. Drop the orphans (the movies that already left the recent list).
    const orphans = alive
      .filter((entry) => !recentSlugs.has(entry.slug))
      .sort((a, b) => a.updatedAt - b.updatedAt);

    let surplus = alive.length - MAX_PROGRESS_KEYS;
    for (const orphan of orphans) {
      if (surplus <= 0) break;
      window.localStorage.removeItem(orphan.key);
      surplus -= 1;
    }

    // 3. Still too many entries: drop the oldest ones, but never a movie
    //    that is still part of the recent list.
    const remaining = alive
      .filter((entry) => window.localStorage.getItem(entry.key) !== null)
      .sort((a, b) => a.updatedAt - b.updatedAt);

    let extra = remaining.length - MAX_PROGRESS_KEYS;
    for (const entry of remaining) {
      if (extra <= 0) break;
      if (recentSlugs.has(entry.slug)) continue;
      window.localStorage.removeItem(entry.key);
      extra -= 1;
    }
  } catch {
    /* storage disabled */
  }
};

/**
 * Removes the surplus pinned-episode keys.
 *
 * The pinned episode is a user preference, so it is only dropped when there
 * are too many of them, oldest first.
 *
 * @returns Nothing. Storage failures are swallowed on purpose.
 */
const prunePinnedEpisodes = (): void => {
  try {
    const entries: Array<{ key: string; updatedAt: number }> = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(PINNED_PREFIX)) continue;
      let updatedAt = 0;
      try {
        const raw = window.localStorage.getItem(key);
        const parsed = raw ? (JSON.parse(raw) as { updatedAt?: number }) : null;
        if (parsed && typeof parsed.updatedAt === 'number') updatedAt = parsed.updatedAt;
      } catch {
        updatedAt = 0;
      }
      entries.push({ key, updatedAt });
    }
    if (entries.length <= MAX_PINNED_KEYS) return;

    entries.sort((a, b) => a.updatedAt - b.updatedAt);
    const surplus = entries.length - MAX_PINNED_KEYS;
    for (let i = 0; i < surplus; i += 1) {
      window.localStorage.removeItem(entries[i].key);
    }
  } catch {
    /* storage disabled */
  }
};

export function saveWatchProgress(slug: string, data: Partial<WatchProgressPayload>): void {
  if (!isBrowser() || !slug) return;

  try {
    // The entries written by the previous version are migrated once, so the
    // payload is not duplicated in the recent list.
    migrateLegacyRecentEntries();

    const payload: WatchProgressPayload = {
      slug,
      serverIndex: Number(data.serverIndex) || 0,
      episodeIndex: Number(data.episodeIndex) || 0,
      epSlug: data.epSlug || '',
      epName: data.epName || '',
      movieName: data.movieName || '',
      posterUrl: data.posterUrl || '',
      updatedAt: Date.now()
    };

    const storageKey = `${STORAGE_PREFIX}${slug}`;
    const raw = window.localStorage.getItem(storageKey);

    // The payload is written only when something really changed. Watching a
    // movie re-runs this function on every episode change, and an unchanged
    // payload does not have to be serialized again.
    let stored: WatchProgressPayload | null = null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as WatchProgressPayload;
        if (parsed && typeof parsed === 'object') stored = parsed;
      } catch {
        stored = null;
      }
    }

    if (!stored || !isSameProgress(stored, payload)) {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } else {
      // Nothing changed: keep the original timestamp so the ordering of the
      // recent list stays stable.
      payload.updatedAt = stored.updatedAt;
    }

    try {
      const index = readRecentIndex().filter((entry) => entry.slug !== slug);
      index.unshift({ slug, updatedAt: payload.updatedAt });
      if (index.length > MAX_RECENT_ITEMS) {
        index.length = MAX_RECENT_ITEMS;
      }
      writeRecentIndex(index);
    } catch {
      // Ignore recent-list errors
    }

    pruneWatchProgress();

    window.dispatchEvent(
      new CustomEvent('watchProgressUpdated', { detail: { slug, payload } })
    );
  } catch {
    // Silent fallback
  }
}

export function getWatchProgress(slug: string): WatchProgressPayload | null {
  if (!isBrowser() || !slug) return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${slug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WatchProgressPayload;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function removeWatchProgress(slug: string): void {
  if (!isBrowser() || !slug) return;
  try {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${slug}`);
  } catch {
    /* ignore */
  }
}

/**
 * Returns every recently watched movie, newest first.
 *
 * The payload of each movie is read from its own
 * `movie_watch_progress_<slug>` key, so the data is stored only once. The
 * legacy entries of the recent list (which carried the whole payload) are
 * still supported and are migrated to their own key on the fly.
 *
 * @returns The watch progress of every recently watched movie.
 */
export function getAllRecentWatches(): WatchProgressPayload[] {
  if (!isBrowser()) return [];
  try {
    // The entries written by the previous version are migrated first.
    migrateLegacyRecentEntries();

    const raw = window.localStorage.getItem(RECENT_LIST_KEY);
    if (!raw) return [];

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) return [];

    const result: WatchProgressPayload[] = [];
    const seen = new Set<string>();

    for (const item of parsed as Array<Record<string, unknown>>) {
      if (!item || typeof item !== 'object') continue;
      const slug = typeof item.slug === 'string' ? item.slug : '';
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);

      const stored = getWatchProgress(slug);
      if (stored) {
        result.push(stored);
        continue;
      }

      // Legacy entry: the payload was stored inside the list itself.
      const legacy = item as unknown as WatchProgressPayload;
      if (typeof legacy.episodeIndex === 'number') {
        const migrated: WatchProgressPayload = {
          slug,
          serverIndex: Number(legacy.serverIndex) || 0,
          episodeIndex: Number(legacy.episodeIndex) || 0,
          epSlug: typeof legacy.epSlug === 'string' ? legacy.epSlug : '',
          epName: typeof legacy.epName === 'string' ? legacy.epName : '',
          movieName: typeof legacy.movieName === 'string' ? legacy.movieName : '',
          posterUrl: typeof legacy.posterUrl === 'string' ? legacy.posterUrl : '',
          updatedAt: typeof legacy.updatedAt === 'number' ? legacy.updatedAt : Date.now()
        };
        result.push(migrated);
        try {
          window.localStorage.setItem(`${STORAGE_PREFIX}${slug}`, JSON.stringify(migrated));
        } catch {
          /* ignore */
        }
      }
    }

    return result;
  } catch {
    return [];
  }
}

export function removeRecentWatch(slug: string): void {
  if (!isBrowser() || !slug) return;
  try {
    removeWatchProgress(slug);
    writeRecentIndex(readRecentIndex().filter((entry) => entry.slug !== slug));
    window.dispatchEvent(new CustomEvent('watchProgressUpdated', { detail: { slug, removed: true } }));
  } catch {
    /* ignore */
  }
}

export function clearAllRecentWatches(): void {
  if (!isBrowser()) return;
  try {
    const list = getAllRecentWatches();
    list.forEach((item) => {
      if (item.slug) removeWatchProgress(item.slug);
    });
    // The orphan keys (movies that already left the recent list) are removed
    // too, so "clear the history" really clears the history.
    for (const entry of listProgressEntries()) {
      window.localStorage.removeItem(entry.key);
    }
    window.localStorage.removeItem(RECENT_LIST_KEY);
    window.dispatchEvent(new CustomEvent('watchProgressUpdated', { detail: { clearedAll: true } }));
  } catch {
    /* ignore */
  }
}

export function getPinnedEpisode(slug: string): PinnedEpisode | null {
  if (!isBrowser() || !slug) return null;
  try {
    const raw = window.localStorage.getItem(`${PINNED_PREFIX}${slug}`);
    if (!raw) return null;
    return JSON.parse(raw) as PinnedEpisode;
  } catch {
    return null;
  }
}

export function setPinnedEpisode(slug: string, data: PinnedEpisode): void {
  if (!isBrowser() || !slug) return;
  try {
    const payload: PinnedEpisode = { ...data, updatedAt: Date.now() };
    window.localStorage.setItem(`${PINNED_PREFIX}${slug}`, JSON.stringify(payload));
    prunePinnedEpisodes();
    window.dispatchEvent(new CustomEvent('pinnedEpisodeChanged', { detail: { slug, data: payload } }));
  } catch {
    /* ignore */
  }
}

export function removePinnedEpisode(slug: string): void {
  if (!isBrowser() || !slug) return;
  try {
    window.localStorage.removeItem(`${PINNED_PREFIX}${slug}`);
    window.dispatchEvent(new CustomEvent('pinnedEpisodeChanged', { detail: { slug, data: null } }));
  } catch {
    /* ignore */
  }
}

export function togglePinnedEpisode(slug: string, data: PinnedEpisode): boolean {
  if (!isBrowser() || !slug) return false;
  const current = getPinnedEpisode(slug);
  if (current && current.episodeIndex === data.episodeIndex) {
    removePinnedEpisode(slug);
    return false;
  }
  setPinnedEpisode(slug, data);
  return true;
}
