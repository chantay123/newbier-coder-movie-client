/**
 * @file countryFlagResolver.ts
 * @description Resolves the alpha-2 code and the flag emoji of a country.
 *
 * WHY THIS FILE EXISTS
 * The `code` (alpha-2) and the `flag` (emoji) of a country are NOT part of
 * the mongoose schema of the backend: it only stores `name`, `slug`,
 * `description`, `isActive` and `movieCount`. So the backend never sends
 * them back, and the flag image of the admin table disappeared as soon as
 * the panel was switched to the live API.
 *
 * HOW THE FLAGS COME BACK
 * 1. The record itself wins — when the backend DOES send `code`/`flag`.
 * 2. The manually saved extras win — the admin edits are persisted in the
 *    Web Storage, so they survive a reload.
 * 3. The RestCountries list is the fallback — the list holds the alpha-2
 *    code AND the flag emoji of every country, and the country is matched
 *    by its slug or by its name.
 *
 * The resolver never throws: a country that cannot be matched simply keeps
 * its empty code, and the UI falls back to the short text badge.
 */

import { getCountryList } from '@/services/countryService';
import {
  buildCountryIndex,
  findCountryMeta,
  type CountryIndexEntry,
  type CountryMeta
} from '@/features/admin/services/countryFlagIndex';

export type { CountryMeta };

/** The index of the RestCountries list, built once per session. */
let indexPromise: Promise<CountryIndexEntry[]> | null = null;

/**
 * Builds the lookup index of the RestCountries list.
 *
 * The list is fetched through the server proxy, so the token of the
 * RestCountries API never reaches the browser.
 *
 * @returns The indexed countries.
 */
const buildIndex = async (): Promise<CountryIndexEntry[]> => {
  let list: Awaited<ReturnType<typeof getCountryList>> = [];
  try {
    list = await getCountryList();
  } catch {
    list = [];
  }
  return buildCountryIndex(list);
};

/**
 * Reads the index of the RestCountries list, building it on the first call.
 *
 * @returns The indexed countries.
 */
const getIndex = (): Promise<CountryIndexEntry[]> => {
  if (!indexPromise) {
    indexPromise = buildIndex().catch(() => [] as CountryIndexEntry[]);
  }
  return indexPromise;
};

/**
 * Looks the metadata of a country up in the RestCountries list.
 *
 * @param name - The name of the country as the backend stores it.
 * @param slug - The slug of the country as the backend stores it.
 * @returns The metadata, or `null` when the country is unknown.
 */
export async function resolveCountryMeta(
  name?: string | null,
  slug?: string | null
): Promise<CountryMeta | null> {
  const index = await getIndex();
  return findCountryMeta(index, name, slug);
}

/**
 * Clears the cached index of the RestCountries list.
 *
 * It is used by the tests, and after a country list was refreshed.
 */
export function resetCountryMetaCache(): void {
  indexPromise = null;
}
