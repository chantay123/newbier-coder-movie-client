/**
 * @file dashboardSnapshot.ts
 * @description Trình quản lý Snapshot & ISR cho Dashboard & Movies.
 * Hỗ trợ Next.js ISR (Incremental Static Regeneration), local static snapshot fallback,
 * và resolve dữ liệu offline/cold-start. Bật/tắt qua NEXT_PUBLIC_ENABLE_HOMEPAGE_SNAPSHOT.
 */

/** Kiểm tra xem cơ chế snapshot / ISR có được bật không */
export function isHomepageSnapshotEnabled(): boolean {
  const envVal = process.env.NEXT_PUBLIC_ENABLE_HOMEPAGE_SNAPSHOT ?? process.env.ENABLE_HOMEPAGE_SNAPSHOT;
  return envVal === 'true';
}

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

let cachedSnapshot: typeof DEFAULT_SNAPSHOT_STRUCTURE | null = null;

/** Tải snapshot từ đĩa (server-side) */
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
      // Fallback sạch
    }
  }

  return null;
}

/** Trả về snapshot pre-built cục bộ */
export function getLocalSnapshot(): typeof DEFAULT_SNAPSHOT_STRUCTURE | null {
  if (!isHomepageSnapshotEnabled()) return null;
  return loadSnapshotFromDisk() || DEFAULT_SNAPSHOT_STRUCTURE;
}

/** Tải snapshot qua HTTP (chạy được cả client và edge) */
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
    // Silent fallback
  }
  return null;
}

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

/** Fetcher ISR phía server, gọi trong getStaticProps. */
export async function getDashboardDataForISR(): Promise<DashboardSnapshot | null> {
  if (!isHomepageSnapshotEnabled()) {
    return null;
  }

  const fallback = loadSnapshotFromDisk() || DEFAULT_SNAPSHOT_STRUCTURE;
  const API_BASE = (process.env.NEXT_PUBLIC_CORE_API_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

  if (API_BASE) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const fetchEndpoint = async (ep: string): Promise<unknown[]> => {
        try {
          const res = await fetch(`${API_BASE}${ep}`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' }
          });
          if (!res.ok) return [];
          const json = await res.json() as Record<string, unknown>;
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
      // Quietly fall back
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
