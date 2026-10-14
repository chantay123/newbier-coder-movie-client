/**
 * @file Movie/index.tsx
 * @description Centralized Backward-Compatibility Barrel for Movie components.
 * Delegates seamlessly to the new Feature-Driven & Common architecture.
 */

// Common Shared Base Components
export { MovieSection, SectionHeader } from '@/features/shared/components/MovieSection';
export { MovieCardVertical, MovieCardHorizontal } from '@/features/shared/components/MovieCard';

// Home Feature Components & Rails
export {
  HeroBanner,
  FeaturedCarousel3D,
  TopRecommendedSection,
  TrendingTop10Section,
  UpcomingMoviesSection,
  CountryMoviesSection,
  LatestMoviesGridSection
} from '@/features/home';

// Movie Detail & Player Feature Components
export {
  TrailerModal,
  RatingStats,
  MovieRating,
  ReportButton,
  ShareButton,
  UserRatingDetails
} from '@/features/movie-detail';

// Search & Browse Filter (lives in src/components/Movie — self-contained)
export {
  default as MovieFilter,
  INITIAL_MOVIE_FILTER_STATE,
  filterStateToQueryParams
} from './MovieFilter';
export type { MovieFilterState } from './MovieFilter';

// Legacy Compatibility components (self-contained rails/grid implementations)
export { default as MovieCarouselSection } from './MovieCarouselSection';
export { default as MovieGridSection } from './MovieGridSection';
export { default as MovieCountrySection } from './MovieCountrySection';
