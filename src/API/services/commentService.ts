/**
 * @file commentService.ts
 * @description API client for community comments and live buzz feeds.
 * Returns live backend data or clean empty states without mock fallbacks.
 */
import { safeFetchJson } from '@/API/services/movieService';

export interface CommentItem {
  id: string;
  author?: string;
  content?: string;
  avatar?: string;
  movieSlug?: string;
  movieName?: string;
  createdAt?: string;
  rating?: number;
  likes?: number;
  [key: string]: unknown;
}

export const commentService = {
  /** Top community comments within the given period. */
  getTopComments: async ({ period = 'week', limit = 6 }: { period?: 'week' | 'month' | 'all'; limit?: number } = {}): Promise<{ comments: CommentItem[]; total: number; period: string }> => {
    try {
      const result = await safeFetchJson(`/comments/top?period=${period}&limit=${limit}`, {}, null) as { data?: { comments?: CommentItem[] }; comments?: CommentItem[]; total?: number } | null;
      const comments = result?.data?.comments || result?.comments || [];

      if (Array.isArray(comments) && comments.length > 0) {
        return {
          comments: comments.slice(0, limit),
          total: result?.total || comments.length,
          period
        };
      }
    } catch {
      // Quietly handled
    }
    return { comments: [], total: 0, period };
  },

  /** Realtime live-buzz comments stream across concurrent movies. */
  getLiveBuzzComments: async ({ limit = 12 }: { limit?: number } = {}): Promise<{ comments: CommentItem[] }> => {
    try {
      const result = await safeFetchJson(`/comments/live-buzz?limit=${limit}`, {}, null) as { data?: { comments?: CommentItem[] }; comments?: CommentItem[] } | null;
      const comments = result?.data?.comments || result?.comments || [];
      if (Array.isArray(comments) && comments.length > 0) {
        return { comments: comments.slice(0, limit) };
      }
    } catch {
      // Quietly handled
    }
    return { comments: [] };
  }
};

export default commentService;
