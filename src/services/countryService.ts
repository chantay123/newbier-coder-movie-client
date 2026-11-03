/**
 * @file countryService.ts
 * @description Enterprise Country service with multi-tier caching (Memory -> SessionStorage -> Server API -> Fallback).
 * Supplies country options for Actor and Person forms with flag emojis, Vietnamese names, and English names.
 */

import { POPULAR_COUNTRIES } from '@/constants/adminActorConstants';

export interface CountryItem {
  code: string;
  nameVi: string;
  nameEn: string;
  flag: string;
}

const SESSION_STORAGE_KEY = 'cine_admin_country_list_v1';
let inMemoryCountryCache: CountryItem[] | null = null;

/**
 * Retrieves the normalized list of countries.
 * Prioritizes: In-Memory Cache -> SessionStorage -> /api/admin/countries/list -> POPULAR_COUNTRIES.
 */
export async function getCountryList(): Promise<CountryItem[]> {
  // 1. Check in-memory cache
  if (inMemoryCountryCache && inMemoryCountryCache.length > 0) {
    return inMemoryCountryCache;
  }

  // 2. Check browser sessionStorage
  if (typeof window !== 'undefined') {
    try {
      const cached = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (cached) {
        const parsed: CountryItem[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryCountryCache = parsed;
          return parsed;
        }
      }
    } catch {
      // Storage access blocked or quota exceeded, proceed to network
    }
  }

  // 3. Fetch from Server Next.js API Proxy (which proxies restcountries v5 securely)
  try {
    const response = await fetch('/api/admin/countries/list', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      const json = await response.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        inMemoryCountryCache = json.data;

        // Persist to sessionStorage
        if (typeof window !== 'undefined') {
          try {
            window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(json.data));
          } catch {
            // Ignore quota errors
          }
        }

        return json.data;
      }
    }
  } catch (error) {
    console.warn('[CountryService] Error fetching country list from API:', error);
  }

  // 4. Fallback to statically bundled POPULAR_COUNTRIES
  const fallback: CountryItem[] = POPULAR_COUNTRIES.map((c) => ({
    code: c.code,
    nameVi: c.nameVi,
    nameEn: c.nameEn,
    flag: c.flag,
  }));

  inMemoryCountryCache = fallback;
  return fallback;
}
