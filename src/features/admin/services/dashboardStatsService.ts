/**
 * @file dashboardStatsService.ts
 * @description Lightweight dashboard statistics helper used by legacy admin pages.
 */
import axiosInstance from '@/API/config/axiosConfig';

interface DashboardStats {
  totalMovies: number;
  newUsers: number;
  engagementRate: number;
  reports: number;
  totalUsers: number;
  totalViews: number;
  totalComments: number;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const response = await axiosInstance.get('/admin/dashboard/stats');
    return response.data as DashboardStats;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};
