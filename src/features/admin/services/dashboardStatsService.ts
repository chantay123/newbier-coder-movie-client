/**
 * @file dashboardStatsService.ts
 * @description Lightweight dashboard statistics helper used by legacy admin pages.
 */
import { MOCK_DASHBOARD_STATS } from '@/mock/admin';

interface DashboardStats {
  totalMovies: number;
  newUsers: number;
  engagementRate: number;
  reports: number;
  totalUsers: number;
  totalViews: number;
  totalComments: number;
}

/**
 * Retrieves dashboard summary stats.
 * @description Endpoint /admin/dashboard/stats is not active on backend.
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  return {
    totalMovies: MOCK_DASHBOARD_STATS.totalMovies,
    newUsers: MOCK_DASHBOARD_STATS.newUsers,
    engagementRate: 78.4,
    reports: MOCK_DASHBOARD_STATS.reports,
    totalUsers: 1420,
    totalViews: 120000,
    totalComments: 350
  };
};
