/**
 * @file pages/api/ping.ts
 * @description Lightweight liveness endpoint returning a 200 + ISO timestamp.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

interface PingResponse {
  status: string;
  timestamp: string;
}

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponse<PingResponse>
): void {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
}
