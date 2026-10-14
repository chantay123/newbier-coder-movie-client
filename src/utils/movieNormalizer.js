/**
 * @file movieNormalizer.js
 * @description Defensive data transformers and normalizers for movie entities.
 * Ensures consistent object shapes and prevents layout breaks across all UI components.
 */

import {
  LOCAL_DEFAULT_BACKDROP,
  LOCAL_DEFAULT_POSTER,
  MOVIE_FALLBACK_DEFAULTS
} from '@/config/movieFallbackConfig';
import { SYSTEM_CONFIG } from '@/config/systemConfig';

/**
 * Resolves a possibly-relative image URL from the backend into a fully
 * qualified URL the browser can load.
 *
 * Rules (priority order, applied in sequence):
 *   1. Falsy / empty / non-string -> empty string (caller decides fallback).
 *   2. Already absolute (http://, https://, data:, blob:) -> used as-is.
 *   3. Protocol-relative (//cdn.example.com/...) -> prefixed with
 *      `window.location.protocol` when available, otherwise 'https:'.
 *   4. Host-relative (/uploads/poster.jpg) -> combined with
 *      SYSTEM_CONFIG.imageOrigin (origin of NEXT_PUBLIC_CORE_API_URL).
 *      This handles the case where the backend returns paths such as
 *      `/uploads/poster.jpg` or `/static/movies/abc.jpg`.
 *   5. Anything else -> returned as-is so the browser can attempt the
 *      request and surface a clear 404/CORS error in DevTools.
 *
 * The function is intentionally permissive: if the resolver cannot
 * confidently build a URL, it returns the input unchanged rather than
 * silently substituting a placeholder. This makes broken URLs visible
 * in the Network tab instead of being masked by a fallback image.
 *
 * @param {string|null|undefined} url - Raw URL from the API.
 * @returns {string} Fully qualified URL or the input string when it
 *   cannot be safely combined.
 */
export const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const cleaned = url.trim();
  if (cleaned === '') return '';

  // Already absolute (http, https, data, blob).
  if (/^(https?:|data:|blob:)/i.test(cleaned)) return cleaned;

  // Protocol-relative URL.
  if (cleaned.startsWith('//')) {
    const proto = (typeof window !== 'undefined' && window.location?.protocol) || 'https:';
    return `${proto}${cleaned}`;
  }

  // Host-relative URL: combine with the configured image origin.
  if (cleaned.startsWith('/')) {
    const origin = SYSTEM_CONFIG.imageOrigin || '';
    if (origin) return `${origin}${cleaned}`;
    return cleaned;
  }

  // Unknown shape — return as-is. The Network panel will show why it
  // failed (often 404 or a relative path that resolves to the current
  // dev origin).
  return cleaned;
};

/**
 * Safely resolves the best available backdrop or poster URL for a movie.
 * Hierarchy: backdrop_url -> poster_url -> thumb_url -> OS-style placeholder SVG.
 *
 * @param {Object} [movie] - Raw movie object from backend API.
 * @param {number} [fallbackIndex=0] - Index parameter preserved for signature compatibility.
 * @returns {string} Validated image URL (always absolute when possible).
 */
export const resolveMovieBackdrop = (movie, fallbackIndex = 0) => {
  if (!movie) return LOCAL_DEFAULT_BACKDROP;

  // Single source of truth for image field discovery.
  // Tries all known shape variants so the banner can survive different
  // backend schemas without us hardcoding contract changes.
  const candidates = [
    movie.backdrop_url,
    movie.backdrop,
    movie.backdropUrl,
    movie.image_backdrop,
    movie.imageBackdrop,
    movie.poster_url,
    movie.poster,
    movie.posterUrl,
    movie.thumb_url,
    movie.thumb,
    movie.thumbUrl,
    movie.image,
    movie.imageUrl
  ];
  for (const candidate of candidates) {
    const resolved = resolveImageUrl(candidate);
    if (resolved) return resolved;
  }

  return LOCAL_DEFAULT_BACKDROP;
};

/**
 * Safely resolves the subtitle / original title.
 * Prevents baseline height jumps if the server has not populated origin_name yet.
 *
 * @param {Object} [movie] - Movie object.
 * @returns {string} Subtitle text or duplicate of movie.name.
 */
export const resolveMovieSubTitle = (movie) => {
  if (!movie) return '\u00A0';

  if (movie.origin_name && typeof movie.origin_name === 'string' && movie.origin_name.trim() !== '') {
    return movie.origin_name.trim();
  }

  return movie.name || '\u00A0';
};

/**
 * Safely resolves movie categories.
 * If backend category array is empty, dynamically synthesizes informative badges.
 *
 * @param {Object} [movie] - Movie object.
 * @returns {Array<{ name: string, slug: string }>} Array of category items.
 */
export const resolveMovieCategories = (movie) => {
  if (movie?.category && Array.isArray(movie.category) && movie.category.length > 0) {
    return movie.category;
  }

  const synthesized = [];

  if (movie?.type === 'series') {
    synthesized.push({ name: 'Phim Bộ Đặc Sắc', slug: 'phim-bo' });
  } else {
    synthesized.push({ name: 'Phim Lẻ Chiếu Rạp', slug: 'phim-le' });
  }

  if (movie?.lang && typeof movie.lang === 'string') {
    synthesized.push({ name: movie.lang, slug: 'ngon-ngu' });
  } else {
    synthesized.push({ name: 'Thịnh Hành', slug: 'thinh-hanh' });
  }

  return synthesized;
};

/**
 * Safely resolves movie release year.
 *
 * @param {Object} [movie] - Movie object.
 * @returns {string|number} Validated year.
 */
export const resolveMovieYear = (movie) => {
  if (movie?.year && String(movie.year).trim() !== '') {
    return movie.year;
  }
  return MOVIE_FALLBACK_DEFAULTS.year;
};

/**
 * Safely resolves movie video quality label.
 *
 * @param {Object} [movie] - Movie object.
 * @returns {string} Standardized quality label.
 */
export const resolveMovieQuality = (movie) => {
  if (movie?.quality && typeof movie.quality === 'string' && movie.quality.trim() !== '') {
    return movie.quality.trim() === '4K' ? '4K Ultra HD' : movie.quality.trim();
  }
  return MOVIE_FALLBACK_DEFAULTS.quality;
};

/**
 * Master Defensive Normalizer for Hero Spotlight Movies.
 * Merges raw server data with safe fallbacks to produce a 100% resilient movie schema.
 *
 * @param {Object} rawMovie - Raw movie object directly from Backend API.
 * @param {number} [index=0] - Carousel slide index.
 * @returns {Object} Fully normalized, battle-tested movie object.
 */
export const normalizeHeroMovie = (rawMovie, index = 0) => {
  if (!rawMovie) return null;

  // Discover all possible image fields the backend might use. The
  // backend team has not fully committed to a single field name
  // across endpoints, so we collect candidates instead of trusting
  // a single key. We keep `poster_url`/`thumb_url`/`backdrop_url`
  // as the primary contract — defined in src/mock/mockMovies.js —
  // and add common alternates as a defensive secondary.
  const posterCandidates = [
    rawMovie.poster_url,
    rawMovie.poster,
    rawMovie.posterUrl,
    rawMovie.image
  ];
  const thumbCandidates = [
    rawMovie.thumb_url,
    rawMovie.thumb,
    rawMovie.thumbUrl,
    rawMovie.thumbnail
  ];
  const backdropCandidates = [
    rawMovie.backdrop_url,
    rawMovie.backdrop,
    rawMovie.backdropUrl,
    rawMovie.cover
  ];

  // Resolve each image field to an absolute URL when possible.
  // We never let a falsy value from one field overwrite a real URL
  // from another.
  const resolveFirstUsable = (candidates) => {
    for (const c of candidates) {
      const r = resolveImageUrl(c);
      if (r) return r;
    }
    return '';
  };

  const resolvedBackdrop = resolveFirstUsable(backdropCandidates)
    || resolveMovieBackdrop(rawMovie, index);
  const resolvedPoster = resolveFirstUsable(posterCandidates)
    || resolveFirstUsable(thumbCandidates)
    || LOCAL_DEFAULT_POSTER;
  const resolvedThumb = resolveFirstUsable(thumbCandidates)
    || resolveFirstUsable(posterCandidates)
    || resolvedPoster
    || LOCAL_DEFAULT_POSTER;

  return {
    ...rawMovie,
    _id: rawMovie._id || rawMovie.id || `hero-${index}`,
    name: rawMovie.name || 'Phim Đang Cập Nhật',
    origin_name: resolveMovieSubTitle(rawMovie),
    backdrop_url: resolvedBackdrop || LOCAL_DEFAULT_BACKDROP,
    poster_url: resolvedPoster,
    thumb_url: resolvedThumb,
    year: resolveMovieYear(rawMovie),
    quality: resolveMovieQuality(rawMovie),
    category: resolveMovieCategories(rawMovie),
    content: rawMovie.content || rawMovie.description || MOVIE_FALLBACK_DEFAULTS.description,
    rating: rawMovie.vote_average || rawMovie.rating || rawMovie.tmdb?.vote_average || MOVIE_FALLBACK_DEFAULTS.rating,
    time: rawMovie.time || (rawMovie.type === 'series' ? '45 phút/tập' : '110 phút'),
    lang: rawMovie.lang || 'Vietsub'
  };
};

/**
 * Safely resolves actors array with rich profiles.
 *
 * @param {Object} [movie] - Movie object.
 * @returns {Array<Object>} Array of actor objects { name, role, avatar_url, slug }.
 */
export const resolveMovieActors = (movie) => {
  if (!movie) return [];

  if (Array.isArray(movie.actor) && movie.actor.length > 0) {
    return movie.actor.map((a, i) => (
      typeof a === 'string'
        ? { name: a.trim(), role: 'Diễn viên', slug: `actor-${i}` }
        : { ...a, role: a.role || 'Diễn viên' }
    ));
  }
  if (typeof movie.actor === 'string' && movie.actor.trim() !== '') {
    return movie.actor.split(',').map((name, i) => ({
      name: name.trim(),
      role: 'Diễn viên',
      slug: `actor-${i}`
    }));
  }

  return [];
};

/**
 * Safely resolves directors array.
 *
 * @param {Object} [movie] - Movie object.
 * @returns {Array<Object>} Array of director objects.
 */
export const resolveMovieDirectors = (movie) => {
  if (!movie) return [];

  if (Array.isArray(movie.director) && movie.director.length > 0) {
    return movie.director.map((d, i) => (
      typeof d === 'string'
        ? { name: d.trim(), role: 'Đạo diễn', slug: `director-${i}` }
        : { ...d, role: d.role || 'Đạo diễn' }
    )).filter((d) => d.name);
  }
  if (typeof movie.director === 'string' && movie.director.trim() !== '') {
    return movie.director.split(',').map((name, i) => ({
      name: name.trim(),
      role: 'Đạo diễn',
      slug: `director-${i}`
    })).filter((d) => d.name);
  }

  return [];
};
