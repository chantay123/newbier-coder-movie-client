/**
 * @file pages/api/auth/google-login.ts
 * @description Google OAuth callback API route. Forwards Google profile to backend.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

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
    const { email, name, googleId, picture } = req.body as {
      email?: string;
      name?: string;
      googleId?: string;
      picture?: string;
    };

    if (!email || !googleId) {
      return res.status(400).json({ message: 'Email and Google ID are required' });
    }

    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/google-login`,
      { email, name, googleId, picture }
    );

    return res.status(200).json(response.data as Record<string, unknown>);
  } catch (error) {


    const axiosError = error as { response?: { status: number; data: { message?: string } } };
    if (axiosError.response) {
      return res.status(axiosError.response.status).json({
        message: axiosError.response.data.message || 'Google authentication failed'
      });
    }
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
}
