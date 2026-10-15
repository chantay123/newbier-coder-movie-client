/**
 * @file pages/api/auth/facebook-login.ts
 * @description Facebook OAuth callback API route. Forwards Facebook profile to backend.
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
    const { email, name, facebookId, picture } = req.body as {
      email?: string;
      name?: string;
      facebookId?: string;
      picture?: string;
    };

    if (!email || !facebookId) {
      return res.status(400).json({ message: 'Email and Facebook ID are required' });
    }

    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/facebook-login`,
      { email, name, facebookId, picture }
    );

    return res.status(200).json(response.data as Record<string, unknown>);
  } catch (error) {


    const axiosError = error as { response?: { status: number; data: { message?: string } } };
    if (axiosError.response) {
      return res.status(axiosError.response.status).json({
        message: axiosError.response.data.message || 'Facebook authentication failed'
      });
    }
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
}
