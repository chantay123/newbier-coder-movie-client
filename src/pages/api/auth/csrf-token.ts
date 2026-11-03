/**
 * @file pages/api/auth/csrf-token.ts
 * @description Hands out the CSRF nonce of the browser.
 *
 * WHY THE ROUTE HAS THIS NAME
 * `/api/auth/csrf` belongs to NextAuth: the catch-all route
 * `[...nextauth].ts` serves it. A STATIC file wins over the catch-all, so
 * this route was shadowing the NextAuth one. The NextAuth client then got
 * the nonce of this route instead of its own, and every OAuth sign-in was
 * rejected with a CSRF error.
 *
 * The route is therefore called `/api/auth/csrf-token`, which cannot
 * collide with anything NextAuth serves.
 *
 * The route creates the nonce (when there is none yet) and writes it into
 * the `mv_csrf` cookie. The client reads the cookie and copies the nonce
 * into the `x-csrf-token` header of the login, refresh and logout calls.
 *
 * A cross-site attacker can make the browser SEND this cookie, but it
 * cannot READ it, so it cannot build a valid header.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

import { ensureCsrfToken, writeCsrfCookie } from '@/utils/serverAuthSession';

/**
 * Hands out the CSRF nonce of the browser.
 *
 * @param req - The API request. The existing `mv_csrf` cookie is reused
 *              when it is present.
 * @param res - The API response. The nonce is written to the `mv_csrf`
 *              cookie and returned in the body.
 * @returns Nothing. The route answers with `{ csrfToken }`.
 */
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Record<string, unknown>>
): void {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const token = ensureCsrfToken(req);
  writeCsrfCookie(res, token);

  res.status(200).json({ csrfToken: token });
}
