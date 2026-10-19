/**
 * @file taxonomy.ts
 * @description Domain types, DTOs, and validation schemas for Admin Taxonomy entities.
 */
import { z } from 'zod';

/** Supported taxonomy entity types in the admin system. */
export type TaxonomyType = 'genres' | 'categories' | 'countries' | 'formats' | 'years';

/** Status filter options for taxonomy list queries. */
export type TaxonomyStatusFilter = 'all' | 'active' | 'inactive';

/**
 * Core taxonomy domain model.
 */
export interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  code?: string;
  flag?: string;
  movieCount: number;
  isActive: boolean;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Zod schema for validating taxonomy creation and update payloads.
 */
export const taxonomyItemInputSchema = z.object({
  name: z.string().trim().min(1, 'Tên không được để trống'),
  slug: z.string().trim().min(1, 'Mã định danh (slug) không được để trống'),
  description: z.string().optional().default(''),
  code: z.string().optional().default(''),
  flag: z.string().optional().default(''),
  isActive: z.boolean().default(true),
  order: z.number().int().optional(),
});

export type TaxonomyItemInput = z.infer<typeof taxonomyItemInputSchema>;

/**
 * Pagination & query parameters for taxonomy management.
 */
export interface TaxonomyQueryParams {
  search?: string;
  status?: TaxonomyStatusFilter;
  page?: number;
  pageSize?: number;
}

/**
 * Paginated response structure for taxonomy entities.
 */
export interface PaginatedTaxonomyResponse {
  items: TaxonomyItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
