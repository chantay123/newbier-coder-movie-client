/**
 * @file pages/api/auth/refresh.ts
 * @description Renews the access token of the current session.
 *
 * The refresh token is read from the encrypted `HttpOnly` cookie, so it
 * never travels through the browser. Only the fresh access token is
 * returned.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

import {
  backendRefresh,
  clearSession,
  needsRefresh,
  readSession,
  readTokenExpiry,
  stripTokensFromUser,
  verifyCsrfToken,
  writeSession,
} from '@/utils/serverAuthSession';

/**
 * Renews the access token of the current session.
 *
 * The refresh token is read from the encrypted `HttpOnly` cookie, so it
 * never travels through the browser. The route calls the backend itself and
 * rotates the cookie with the new tokens.
 *
 * @param req - The API request. It must carry the `x-csrf-token` header.
 * @param res - The API response.
 * @returns Nothing. The route answers with the fresh access token.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Record<string, unknown>>
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!verifyCsrfToken(req)) {
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }

  const session = readSession(req);

  if (!session) {
    clearSession(res);
    return res.status(401).json({ authenticated: false });
  }

  // The access token is still valid, so there is nothing to renew. This
  // keeps the renewal from being called on every request.
  if (!needsRefresh(session)) {
    return res.status(200).json({
      authenticated: true,
      token: session.accessToken,
      user: stripTokensFromUser(session.user) ?? null,
    });
  }

  if (!session.refreshToken) {
    clearSession(res);
    return res.status(401).json({ authenticated: false });
  }

  const result = await backendRefresh(session.refreshToken);

  if (!result.ok || !result.tokens) {
    clearSession(res);
    return res.status(401).json({ authenticated: false });
  }

  const { accessToken, refreshToken, user } = result.tokens;

  writeSession(res, {
    accessToken,
    refreshToken: refreshToken || session.refreshToken,
    user: stripTokensFromUser(user) ?? stripTokensFromUser(session.user),
    accessTokenExpiresAt: readTokenExpiry(accessToken),
    rememberMe: session.rememberMe,
  });

  return res.status(200).json({
    authenticated: true,
    token: accessToken,
    user: stripTokensFromUser(user) ?? stripTokensFromUser(session.user) ?? null,
  });
}
