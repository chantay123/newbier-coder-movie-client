/**
 * @file year.types.ts
 * @description Domain types, DTOs, and Zod validation schemas for Admin Release Year entity.
 * Single source of truth for all form validation and API communications.
 */

import { z } from 'zod';
import { ADMIN_YEAR_CONSTANTS } from '@/constants/adminYearConstants';

const currentYear = new Date().getFullYear();
const maxAllowedYear = currentYear + ADMIN_YEAR_CONSTANTS.VALIDATION.MAX_YEAR_OFFSET;

/**
 * Zod validation schema for creating a new release year.
 * Single source of truth for both client-side and server-side validation.
 */
export const createYearSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, ADMIN_YEAR_CONSTANTS.MESSAGES.VALIDATION_NAME_REQUIRED)
    .regex(/^\d{4}$/, ADMIN_YEAR_CONSTANTS.MESSAGES.VALIDATION_NAME_INVALID)
    .refine(
      (val) => {
        const num = parseInt(val, 10);
        return num >= ADMIN_YEAR_CONSTANTS.VALIDATION.MIN_YEAR && num <= maxAllowedYear;
      },
      {
        message: `Năm phát hành phải nằm trong khoảng từ ${ADMIN_YEAR_CONSTANTS.VALIDATION.MIN_YEAR} đến ${maxAllowedYear}.`,
      }
    ),
  slug: z
    .string()
    .trim()
    .min(1, ADMIN_YEAR_CONSTANTS.MESSAGES.VALIDATION_SLUG_REQUIRED)
    .regex(ADMIN_YEAR_CONSTANTS.VALIDATION.SLUG_REGEX, ADMIN_YEAR_CONSTANTS.MESSAGES.VALIDATION_SLUG_INVALID),
  description: z
    .string()
    .trim()
    .max(
      ADMIN_YEAR_CONSTANTS.VALIDATION.MAX_DESCRIPTION_LENGTH,
      ADMIN_YEAR_CONSTANTS.MESSAGES.VALIDATION_DESC_MAX
    )
    .default(''),
  isActive: z.boolean().default(true),
});

/**
 * Infer TypeScript type directly from Zod schema (Single Source of Truth)
 */
export type CreateYearInput = z.infer<typeof createYearSchema>;

/**
 * Schema for updating an existing release year in edit form
 */
export const updateYearSchema = createYearSchema;
export type UpdateYearInput = z.infer<typeof updateYearSchema>;

/**
 * Schema for partial updates (e.g. quick status toggle)
 */
export const partialYearUpdateSchema = createYearSchema.partial();
export type PartialYearUpdateInput = z.infer<typeof partialYearUpdateSchema>;

/**
 * Domain entity representing a release year in the database.
 */
export interface YearEntity {
  id: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  movieCount: number;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Filter & query parameters for querying years in the admin panel.
 */
export interface YearFilterParams {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  page?: number;
  limit?: number;
}

/**
 * Paginated response structure for admin years view.
 */
export interface PaginatedYearResponse {
  items: YearEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Raw response format returned by backend API
 */
export interface RawYearApiResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
  items?: unknown[];
}
