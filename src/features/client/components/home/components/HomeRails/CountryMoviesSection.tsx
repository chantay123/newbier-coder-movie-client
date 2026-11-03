import React, { useState, useEffect, useMemo } from 'react';
import { MovieSection as MovieSectionRaw } from '@/features/shared/components/MovieSection';
import { filterMoviesWithValidTrailer } from '@/utils/trailer';

const MovieSection = MovieSectionRaw as unknown as React.FC<Record<string, unknown>>;

/**
 * A dynamic and config driven component for the country drama rails.
 *
 * It is completely decoupled: the rail titles, the badges, the links and
 * the data loaders are defined in `homeSectionsConfig`.
 */

/** A rail entry coming from the config. */
export interface RailConfig {
  id: string;
  title?: string;
  badge?: string;
  viewAllHref?: string;
  load?: (fallback?: unknown[]) => Promise<unknown[]>;
}

/**
 * The defensive check that tells whether a movie has a poster URL the
 * `<img>` element can load.
 *
 * It returns `false` when the payload has no `poster_url`, `thumb_url` or
 * `imagePoster`, or when the URL is empty or is not http(s). The purpose
 * is to hide the movies that cannot show an image before they reach the
 * `MovieSection`, so the home page never shows a broken image icon.
 */
const hasDisplayablePoster = (m: Record<string, unknown>): boolean => {
  const candidates = [m.poster_url, m.posterUrl, m.thumb_url, m.thumbUrl, m.imagePoster];
  for (const raw of candidates) {
    if (typeof raw !== 'string') continue;
    const v = raw.trim();
    if (!v) continue;
    if (/^https?:\/\//i.test(v)) return true;
  }
  return false;
};

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
            if (typeof rail.load !== 'function') {
              return { id: rail.id, data: [] as unknown[] };
            }
            const rawData = await rail.load([]);

            // STEP 1: only the movies with a valid trailer are kept. This
            // is the same rule as the hero and the Top 10, so every rail
            // shows the same kind of movie.
            const withTrailer = filterMoviesWithValidTrailer(
              (Array.isArray(rawData) ? rawData : []) as unknown[]
            );

            // STEP 2: the movies without a valid poster URL are removed
            // as well, so the image never shows a broken image icon. This
            // is the defense in depth: even when the `MovieSection` has
            // no `onError` handler, the country rail never shows a movie
            // with a broken image.
            const withPoster = withTrailer.filter((m) =>
              hasDisplayablePoster(m as Record<string, unknown>)
            );

            return { id: rail.id, data: withPoster };
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

  // Memo derived data so we don't recreate the movies array on every render
  const derivedRails = useMemo(
    () => rails.map((rail) => ({ ...rail, data: railData[rail.id] || [] })),
    [rails, railData]
  );

  return (
    <div className="movie-country-rails">
      {derivedRails.map((rail) => (
        <MovieSection
          key={rail.id}
          title={rail.title}
          badge={rail.badge}
          viewAllHref={rail.viewAllHref}
          layout="rail"
          variant="vertical"
          cardSize={cardSize}
          movies={rail.data}
          loading={loading}
          onPlayTrailer={onPlayTrailer}
        />
      ))}
    </div>
  );
};

export default CountryMoviesSection;
