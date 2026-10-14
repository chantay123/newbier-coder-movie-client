/**
 * @file adService.ts
 * @description Advertisement client service with safe offline error handling,
 * in-memory caching for video ads, and ad-tracker calls (impression/click/skip).
 */
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const CACHE_DURATION_MS = 300_000;

interface AdCache {
  videoAd: Advertisement | null;
  videoAdTimestamp: number;
  bannerTopAd: Advertisement | null;
  bannerTopTimestamp: number;
  bannerBottomAd: Advertisement | null;
  bannerBottomTimestamp: number;
  cacheDuration: number;
}

export interface Advertisement {
  _id: string;
  title?: string;
  type?: 'video' | 'banner_top' | 'banner_bottom';
  url?: string;
  imageUrl?: string;
  clickUrl?: string;
  duration?: number;
  active?: boolean;
  [key: string]: unknown;
}

export interface AdListResult {
  success: boolean;
  advertisements: Advertisement[];
  totalPages: number;
  error?: string;
}

const requestCache: AdCache = {
  videoAd: null,
  videoAdTimestamp: 0,
  bannerTopAd: null,
  bannerTopTimestamp: 0,
  bannerBottomAd: null,
  bannerBottomTimestamp: 0,
  cacheDuration: CACHE_DURATION_MS
};

const safeGet = async <T>(url: string, timeout = 1200): Promise<T | null> => {
  try {
    const res = await axios.get<T>(url, { timeout });
    return res.data;
  } catch {
    return null;
  }
};

const adService = {
  getRandomVideoAd: async (): Promise<Advertisement | null> => {
    try {
      const now = Date.now();
      if (requestCache.videoAd && now - requestCache.videoAdTimestamp < requestCache.cacheDuration) {
        return requestCache.videoAd;
      }
      const data = await safeGet<{ success?: boolean; advertisement?: Advertisement }>(
        `${API_URL}/advertisements/random?type=video`
      );
      if (data?.success && data.advertisement) {
        requestCache.videoAd = data.advertisement;
        requestCache.videoAdTimestamp = now;
        return data.advertisement;
      }
      return null;
    } catch {
      return null;
    }
  },

  getTopBannerAd: async (): Promise<Advertisement | null> => {
    try {
      const data = await safeGet<{ success?: boolean; advertisement?: Advertisement }>(
        `${API_URL}/advertisements/random?type=banner_top`
      );
      return data?.success && data.advertisement ? data.advertisement : null;
    } catch {
      return null;
    }
  },

  getBottomBannerAd: async (): Promise<Advertisement | null> => {
    try {
      const data = await safeGet<{ success?: boolean; advertisement?: Advertisement }>(
        `${API_URL}/advertisements/random?type=banner_bottom`
      );
      return data?.success && data.advertisement ? data.advertisement : null;
    } catch {
      return null;
    }
  },

  getMultipleBannerAds: async (position: 'top' | 'bottom' = 'top', limit = 3): Promise<Advertisement[]> => {
    try {
      const type = position === 'top' ? 'banner_top' : 'banner_bottom';
      const data = await safeGet<{ success?: boolean; advertisements?: Advertisement[] }>(
        `${API_URL}/advertisements/random?type=${type}&limit=${limit}`
      );
      if (data?.success && Array.isArray(data.advertisements) && data.advertisements.length > 0) {
        return data.advertisements;
      }
      const single = position === 'top' ? await adService.getTopBannerAd() : await adService.getBottomBannerAd();
      return single ? [single] : [];
    } catch {
      return [];
    }
  },

  getMultipleVideoAds: async (limit = 1): Promise<Advertisement[]> => {
    try {
      const now = Date.now();
      if (limit === 1 && requestCache.videoAd && now - requestCache.videoAdTimestamp < requestCache.cacheDuration) {
        return [requestCache.videoAd];
      }
      const data = await safeGet<{ success?: boolean; advertisements?: Advertisement[] }>(
        `${API_URL}/advertisements/random?type=video&limit=${limit}`
      );
      if (data?.success && Array.isArray(data.advertisements) && data.advertisements.length > 0) {
        requestCache.videoAd = data.advertisements[0];
        requestCache.videoAdTimestamp = now;
        return data.advertisements;
      }
      const single = await adService.getRandomVideoAd();
      return single ? [single] : [];
    } catch {
      return [];
    }
  },

  trackAdImpression: async (adId: string): Promise<boolean> => {
    try {
      const data = await axios.post<{ success?: boolean }>(
        `${API_URL}/advertisements/view`,
        { adId },
        { timeout: 1200 }
      ).then((r) => r.data).catch(() => null);
      return Boolean(data?.success);
    } catch {
      return false;
    }
  },

  trackAdClick: async (adId: string): Promise<boolean> => {
    try {
      const data = await axios.post<{ success?: boolean }>(
        `${API_URL}/advertisements/click`,
        { adId },
        { timeout: 1200 }
      ).then((r) => r.data).catch(() => null);
      return Boolean(data?.success);
    } catch {
      return false;
    }
  },

  trackAdSkip: async (adId: string): Promise<boolean> => {
    try {
      const data = await axios.post<{ success?: boolean }>(
        `${API_URL}/advertisements/skip`,
        { adId },
        { timeout: 1200 }
      ).then((r) => r.data).catch(() => null);
      return Boolean(data?.success);
    } catch {
      return false;
    }
  },

  getAllAds: async (page = 1, limit = 10, type: string | null = null, active: boolean | null = null): Promise<AdListResult> => {
    try {
      let url = `${API_URL}/advertisements?page=${page}&limit=${limit}`;
      if (type) url += `&type=${type}`;
      if (active !== null) url += `&active=${active}`;
      const data = await safeGet<AdListResult>(url, 1500);
      if (data) return data;
      return { success: false, advertisements: [], totalPages: 1, error: 'Network error or backend unavailable' };
    } catch {
      return { success: false, advertisements: [], totalPages: 1, error: 'Network error or backend unavailable' };
    }
  },

  getAdById: async (id: string): Promise<Advertisement | null> => {
    try {
      const data = await safeGet<{ advertisement?: Advertisement }>(`${API_URL}/advertisements/${id}`, 1500);
      return data?.advertisement || null;
    } catch {
      return null;
    }
  },

  createAd: async (adData: Record<string, unknown>): Promise<Record<string, unknown>> => {
    try {
      const response = await axios.post(`${API_URL}/advertisements`, adData, { timeout: 2000 })
        .then((r) => r.data)
        .catch((err) => err?.response?.data || null);
      return response || { success: false, error: 'Cannot connect to server' };
    } catch (error) {
      return { success: false, error: (error as Error).message || 'Cannot connect to server' };
    }
  },

  updateAd: async (id: string, adData: Record<string, unknown>): Promise<Record<string, unknown>> => {
    try {
      const response = await axios.put(`${API_URL}/advertisements/${id}`, adData, { timeout: 2000 })
        .then((r) => r.data)
        .catch((err) => err?.response?.data || null);
      return response || { success: false, error: 'Cannot connect to server' };
    } catch (error) {
      return { success: false, error: (error as Error).message || 'Cannot connect to server' };
    }
  },

  deleteAd: async (id: string): Promise<Record<string, unknown>> => {
    try {
      const response = await axios.delete(`${API_URL}/advertisements/${id}`, { timeout: 2000 })
        .then((r) => r.data)
        .catch((err) => err?.response?.data || null);
      return response || { success: false, error: 'Cannot connect to server' };
    } catch (error) {
      return { success: false, error: (error as Error).message || 'Cannot connect to server' };
    }
  },

  clearCache: (): boolean => {
    requestCache.videoAd = null;
    requestCache.videoAdTimestamp = 0;
    requestCache.bannerTopAd = null;
    requestCache.bannerTopTimestamp = 0;
    requestCache.bannerBottomAd = null;
    requestCache.bannerBottomTimestamp = 0;
    return true;
  }
};

export default adService;
