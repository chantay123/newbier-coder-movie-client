/**
 * dashboardSnapshot.ts
 *
 * Snapshot and ISR management for the Dashboard and Movies pages.
 *
 * It supports Next.js ISR (Incremental Static Regeneration), a local static
 * snapshot as a fallback, and the resolution of offline or cold-start data.
 * The whole mechanism is turned on and off with
 * NEXT_PUBLIC_ENABLE_HOMEPAGE_SNAPSHOT.
 */

import { getApiBaseUrl } from '@/config/apiBase';

/**
 * Checks whether the snapshot and ISR mechanism is enabled.
 *
 * @returns true when the feature is turned on, false otherwise.
 */
export function isHomepageSnapshotEnabled(): boolean {
  const envVal = process.env.NEXT_PUBLIC_ENABLE_HOMEPAGE_SNAPSHOT ?? process.env.ENABLE_HOMEPAGE_SNAPSHOT;
  return envVal === 'true';
}

/**
 * The shape of the snapshot file. It mirrors the sections rendered on the
 * home page so the file can be used without any conversion.
 */
const DEFAULT_SNAPSHOT_STRUCTURE = {
  version: '1.0',
  generatedAt: null,
  dashboard: {
    featuredMovies: [],
    topMovies: [],
    mostViewedMovies: [],
    latestMovies: [],
    animeSpotlightMovies: []
  },
  moviesDetail: {} as Record<string, unknown>
};

/**
 * In-memory cache of the snapshot, so the file is read from disk only once
 * per server process.
 */
let cachedSnapshot: typeof DEFAULT_SNAPSHOT_STRUCTURE | null = null;

/**
 * Loads the snapshot from disk. Server side only.
 *
 * @returns The snapshot, or null when the feature is off or the file cannot
 *          be read.
 */
function loadSnapshotFromDisk(): typeof DEFAULT_SNAPSHOT_STRUCTURE | null {
  if (cachedSnapshot) return cachedSnapshot;
  if (!isHomepageSnapshotEnabled()) return null;

  if (typeof window === 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs') as typeof import('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path') as typeof import('path');
      const snapshotPath = path.join(process.cwd(), 'public', 'data', 'dashboard-snapshot.json');
      if (fs.existsSync(snapshotPath)) {
        cachedSnapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) as typeof DEFAULT_SNAPSHOT_STRUCTURE;
        return cachedSnapshot;
      }
    } catch {
      // Clean fallback: the snapshot stays unavailable and the API is used.
    }
  }

  return null;
}

/**
 * Returns the pre-built local snapshot.
 *
 * @returns The snapshot, or null when the feature is turned off.
 */
export function getLocalSnapshot(): typeof DEFAULT_SNAPSHOT_STRUCTURE | null {
  if (!isHomepageSnapshotEnabled()) return null;
  return loadSnapshotFromDisk() || DEFAULT_SNAPSHOT_STRUCTURE;
}

/**
 * Loads the snapshot over HTTP. Works on the client and on the edge runtime.
 *
 * A cache-busting query parameter is added so the browser does not serve an
 * old snapshot for more than a minute.
 *
 * @returns The snapshot, or null when it cannot be loaded.
 */
export async function getClientSnapshot(): Promise<typeof DEFAULT_SNAPSHOT_STRUCTURE | null> {
  if (!isHomepageSnapshotEnabled()) return null;

  if (typeof window === 'undefined') {
    return loadSnapshotFromDisk();
  }

  try {
    const res = await fetch(`/data/dashboard-snapshot.json?t=${Math.floor(Date.now() / 60000)}`, {
      cache: 'default'
    });
    if (res.ok) {
      return await res.json() as typeof DEFAULT_SNAPSHOT_STRUCTURE;
    }
  } catch {
    // Silent fallback: the caller keeps using the live API.
  }
  return null;
}

/** The dashboard data returned to the page after the snapshot is resolved. */
type DashboardSnapshot = {
  featuredMovies: unknown[];
  topMovies: unknown[];
  mostViewedMovies: { rank: number }[];
  latestMovies: unknown[];
  animeSpotlightMovies: unknown[];
  moviesDetail: Record<string, unknown>;
  source: string;
  generatedAt: string;
};

/**
 * Fetches the dashboard data for ISR. Called inside getStaticProps.
 *
 * The live API is preferred. When it fails, the local snapshot file is used
 * instead, so the page still renders with data.
 *
 * @returns The dashboard data, or null when neither source has data.
 */
export async function getDashboardDataForISR(): Promise<DashboardSnapshot | null> {
  if (!isHomepageSnapshotEnabled()) {
    return null;
  }

  const fallback = loadSnapshotFromDisk() || DEFAULT_SNAPSHOT_STRUCTURE;
  const API_BASE = getApiBaseUrl();

  if (API_BASE) {
    try {
      // The request is aborted after 6 seconds so a slow backend cannot
      // block the build.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      /**
       * Fetches one endpoint and unwraps the list from the response.
       *
       * @param ep - The endpoint path, relative to the API base.
       * @returns The list of movies, or an empty array on any failure.
       */
      const fetchEndpoint = async (ep: string): Promise<unknown[]> => {
        try {
          const res = await fetch(`${API_BASE}${ep}`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' }
          });
          if (!res.ok) return [];
          const json = await res.json() as Record<string, unknown>;
          // The backend has used several envelope shapes over time, so every
          // known one is tried before giving up.
          return ((json.responseData as Record<string, unknown>)?.data as unknown[]) ||
            (json.responseData as unknown[]) ||
            ((json.data as Record<string, unknown>)?.movies as unknown[]) ||
            (json.data as unknown[]) ||
            (json.movies as unknown[]) ||
            [];
        } catch {
          return [];
        }
      };

      const [latest, trending, topRated] = await Promise.all([
        fetchEndpoint('/movies/latest'),
        fetchEndpoint('/movies/trending'),
        fetchEndpoint('/movies/top-rated')
      ]);

      clearTimeout(timeout);

      const hasLiveData = Array.isArray(latest) && latest.length > 0;

      if (hasLiveData) {
        const latestArr = latest as unknown[];
        const trendingArr = trending as unknown[];

        const featured = latestArr.slice(0, 6);
        const top10 = Array.isArray(trendingArr) && trendingArr.length > 0
          ? trendingArr.slice(0, 10)
          : latestArr.slice(0, 10);
        const mostViewed = (top10 as Array<unknown>).map((m, idx) => ({ ...(m as object), rank: idx + 1 }));
        const topMovies = Array.isArray(topRated) && (topRated as unknown[]).length > 0
          ? (topRated as unknown[]).slice(0, 12)
          : latestArr.slice(0, 12);

        return {
          featuredMovies: featured,
          topMovies,
          mostViewedMovies: mostViewed,
          latestMovies: latestArr.slice(0, 24),
          animeSpotlightMovies: (fallback?.dashboard?.animeSpotlightMovies as unknown[]) || [],
          moviesDetail: (fallback?.moviesDetail as Record<string, unknown>) || {},
          source: 'live_api',
          generatedAt: new Date().toISOString()
        };
      }
    } catch {
      // Quietly fall back to the snapshot file below.
    }
  }

  if (fallback?.dashboard && fallback?.generatedAt) {
    return {
      ...fallback.dashboard,
      moviesDetail: fallback.moviesDetail || {},
      source: 'disk_snapshot',
      generatedAt: fallback.generatedAt || new Date().toISOString()
    };
  }

  return null;
}

export default { isHomepageSnapshotEnabled, getLocalSnapshot, getClientSnapshot, getDashboardDataForISR };
