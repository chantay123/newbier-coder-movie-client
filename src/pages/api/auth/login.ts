/**
 * @file pages/api/auth/login.ts
 * @description Local login API route. Forwards credentials to the backend auth service.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

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
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      }
    );

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const message = (data.error || data.message || 'Login failed') as string;
      throw new Error(message);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Login error:', error);

    const axiosLike = error as { response?: { status: number; data: { error?: string; message?: string } } };
    if (axiosLike.response) {
      return res.status(axiosLike.response.status).json({
        message: axiosLike.response.data.error || axiosLike.response.data.message || 'Authentication failed'
      });
    }
    return res.status(500).json({ message: (error as Error).message || 'Server error. Please try again later.' });
  }
}
