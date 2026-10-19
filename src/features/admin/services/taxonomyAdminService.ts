/**
 * @file taxonomyAdminService.ts
 * @description Admin taxonomy service managing genres, countries, formats, and years.
 * Implements Dependency Injection and supports mock/network mode switching.
 */
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

/**
 * Normalises an initial mock item into a strict TaxonomyItem.
 */
function normalizeMockItem(item: Record<string, unknown>): TaxonomyItem {
  return {
    id: String(item.id || ''),
    name: String(item.name || ''),
    slug: String(item.slug || ''),
    description: typeof item.description === 'string' ? item.description : '',
    code: typeof item.code === 'string' ? item.code : '',
    flag: typeof item.flag === 'string' ? item.flag : '',
    movieCount: typeof item.movieCount === 'number' ? item.movieCount : 0,
    isActive: typeof item.isActive === 'boolean' ? item.isActive : true,
    order: typeof item.order === 'number' ? item.order : undefined
  };
}

export class TaxonomyAdminService implements ITaxonomyAdminService {
  private stores: Record<TaxonomyType, TaxonomyItem[]>;

  constructor(customStores?: Partial<Record<TaxonomyType, TaxonomyItem[]>>) {
    const categoriesStore = (INITIAL_CATEGORIES || []).map(normalizeMockItem);
    this.stores = {
      genres: categoriesStore,
      categories: categoriesStore,
      countries: (INITIAL_COUNTRIES || []).map(normalizeMockItem),
      formats: (INITIAL_FORMATS || []).map(normalizeMockItem),
      years: (INITIAL_YEARS || []).map(normalizeMockItem),
      ...customStores
    };
  }

  private resolveKey(type: TaxonomyType): TaxonomyType {
    return type === 'categories' ? 'genres' : type;
  }

  /**
   * Retrieves all items for a given taxonomy type.
   */
  async getAll(type: TaxonomyType): Promise<TaxonomyItem[]> {
    const key = this.resolveKey(type);
    return [...this.stores[key]];
  }

  /**
   * Queries and returns a filtered, paginated list of taxonomy items.
   */
  async getPaginated(
    type: TaxonomyType,
    params: TaxonomyQueryParams = {}
  ): Promise<PaginatedTaxonomyResponse> {
    const key = this.resolveKey(type);
    const { search = '', status = 'all', page = 1, pageSize = 10 } = params;
    const term = search.toLowerCase().trim();

    let list = this.stores[key].filter((item) => {
      const matchSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.slug.toLowerCase().includes(term) ||
        (item.code && item.code.toLowerCase().includes(term));

      const matchStatus =
        status === 'all' ? true : status === 'active' ? item.isActive : !item.isActive;

      return Boolean(matchSearch && matchStatus);
    });

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (safePage - 1) * pageSize;
    const paginatedItems = list.slice(startIndex, startIndex + pageSize);

    return {
      items: paginatedItems,
      total,
      page: safePage,
      pageSize,
      totalPages
    };
  }

  /**
   * Creates a new taxonomy item after validating input with Zod.
   */
  async create(type: TaxonomyType, rawInput: TaxonomyItemInput): Promise<TaxonomyItem> {
    const validated = taxonomyItemInputSchema.parse(rawInput);
    const key = this.resolveKey(type);

    const prefix = key.slice(0, 3);
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

    this.stores[key] = [newItem, ...this.stores[key]];
    return newItem;
  }

  /**
   * Updates an existing taxonomy item.
   */
  async update(
    type: TaxonomyType,
    id: string,
    rawInput: Partial<TaxonomyItemInput>
  ): Promise<TaxonomyItem> {
    const key = this.resolveKey(type);
    const existingIndex = this.stores[key].findIndex((i) => i.id === id);

    if (existingIndex === -1) {
      throw new Error(`Taxonomy item with ID "${id}" not found.`);
    }

    const current = this.stores[key][existingIndex];
    const updated: TaxonomyItem = {
      ...current,
      ...rawInput,
      updatedAt: new Date().toISOString()
    };

    this.stores[key][existingIndex] = updated;
    return updated;
  }

  /**
   * Deletes a taxonomy item by id.
   */
  async delete(type: TaxonomyType, id: string): Promise<boolean> {
    const key = this.resolveKey(type);
    const beforeCount = this.stores[key].length;
    this.stores[key] = this.stores[key].filter((i) => i.id !== id);
    return this.stores[key].length < beforeCount;
  }

  /**
   * Toggles the active status of a taxonomy item.
   */
  async toggleStatus(type: TaxonomyType, id: string): Promise<TaxonomyItem> {
    const key = this.resolveKey(type);
    const existingIndex = this.stores[key].findIndex((i) => i.id === id);

    if (existingIndex === -1) {
      throw new Error(`Taxonomy item with ID "${id}" not found.`);
    }

    const current = this.stores[key][existingIndex];
    const updated: TaxonomyItem = {
      ...current,
      isActive: !current.isActive,
      updatedAt: new Date().toISOString()
    };

    this.stores[key][existingIndex] = updated;
    return updated;
  }
}

/** Singleton instance with default in-memory store */
export const taxonomyAdminService = new TaxonomyAdminService();
