/**
 * @file pages/api/auth/reset-password.ts
 * @description Reset password API route. Validates new password and forwards to backend.
 *
 * Endpoint: `POST {API_BASE}/auth/reset-password`.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getApiBaseUrl } from '@/config/apiBase';

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
    const { token, newPassword, confirmPassword } = req.body as {
      token?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const response = await axios.post(
      `${getApiBaseUrl()}/auth/reset-password`,
      { token, newPassword, confirmPassword }
    );

    return res.status(200).json({
      ...(response.data as Record<string, unknown>),
      success: true
    });
  } catch (error) {


    const axiosError = error as { response?: { status: number; data: { error?: string; message?: string } } };
    if (axiosError.response) {
      return res.status(axiosError.response.status).json({
        message: axiosError.response.data.error || axiosError.response.data.message || 'Reset password failed'
      });
    }
    return res.status(500).json({ message: (error as Error).message || 'Server error. Please try again later.' });
  }
}
