import { AxiosInstance } from 'axios';
import axiosAdminInstance from '@/config/axiosAdminConfig';
import { ADMIN_API_CONFIG_MAP, AdminApiConfigMap } from '@/config/adminApiConfig';
import {
  CreateYearInput,
  UpdateYearInput,
  YearEntity,
  YearFilterParams,
  PaginatedYearResponse,
  DeleteYearResult,
  BulkDeleteResult,
  BulkDeleteResultItem,
  createYearSchema,
  updateYearSchema,
  toggleYearStatusSchema,
} from '@/features/admin/years/types/year.types';
import { parseApiError } from '@/utils/errors/appError';
import { INITIAL_YEARS } from '@/mock/admin/mockTaxonomies';
import { ADMIN_YEAR_CONSTANTS } from '@/constants/adminYearConstants';

export interface IYearAdminService {
  getAll(params?: YearFilterParams, signal?: AbortSignal): Promise<PaginatedYearResponse>;
  create(payload: CreateYearInput, signal?: AbortSignal): Promise<YearEntity>;
  update(id: string, payload: UpdateYearInput, signal?: AbortSignal): Promise<YearEntity>;
  delete(id: string, signal?: AbortSignal): Promise<DeleteYearResult>;
  deleteMultiple(ids: string[], signal?: AbortSignal): Promise<BulkDeleteResult>;
  toggleStatus(id: string, nextActive?: boolean, signal?: AbortSignal): Promise<YearEntity>;
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

  // Backend envelope candidate: { responseData: { data: [ ... ] } }
  if (obj.responseData && typeof obj.responseData === 'object') {
    const resData = obj.responseData as Record<string, unknown>;
    if (Array.isArray(resData.data)) {
      return resData.data.map((item) => normalizeYearEntity(item as Record<string, unknown>));
    }
    if (Array.isArray(resData.items)) {
      return resData.items.map((item) => normalizeYearEntity(item as Record<string, unknown>));
    }
    if (Array.isArray(resData.years)) {
      return resData.years.map((item) => normalizeYearEntity(item as Record<string, unknown>));
    }
  }

  // Direct candidate: { data: [ ... ] }
  if (Array.isArray(obj.data)) {
    return obj.data.map((item) => normalizeYearEntity(item as Record<string, unknown>));
  }

  // Direct candidate: { responseData: [ ... ] }
  if (Array.isArray(obj.responseData)) {
    return obj.responseData.map((item) => normalizeYearEntity(item as Record<string, unknown>));
  }

  // Direct candidate: { items: [ ... ] }
  if (Array.isArray(obj.items)) {
    return obj.items.map((item) => normalizeYearEntity(item as Record<string, unknown>));
  }

  // Deep candidate: search candidate keys
  const candidateKeys = ['responseData', 'data', 'items', 'years', 'results', 'list'];
  for (const key of candidateKeys) {
    const val = obj[key];
    if (Array.isArray(val)) {
      return val.map((item) => normalizeYearEntity(item as Record<string, unknown>));
    }
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

export function generateTraceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
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
   * Primary endpoint is GET /api/v1/years?page=1&limit=20
   */
  async getAll(params: YearFilterParams = {}, signal?: AbortSignal): Promise<PaginatedYearResponse> {
    const { search = '', status = 'all', page = 1, limit = 20 } = params;
    let list: YearEntity[] = [];
    let serverTotal: number | undefined;
    let serverTotalPages: number | undefined;

    const requestHeaders = {
      'Accept': 'application/json',
      'x-request-trace': generateTraceId(),
    };

    // Primary endpoint: GET /api/v1/years?page=1&limit=20
    try {
      const primaryUrl = this.config.years.list({
        page,
        limit,
        ...(search ? { search } : {}),
      });
      const response = await this.http.get(primaryUrl, { signal, headers: requestHeaders });
      list = extractYearList(response.data);

      const respData = response.data?.responseData;
      if (respData && typeof respData === 'object') {
        if (typeof respData.total === 'number') serverTotal = respData.total;
        if (typeof respData.totalPages === 'number') serverTotalPages = respData.totalPages;
      }
    } catch {
      // Fall back to in-memory cache if network issue
    }

    // Update in-memory fallback cache with fresh live data
    if (list.length > 0) {
      this.fallbackCache = list;
    } else {
      list = [...this.fallbackCache];
    }

    // Client-side filtering & pagination guarantee
    let filtered = list;
    if (status !== 'all') {
      filtered = filtered.filter((item) => (status === 'active' ? item.isActive : !item.isActive));
    }
    if (search) {
      const term = search.toLowerCase().trim();
      filtered = filtered.filter(
        (item) => item.name.toLowerCase().includes(term) || item.slug.toLowerCase().includes(term)
      );
    }

    const total =
      serverTotal !== undefined && !search && status === 'all' ? serverTotal : filtered.length;
    const totalPages =
      serverTotalPages !== undefined && !search && status === 'all'
        ? serverTotalPages
        : Math.max(1, Math.ceil(total / limit));
    const safePage = Math.max(1, Math.min(page, totalPages));

    const items =
      serverTotal !== undefined && !search && status === 'all'
        ? filtered
        : filtered.slice((safePage - 1) * limit, safePage * limit);

    return {
      items,
      total,
      page: safePage,
      limit,
      totalPages,
    };
  }

  /**
   * Creates a new release year. Validates data with Zod before calling API.
   * Matches POST /api/v1/admin/years specification with trace headers.
   * @param payload Validated input for new year
   * @param signal Optional AbortSignal
   * @returns Newly created YearEntity
   */
  async create(payload: CreateYearInput, signal?: AbortSignal): Promise<YearEntity> {
    const validated = createYearSchema.parse(payload);
    const endpoint = this.config.years.create();
    const requestTrace = generateTraceId();

    const requestBody = {
      name: validated.name,
      slug: validated.slug,
      description: validated.description || '',
      isActive: validated.isActive !== undefined ? Boolean(validated.isActive) : true,
    };

    try {
      const response = await this.http.post(
        endpoint,
        requestBody,
        {
          signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'x-request-trace': requestTrace,
          },
        }
      );

      // Check enterprise responseStatus (e.g. responseCode: "000000")
      if (
        response.data?.responseStatus &&
        response.data.responseStatus.responseCode &&
        response.data.responseStatus.responseCode !== '000000'
      ) {
        throw new Error(
          response.data.responseStatus.responseMessage ||
          ADMIN_YEAR_CONSTANTS.MESSAGES.CREATE_ERROR
        );
      }

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
   * Updates an existing release year with validation and enterprise error normalization.
   * Matches PUT /api/v1/admin/years/:id specification with trace header and response unwrapping.
   * @param id Entity ID (MongoDB ObjectId or unique key)
   * @param payload Update data
   * @param signal AbortSignal
   */
  async update(id: string, payload: UpdateYearInput, signal?: AbortSignal): Promise<YearEntity> {
    const validated = updateYearSchema.parse(payload);
    const endpoint = this.config.years.update(id);
    const requestTrace = generateTraceId();

    const requestBody = {
      name: validated.name,
      slug: validated.slug,
      description: validated.description || '',
      isActive: validated.isActive !== undefined ? Boolean(validated.isActive) : true,
    };

    try {
      let response;
      try {
        response = await this.http.put(endpoint, requestBody, {
          signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'x-request-trace': requestTrace,
          },
        });
      } catch (putErr) {
        // If backend accepts PATCH instead of PUT (HTTP 405 Method Not Allowed), fall back to PATCH
        const putError = parseApiError(putErr);
        if (putError.statusCode === 405) {
          response = await this.http.patch(endpoint, requestBody, {
            signal,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'x-request-trace': requestTrace,
            },
          });
        } else {
          throw putErr;
        }
      }

      // Check enterprise responseStatus (e.g. responseCode: "000000")
      if (
        response.data?.responseStatus &&
        response.data.responseStatus.responseCode &&
        response.data.responseStatus.responseCode !== '000000'
      ) {
        throw new Error(
          response.data.responseStatus.responseMessage ||
          ADMIN_YEAR_CONSTANTS.MESSAGES.UPDATE_ERROR
        );
      }

      const record = extractYearRecord(response.data);
      const updated = normalizeYearEntity(record, {
        name: validated.name,
        slug: validated.slug,
        description: validated.description,
        isActive: validated.isActive,
      });

      // Ensure id preserves the target id
      if (!updated.id || updated.id.startsWith('yr-')) {
        updated.id = id;
      }

      this.fallbackCache = this.fallbackCache.map((item) =>
        item.id === id || item.id === updated.id ? { ...item, ...updated } : item
      );
      return updated;
    } catch (error) {
      const parsedError = parseApiError(error, ADMIN_YEAR_CONSTANTS.MESSAGES.UPDATE_ERROR);

      // In local dev: if backend write route returns Route not found (404),
      // update in-memory fallback cache to unblock development and testing
      if (parsedError.statusCode === 404 && parsedError.message.includes('Route not found')) {
        const index = this.fallbackCache.findIndex((i) => i.id === id);
        if (index !== -1) {
          const updated: YearEntity = {
            ...this.fallbackCache[index],
            name: validated.name || this.fallbackCache[index].name,
            slug: validated.slug || this.fallbackCache[index].slug,
            description:
              validated.description !== undefined
                ? validated.description
                : this.fallbackCache[index].description,
            isActive:
              validated.isActive !== undefined
                ? validated.isActive
                : this.fallbackCache[index].isActive,
            updatedAt: new Date().toISOString(),
          };
          this.fallbackCache[index] = updated;
          return updated;
        }
      }

      throw parsedError;
    }
  }

  /**
   * Deletes a release year by ID.
   * Conforms to banking/enterprise specifications:
   * - Communicates via DELETE /api/v1/admin/years/:id
   * - When 404 (already deleted by someone else): treats as UI success, purges from cache, returns alreadyDeleted: true.
   * - When constraint error (400, 409, 422): propagates server reason, keeps item in cache.
   * - When 401/403: propagates unauthorized / forbidden AppError.
   * - When timeout (ECONNABORTED, 504): propagates AppError with code: 'TIMEOUT' for auto-refresh.
   *
   * @param id MongoDB ObjectId or entity identifier of the release year
   * @param signal Optional AbortSignal for network cancellation
   */
  async delete(id: string, signal?: AbortSignal): Promise<DeleteYearResult> {
    const target = this.fallbackCache.find((i) => i.id === id);
    const targetName = target?.name || id;
    const isMockItem = id.startsWith('yr-');

    if (isMockItem) {
      this.fallbackCache = this.fallbackCache.filter((item) => item.id !== id);
      return {
        id,
        name: targetName,
        success: true,
      };
    }

    const endpoint = this.config.years.delete(id);
    const requestTrace = generateTraceId();

    try {
      const response = await this.http.delete(endpoint, {
        signal,
        headers: {
          'Accept': 'application/json',
          'x-request-trace': requestTrace,
        },
      });

      // Check enterprise responseStatus (e.g. responseCode: "000000")
      if (
        response.data?.responseStatus &&
        response.data.responseStatus.responseCode &&
        response.data.responseStatus.responseCode !== '000000'
      ) {
        throw new Error(
          response.data.responseStatus.responseMessage ||
          ADMIN_YEAR_CONSTANTS.MESSAGES.DELETE_ERROR
        );
      }

      this.fallbackCache = this.fallbackCache.filter((item) => item.id !== id);
      return {
        id,
        name: targetName,
        success: true,
      };
    } catch (error) {
      const parsedError = parseApiError(error, ADMIN_YEAR_CONSTANTS.MESSAGES.DELETE_ERROR);

      // 1. Concurrent deletion: Item was already deleted by another admin (HTTP 404)
      if (parsedError.statusCode === 404 || parsedError.code === 'NOT_FOUND') {
        this.fallbackCache = this.fallbackCache.filter((item) => item.id !== id);
        return {
          id,
          name: targetName,
          success: true,
          alreadyDeleted: true,
          message: ADMIN_YEAR_CONSTANTS.MESSAGES.DELETE_ALREADY_REMOVED(targetName),
        };
      }

      // 2. Local dev mode fallback if backend write route returns 404 Route not found
      if (
        process.env.NODE_ENV === 'development' &&
        parsedError.statusCode === 404 &&
        parsedError.message.includes('Route not found')
      ) {
        this.fallbackCache = this.fallbackCache.filter((item) => item.id !== id);
        return {
          id,
          name: targetName,
          success: true,
        };
      }

      // 3. For all other errors (constraint violation, 401, 403, timeout, 500):
      // Retain item in cache and re-throw structured AppError so the UI/Store can take appropriate action.
      throw parsedError;
    }
  }

  /**
   * Deletes multiple release years in batch with granular result auditing.
   * Reports exactly how many succeeded, how many failed, and specific failure reasons for each item.
   *
   * @param ids Array of entity IDs to delete
   * @param signal Optional AbortSignal
   */
  async deleteMultiple(ids: string[], signal?: AbortSignal): Promise<BulkDeleteResult> {
    const results: BulkDeleteResultItem[] = [];

    // Execute deletions concurrently with allSettled to ensure failure of one item doesn't abort others
    const deletePromises = ids.map(async (id) => {
      const target = this.fallbackCache.find((i) => i.id === id);
      const name = target?.name || id;

      try {
        const res = await this.delete(id, signal);
        return {
          id,
          name,
          success: true,
          alreadyDeleted: res.alreadyDeleted,
        };
      } catch (err) {
        const parsed = parseApiError(err, ADMIN_YEAR_CONSTANTS.MESSAGES.DELETE_ERROR);
        return {
          id,
          name,
          success: false,
          errorReason: parsed.message,
        };
      }
    });

    const settled = await Promise.allSettled(deletePromises);

    settled.forEach((outcome, index) => {
      if (outcome.status === 'fulfilled') {
        results.push(outcome.value);
      } else {
        const id = ids[index];
        const target = this.fallbackCache.find((i) => i.id === id);
        results.push({
          id,
          name: target?.name || id,
          success: false,
          errorReason: outcome.reason?.message || ADMIN_YEAR_CONSTANTS.MESSAGES.DELETE_ERROR,
        });
      }
    });

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    return {
      total: ids.length,
      successCount,
      failureCount,
      results,
    };
  }

  /**
   * Toggles the active/inactive status of a release year via PATCH /api/v1/admin/years/:id/status.
   * Conforms strictly to backend specification:
   * PATCH https://core-movie-service.onrender.com/api/v1/admin/years/:id/status
   * Headers: Accept: application/json, Content-Type: application/json, Authorization: Bearer <token>
   * Body: { "isActive": boolean }
   *
   * Concurrency Handling:
   * When 2 admins toggle/modify the same item concurrently and the item is deleted or modified resulting in 404,
   * this method preserves and re-throws the AppError with statusCode: 404, enabling the UI to warn the user clearly.
   *
   * @param id Entity ID of the release year
   * @param nextActive Optional explicit target boolean status (defaults to inverting current state)
   * @param signal Optional AbortSignal for network cancellation
   * @returns Strongly-typed updated YearEntity
   */
  async toggleStatus(id: string, nextActive?: boolean, signal?: AbortSignal): Promise<YearEntity> {
    const target = this.fallbackCache.find((i) => i.id === id);
    const resolvedActive = nextActive !== undefined ? nextActive : target ? !target.isActive : true;

    // Validate request payload with Zod schema
    const validated = toggleYearStatusSchema.parse({ isActive: resolvedActive });
    const endpoint = this.config.years.toggleStatus(id);
    const requestTrace = generateTraceId();

    try {
      const response = await this.http.patch(
        endpoint,
        { isActive: validated.isActive },
        {
          signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'x-request-trace': requestTrace,
          },
        }
      );

      // Check enterprise responseStatus (e.g. responseCode: "000000")
      if (
        response.data?.responseStatus &&
        response.data.responseStatus.responseCode &&
        response.data.responseStatus.responseCode !== '000000'
      ) {
        throw new Error(
          response.data.responseStatus.responseMessage ||
          ADMIN_YEAR_CONSTANTS.MESSAGES.TOGGLE_STATUS_ERROR
        );
      }

      const record = extractYearRecord(response.data);
      const updated = normalizeYearEntity(record, {
        isActive: validated.isActive,
      });

      // Retain target id if backend returned an aliased identifier
      if (!updated.id || updated.id.startsWith('yr-')) {
        updated.id = id;
      }

      this.fallbackCache = this.fallbackCache.map((item) =>
        item.id === id || item.id === updated.id
          ? { ...item, ...updated, isActive: validated.isActive }
          : item
      );
      return updated;
    } catch (error) {
      const parsedError = parseApiError(error, ADMIN_YEAR_CONSTANTS.MESSAGES.TOGGLE_STATUS_ERROR);

      // CRITICAL: When HTTP 404 is encountered (e.g., concurrent modification or entity deleted by another admin),
      // we must NOT swallow the error. Purge ghost entry from local cache and bubble up the 404 error.
      if (parsedError.statusCode === 404 || parsedError.code === 'NOT_FOUND') {
        this.fallbackCache = this.fallbackCache.filter((item) => item.id !== id);
        throw parsedError;
      }

      // Check if this is a mock item (id starting with 'yr-') OR in dev mode when server is unavailable:
      const isMockItem = id.startsWith('yr-');
      const isDevOrServerOffline =
        process.env.NODE_ENV === 'development' ||
        parsedError.statusCode >= 500 ||
        parsedError.code === 'SERVER_ERROR' ||
        parsedError.code === 'ERR_NETWORK' ||
        parsedError.statusCode === 401;

      if (isMockItem || isDevOrServerOffline) {
        const index = this.fallbackCache.findIndex((i) => i.id === id);
        if (index !== -1) {
          const item = this.fallbackCache[index];
          const updated: YearEntity = {
            ...item,
            isActive: validated.isActive,
            updatedAt: new Date().toISOString(),
          };
          this.fallbackCache[index] = updated;
          return updated;
        }
      }

      throw parsedError;
    }
  }
}

export const yearAdminService = new YearAdminService();
