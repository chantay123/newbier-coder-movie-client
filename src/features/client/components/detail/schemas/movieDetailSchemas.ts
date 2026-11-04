/**
 * @file movieDetailSchemas.ts
 * @description Zod validation schemas for movie detail user interactions
 * including comment submission, user ratings, and feedback reporting.
 */
import { z } from 'zod';
import { containsRestrictedWords } from '@/utils/profanityFilter';

/**
 * Zod validation schema for submitting a user comment on a movie.
 * Enforces length constraints, non-empty whitespace check, and profanity filtering.
 */
export const commentFormSchema = z.object({
  content: z
    .string()
    .trim()
    .min(2, { message: 'Nội dung bình luận phải có ít nhất 2 ký tự.' })
    .max(1000, { message: 'Nội dung bình luận không được vượt quá 1000 ký tự.' })
    .refine((text) => !containsRestrictedWords(text), {
      message: 'Bình luận chứa từ ngữ không phù hợp với tiêu chuẩn cộng đồng.'
    }),
  rating: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional(),
  parentId: z
    .string()
    .nullable()
    .optional()
});

export type CommentFormData = z.infer<typeof commentFormSchema>;

/**
 * Zod validation schema for user star rating submission.
 */
export const movieRatingSchema = z.object({
  rating: z
    .number()
    .int({ message: 'Điểm đánh giá phải là số nguyên.' })
    .min(1, { message: 'Điểm đánh giá tối thiểu là 1 sao.' })
    .max(10, { message: 'Điểm đánh giá tối đa là 10 sao.' }),
  movieSlug: z
    .string()
    .min(1, { message: 'Slug phim không hợp lệ.' })
});

export type MovieRatingData = z.infer<typeof movieRatingSchema>;
