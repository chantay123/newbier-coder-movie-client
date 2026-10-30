import React from 'react';
// MovieSection is currently a .js module, so we cast it to a typed component
// to satisfy strict TypeScript checks until the component itself is migrated.
import { MovieSection as MovieSectionRaw } from '@/features/shared/components/MovieSection';
const MovieSection = MovieSectionRaw as unknown as React.FC<Record<string, unknown>>;

/**
 * A preset component for the "Top recommended movies" carousel rail.
 */

export interface TopRecommendedSectionProps {
  movies?: Record<string, unknown>[];
  cardSize?: 'sm' | 'md' | 'lg';
  cardWidth?: { desktop?: number; tablet?: number; mobile?: number };
  loading?: boolean;
  onPlayTrailer?: (movie: Record<string, unknown>) => void;
  [key: string]: unknown;
}

const TopRecommendedSection: React.FC<TopRecommendedSectionProps> = ({
  movies = [],
  cardSize = 'md',
  cardWidth,
  loading = false,
  onPlayTrailer,
  ...restProps
}) => {
  return (
    <MovieSection
      title="Phim Đề Xuất"
      badge="HOT"
      viewAllHref="/browse/movies?type=all&sort=highest-rating"
      layout="rail"
      variant="vertical"
      cardSize={cardSize}
      cardWidth={cardWidth}
      movies={movies}
      loading={loading}
      onPlayTrailer={onPlayTrailer}
      {...restProps}
    />
  );
};

export default TopRecommendedSection;
