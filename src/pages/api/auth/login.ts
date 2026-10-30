/**
 * The local login API route. It forwards the credentials to the
 * backend auth service.
 *
 * Endpoint contract (verified against production on 2026-10-27):
 * - `POST {API_BASE}/auth/login` returns a 401 "Missing Bearer token"
 *   style validation error when the body is wrong; this route exists.
 * - `POST {API_BASE}/api/auth/login` returns 404 "Route not found";
 *   that is the old path.
 *
 * Because of that, this route forwards to `${API_BASE}/auth/login`, where
 * `API_BASE` comes from `getApiBaseUrl()` (it already includes `/api/v1`).
 * The old code built `${NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/login`,
 * which added `/api` a second time to a base that already had `/api/v1`
 * and produced the URL `.../api/v1/api/auth/login` → 404.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getApiBaseUrl } from '@/config/apiBase';
import { apiUrl } from '@/config/apiRoutes';

interface ErrorResponse {
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ErrorResponse | Record<string, unknown>>
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, username, password } = req.body as {
      email?: string;
      username?: string;
      password?: string;
    };

    // Backend v1 requires `username` (see the real validation error:
    // "body must have required property 'username'"). The UI form can send
    // `email` or `username`, so normalize it to `username` before forwarding.
    const identifier = (username || email || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const response = await fetch(apiUrl(`authLogin`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: identifier, password })
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const message = (data.error || data.message || 'Login failed') as string;
      throw new Error(message);
    }

    return res.status(200).json(data);
  } catch (error) {
    const axiosLike = error as { response?: { status: number; data: { error?: string; message?: string } } };
    if (axiosLike.response) {
      return res.status(axiosLike.response.status).json({
        message: axiosLike.response.data.error || axiosLike.response.data.message || 'Authentication failed'
      });
    }
    return res.status(500).json({ message: (error as Error).message || 'Server error. Please try again later.' });
  }
}
