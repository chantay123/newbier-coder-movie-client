/**
 * @file pages/api/auth/oauth-session.ts
 * @description Bridges an OAuth sign-in into the server-side session.
 *
 * WHY THIS ROUTE EXISTS
 * The OAuth flow (Google / Facebook) goes through NextAuth, which keeps its
 * own session in a JWT cookie. The backend access token was part of the
 * NextAuth session payload, so it was returned to the browser as plain
 * JSON and ended up readable by any script on the page.
 *
 * This route fixes that WITHOUT rewriting NextAuth:
 *   1. it reads the NextAuth JWT ON THE SERVER (`getToken`), where it is
 *      decrypted and never leaves the server process;
 *   2. it writes the backend access token into the encrypted `HttpOnly`
 *      session cookie (`mv_session`), exactly like the local login route
 *      does;
 *   3. it answers WITHOUT any token, so the browser only learns that the
 *      session exists.
 *
 * The client then asks `/api/auth/session-state` for the access token,
 * which travels in the body and is kept in the memory of the tab.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';

import {
  readTokenExpiry,
  stripTokensFromUser,
  writeSession,
} from '@/utils/serverAuthSession';

/**
 * Bridges a NextAuth (OAuth) session into the local encrypted session.
 *
 * The NextAuth JWT is read and decrypted on the server. The backend token
 * it contains is written into the encrypted `HttpOnly` cookie, so the
 * browser never handles it.
 *
 * @param req - The API request. It carries the NextAuth session cookie.
 * @param res - The API response.
 * @returns Nothing. The route answers with `{ authenticated }`.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Record<string, unknown>>
): Promise<void> {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    // The JWT is read and decrypted on the server. The token never leaves
    // this function.
    const token = await getToken({ req });

    const backendToken = (token?.backendToken as string) || '';
    if (!backendToken) {
      res.status(401).json({ authenticated: false });
      return;
    }

    const backendUser = (token?.backendUser as Record<string, unknown>) || undefined;

    // The session is written to the encrypted `HttpOnly` cookie. The
    // refresh token is not part of the OAuth answer, so the session can
    // only be renewed by signing in again.
    writeSession(res, {
      accessToken: backendToken,
      user: stripTokensFromUser(backendUser),
      accessTokenExpiresAt: readTokenExpiry(backendToken),
      rememberMe: true,
    });

    // No token in the answer.
    res.status(200).json({ authenticated: true });
  } catch {
    res.status(401).json({ authenticated: false });
  }
}
