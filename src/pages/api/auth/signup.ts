/**
 * @file pages/api/auth/signup.ts
 * @description Local signup API route. Forwards registration payload to backend.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

interface ErrorResponse {
  message: string;
}

interface SignupBody {
  fullname?: string;
  email?: string;
  password?: string;
  retype_password?: string;
  address?: string;
  phone?: string;
  date_of_birth?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ErrorResponse | Record<string, unknown>>
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const userData = req.body as SignupBody;

    if (!userData.fullname || !userData.email || !userData.password) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: userData.fullname,
          email: userData.email,
          password: userData.password,
          retype_password: userData.retype_password || userData.password,
          address: userData.address || '',
          phone: userData.phone || '',
          date_of_birth: userData.date_of_birth || ''
        })
      }
    );

    const responseText = await response.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      console.error('Error parsing JSON response');
      if (responseText.includes('<!DOCTYPE')) {
        return res.status(500).json({ message: 'Lỗi kết nối máy chủ. Vui lòng kiểm tra lại API URL.' });
      }
      return res.status(500).json({ message: 'Invalid response from server' });
    }

    if (!response.ok) {
      const message = (data.error || data.message || 'Registration failed') as string;
      return res.status(response.status).json({ message });
    }

    return res.status(200).json({
      success: true,
      message: (data.message as string) || 'Registration successful',
      data
    });
  } catch (error) {
    console.error('Registration error:', error);

    const axiosLike = error as { response?: { status: number; data: { message?: string } } };
    if (axiosLike.response) {
      return res.status(axiosLike.response.status).json({
        message: axiosLike.response.data.message || 'Registration failed'
      });
    }
    return res.status(500).json({
      message: (error as Error).message || 'Server error. Please try again later.'
    });
  }
}
