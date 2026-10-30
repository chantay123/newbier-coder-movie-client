/**
 * @file ratingAdminService.ts
 * @description Admin rating aggregation: fetch per-movie stats and trigger rating sync.
 */
import axiosInstance from '@/API/config/axiosConfig';
import { apiRoute } from '@/config/apiRoutes';

interface RatingUser {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
}

export interface AdminRating {
  _id: string;
  userId: string | RatingUser;
  movieId: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface RatingStats {
  ratings: AdminRating[];
  averageRating: number;
  ratingCount: number;
  userRatingsStats: Record<number, number>;
}

export const getMovieRatings = async (movieId: string): Promise<RatingStats> => {
  try {
    const response = await axiosInstance.get(apiRoute(`adminRatingsByMovie`, movieId));
    return (response.data as { data: RatingStats }).data;
  } catch (error) {

    throw error;
  }
};

export const syncMovieRatings = async (movieId: string): Promise<unknown> => {
  try {
    const response = await axiosInstance.post(apiRoute(`adminRatingsUpdateMovie`), { movieId });
    return (response.data as { data: unknown }).data;
  } catch (error) {

    throw error;
  }
};

export const syncAllMovieRatings = async (): Promise<unknown> => {
  try {
    const response = await axiosInstance.get(apiRoute(`adminRatingsSyncAll`));
    return (response.data as { data: unknown }).data;
  } catch (error) {

    throw error;
  }
};
