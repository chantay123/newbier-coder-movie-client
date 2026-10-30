import React from 'react';
// MovieSection is currently a .js module, so we cast it to a typed component
// to satisfy strict TypeScript checks until the component itself is migrated.
import { MovieSection as MovieSectionRaw } from '@/features/shared/components/MovieSection';
const MovieSection = MovieSectionRaw as unknown as React.FC<Record<string, unknown>>;

/**
 * A preset component for the "Recently updated movies" cinema rail.
 */

export interface LatestMoviesGridSectionProps {
  movies?: Record<string, unknown>[];
  cardSize?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  onPlayTrailer?: (movie: Record<string, unknown>) => void;
  [key: string]: unknown;
}

const LatestMoviesGridSection: React.FC<LatestMoviesGridSectionProps> = ({
  movies = [],
  cardSize = 'md',
  loading = false,
  onPlayTrailer,
  ...restProps
}) => {
  return (
    <MovieSection
      title="Phim Mới Cập Nhật"
      badge="MỚI NHẤT"
      viewAllHref="/browse/movies?type=all&sort=newest"
      viewAllText="Xem tất cả"
      layout="rail"
      variant="vertical"
      cardSize={cardSize}
      movies={movies}
      loading={loading}
      onPlayTrailer={onPlayTrailer}
      {...restProps}
    />
  );
};

export default LatestMoviesGridSection;
