/**
 * @file pages/api/admin/countries/lookup.ts
 * @description Server-side proxy for the restcountries.com v5 API.
 *
 * Keeps RESTCOUNTRIES_API_TOKEN in the server environment — the bearer token
 * is never exposed to the browser bundle.
 *
 * GET /api/admin/countries/lookup?q=<name>
 *
 * Returns a mapped CountryLookupResult or a structured error object.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

// ─── Response types ────────────────────────────────────────────────────────────

/** Normalised country metadata returned to the client. */
export interface CountryLookupResult {
  /** Common English name (e.g. "Canada") */
  nameCommon: string;
  /** Official English name (e.g. "Canada") */
  nameOfficial: string;
  /** ISO 3166-1 alpha-2 code (e.g. "CA") */
  alpha2: string;
  /** ISO 3166-1 alpha-3 code (e.g. "CAN") */
  alpha3: string;
  /** Unicode flag emoji (e.g. "🇨🇦") */
  flagEmoji: string;
  /** PNG flag image URL from the RestCountries CDN (e.g. "https://flags.restcountries.com/v5/w640/ca.png") */
  flagPngUrl: string;
  /** SVG flag image URL from the RestCountries CDN */
  flagSvgUrl: string;
  /** Short English description */
  description: string;
  /** Region (e.g. "Americas") */
  region: string;
  /** Subregion (e.g. "North America") */
  subregion: string;
}

interface ApiSuccessResponse {
  success: true;
  data: CountryLookupResult;
}

interface ApiErrorResponse {
  success: false;
  code: 'MISSING_QUERY' | 'NOT_FOUND' | 'UPSTREAM_ERROR' | 'SERVER_ERROR';
  message: string;
}

type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

// ─── Upstream DTO (partial — only fields we consume) ──────────────────────────

interface UpstreamCountryObject {
  names?: {
    common?: string;
    official?: string;
  };
  codes?: {
    alpha_2?: string;
    alpha_3?: string;
  };
  flag?: {
    emoji?: string;
    url_png?: string;
    url_svg?: string;
  };
  descriptions?: {
    short?: string;
    long?: string;
  };
  region?: string;
  subregion?: string;
}

interface UpstreamResponse {
  data?: {
    objects?: UpstreamCountryObject[];
    meta?: { total?: number };
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RESTCOUNTRIES_API_URL =
  process.env.RESTCOUNTRIES_API_URL ?? 'https://api.restcountries.com/countries/v5';

const RESTCOUNTRIES_API_TOKEN = process.env.RESTCOUNTRIES_API_TOKEN ?? '';

const UPSTREAM_TIMEOUT_MS = 8_000;

// ─── Mapper ───────────────────────────────────────────────────────────────────

/**
 * Maps a raw upstream country object to the normalised CountryLookupResult DTO.
 * Falls back to empty strings for missing fields — never throws.
 */
function mapToCountryLookupResult(raw: UpstreamCountryObject): CountryLookupResult {
  return {
    nameCommon: raw.names?.common ?? '',
    nameOfficial: raw.names?.official ?? '',
    alpha2: raw.codes?.alpha_2 ?? '',
    alpha3: raw.codes?.alpha_3 ?? '',
    flagEmoji: raw.flag?.emoji ?? '',
    flagPngUrl: raw.flag?.url_png ?? '',
    flagSvgUrl: raw.flag?.url_svg ?? '',
    description: raw.descriptions?.short ?? raw.descriptions?.long ?? '',
    region: raw.region ?? '',
    subregion: raw.subregion ?? '',
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ success: false, code: 'SERVER_ERROR', message: 'Method Not Allowed' });
    return;
  }

  const q = (Array.isArray(req.query.q) ? req.query.q[0] : req.query.q ?? '').trim();

  if (!q) {
    res.status(400).json({ success: false, code: 'MISSING_QUERY', message: 'Query parameter "q" is required.' });
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(
        `${RESTCOUNTRIES_API_URL}?q=${encodeURIComponent(q)}`,
        {
          headers: {
            Authorization: `Bearer ${RESTCOUNTRIES_API_TOKEN}`,
            Accept: 'application/json',
          },
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!upstreamRes.ok) {
      res.status(502).json({
        success: false,
        code: 'UPSTREAM_ERROR',
        message: `RestCountries API responded with status ${upstreamRes.status}.`,
      });
      return;
    }

    const body = await upstreamRes.json() as UpstreamResponse;
    const objects = body?.data?.objects;

    if (!Array.isArray(objects) || objects.length === 0) {
      res.status(404).json({ success: false, code: 'NOT_FOUND', message: `No country found for query "${q}".` });
      return;
    }

    res.status(200).json({ success: true, data: mapToCountryLookupResult(objects[0]) });
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    res.status(504).json({
      success: false,
      code: 'UPSTREAM_ERROR',
      message: isAbort ? 'Request to RestCountries API timed out.' : 'Failed to reach RestCountries API.',
    });
  }
}
