/**
 * @file pages/api/admin/countries/list.ts
 * @description Server-side proxy with caching for RestCountries v5 API.
 * Keeps RESTCOUNTRIES_API_TOKEN secure on the server.
 *
 * GET /api/admin/countries/list
 *
 * Returns a sorted, normalized array of countries with Vietnamese names,
 * English names, ISO codes, and flag emojis.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { POPULAR_COUNTRIES } from '@/constants/adminActorConstants';

// The TLS limit is applied as soon as this module is loaded (see
// `src/utils/serverTls.ts`).
import '@/utils/serverTls';

export interface CountryListItem {
  code: string;
  nameVi: string;
  nameEn: string;
  flag: string;
}

interface ApiSuccessResponse {
  success: true;
  data: CountryListItem[];
  source: 'cache' | 'upstream' | 'fallback';
}

interface ApiErrorResponse {
  success: false;
  code: 'UPSTREAM_ERROR' | 'SERVER_ERROR';
  message: string;
}

type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

// Comprehensive Vietnamese name mappings for world countries
const VIETNAMESE_NAME_MAP: Record<string, string> = {
  VN: 'Việt Nam',
  KR: 'Hàn Quốc',
  US: 'Mỹ (Hoa Kỳ)',
  CN: 'Trung Quốc',
  JP: 'Nhật Bản',
  GB: 'Vương Quốc Anh',
  TH: 'Thái Lan',
  HK: 'Hồng Kông',
  TW: 'Đài Loan',
  FR: 'Pháp',
  DE: 'Đức',
  CA: 'Canada',
  AU: 'Úc',
  IN: 'Ấn Độ',
  ES: 'Tây Ban Nha',
  IT: 'Ý',
  SG: 'Singapore',
  PH: 'Philippines',
  ID: 'Indonesia',
  MY: 'Malaysia',
  RU: 'Nga',
  MX: 'Mexico',
  BR: 'Brazil',
  NL: 'Hà Lan',
  CH: 'Thụy Sĩ',
  SE: 'Thụy Điển',
  NO: 'Na Uy',
  DK: 'Đan Mạch',
  FI: 'Phần Lan',
  BE: 'Bỉ',
  AT: 'Áo',
  PT: 'Bồ Đào Nha',
  GR: 'Hy Lạp',
  TR: 'Thổ Nhĩ Kỳ',
  PL: 'Ba Lan',
  CZ: 'Cộng hòa Séc',
  HU: 'Hungary',
  RO: 'Romania',
  UA: 'Ukraine',
  IE: 'Ireland',
  NZ: 'New Zealand',
  ZA: 'Nam Phi',
  EG: 'Ai Cập',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
  LA: 'Lào',
  KH: 'Campuchia',
  MM: 'Myanmar',
};

const POPULAR_ORDER_CODES = [
  'VN', 'KR', 'US', 'CN', 'JP', 'GB', 'TH', 'HK', 'TW',
  'FR', 'DE', 'CA', 'AU', 'IN', 'ES', 'IT', 'SG', 'PH',
  'ID', 'MY', 'RU', 'MX', 'BR'
];

// In-memory server cache with 24h TTL
interface CachedData {
  items: CountryListItem[];
  expiresAt: number;
}

let memoryCache: CachedData | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const UPSTREAM_TIMEOUT_MS = 8000;

const RESTCOUNTRIES_API_URL =
  process.env.RESTCOUNTRIES_API_URL ?? 'https://api.restcountries.com/countries/v5';

const RESTCOUNTRIES_API_TOKEN =
  process.env.RESTCOUNTRIES_API_TOKEN ?? 'rc_live_a0d993cd0c9341f3a5759747a00f76ee';

/**
 * Transforms raw country objects from RestCountries API into normalized CountryListItem
 */
function normalizeCountries(rawList: any[]): CountryListItem[] {
  const mapped = rawList
    .map((c: any) => {
      const code = (c.codes?.alpha_2 || '').toUpperCase();
      const nameEn = c.names?.common || '';
      const nativeVie = c.names?.native?.vie?.common;
      const nameVi = VIETNAMESE_NAME_MAP[code] || nativeVie || nameEn;
      const flag = c.flag?.emoji || '';
      return { code, nameVi, nameEn, flag };
    })
    .filter((c) => c.code && c.nameEn);

  // Deduplicate by code
  const uniqueMap = new Map<string, CountryListItem>();
  for (const item of mapped) {
    if (!uniqueMap.has(item.code)) {
      uniqueMap.set(item.code, item);
    }
  }

  const allCountries = Array.from(uniqueMap.values());

  // Split into popular priority group and remaining group
  const popularList: CountryListItem[] = [];
  const popularSet = new Set(POPULAR_ORDER_CODES);

  for (const code of POPULAR_ORDER_CODES) {
    const found = allCountries.find((c) => c.code === code);
    if (found) {
      popularList.push(found);
    }
  }

  const otherList = allCountries
    .filter((c) => !popularSet.has(c.code))
    .sort((a, b) => a.nameVi.localeCompare(b.nameVi, 'vi'));

  return [...popularList, ...otherList];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ success: false, code: 'SERVER_ERROR', message: 'Method Not Allowed' });
    return;
  }

  const now = Date.now();

  // 1. Check in-memory cache
  if (memoryCache && memoryCache.expiresAt > now && memoryCache.items.length > 0) {
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
    res.status(200).json({
      success: true,
      data: memoryCache.items,
      source: 'cache',
    });
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    // Fetch in parallel across offsets (0, 100, 200) to retrieve all 254 countries
    const offsets = [0, 100, 200];
    const fetchPromises = offsets.map(async (offset) => {
      const response = await fetch(`${RESTCOUNTRIES_API_URL}?limit=100&offset=${offset}`, {
        headers: {
          Authorization: `Bearer ${RESTCOUNTRIES_API_TOKEN}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`RestCountries upstream error ${response.status}`);
      }

      const json = await response.json();
      return json?.data?.objects || [];
    });

    let rawObjects: any[] = [];
    try {
      const results = await Promise.all(fetchPromises);
      rawObjects = results.flat();
    } finally {
      clearTimeout(timeoutId);
    }

    if (!Array.isArray(rawObjects) || rawObjects.length === 0) {
      throw new Error('Empty upstream country list');
    }

    const normalized = normalizeCountries(rawObjects);

    // Update in-memory cache
    memoryCache = {
      items: normalized,
      expiresAt: now + CACHE_TTL_MS,
    };

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
    res.status(200).json({
      success: true,
      data: normalized,
      source: 'upstream',
    });
  } catch (error) {
    console.warn('[RestCountries API] Upstream fetch failed, falling back to static constants:', error);

    // Fallback to static POPULAR_COUNTRIES if upstream fails
    const fallbackList: CountryListItem[] = POPULAR_COUNTRIES.map((c) => ({
      code: c.code,
      nameVi: c.nameVi,
      nameEn: c.nameEn,
      flag: c.flag,
    }));

    res.status(200).json({
      success: true,
      data: fallbackList,
      source: 'fallback',
    });
  }
}
