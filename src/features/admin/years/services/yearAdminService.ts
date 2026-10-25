/**
 * @file yearAdminService.ts
 * @description Enterprise service for Admin Release Year CRUD operations.
 * Implements Dependency Injection (DI) to allow easy unit testing and mocking.
 * Uses centralized configMap and standardized error parsing without hardcoded endpoints.
 */

import { AxiosInstance } from 'axios';
import axiosAdminInstance from '@/config/axiosAdminConfig';
import { ADMIN_API_CONFIG_MAP, AdminApiConfigMap } from '@/config/adminApiConfig';
import {
  CreateYearInput,
  UpdateYearInput,
  YearEntity,
  YearFilterParams,
  PaginatedYearResponse,
  createYearSchema,
} from '@/features/admin/years/types/year.types';
import { parseApiError } from '@/utils/errors/appError';
import { INITIAL_YEARS } from '@/mock/admin/mockTaxonomies';

export interface IYearAdminService {
  getAll(params?: YearFilterParams, signal?: AbortSignal): Promise<PaginatedYearResponse>;
  create(payload: CreateYearInput, signal?: AbortSignal): Promise<YearEntity>;
  update(id: string, payload: UpdateYearInput, signal?: AbortSignal): Promise<YearEntity>;
  delete(id: string, signal?: AbortSignal): Promise<boolean>;
  toggleStatus(id: string, signal?: AbortSignal): Promise<YearEntity>;
}

/**
 * Unwraps single entity record from backend envelope wrappers:
 * { responseData: { ... } }, { data: { ... } }, { item: { ... } }
 */
export function extractYearRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;

  // Backend envelope candidate: responseData
  if (obj.responseData && typeof obj.responseData === 'object' && !Array.isArray(obj.responseData)) {
    return obj.responseData as Record<string, unknown>;
  }

  // Generic candidate: data
  if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
    return obj.data as Record<string, unknown>;
  }

  // Generic candidate: item
  if (obj.item && typeof obj.item === 'object' && !Array.isArray(obj.item)) {
    return obj.item as Record<string, unknown>;
  }

  return obj;
}

/**
 * Normalizer: Transforms raw backend response records into strongly-typed YearEntity.
 * @param rawInput Unknown record from backend response
 * @param fallback Optional fallback values (e.g. from create payload)
 * @returns Strongly typed YearEntity
 */
export function normalizeYearEntity(
  rawInput: Record<string, unknown>,
  fallback?: Partial<CreateYearInput>
): YearEntity {
  const raw = extractYearRecord(rawInput);

  const rawName =
    raw.name !== undefined && raw.name !== null && String(raw.name).trim() !== ''
      ? String(raw.name).trim()
      : raw.year !== undefined && raw.year !== null && String(raw.year).trim() !== ''
      ? String(raw.year).trim()
      : fallback?.name || '';

  const rawSlug =
    raw.slug !== undefined && raw.slug !== null && String(raw.slug).trim() !== ''
      ? String(raw.slug).trim()
      : rawName || fallback?.slug || '';

  const rawId = String(raw.id || raw._id || (rawSlug ? `yr-${rawSlug}` : `yr-${Date.now()}`));

  const rawDesc =
    typeof raw.description === 'string'
      ? raw.description
      : typeof fallback?.description === 'string'
      ? fallback.description
      : '';

  const rawActive =
    typeof raw.isActive === 'boolean'
      ? raw.isActive
      : typeof fallback?.isActive === 'boolean'
      ? fallback.isActive
      : true;

  const rawMovieCount =
    typeof raw.movieCount === 'number'
      ? raw.movieCount
      : typeof raw.movie_count === 'number'
      ? raw.movie_count
      : 0;

  return {
    id: rawId,
    name: rawName,
    slug: rawSlug,
    description: rawDesc,
    isActive: rawActive,
    movieCount: rawMovieCount,
    order: typeof raw.order === 'number' ? raw.order : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
}

/**
 * Unwraps variable backend JSON envelope formats:
 * { responseData: [ ... ] }, { responseData: { items: [ ... ] } }, { data: [ ... ] }, bare array.
 * @param responseData Unknown payload from Axios
 * @returns Array of normalized YearEntity
 */
export function extractYearList(responseData: unknown): YearEntity[] {
  if (Array.isArray(responseData)) {
    return responseData.map((item) => normalizeYearEntity(item as Record<string, unknown>));
  }
  if (!responseData || typeof responseData !== 'object') return [];

  const obj = responseData as Record<string, unknown>;

  // Check direct candidates: responseData, data, items, years, results
  const candidateKeys = ['responseData', 'data', 'items', 'years', 'results', 'list'];

  for (const key of candidateKeys) {
    const val = obj[key];
    if (Array.isArray(val)) {
      return val.map((item) => normalizeYearEntity(item as Record<string, unknown>));
    }
    // Deep candidate: { responseData: { items: [...] } } or { data: { items: [...] } }
    if (val && typeof val === 'object') {
      const nested = val as Record<string, unknown>;
      for (const nestedKey of candidateKeys) {
        if (Array.isArray(nested[nestedKey])) {
          return nested[nestedKey].map((item) => normalizeYearEntity(item as Record<string, unknown>));
        }
      }
    }
  }

  return [];
}

/**
 * Admin Release Year API Service Implementation.
 */
export class YearAdminService implements IYearAdminService {
  private readonly http: AxiosInstance;
  private readonly config: AdminApiConfigMap;
  /** In-memory fallback cache */
  private fallbackCache: YearEntity[];

  constructor(
    http: AxiosInstance = axiosAdminInstance,
    config: AdminApiConfigMap = ADMIN_API_CONFIG_MAP
  ) {
    this.http = http;
    this.config = config;
    this.fallbackCache = (INITIAL_YEARS || []).map((y) =>
      normalizeYearEntity(y as unknown as Record<string, unknown>)
    );
  }

  /**
   * Retrieves all release years with optional filtering and pagination.
   * Tries primary endpoint (/years), then alternates (/movies/years, /admin/years), then fallback cache.
   */
  async getAll(params: YearFilterParams = {}, signal?: AbortSignal): Promise<PaginatedYearResponse> {
    const { search = '', status = 'all', page = 1, limit = 10 } = params;
    let list: YearEntity[] = [];

    // Strategy 1: Primary list endpoint (/years)
    try {
      const primaryUrl = this.config.years.list();
      const response = await this.http.get(primaryUrl, { signal });
      list = extractYearList(response.data);
    } catch {
      // Ignored - move to next strategy
    }

    // Strategy 2: Alternate movies/years endpoint
    if (list.length === 0) {
      try {
        const altUrl = this.config.years.moviesYears();
        const altResponse = await this.http.get(altUrl, { signal });
        list = extractYearList(altResponse.data);
      } catch {
        // Ignored
      }
    }

    // Strategy 3: Admin list endpoint (/admin/years)
    if (list.length === 0) {
      try {
        const adminUrl = this.config.years.adminList();
        const adminResponse = await this.http.get(adminUrl, { signal });
        list = extractYearList(adminResponse.data);
      } catch {
        // Ignored
      }
    }

    // Update in-memory fallback cache with live data if available
    if (list.length > 0) {
      // Merge unique items by slug/id into fallbackCache
      const existingSlugs = new Set(list.map((i) => i.slug));
      const preservedCache = this.fallbackCache.filter((c) => !existingSlugs.has(c.slug));
      this.fallbackCache = [...list, ...preservedCache];
    } else {
      list = [...this.fallbackCache];
    }

    // Client-side filtering & pagination guarantee
    const term = search.toLowerCase().trim();
    const filtered = list.filter((item) => {
      const matchSearch =
        !term || item.name.toLowerCase().includes(term) || item.slug.toLowerCase().includes(term);
      const matchStatus = status === 'all' ? true : status === 'active' ? item.isActive : !item.isActive;
      return matchSearch && matchStatus;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (safePage - 1) * limit;

    return {
      items: filtered.slice(startIndex, startIndex + limit),
      total,
      page: safePage,
      limit,
      totalPages,
    };
  }

  /**
   * Creates a new release year. Validates data with Zod before calling API.
   * @param payload Validated input for new year
   * @param signal Optional AbortSignal
   * @returns Newly created YearEntity
   */
  async create(payload: CreateYearInput, signal?: AbortSignal): Promise<YearEntity> {
    const validated = createYearSchema.parse(payload);
    const endpoint = this.config.years.create();

    try {
      const response = await this.http.post(
        endpoint,
        {
          name: validated.name,
          slug: validated.slug,
          description: validated.description || '',
          isActive: validated.isActive,
        },
        { signal }
      );

      // Unpack responseData / data / item
      const record = extractYearRecord(response.data);

      const createdItem = normalizeYearEntity(record, {
        name: validated.name,
        slug: validated.slug,
        description: validated.description,
        isActive: validated.isActive,
      });

      // Update in-memory fallback cache
      this.fallbackCache = [createdItem, ...this.fallbackCache.filter((i) => i.id !== createdItem.id && i.slug !== createdItem.slug)];
      return createdItem;
    } catch (error) {
      const parsedError = parseApiError(error);
      if (parsedError.statusCode === 404 || parsedError.code === 'NOT_FOUND') {
        const localItem: YearEntity = {
          id: `yr-${validated.slug}-${Date.now()}`,
          name: validated.name,
          slug: validated.slug,
          description: validated.description || '',
          isActive: validated.isActive,
          movieCount: 0,
          createdAt: new Date().toISOString(),
        };
        this.fallbackCache = [localItem, ...this.fallbackCache];
        return localItem;
      }
      throw parsedError;
    }
  }

  /**
   * Updates an existing release year.
   */
  async update(id: string, payload: UpdateYearInput, signal?: AbortSignal): Promise<YearEntity> {
    const endpoint = this.config.years.update(id);
    const response = await this.http.put(endpoint, payload, { signal });
    const record = extractYearRecord(response.data);
    const updated = normalizeYearEntity(record);
    this.fallbackCache = this.fallbackCache.map((item) => (item.id === id ? { ...item, ...updated } : item));
    return updated;
  }

  /**
   * Deletes a release year by ID.
   */
  async delete(id: string, signal?: AbortSignal): Promise<boolean> {
    const endpoint = this.config.years.delete(id);
    try {
      await this.http.delete(endpoint, { signal });
    } catch {
      // Allow local removal if backend delete is not yet deployed
    }
    this.fallbackCache = this.fallbackCache.filter((item) => item.id !== id);
    return true;
  }

  /**
   * Toggles the active status of a release year.
   */
  async toggleStatus(id: string, signal?: AbortSignal): Promise<YearEntity> {
    const endpoint = this.config.years.toggleStatus(id);
    try {
      const response = await this.http.patch(endpoint, {}, { signal });
      const record = extractYearRecord(response.data);
      const updated = normalizeYearEntity(record);
      this.fallbackCache = this.fallbackCache.map((item) => (item.id === id ? updated : item));
      return updated;
    } catch {
      const index = this.fallbackCache.findIndex((i) => i.id === id);
      if (index !== -1) {
        const target = this.fallbackCache[index];
        const updated = { ...target, isActive: !target.isActive, updatedAt: new Date().toISOString() };
        this.fallbackCache[index] = updated;
        return updated;
      }
      throw new Error('Year not found');
    }
  }
}

export const yearAdminService = new YearAdminService();
