/**
 * @file pages/api/auth/_log.ts
 * @description Internal auth error logger API route.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

interface ErrorResponse {
  message: string;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ErrorResponse | { success: boolean }>
): void {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.error('Auth log:', req.body);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error logging auth event:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
