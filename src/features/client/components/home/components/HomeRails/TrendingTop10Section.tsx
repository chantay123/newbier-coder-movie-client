import React from 'react';
// MovieSection is currently a .js module, so we cast it to a typed component
// to satisfy strict TypeScript checks until the component itself is migrated.
import { MovieSection as MovieSectionRaw } from '@/features/shared/components/MovieSection';
const MovieSection = MovieSectionRaw as unknown as React.FC<Record<string, unknown>>;

/**
 * @file TrendingTop10Section.tsx
 * @description Preset component for 'Phim Được Xem Nhiều Nhất (TOP 10)' carousel rail.
 */

export interface TrendingTop10SectionProps {
  movies?: Record<string, unknown>[];
  cardSize?: 'sm' | 'md' | 'lg';
  cardWidth?: { desktop?: number; tablet?: number; mobile?: number };
  loading?: boolean;
  onPlayTrailer?: (movie: Record<string, unknown>) => void;
  [key: string]: unknown;
}

const TrendingTop10Section: React.FC<TrendingTop10SectionProps> = ({
  movies = [],
  cardSize = 'md',
  cardWidth,
  loading = false,
  onPlayTrailer,
  ...restProps
}) => {
  return (
    <MovieSection
      title="Phim Được Xem Nhiều Nhất"
      badge="TOP 10"
      viewAllHref="/danh-sach/phim-hot"
      layout="rail"
      variant="horizontal"
      showRank={true}
      cardSize={cardSize}
      cardWidth={cardWidth}
      movies={movies}
      loading={loading}
      onPlayTrailer={onPlayTrailer}
      {...restProps}
    />
  );
};

export default TrendingTop10Section;
