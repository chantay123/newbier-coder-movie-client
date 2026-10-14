/**
 * @file pages/api/auth/forgot-password.ts
 * @description Forgot password request API route. Sends reset link to user's email.
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
    const { email } = req.body as { email?: string };

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/forgot-password`,
      { email }
    );

    return res.status(200).json({
      ...(response.data as Record<string, unknown>),
      success: true
    });
  } catch (error) {
    console.error('Forgot password error:', error);

    const axiosError = error as { response?: { status: number; data: { error?: string; message?: string } } };
    if (axiosError.response) {
      return res.status(axiosError.response.status).json({
        message: axiosError.response.data.error || axiosError.response.data.message || 'Forgot password failed'
      });
    }
    return res.status(500).json({ message: (error as Error).message || 'Server error. Please try again later.' });
  }
}
