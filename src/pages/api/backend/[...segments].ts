/**
 * [...segments].ts
 *
 * The backend proxy.
 *
 * WHY THIS FILE EXISTS
 * The real backend paths must not appear in the client bundle. So the
 * frontend calls an opaque token (`/api/backend/t1a2b3c4`) and this route
 * translates that token back into the real path, using the SERVER-ONLY
 * `API_ROUTE_MAP` environment variable, before forwarding the request to
 * the backend.
 *
 * The result:
 *   - the client bundle contains tokens, never URLs;
 *   - the backend host never reaches the browser;
 *   - the browser only ever talks to the same origin.
 *
 * The path parameters are the segments AFTER the token. They are appended to
 * the real path in the same order, which is why the client does not need to
 * know where a parameter belongs.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerApiBaseUrl } from '@/config/apiBase';

/** The prefix of the proxy. */
const PREFIX = '/api/backend';

/**
 * Reads and parses the server-only route map.
 *
 * `API_ROUTE_MAP` is a JSON object: `{ "t1a2b3c4": "/movies", ... }`.
 * It is stored WITHOUT the `NEXT_PUBLIC_` prefix, so Next.js replaces it
 * with `undefined` in the browser bundle.
 *
 * @returns The map, or an empty object when it is missing or invalid.
 */
const readRouteMap = (): Record<string, string> => {
  const raw = process.env.API_ROUTE_MAP;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
};

/**
 * Relays the request to the backend and streams the answer back.
 *
 * The Authorization header and the cookies are forwarded, so the backend
 * keeps answering exactly as it would for a direct call.
 */
const proxy = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const backendBase = getServerApiBaseUrl();
  if (!backendBase) {
    res.status(503).json({ success: false, message: 'Backend is not configured.' });
    return;
  }

  const routeMap = readRouteMap();

  // `req.query.segments` holds everything after `/api/backend`.
  const segments = (req.query.segments ?? []) as string[];
  const [token, ...params] = segments;

  const template = token ? routeMap[token] : undefined;
  if (!template) {
    res.status(404).json({ success: false, message: 'Unknown route.' });
    return;
  }

  // The path parameters are substituted in order. A template parameter that
  // receives no value keeps its placeholder out of the URL.
  const path = template.replace(/\{(\d+)\}/g, (match, index) => {
    const value = params[Number(index)];
    return value === undefined ? match : encodeURIComponent(value);
  });

  // The parameters that were not consumed by the template are appended, so a
  // route can accept a variable number of them.
  const consumed = (template.match(/\{(\d+)\}/g) || []).length;
  const extra = params.slice(consumed).map((value) => encodeURIComponent(value));

  // The template starts with a slash, and the base URL ends with one too.
  // Joining them as is would produce a double slash (`/api/v1//movies`),
  // which the backend answers with `404 Route not found`.
  const suffix = [path.replace(/^\/+/, ''), ...extra].join('/');

  const requestUrl = req.url ?? '';
  const queryIndex = requestUrl.indexOf('?');
  const search = queryIndex >= 0 ? requestUrl.slice(queryIndex) : '';

  const target = `${backendBase}/${suffix}${search}`;

  // The body is buffered so it can be forwarded as-is. `multipart/form-data`
  // is excluded: it must keep its own boundary header.
  const contentType = req.headers['content-type'] ?? '';
  const isMultipart = contentType.includes('multipart/form-data');

  let body: Buffer | undefined;
  if (!isMultipart && req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    body = Buffer.concat(chunks);
  }

  const headers: Record<string, string> = {};
  if (req.headers.authorization) headers.Authorization = req.headers.authorization;
  if (req.headers.cookie) headers.cookie = req.headers.cookie;
  if (req.headers['user-agent']) headers['user-agent'] = req.headers['user-agent'];
  if (!isMultipart && body) headers['content-type'] = contentType;
  if (isMultipart) headers['content-type'] = contentType;
  headers.accept = req.headers.accept ?? 'application/json';

  try {
    const upstream = await fetch(target, {
      method: req.method ?? 'GET',
      headers,
      body: body && body.length ? new Uint8Array(body) : undefined,
      redirect: 'manual',
    });

    // The status and the content type are relayed.
    res.status(upstream.status);

    const upstreamType = upstream.headers.get('content-type');
    if (upstreamType) res.setHeader('content-type', upstreamType);

    // The `set-cookie` headers of the backend are relayed, so the sessions
    // keep working exactly as before.
    const setCookies = upstream.headers.getSetCookie?.() ?? [];
    if (setCookies.length) res.setHeader('set-cookie', setCookies);

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.send(buffer);
  } catch (error) {
    res.status(502).json({
      success: false,
      message: 'Upstream request failed.',
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default proxy;

/**
 * The proxy accepts every method, so the config only has to exclude the
 * static assets Next.js serves itself.
 */
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
