import React, { useState, useEffect } from 'react';
// MovieSection is currently a .js module, so we cast it to a typed component
// to satisfy strict TypeScript checks until the component itself is migrated.
import { MovieSection as MovieSectionRaw } from '@/features/shared/components/MovieSection';
const MovieSection = MovieSectionRaw as unknown as React.FC<Record<string, unknown>>;

/**
 * @file CountryMoviesSection.tsx
 * @description Dynamic, config-driven component for Country Drama rails.
 * Completely decoupled: rail titles, badges, links, and data loaders are defined in homeSectionsConfig.
 */

/** Rail entry từ config */
export interface RailConfig {
  id: string;
  title?: string;
  badge?: string;
  viewAllHref?: string;
  load?: (fallback?: unknown[]) => Promise<unknown[]>;
}

export interface CountryMoviesSectionProps {
  cardSize?: 'sm' | 'md' | 'lg';
  rails?: RailConfig[];
  onPlayTrailer?: (movie: Record<string, unknown>) => void;
}

const CountryMoviesSection: React.FC<CountryMoviesSectionProps> = ({
  cardSize = 'md',
  rails = [],
  onPlayTrailer
}) => {
  const [railData, setRailData] = useState<Record<string, unknown[]>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isSubscribed = true;

    const fetchAllRails = async (): Promise<void> => {
      try {
        setLoading(true);

        const results = await Promise.all(
          rails.map(async (rail) => {
            if (typeof rail.load === 'function') {
              const data = await rail.load([]);
              return { id: rail.id, data: Array.isArray(data) ? data : [] };
            }
            return { id: rail.id, data: [] };
          })
        );

        if (isSubscribed) {
          const updated: Record<string, unknown[]> = {};
          results.forEach(({ id, data }) => {
            updated[id] = data;
          });
          setRailData(updated);
        }
      } catch {
        if (isSubscribed) {
          setRailData({});
        }
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    fetchAllRails();

    return () => {
      isSubscribed = false;
    };
  }, [rails]);

  return (
    <div className="movie-country-rails">
      {rails.map((rail) => (
        <MovieSection
          key={rail.id}
          title={rail.title}
          badge={rail.badge}
          viewAllHref={rail.viewAllHref}
          layout="rail"
          variant="vertical"
          cardSize={cardSize}
          movies={railData[rail.id] || []}
          loading={loading}
          onPlayTrailer={onPlayTrailer}
        />
      ))}
    </div>
  );
};

export default CountryMoviesSection;
