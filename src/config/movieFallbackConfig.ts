/**
 * The central declaration of the fallback constants for the movies and the
 * media.
 *
 * The file only contains pure configuration, without any conversion logic.
 * The normalization logic lives in `@/utils/movieNormalizer`.
 */

// The default cinema backdrops. They are high quality images hosted on a
// global CDN.
// They are used when the backend has no 'backdrop_url' or 'poster_url' for
// a movie.
export const HERO_FALLBACK_BACKDROPS: readonly string[] = [
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1574267432553-4b4628081c31?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1920&auto=format&fit=crop'
];

// The local fallback backdrop, located in the public folder of the project.
// It is an operating system style placeholder image with a 16:9 ratio.
export const LOCAL_DEFAULT_BACKDROP = '/img/placeholder-backdrop.svg';

// The local fallback poster, located in the public folder of the project.
// It is an operating system style placeholder image with a 2:3 ratio.
export const LOCAL_DEFAULT_POSTER = '/img/placeholder-poster.svg';

// The default values used when a property coming from the backend is null,
// undefined or empty.
export const MOVIE_FALLBACK_DEFAULTS = {
  // The default release year, used when the server returns an empty value.
  year: new Date().getFullYear(),

  // The default label of the video resolution.
  quality: 'FHD',

  // The default rating, used when `tmdb.vote_average` or `rating` is 0 or
  // missing.
  rating: '8.6',

  // The default description, used when the description or the content is
  // missing.
  description:
    'Khám phá ngay bộ phim hấp dẫn với chất lượng hình ảnh sắc nét, âm thanh sống động và trải nghiệm điện ảnh đỉnh cao.',

  // The fallback rule of the subtitle: when `origin_name` is empty the
  // `movie.name` is used, so the layout does not shrink.
  useNameAsSubTitle: true
} as const;

// The normalization helpers are re-exported from `@/utils/movieNormalizer`,
// so every existing import keeps working.
export {
  resolveMovieBackdrop,
  resolveMovieSubTitle,
  resolveMovieCategories,
  resolveMovieYear,
  resolveMovieQuality,
  normalizeHeroMovie,
  resolveMovieActors,
  resolveMovieDirectors,
  resolveImageUrl
} from '@/utils/movieNormalizer';
