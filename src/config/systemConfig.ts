/**
 * @file systemConfig.ts
 * @description Nguồn cấu hình hệ thống duy nhất (Single Source of Truth) cho toàn bộ ứng dụng.
 * Gom các URL API, timeout mạng, chế độ dữ liệu và tiêu chuẩn UI/pagination toàn cục.
 */

import { LOCAL_DEFAULT_BACKDROP, LOCAL_DEFAULT_POSTER } from './movieFallbackConfig';
import { AUTH_CONFIG } from './authConfig';

/** Helper lấy image origin từ URL cấu hình, an toàn khi env rỗng */
function getImageOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_CORE_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
  try {
    return new URL(raw).origin;
  } catch {
    return '';
  }
}

// Cấu hình hệ thống toàn cục.
export const SYSTEM_CONFIG = {
  // Thông tin ứng dụng
  appName: 'NewbieCoder Movies',
  appVersion: '1.0.0',

  // Ngôn ngữ đang dùng (mặc định 'vi')
  locale: process.env.NEXT_PUBLIC_LOCALE || 'vi',

  // URL gốc của backend - chỉ đọc từ biến môi trường
  apiBaseUrl: (
    process.env.NEXT_PUBLIC_CORE_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ''
  ).replace(/\/+$/, ''),

  // Chế độ tải dữ liệu:
  // - 'api_only': chỉ gọi API thật, nếu lỗi trả mảng rỗng
  dataMode: process.env.NEXT_PUBLIC_DATA_MODE || 'api_only',

  // Bật/tắt cơ chế snapshot cho trang chủ
  enableHomepageSnapshot: process.env.NEXT_PUBLIC_ENABLE_HOMEPAGE_SNAPSHOT === 'true',

  // Cờ dùng dữ liệu mock
  useMockData: process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true',

  // Cờ log chẩn đoán cho image / movie payload
  debugMovies: process.env.NEXT_PUBLIC_DEBUG_MOVIES === 'true',

  // Timeout HTTP toàn cục, đơn vị mili-giây
  networkTimeoutMs: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '8000', 10),

  // Cấu hình UI và phân trang mặc định
  ui: {
    itemsPerPage: 20,
    defaultPoster: LOCAL_DEFAULT_POSTER,
    defaultBackdrop: LOCAL_DEFAULT_BACKDROP,
    heroAutoPlayInterval: parseInt(process.env.NEXT_PUBLIC_HERO_AUTOPLAY_INTERVAL || '6000', 10),
    heroDescLimit: parseInt(process.env.NEXT_PUBLIC_HERO_DESC_LIMIT || '220', 10)
  },

  // Origin dùng để ghép URL ảnh tương đối.
  imageOrigin: getImageOrigin(),

  // Cấu hình TMDB External API
  tmdb: {
    apiKey: process.env.NEXT_PUBLIC_TMDB_API_KEY || '5739ebb7d66fa1dd775f806325ab4067',
    authToken: process.env.NEXT_PUBLIC_TMDB_AUTH_TOKEN || '',
    baseUrl: (process.env.NEXT_PUBLIC_TMDB_BASE_URL || 'https://api.themoviedb.org/3').replace(/\/+$/, ''),
    imageBaseUrl: (process.env.NEXT_PUBLIC_TMDB_IMAGE_URL || 'https://image.tmdb.org/t/p').replace(/\/+$/, ''),
    imageSizes: {
      avatar: 'w185',
      poster: 'w500',
      backdrop: 'w1280',
      original: 'original'
    },
    // Hàm ghép URL ảnh TMDB theo size, có fallback
    getImageUrl: (path: string | null | undefined, size: string = 'w500', fallback: string = '/img/default-poster.jpg') => {
      if (!path) return fallback;
      if (path.startsWith('http')) return path;
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      const base = (process.env.NEXT_PUBLIC_TMDB_IMAGE_URL || 'https://image.tmdb.org/t/p').replace(/\/+$/, '');
      return `${base}/${size}${cleanPath}`;
    }
  },

  // Cấu hình YouTube
  youtube: {
    embedBaseUrl: 'https://www.youtube.com/embed',
    watchBaseUrl: 'https://www.youtube.com/watch?v=',
    getEmbedUrl: (videoKey: string, params: string = 'autoplay=1&rel=0&modestbranding=1') => {
      if (!videoKey) return '';
      return `https://www.youtube.com/embed/${videoKey}?${params}`;
    }
  },

  // Cấu hình xác thực & asset
  auth: AUTH_CONFIG
} as const;

export const TMDB_CONFIG = SYSTEM_CONFIG.tmdb;
export const YOUTUBE_CONFIG = SYSTEM_CONFIG.youtube;
export { AUTH_CONFIG };

export default SYSTEM_CONFIG;
