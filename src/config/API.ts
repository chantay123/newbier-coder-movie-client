/**
 * @file API.ts
 * @description Khai báo tập trung các URL endpoint của backend.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/** Helper tạo URL endpoint cho các route có query params */
function buildUrl(base: string, params?: Record<string, string | number>): string {
  if (!params) return base;
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return query ? `${base}?${query}` : base;
}

export const endpoints = {
  movies: {
    detail: (slug: string) => `${API_URL}/movies/${slug}`,
    related: (category: string, limit: number) => `${API_URL}/movies?category=${category}&limit=${limit}`,
    search: (query: string) => `${API_URL}/movies/search?q=${encodeURIComponent(query)}`
  },
  crawl: {
    movies: () => `${API_URL}/crawl/movies`,
    moviesAll: () => `${API_URL}/crawl/moviesall`
  },
  /**
   * Watch history — path đã verify trực tiếp với backend production
   * (2026-10-20). Route cũ `/history/*` trả 404 "Route not found".
   *   GET    /users/me/history        → 401 (list, cần Bearer token)
   *   POST   /users/me/history        → 400 (add, cần Bearer token + body)
   *   DELETE /users/me/history/:id    → 401 (xóa 1 item)
   *   DELETE /users/me/history        → 401 (xóa toàn bộ)
   * Baseline `/users/me/zzz-nope` → 404 nên 401 ở đây là route thật, không
   * phải false-positive của `/users/me/:param`.
   */
  history: {
    getAll: (limit = 10, page = 1) => buildUrl(`${API_URL}/users/me/history`, { limit, page }),
    add: () => `${API_URL}/users/me/history`,
    addById: (_movieId: string) => `${API_URL}/users/me/history`,
    delete: (historyId: string) => `${API_URL}/users/me/history/${historyId}`,
    clear: () => `${API_URL}/users/me/history`,
    getUserHistory: (userId: string, limit = 10, page = 1) =>
      buildUrl(`${API_URL}/users/${userId}/history`, { limit, page })
  },
  /**
   * Favorites — path đã được verify trực tiếp với backend production
   * (2026-10-20). Route cũ `/favorites` trả 404 "Route not found".
   *   GET    /users/me/favorites    → 401 (tồn tại, cần Bearer token)
   *   POST   /movies/:slug/favorite → 401 (tồn tại, cần Bearer token)
   *   DELETE /movies/:slug/favorite → 401 (tồn tại, cần Bearer token)
   * Toggle dùng slug (không phải id) — đã đúng ở useMovieDetail.ts.
   */
  favorites: {
    getAll: () => `${API_URL}/users/me/favorites`,
    add: (movieSlug: string) => `${API_URL}/movies/${encodeURIComponent(movieSlug)}/favorite`,
    remove: (movieSlug: string) => `${API_URL}/movies/${encodeURIComponent(movieSlug)}/favorite`,
    check: (movieSlug: string) =>
      `${API_URL}/users/me/favorites?slug=${encodeURIComponent(movieSlug)}`
  },
  search: {
    find: () => `${API_URL}/search`
  },
  admin: {
    movies: {
      getAll: (page = 1, limit = 10) => buildUrl(`${API_URL}/admin/movies`, { page, limit }),
      getById: (id: string) => `${API_URL}/admin/movies/${id}`,
      create: () => `${API_URL}/admin/movies`,
      update: (id: string) => `${API_URL}/admin/movies/${id}`,
      delete: (id: string) => `${API_URL}/admin/movies/${id}`,
      uploadThumbnail: (id: string) => `${API_URL}/admin/movies/${id}/thumbnail`,
      toggleVisibility: (id: string) => `${API_URL}/admin/movies/${id}/visibility`
    },
    users: {
      getAll: (page = 1, limit = 10) => buildUrl(`${API_URL}/admin/users`, { page, limit }),
      getById: (id: string) => `${API_URL}/admin/users/${id}`,
      create: () => `${API_URL}/admin/users`,
      update: (id: string) => `${API_URL}/admin/users/${id}`,
      delete: (id: string) => `${API_URL}/admin/users/${id}`,
      updateRole: (id: string) => `${API_URL}/admin/users/${id}/role`,
      ban: (id: string) => `${API_URL}/admin/users/${id}/ban`,
      unban: (id: string) => `${API_URL}/admin/users/${id}/unban`,
      toggleStatus: (id: string) => `${API_URL}/admin/users/${id}/toggle-status`,
      uploadAvatar: (id: string) => `${API_URL}/admin/users/${id}/avatar`
    },
    roles: {
      getAll: () => `${API_URL}/admin/roles`
    },
    accountTypes: {
      getAll: () => `${API_URL}/admin/account-types`
    },
    dashboard: {
      stats: () => `${API_URL}/admin/dashboard/stats`,
      recentMovies: () => `${API_URL}/admin/dashboard/recent-movies`,
      topMovies: () => `${API_URL}/admin/dashboard/top-movies`
    },
    premium: {
      getAllPackages: () => `${API_URL}/subscription/packages`,
      getPackageById: (id: string) => `${API_URL}/subscription/packages/${id}`,
      createPackage: () => `${API_URL}/subscription/admin/packages`,
      updatePackage: (id: string) => `${API_URL}/subscription/admin/packages/${id}`,
      deletePackage: (id: string) => `${API_URL}/subscription/admin/packages/${id}`,
      getAllSubscriptions: () => `${API_URL}/subscription/admin/subscriptions`,
      getPendingSubscriptions: () => `${API_URL}/subscription/admin/pending-subscriptions`,
      approveSubscription: (subscriptionId: string) =>
        `${API_URL}/subscription/admin/approve/${subscriptionId}`,
      rejectSubscription: (subscriptionId: string) =>
        `${API_URL}/subscription/admin/reject/${subscriptionId}`
    }
  }
} as const;

export default { API_URL, endpoints };
