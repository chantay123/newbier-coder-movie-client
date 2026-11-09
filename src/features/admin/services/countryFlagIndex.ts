/**
 * @file countryFlagIndex.ts
 * @description The pure matching logic of the country flags.
 *
 * This file has NO import at all, so it can be used by the admin panel
 * AND by the check script (`scripts/check-country-flag-resolver.mjs`),
 * which runs it with the plain Node type stripping. The logic therefore
 * never drifts away from the implementation.
 *
 * WHY THE FLAGS HAVE TO BE RESOLVED
 * The `code` (alpha-2) and the `flag` (emoji) of a country are NOT part of
 * the mongoose schema of the backend: it only stores `name`, `slug`,
 * `description`, `isActive` and `movieCount`. So the backend never sends
 * them back, and the flag image of the admin table disappeared as soon as
 * the panel was switched to the live API.
 */

/** The alpha-2 code and the flag emoji of one country. */
export interface CountryMeta {
  /** ISO 3166-1 alpha-2 code, such as "KR". */
  code: string;
  /** The Unicode flag emoji, such as "🇰🇷". */
  flag: string;
}

/** One entry of the lookup index. */
export interface CountryIndexEntry {
  /** The normalized name or slug the entry is indexed under. */
  key: string;
  /** The code and the flag of the country. */
  meta: CountryMeta;
}

/**
 * Normalizes a name or a slug so two spellings of the same country match.
 *
 * The diacritics are removed, the punctuation becomes a space, and the
 * result is lowercased. "Hàn Quốc", "hàn-quốc" and "han quoc" therefore all
 * become "han quoc".
 *
 * @param value - The raw name or slug.
 * @returns The normalized text, or an empty string.
 */
export const normalizeCountryText = (value: string | undefined | null): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();

/**
 * Escapes the characters of a text so it can be used in a RegExp.
 *
 * @param value - The raw text.
 * @returns The escaped text.
 */
export const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Whether a whole word of the haystack matches the needle.
 *
 * The word boundary matters: "my" is a word of "my hoa ky" (the United
 * States) but NOT of "myanmar".
 *
 * @param needle - The word to look for.
 * @param haystack - The text to look into.
 * @returns `true` when the needle is a whole word of the haystack.
 */
export const containsCountryWord = (needle: string, haystack: string): boolean => {
  if (!needle) return false;
  return new RegExp(`(^|\\s)${escapeRegExp(needle)}($|\\s)`).test(haystack);
};

/**
 * The shape of a country of the RestCountries list.
 */
export interface CountryListEntry {
  code?: string;
  nameVi?: string;
  nameEn?: string;
  flag?: string;
}

/**
 * Builds the lookup index of the country list.
 *
 * Every country is indexed under its Vietnamese name, its English name and
 * the slug form of both, so a country is found by whichever spelling the
 * backend uses.
 *
 * @param list - The countries of the RestCountries list.
 * @returns The indexed countries.
 */
export const buildCountryIndex = (list: CountryListEntry[]): CountryIndexEntry[] => {
  const entries: CountryIndexEntry[] = [];

  for (const country of list ?? []) {
    const meta: CountryMeta = { code: country.code ?? '', flag: country.flag ?? '' };
    if (!meta.code && !meta.flag) continue;

    const keys = [
      country.nameVi,
      country.nameEn,
      country.nameVi?.replace(/\s+/g, '-'),
      country.nameEn?.replace(/\s+/g, '-')
    ];

    for (const key of keys) {
      const normalized = normalizeCountryText(key);
      if (normalized) entries.push({ key: normalized, meta });
    }
  }

  return entries;
};

/**
 * Looks the metadata of a country up in the index.
 *
 * The slug is tried first, because it is the most stable identifier, then
 * the name. An exact match wins; a whole-word match is the fallback, so
 * "Mỹ" still finds "Mỹ (Hoa Kỳ)".
 *
 * @param index - The index built by `buildCountryIndex`.
 * @param name - The name of the country as the backend stores it.
 * @param slug - The slug of the country as the backend stores it.
 * @returns The metadata, or `null` when the country is unknown.
 */
export const findCountryMeta = (
  index: CountryIndexEntry[],
  name?: string | null,
  slug?: string | null
): CountryMeta | null => {
  if (!index || index.length === 0) return null;

  const candidates = [normalizeCountryText(slug), normalizeCountryText(name)].filter(Boolean);

  for (const candidate of candidates) {
    const exact = index.find((entry) => entry.key === candidate);
    if (exact) return exact.meta;
  }

  for (const candidate of candidates) {
    const partial = index.find((entry) => containsCountryWord(candidate, entry.key));
    if (partial) return partial.meta;
  }

  return null;
};
