/**
 * @file watchProgress.ts
 * @description Local watch-progress manager. Persists last watched episode,
 * server index, and timestamp per movie slug to enable instant resume and
 * proximity-based episode navigation. All operations are no-ops during SSR.
 */

const STORAGE_PREFIX = 'movie_watch_progress_';
const RECENT_LIST_KEY = 'movie_recent_watches';
const PINNED_PREFIX = 'movie_pinned_ep_';
const MAX_RECENT_ITEMS = 50;

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

export interface PinnedEpisode {
  episodeIndex: number;
  epSlug?: string;
  epName?: string;
  serverIndex?: number;
  [key: string]: unknown;
}

export function saveWatchProgress(slug: string, data: Partial<WatchProgressPayload>): void {
  if (!isBrowser() || !slug) return;

  try {
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

    window.localStorage.setItem(`${STORAGE_PREFIX}${slug}`, JSON.stringify(payload));

    try {
      const rawRecent = window.localStorage.getItem(RECENT_LIST_KEY);
      let recentList: WatchProgressPayload[] = rawRecent ? JSON.parse(rawRecent) : [];
      if (!Array.isArray(recentList)) recentList = [];

      recentList = recentList.filter((item) => item.slug !== slug);
      recentList.unshift(payload);
      if (recentList.length > MAX_RECENT_ITEMS) {
        recentList = recentList.slice(0, MAX_RECENT_ITEMS);
      }
      window.localStorage.setItem(RECENT_LIST_KEY, JSON.stringify(recentList));
    } catch {
      // Ignore recent-list errors
    }

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

export function getAllRecentWatches(): WatchProgressPayload[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(RECENT_LIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WatchProgressPayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function removeRecentWatch(slug: string): void {
  if (!isBrowser() || !slug) return;
  try {
    removeWatchProgress(slug);
    const list = getAllRecentWatches().filter((item) => item.slug !== slug);
    window.localStorage.setItem(RECENT_LIST_KEY, JSON.stringify(list));
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
    window.localStorage.setItem(`${PINNED_PREFIX}${slug}`, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('pinnedEpisodeChanged', { detail: { slug, data } }));
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
