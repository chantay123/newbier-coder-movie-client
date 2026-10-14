import React from 'react';
// MovieSection is currently a .js module, so we cast it to a typed component
// to satisfy strict TypeScript checks until the component itself is migrated.
import { MovieSection as MovieSectionRaw } from '@/components/common/MovieSection';
const MovieSection = MovieSectionRaw as unknown as React.FC<Record<string, unknown>>;

/**
 * @file UpcomingMoviesSection.tsx
 * @description Preset component for 'Phim Sắp Ra Mắt' carousel rail.
 */

export interface UpcomingMoviesSectionProps {
  movies?: Record<string, unknown>[];
  cardSize?: 'sm' | 'md' | 'lg';
  cardWidth?: { desktop?: number; tablet?: number; mobile?: number };
  loading?: boolean;
  onPlayTrailer?: (movie: Record<string, unknown>) => void;
  [key: string]: unknown;
}

const UpcomingMoviesSection: React.FC<UpcomingMoviesSectionProps> = ({
  movies = [],
  cardSize = 'md',
  cardWidth,
  loading = false,
  onPlayTrailer,
  ...restProps
}) => {
  return (
    <MovieSection
      title="Phim Sắp Ra Mắt"
      badge="SẮP CHIẾU"
      viewAllHref="/danh-sach/phim-sap-chieu"
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

export default UpcomingMoviesSection;
