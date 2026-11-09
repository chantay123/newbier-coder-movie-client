/**
 * @file taxonomyAdminService.ts
 * @description Admin taxonomy service — reads AND writes the LIVE backend API.
 *
 * @section Endpoint map (verified live against the Fastify backend)
 *
 * Categories (the genre taxonomy of the website):
 *   GET    /categories                  → list   (?page, ?limit, ?search, ?isActive)
 *   GET    /categories/:slug            → detail
 *   GET    /categories/:slug/movies     → movies of the category
 *   POST   /admin/categories            → create                    (201)
 *   PUT    /admin/categories/:id        → update                    (200)
 *   PATCH  /admin/categories/:id/status → toggle `isActive`         (200)
 *   DELETE /admin/categories/:id        → delete                    (200)
 *
 * Countries:
 *   GET    /countries                   → list
 *   GET    /countries/:slug             → detail
 *   GET    /countries/:slug/movies      → movies of the country
 *   POST   /admin/countries             → create                    (201)
 *   PUT    /admin/countries/:id         → update                    (200)
 *   PATCH  /admin/countries/:id/status  → toggle `isActive`         (200)
 *   DELETE /admin/countries/:id         → delete                    (200)
 *
 * Formats:
 *   GET    /formats                     → list
 *   POST   /admin/formats               → create                    (201)
 *   PUT    /admin/formats/:id           → update                    (200)
 *   DELETE /admin/formats/:id           → delete                    (200)
 *   NOTE: the backend has NO `isActive` on a format, so there is no
 *   `/admin/formats/:id/status` route. The status toggle is hidden for it.
 *
 * Years:
 *   GET    /years                       → list
 *   POST   /admin/years                 → create                    (201)
 *   PATCH  /admin/years/:id/status      → toggle `isActive`         (200)
 *   DELETE /admin/years/:id             → delete                    (200)
 *   NOTE: the backend has NO `PUT /admin/years/:id` route (the service
 *   method exists, the route does not), so the year cannot be renamed.
 *
 * IMPORTANT
 * The backend has NO `/genres` route at all: the genre taxonomy of the
 * website IS the category taxonomy. The client therefore maps `genres`
 * onto the category routes.
 *
 * THE LIST ROUTE IS FILTERED ON `isActive`
 * The public list route returns only the ACTIVE items when the `isActive`
 * query parameter is absent. The admin panel needs both, so the service
 * reads the active AND the inactive page and merges them.
 *
 * THE DATA FLOW
 * Page → `useTaxonomyManager` hook → this service → backend → the
 * `TaxonomyItem` shape the table renders.
 */
import axiosInstance from '@/API/config/axiosConfig';
import { apiPath, type ApiPathKey } from '@/config/apiPaths';
import {
  ADMIN_TAXONOMY_FALLBACK_DESCRIPTION,
  ADMIN_TAXONOMY_MAX_PAGES,
  ADMIN_TAXONOMY_MESSAGES,
  ADMIN_TAXONOMY_PAGE_SIZE
} from '@/config/taxonomyAdminConfig';
import { parseApiError } from '@/utils/errors/appError';
import { resolveCountryMeta } from '@/features/admin/services/countryFlagResolver';
import {
  TaxonomyItem,
  TaxonomyType,
  TaxonomyQueryParams,
  PaginatedTaxonomyResponse,
  TaxonomyItemInput,
  taxonomyItemInputSchema
} from '@/features/admin/types/taxonomy';

/**
 * The contract of the admin taxonomy service.
 *
 * Every method talks to the backend. The hook calls the service and never
 * the HTTP client directly.
 */
export interface ITaxonomyAdminService {
  /**
   * Reads every item of a taxonomy from the backend.
   *
   * @param type - The taxonomy to read, such as "categories" or "countries".
   * @returns Every item of the taxonomy, active and inactive.
   */
  getAll(type: TaxonomyType): Promise<TaxonomyItem[]>;

  /**
   * Reads a taxonomy and applies the search, the status filter and the
   * pagination on the client.
   *
   * @param type - The taxonomy to read.
   * @param params - The search term, the status filter and the page.
   * @returns The requested page of items and the pagination counters.
   */
  getPaginated(type: TaxonomyType, params?: TaxonomyQueryParams): Promise<PaginatedTaxonomyResponse>;

  /**
   * Creates an item on the backend.
   *
   * @param type - The taxonomy the item belongs to.
   * @param input - The name, the slug and the description of the item.
   * @returns The item created by the backend.
   * @throws When the backend rejects the payload, for example with a
   *         `409` because the slug is already taken.
   */
  create(type: TaxonomyType, input: TaxonomyItemInput): Promise<TaxonomyItem>;

  /**
   * Updates an item on the backend.
   *
   * @param type - The taxonomy the item belongs to.
   * @param id - The id of the item.
   * @param input - The fields to change.
   * @returns The item returned by the backend after the update.
   * @throws When the backend rejects the payload or has no update route.
   */
  update(type: TaxonomyType, id: string, input: Partial<TaxonomyItemInput>): Promise<TaxonomyItem>;

  /**
   * Deletes an item on the backend.
   *
   * @param type - The taxonomy the item belongs to.
   * @param id - The id of the item.
   * @returns `true` when the item was deleted.
   * @throws When the backend refuses the deletion, for example with a
   *         `409` because a movie still references the item.
   */
  delete(type: TaxonomyType, id: string): Promise<boolean>;

  /**
   * Toggles the `isActive` flag of an item on the backend.
   *
   * @param type - The taxonomy the item belongs to.
   * @param id - The id of the item.
   * @param nextActive - The wanted state. When it is absent, the current
   *                    state is read and inverted.
   * @returns The item returned by the backend after the change.
   * @throws When the taxonomy has no status route on the backend.
   */
  toggleStatus(type: TaxonomyType, id: string, nextActive?: boolean): Promise<TaxonomyItem>;
}

/**
 * The routes of one taxonomy type.
 *
 * `supportsStatus` tells whether the backend has an `isActive` field and a
 * `/status` route for that type — the format taxonomy has none.
 */
interface TaxonomyRoutes {
  list: ApiPathKey;
  create: ApiPathKey;
  update?: ApiPathKey;
  status?: ApiPathKey;
  remove: ApiPathKey;
  supportsStatus: boolean;
  supportsInactiveList: boolean;
}

/**
 * The route table of every taxonomy type.
 *
 * `genres` and `categories` share the same backend collection: the website
 * has no separate genre taxonomy.
 */
const ROUTES: Record<TaxonomyType, TaxonomyRoutes> = {
  genres: {
    list: 'taxonomyCategories',
    create: 'adminCategoriesList',
    update: 'adminCategoriesById',
    status: 'adminCategoriesStatus',
    remove: 'adminCategoriesById',
    supportsStatus: true,
    supportsInactiveList: true
  },
  categories: {
    list: 'taxonomyCategories',
    create: 'adminCategoriesList',
    update: 'adminCategoriesById',
    status: 'adminCategoriesStatus',
    remove: 'adminCategoriesById',
    supportsStatus: true,
    supportsInactiveList: true
  },
  countries: {
    list: 'taxonomyCountries',
    create: 'adminCountriesList',
    update: 'adminCountriesById',
    status: 'adminCountriesStatus',
    remove: 'adminCountriesById',
    supportsStatus: true,
    supportsInactiveList: true
  },
  formats: {
    list: 'taxonomyFormats',
    create: 'adminFormatsList',
    update: 'adminFormatsById',
    remove: 'adminFormatsById',
    supportsStatus: false,
    supportsInactiveList: false
  },
  years: {
    list: 'taxonomyYears',
    create: 'adminYearsList',
    status: 'adminYearsToggleStatus',
    remove: 'adminYearsById',
    supportsStatus: true,
    supportsInactiveList: true
  }
};

/**
 * Returns the routes of a taxonomy type.
 *
 * @param type - The taxonomy to look up.
 * @returns The routes of the taxonomy, or the category routes when the
 *          type is unknown.
 */
function routesOf(type: TaxonomyType): TaxonomyRoutes {
  return ROUTES[type] ?? ROUTES.categories;
}

/**
 * Whether the backend supports the active/inactive status of a taxonomy type.
 *
 * The format has no `isActive` field and no `/status` route, so its toggle
 * is hidden in the admin panel.
 *
 * @param type - The taxonomy to check.
 * @returns `true` when the backend can toggle the status of the taxonomy.
 */
export function taxonomySupportsStatus(type: TaxonomyType): boolean {
  return routesOf(type).supportsStatus;
}

/**
 * Whether the backend supports renaming/editing a taxonomy type.
 *
 * The year has a `PATCH /admin/years/:id/status` route but NO
 * `PUT /admin/years/:id` route, so a year cannot be renamed.
 *
 * @param type - The taxonomy to check.
 * @returns `true` when the backend can update the taxonomy.
 */
export function taxonomySupportsUpdate(type: TaxonomyType): boolean {
  return Boolean(routesOf(type).update);
}

/**
 * Converts a raw backend record into the shape the admin table renders.
 *
 * @param raw - The record as the backend sent it.
 * @returns The normalized taxonomy item.
 */
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
    // A format has no `isActive` field on the backend: it is always shown.
    isActive: typeof raw.isActive === 'boolean' ? raw.isActive : true,
    order: typeof raw.sortOrder === 'number' ? raw.sortOrder
         : typeof raw.order === 'number' ? raw.order
         : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined
  };
}

/**
 * Unwraps the response envelope the backend uses for taxonomy reads.
 *
 * The backend answers with `{ responseData: { data: [...], total, page, totalPages } }`
 * for a list, and `{ responseData: { ...record } }` for a single record.
 * The older shapes (`{ data: [...] }`, a bare array) are still accepted.
 *
 * @param raw - The payload of the response.
 * @returns The items of the list, or an empty array when there is none.
 */
function extractItems(raw: unknown): TaxonomyItem[] {
  if (Array.isArray(raw)) return raw.map((r) => normalizeItem(r as Record<string, unknown>));
  if (!raw || typeof raw !== 'object') return [];

  const obj = raw as Record<string, unknown>;

  // The envelope of the backend: `{ responseData: { data: [...] } }`.
  const envelope = obj.responseData;
  if (envelope && typeof envelope === 'object') {
    const inner = envelope as Record<string, unknown>;
    for (const key of ['data', 'items', 'results']) {
      if (Array.isArray(inner[key])) {
        return (inner[key] as unknown[]).map((r) => normalizeItem(r as Record<string, unknown>));
      }
    }
    if (Array.isArray(envelope)) {
      return envelope.map((r) => normalizeItem(r as Record<string, unknown>));
    }
  }

  // The flatter shapes.
  for (const key of ['data', 'items', 'results', 'formats', 'countries', 'years', 'genres', 'categories']) {
    const val = obj[key];
    if (Array.isArray(val)) {
      return val.map((r) => normalizeItem(r as Record<string, unknown>));
    }
    if (val && typeof val === 'object') {
      const nested = val as Record<string, unknown>;
      for (const nKey of ['items', 'data', 'results']) {
        if (Array.isArray(nested[nKey])) {
          return (nested[nKey] as unknown[]).map((r) => normalizeItem(r as Record<string, unknown>));
        }
      }
    }
  }
  return [];
}

/**
 * Unwraps the single record of a mutation response.
 *
 * `{ responseData: { id, name, ... } }` is the shape of the backend.
 *
 * @param raw - The payload of the response.
 * @returns The normalized record, or `null` when the payload has no record.
 */
function extractRecord(raw: unknown): TaxonomyItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const envelope = obj.responseData;
  if (envelope && typeof envelope === 'object' && !Array.isArray(envelope)) {
    return normalizeItem(envelope as Record<string, unknown>);
  }
  if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
    return normalizeItem(obj.data as Record<string, unknown>);
  }
  return null;
}

/**
 * Builds the description the backend accepts.
 *
 * The `description` of a category/country/format is REQUIRED by the
 * mongoose schema, and an empty string is rejected with
 * `400 description: Path 'description' is required`.
 *
 * @param description - The description the admin typed in.
 * @returns The description to send, never empty.
 */
function toBackendDescription(description: string | undefined): string {
  const value = (description ?? '').trim();
  return value.length > 0 ? value : ADMIN_TAXONOMY_FALLBACK_DESCRIPTION;
}

/**
 * Builds the payload of a create request.
 *
 * Only the fields the backend really knows are sent: `code` and `flag` are
 * frontend-only extras, and the backend ignores the unknown keys.
 *
 * @param input - The values of the form.
 * @returns The JSON body of the create request.
 */
function toCreatePayload(input: {
  name?: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: (input.name ?? '').trim(),
    slug: (input.slug ?? '').trim(),
    description: toBackendDescription(input.description)
  };
  if (input.isActive !== undefined) payload.isActive = Boolean(input.isActive);
  if (input.order !== undefined) payload.sortOrder = Number(input.order);
  return payload;
}

/**
 * The payload of an update request.
 *
 * Only the fields that are really provided are sent: an absent field keeps
 * its value on the backend, while an empty `name` or `slug` would wipe it.
 *
 * @param input - The values of the form.
 * @returns The JSON body of the update request.
 */
function toUpdatePayload(input: {
  name?: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined && input.name.trim()) payload.name = input.name.trim();
  if (input.slug !== undefined && input.slug.trim()) payload.slug = input.slug.trim();
  if (input.description !== undefined) payload.description = toBackendDescription(input.description);
  if (input.isActive !== undefined) payload.isActive = Boolean(input.isActive);
  if (input.order !== undefined) payload.sortOrder = Number(input.order);

  return payload;
}

/**
 * The frontend-only extras of a taxonomy item.
 *
 * The `code` (alpha-2) and the `flag` (emoji) of a country are NOT part of
 * the mongoose schema of the backend — it stores only `name`, `slug`,
 * `description`, `isActive` and `movieCount`. The form still collects them,
 * so they are kept here, keyed by the id of the item, and merged back into
 * the list that is shown in the admin panel.
 *
 * WHY THEY ARE ALSO PERSISTED
 * The in-memory map alone is lost on every reload, so the flags of the
 * countries disappeared as soon as the page was refreshed. The extras are
 * therefore ALSO written to the Web Storage, keyed by the id of the item,
 * and read back when the panel loads.
 */
const EXTRA_FIELDS = new Map<string, { code?: string; flag?: string }>();

/** The key of the persisted extras in the Web Storage. */
const EXTRA_FIELDS_STORAGE_KEY = 'cine_admin_taxonomy_extras_v1';

/**
 * Reads the persisted extras from the Web Storage.
 *
 * The storage is not available on the server, and a corrupted value is
 * simply ignored — the flags are then resolved from RestCountries.
 *
 * @returns The persisted extras, keyed by the id of the item.
 */
function readPersistedExtras(): Map<string, { code?: string; flag?: string }> {
  const stored = new Map<string, { code?: string; flag?: string }>();
  if (typeof window === 'undefined') return stored;

  try {
    const raw = window.localStorage.getItem(EXTRA_FIELDS_STORAGE_KEY);
    if (!raw) return stored;

    const parsed = JSON.parse(raw) as Record<string, { code?: string; flag?: string }>;
    for (const [id, value] of Object.entries(parsed ?? {})) {
      if (!id || !value || typeof value !== 'object') continue;
      stored.set(id, {
        code: typeof value.code === 'string' ? value.code : '',
        flag: typeof value.flag === 'string' ? value.flag : ''
      });
    }
  } catch {
    // A corrupted entry must never break the admin panel.
  }

  return stored;
}

/**
 * Writes the remembered extras to the Web Storage.
 *
 * A failure (a full storage, a private mode) is ignored: the flags are
 * then only known during the current session.
 */
function persistExtras(extras: Map<string, { code?: string; flag?: string }>): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      EXTRA_FIELDS_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(extras.entries()))
    );
  } catch {
    // The storage is not available — the in-memory map still works.
  }
}

/**
 * Remembers the frontend-only fields of an item.
 *
 * @param id - The id of the item on the backend.
 * @param code - The alpha-2 code the admin typed in.
 * @param flag - The flag emoji the admin typed in.
 */
function rememberExtras(id: string, code?: string, flag?: string): void {
  if (!id) return;
  const trimmedCode = (code ?? '').trim();
  const trimmedFlag = (flag ?? '').trim();
  if (!trimmedCode && !trimmedFlag) return;
  const previous = EXTRA_FIELDS.get(id) ?? {};
  EXTRA_FIELDS.set(id, {
    code: trimmedCode || previous.code || '',
    flag: trimmedFlag || previous.flag || ''
  });
  persistExtras(EXTRA_FIELDS);
}

/**
 * Merges the remembered frontend-only fields into an item.
 *
 * The extras of the item win over the persisted ones, and the persisted
 * ones win over the empty strings the backend sends.
 *
 * @param item - The item as the backend sent it.
 * @returns The item with its code and flag, when they are known.
 */
function applyExtras(item: TaxonomyItem): TaxonomyItem {
  const extras = EXTRA_FIELDS.get(item.id) ?? PERSISTED_EXTRAS.get(item.id);
  if (!extras) return item;
  return {
    ...item,
    code: item.code || extras.code || '',
    flag: item.flag || extras.flag || ''
  };
}

/**
 * The extras that were read from the Web Storage.
 *
 * They are read once, when the module loads in the browser, so the flags
 * are known even after a reload of the page.
 */
const PERSISTED_EXTRAS: Map<string, { code?: string; flag?: string }> =
  typeof window === 'undefined'
    ? new Map<string, { code?: string; flag?: string }>()
    : readPersistedExtras();

/**
 * Reads and writes the admin taxonomies of the backend.
 *
 * The class is the only place that knows the endpoints of the taxonomy
 * routes. The hook and the pages work with the `TaxonomyItem` shape.
 */
export class TaxonomyAdminService implements ITaxonomyAdminService {
  /**
   * Reads every taxonomy item from the live API.
   *
   * The list route of the backend is paginated AND filtered on `isActive`,
   * so the pages are walked until every item is collected.
   *
   * @param type - The taxonomy to read.
   * @returns Every item of the taxonomy, active and inactive.
   */
  async getAll(type: TaxonomyType): Promise<TaxonomyItem[]> {
    const routes = routesOf(type);
    const collected: TaxonomyItem[] = [];
    const seen = new Set<string>();

    const push = (items: TaxonomyItem[]) => {
      for (const item of items) {
        if (!item.id || seen.has(item.id)) continue;
        seen.add(item.id);
        collected.push(applyExtras(item));
      }
    };

    // The active items, and — when the taxonomy has an `isActive` field —
    // the inactive ones as well. The public list route hides them.
    const passes: (boolean | undefined)[] = routes.supportsInactiveList
      ? [true, false]
      : [undefined];

    for (const isActive of passes) {
      let page = 1;
      let totalPages = 1;

      do {
        const response = await axiosInstance.get(apiPath(routes.list), {
          params: {
            page,
            limit: ADMIN_TAXONOMY_PAGE_SIZE,
            ...(isActive === undefined ? {} : { isActive })
          }
        });

        const items = extractItems(response.data);
        push(items);

        const envelope = (response.data as { responseData?: { totalPages?: number } })?.responseData;
        totalPages = Number(envelope?.totalPages ?? 1) || 1;
        page += 1;
      } while (page <= totalPages && page <= ADMIN_TAXONOMY_MAX_PAGES);
    }

    // The backend does not store the alpha-2 code and the flag emoji of a
    // country, so the flags are resolved from the RestCountries list. This
    // is what brings the flag images of the admin table back.
    if (type === 'countries') {
      await this.resolveCountryFlags(collected);
    }

    return collected;
  }

  /**
   * Fills the missing `code` and `flag` of the countries.
   *
   * Only the countries that still have no code and no flag are looked up,
   * so the values the admin typed in are never overwritten.
   *
   * @param items - The countries of the panel, modified in place.
   */
  private async resolveCountryFlags(items: TaxonomyItem[]): Promise<void> {
    const missing = items.filter((item) => !item.code && !item.flag);
    if (missing.length === 0) return;

    await Promise.all(
      missing.map(async (item) => {
        const meta = await resolveCountryMeta(item.name, item.slug);
        if (!meta) return;

        item.code = meta.code;
        item.flag = meta.flag;
        rememberExtras(item.id, meta.code, meta.flag);
      })
    );
  }

  /**
   * Paginated + filtered query. The whole list is read once and then
   * filtered and sliced on the client, so the search box stays instant.
   *
   * @param type - The taxonomy to read.
   * @param params - The search term, the status filter and the page.
   * @returns The requested page of items and the pagination counters.
   */
  async getPaginated(
    type: TaxonomyType,
    params: TaxonomyQueryParams = {}
  ): Promise<PaginatedTaxonomyResponse> {
    const { search = '', status = 'all', page = 1, pageSize = 10 } = params;
    const term = search.toLowerCase().trim();

    const all = await this.getAll(type);

    const list = all.filter((item) => {
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

  /**
   * Creates a taxonomy item on the backend.
   *
   * The backend answers 201 with the created record, and 409 when the slug
   * is already taken.
   *
   * @param type - The taxonomy the item belongs to.
   * @param rawInput - The values of the form.
   * @returns The item created by the backend.
   * @throws When the payload is invalid, or when the slug is already taken.
   */
  async create(type: TaxonomyType, rawInput: TaxonomyItemInput): Promise<TaxonomyItem> {
    const validated = taxonomyItemInputSchema.parse(rawInput);
    const routes = routesOf(type);

    try {
      const response = await axiosInstance.post(
        apiPath(routes.create),
        toCreatePayload({
          name: validated.name,
          slug: validated.slug,
          description: validated.description,
          isActive: routes.supportsStatus ? validated.isActive : undefined,
          order: validated.order
        })
      );

      const record = extractRecord(response.data);
      if (!record) throw new Error(ADMIN_TAXONOMY_MESSAGES.invalidResponse);
      rememberExtras(record.id, validated.code, validated.flag);
      return applyExtras(record);
    } catch (error) {
      throw parseApiError(error, ADMIN_TAXONOMY_MESSAGES.createFailed);
    }
  }

  /**
   * Updates a taxonomy item on the backend.
   *
   * The backend answers 200 with the updated record, and 409 when the new
   * slug is already taken by another item.
   *
   * @param type - The taxonomy the item belongs to.
   * @param id - The id of the item.
   * @param rawInput - The fields to change.
   * @returns The item returned by the backend after the update.
   * @throws When the taxonomy has no update route, or when the backend
   *         rejects the payload.
   */
  async update(
    type: TaxonomyType,
    id: string,
    rawInput: Partial<TaxonomyItemInput>
  ): Promise<TaxonomyItem> {
    const routes = routesOf(type);
    if (!routes.update) {
      throw new Error(ADMIN_TAXONOMY_MESSAGES.updateNotSupported);
    }

    try {
      const response = await axiosInstance.put(
        apiPath(routes.update, id),
        toUpdatePayload({
          name: rawInput.name,
          slug: rawInput.slug,
          description: rawInput.description,
          isActive: routes.supportsStatus ? rawInput.isActive : undefined,
          order: rawInput.order
        })
      );

      const record = extractRecord(response.data);
      if (!record) throw new Error(ADMIN_TAXONOMY_MESSAGES.invalidResponse);
      rememberExtras(record.id, rawInput.code, rawInput.flag);
      return applyExtras(record);
    } catch (error) {
      throw parseApiError(error, ADMIN_TAXONOMY_MESSAGES.updateFailed);
    }
  }

  /**
   * Deletes a taxonomy item on the backend.
   *
   * The backend answers 409 when a movie still references the item — even
   * a HIDDEN movie keeps the reference — so the reason is passed to the UI.
   */
  async delete(type: TaxonomyType, id: string): Promise<boolean> {
    const routes = routesOf(type);

    try {
      // The body of a DELETE has to be sent, otherwise the backend answers
      // `500 Body cannot be empty when content-type is set to application/json`.
      await axiosInstance.delete(apiPath(routes.remove, id), { data: {} });
      return true;
    } catch (error) {
      throw parseApiError(error, ADMIN_TAXONOMY_MESSAGES.deleteFailed);
    }
  }

  /**
   * Toggles the `isActive` flag of a taxonomy item.
   *
   * The backend has a dedicated `PATCH /admin/:type/:id/status` route for
   * it. A taxonomy without an `isActive` field (the format) has no such
   * route, so the call is rejected with a clear message.
   *
   * @param type - The taxonomy the item belongs to.
   * @param id - The id of the item.
   * @param nextActive - The wanted state. When it is absent, the current
   *                    state is read from the API and inverted.
   * @returns The item returned by the backend after the change.
   * @throws When the taxonomy has no status route on the backend.
   */
  async toggleStatus(
    type: TaxonomyType,
    id: string,
    nextActive?: boolean
  ): Promise<TaxonomyItem> {
    const routes = routesOf(type);
    if (!routes.status) {
      throw new Error(ADMIN_TAXONOMY_MESSAGES.statusNotSupported);
    }

    let resolved = nextActive;
    if (resolved === undefined) {
      // The current value is needed, because the route only takes the new one.
      try {
        const items = await this.getAll(type);
        const current = items.find((item) => item.id === id);
        resolved = !(current?.isActive ?? true);
      } catch {
        resolved = true;
      }
    }

    try {
      const response = await axiosInstance.patch(
        apiPath(routes.status, id),
        { isActive: resolved }
      );

      const record = extractRecord(response.data);
      if (!record) throw new Error(ADMIN_TAXONOMY_MESSAGES.invalidResponse);
      return { ...record, isActive: resolved };
    } catch (error) {
      throw parseApiError(error, ADMIN_TAXONOMY_MESSAGES.toggleStatusFailed);
    }
  }
}

/** Singleton instance shared by the admin taxonomy pages. */
export const taxonomyAdminService = new TaxonomyAdminService();
