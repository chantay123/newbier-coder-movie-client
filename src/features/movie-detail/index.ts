/**
 * @file features/movie-detail/index.ts
 * @description Backward-compatible barrel re-export from new location.
 * All movie-detail feature exports are now in features/client/components/detail/.
 */
export { default as TrailerModal, type TrailerMovie } from '@/features/client/components/detail/components/TrailerModal';
export { default as RatingStats, RatingContext } from '@/features/client/components/detail/components/RatingStats';
export { default as UserRatingDetails } from '@/features/client/components/detail/components/UserRatingDetails';
export { default as MovieRating } from '@/features/client/components/detail/components/MovieRating';
export { default as ReportButton } from '@/features/client/components/detail/components/ReportButton';
export { default as ShareButton } from '@/features/client/components/detail/components/ShareButton';

export { default as MovieHeroHeader, type HeroHeaderMovie } from '@/features/client/components/detail/components/MovieHeroHeader/MovieHeroHeader';
export { default as MoviePlayerSection } from '@/features/client/components/detail/components/MoviePlayerSection/MoviePlayerSection';
export { default as EpisodeSelector } from '@/features/client/components/detail/components/EpisodeSelector/EpisodeSelector';
export { default as EpisodeDirectory } from '@/features/client/components/detail/components/EpisodeDirectory/EpisodeDirectory';
export { default as WatchSidebarPlaylist } from '@/features/client/components/detail/components/WatchSidebarPlaylist/WatchSidebarPlaylist';
export { default as ServerVersionSelector } from '@/features/client/components/detail/components/ServerVersionSelector/ServerVersionSelector';
export { default as TrendingSidebar } from '@/features/client/components/detail/components/TrendingSidebar/TrendingSidebar';
export { default as CastCrewSection, type CastCrewPerson } from '@/features/client/components/detail/components/CastCrewSection/CastCrewSection';
export { default as MovieMetaBento } from '@/features/client/components/detail/components/MovieMetaBento/MovieMetaBento';
export { default as MovieCommentsSection } from '@/features/client/components/detail/components/MovieCommentsSection/MovieCommentsSection';
export { default as InlineTrailerSection } from '@/features/client/components/detail/components/InlineTrailerSection/InlineTrailerSection';
export { default as BroadcastScheduleCard } from '@/features/client/components/detail/components/BroadcastSchedule/BroadcastScheduleCard';
export { default as CuratorRecommendation } from '@/features/client/components/detail/components/CuratorRecommendation/CuratorRecommendation';
export { default as SimilarMoviesSection, type SimilarMovieItem } from '@/features/client/components/detail/components/SimilarMoviesSection/SimilarMoviesSection';

export { useMovieDetail, normalizeMovieDetail, type MovieDetailError } from '@/features/client/components/detail/hooks/useMovieDetail';
