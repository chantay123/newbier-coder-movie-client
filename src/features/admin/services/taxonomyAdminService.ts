/**
 * @file taxonomyAdminService.ts
 * @description Admin taxonomy service — reads live from the backend API, mutates
 * in-memory until the backend exposes admin write routes.
 *
 * @section Endpoint map (verified 2026-10-20)
 * GET routes exist and return 401 (need Bearer token):
 *   GET /api/v1/formats           → list all formats
 *   GET /api/v1/formats/:slug/movies → movies by format slug
 *   GET /api/v1/countries         → list all countries
 *   GET /api/v1/countries/:code   → country detail
 *   GET /api/v1/countries/:code/movies → movies by country code
 *   GET /api/v1/years             → list all years
 *   GET /api/v1/movies/countries  → countries (alternate)
 *   GET /api/v1/movies/genres     → genres (alternate)
 *   GET /api/v1/movies/years      → years (alternate)
 *   GET /api/v1/movies/formats    → formats (alternate)
 *   GET /api/v1/movies/categories → categories (alternate)
 *
 * POST/PUT/DELETE routes do NOT exist — 404 across all taxonomy types.
 * Mutations stay in-memory until backend deploys admin write routes.
 */
import axiosInstance from '@/API/config/axiosConfig';
import { apiPath, type ApiPathKey } from '@/config/apiPaths';
import {
  INITIAL_CATEGORIES,
  INITIAL_COUNTRIES,
  INITIAL_FORMATS,
  INITIAL_YEARS
} from '@/mock/admin/mockTaxonomies';
import {
  TaxonomyItem,
  TaxonomyType,
  TaxonomyQueryParams,
  PaginatedTaxonomyResponse,
  TaxonomyItemInput,
  taxonomyItemInputSchema
} from '@/features/admin/types/taxonomy';

export interface ITaxonomyAdminService {
  getAll(type: TaxonomyType): Promise<TaxonomyItem[]>;
  getPaginated(type: TaxonomyType, params?: TaxonomyQueryParams): Promise<PaginatedTaxonomyResponse>;
  create(type: TaxonomyType, input: TaxonomyItemInput): Promise<TaxonomyItem>;
  update(type: TaxonomyType, id: string, input: Partial<TaxonomyItemInput>): Promise<TaxonomyItem>;
  delete(type: TaxonomyType, id: string): Promise<boolean>;
  toggleStatus(type: TaxonomyType, id: string): Promise<TaxonomyItem>;
}

/** Snake → camel normaliser for raw backend taxonomy items. */
function normalizeItem(raw: Record<string, unknown>): TaxonomyItem {
  return {
    id: String(raw.id || raw._id || ''),
    name: String(raw.name || raw.slug || ''),
    slug: String(raw.slug || ''),
    description: typeof raw.description === 'string' ? raw.description : '',
    code: typeof raw.code === 'string' ? raw.code : '',
    flag: typeof raw.flag === 'string' ? raw.flag : '',
    movieCount: typeof raw.movieCount === 'number' ? raw.movieCount
             : typeof raw.movie_count === 'number' ? raw.movie_count
             : 0,
    isActive: typeof raw.isActive === 'boolean' ? raw.isActive : true,
    order: typeof raw.order === 'number' ? raw.order : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined
  };
}

/**
 * Unwrap the response envelope the backend uses for taxonomy reads.
 * Handles: { data: [...] }, { data: { items: [...] } }, bare array, { items: [...] }
 */
function extractItems(raw: unknown): TaxonomyItem[] {
  if (Array.isArray(raw)) return raw.map((r) => normalizeItem(r as Record<string, unknown>));
  if (!raw || typeof raw !== 'object') return [];

  const obj = raw as Record<string, unknown>;
  // Top-level candidates
  for (const key of ['data', 'items', 'results', 'formats', 'countries', 'years', 'genres', 'categories']) {
    const val = obj[key];
    if (Array.isArray(val)) return val.map((r) => normalizeItem(r as Record<string, unknown>));
    // One level deeper: { data: { items: [...] } }
    if (val && typeof val === 'object') {
      const nested = val as Record<string, unknown>;
      for (const nKey of ['items', 'data', 'results']) {
        if (Array.isArray(nested[nKey])) {
          return nested[nKey].map((r) => normalizeItem(r as Record<string, unknown>));
        }
      }
    }
  }
  return [];
}

/**
 * Maps a TaxonomyType to the KEY of its endpoint.
 *
 * The key is semantic and identifies the endpoint in `AP`.
 */
function typeToRouteKey(type: TaxonomyType): ApiPathKey {
  switch (type) {
    case 'formats':   return 'taxonomyFormats';
    case 'countries': return 'taxonomyCountries';
    case 'years':     return 'taxonomyYears';
    case 'genres':
    case 'categories': return 'taxonomyGenres';   // categories maps to genres on backend
    default:          return 'taxonomyGenres';
  }
}

export class TaxonomyAdminService implements ITaxonomyAdminService {
  private stores: Record<TaxonomyType, TaxonomyItem[]>;

  constructor(customStores?: Partial<Record<TaxonomyType, TaxonomyItem[]>>) {
    const defaultItems = (INITIAL_CATEGORIES || []).map((item: Record<string, unknown>) =>
      normalizeItem(item as Record<string, unknown>)
    );
    this.stores = {
      genres:     defaultItems,
      categories: defaultItems,
      countries:  (INITIAL_COUNTRIES || []).map((item: Record<string, unknown>) =>
        normalizeItem(item as Record<string, unknown>)
      ),
      formats:    (INITIAL_FORMATS || []).map((item: Record<string, unknown>) =>
        normalizeItem(item as Record<string, unknown>)
      ),
      years:      (INITIAL_YEARS || []).map((item: Record<string, unknown>) =>
        normalizeItem(item as Record<string, unknown>)
      ),
      ...customStores
    };
  }

  /**
   * Reads all taxonomy items. Tries the live API first; falls back to the
   * in-memory store so the UI never renders an empty list.
   */
  async getAll(type: TaxonomyType): Promise<TaxonomyItem[]> {
    try {
      const path = apiPath(typeToRouteKey(type));
      const response = await axiosInstance.get(path);
      const items = extractItems(response.data);
      if (items.length > 0) {
        this.stores[type] = items; // keep store in sync
        return items;
      }
    } catch {
      // Fall through to in-memory
    }
    return [...this.stores[type]];
  }

  /**
   * Paginated + filtered query. Reads live when available, falls back to store.
   */
  async getPaginated(
    type: TaxonomyType,
    params: TaxonomyQueryParams = {}
  ): Promise<PaginatedTaxonomyResponse> {
    const { search = '', status = 'all', page = 1, pageSize = 10 } = params;
    const term = search.toLowerCase().trim();

    // Fetch all from API (store handles pagination client-side)
    const all = await this.getAll(type);

    let list = all.filter((item) => {
      const matchSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.slug.toLowerCase().includes(term) ||
        (item.code && item.code.toLowerCase().includes(term));

      const matchStatus =
        status === 'all' ? true
        : status === 'active' ? item.isActive
        : !item.isActive;

      return Boolean(matchSearch && matchStatus);
    });

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (safePage - 1) * pageSize;

    return {
      items: list.slice(startIndex, startIndex + pageSize),
      total,
      page: safePage,
      pageSize,
      totalPages
    };
  }

  // ---- Mutations: in-memory only (admin write routes not yet deployed) ----

  async create(type: TaxonomyType, rawInput: TaxonomyItemInput): Promise<TaxonomyItem> {
    const validated = taxonomyItemInputSchema.parse(rawInput);
    const prefix = typeToRouteKey(type).slice(0, 3);
    const newItem: TaxonomyItem = {
      id: `${prefix}-${Date.now()}`,
      name: validated.name,
      slug: validated.slug,
      description: validated.description,
      code: validated.code,
      flag: validated.flag,
      movieCount: 0,
      isActive: validated.isActive,
      order: validated.order,
      createdAt: new Date().toISOString()
    };
    this.stores[type] = [newItem, ...this.stores[type]];
    return newItem;
  }

  async update(
    type: TaxonomyType,
    id: string,
    rawInput: Partial<TaxonomyItemInput>
  ): Promise<TaxonomyItem> {
    const idx = this.stores[type].findIndex((i) => i.id === id);
    if (idx === -1) throw new Error(`Taxonomy item "${id}" not found.`);
    const updated: TaxonomyItem = {
      ...this.stores[type][idx],
      ...rawInput,
      updatedAt: new Date().toISOString()
    };
    this.stores[type][idx] = updated;
    return updated;
  }

  async delete(type: TaxonomyType, id: string): Promise<boolean> {
    const before = this.stores[type].length;
    this.stores[type] = this.stores[type].filter((i) => i.id !== id);
    return this.stores[type].length < before;
  }

  async toggleStatus(type: TaxonomyType, id: string): Promise<TaxonomyItem> {
    const idx = this.stores[type].findIndex((i) => i.id === id);
    if (idx === -1) throw new Error(`Taxonomy item "${id}" not found.`);
    const updated: TaxonomyItem = {
      ...this.stores[type][idx],
      isActive: !this.stores[type][idx].isActive,
      updatedAt: new Date().toISOString()
    };
    this.stores[type][idx] = updated;
    return updated;
  }
}

/** Singleton instance */
export const taxonomyAdminService = new TaxonomyAdminService();