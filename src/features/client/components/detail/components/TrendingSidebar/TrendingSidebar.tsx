import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import movieService from '@/API/services/movieService';
import { LOCAL_DEFAULT_POSTER } from '@/config/movieFallbackConfig';
import { WATCH_CONFIG } from '@/config/watchConfig';
import { pickImageSrc, POSTER_FIELDS } from '@/utils/imageSource';
import styles from './TrendingSidebar.module.css';

/**
 * A small sidebar that recommends a few other movies to the visitor.
 */

export interface RecommendedMovie {
  _id?: string;
  slug?: string;
  name?: string;
  origin_name?: string;
  year?: number | string;
  quality?: string;
  episode_current?: string;
  poster_url?: string;
  thumb_url?: string;
}

export interface TrendingSidebarProps {
  currentSlug?: string;
}

const TrendingSidebar: React.FC<TrendingSidebarProps> = ({ currentSlug = '' }) => {
  const [movies, setMovies] = useState<RecommendedMovie[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const { limit, title: sectionTitle, emptyText } = WATCH_CONFIG.recommendations;

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchRecommended = async (): Promise<void> => {
      setLoading(true);
      try {
        const list = (await movieService.getTop10Movies(controller.signal)) as RecommendedMovie[];
        if (isMounted) {
          setMovies(Array.isArray(list) ? list : []);
        }
      } catch {
        if (isMounted) {
          setMovies([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRecommended();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const displayedMovies = useMemo((): RecommendedMovie[] => {
    if (!movies || movies.length === 0) return [];
    const filtered = currentSlug
      ? movies.filter((m) => m.slug !== currentSlug)
      : movies;
    return filtered.slice(0, limit);
  }, [movies, currentSlug, limit]);

  return (
    <aside className={styles.sidebarCard} aria-label="Phim đề xuất">
      {/* 1. Minimalist Header */}
      <div className={styles.headerBlock}>
        <h3 className={styles.sidebarTitle}>
          <i className={`fas fa-film ${styles.titleIcon}`} />
          <span>{sectionTitle}</span>
        </h3>
      </div>

      {/* 2. Movie List / Skeletons */}
      {loading ? (
        <div className={styles.skeletonList}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonItem}>
              <div className={styles.skeletonPoster} />
              <div className={styles.skeletonInfo}>
                <div className={styles.skeletonLine} style={{ width: '80%' }} />
                <div className={styles.skeletonLine} style={{ width: '45%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : displayedMovies.length > 0 ? (
        <div className={styles.movieList}>
          {displayedMovies.map((movie, idx) => {
            const posterSrc = pickImageSrc(
              movie as unknown as Record<string, unknown>,
              POSTER_FIELDS,
              LOCAL_DEFAULT_POSTER
            );

            const hasDistinctOrigin =
              !!(movie.origin_name && movie.name) &&
              movie.origin_name.trim().toLowerCase() !== movie.name.trim().toLowerCase();

            return (
              <Link
                key={movie._id || movie.slug || String(idx)}
                href={`/movie/${movie.slug}`}
                className={styles.movieItem}
                title={movie.name}
              >
                {/* Poster Thumbnail */}
                <div className={styles.posterWrap}>
                  <img
                    src={posterSrc}
                    alt={movie.name}
                    className={styles.posterImg}
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      img.src = LOCAL_DEFAULT_POSTER;
                    }}
                  />
                  {movie.quality && (
                    <span className={styles.qualityBadge}>{movie.quality}</span>
                  )}
                </div>

                {/* Movie Meta Information */}
                <div className={styles.infoCol}>
                  <h4 className={styles.movieName}>{movie.name}</h4>
                  {hasDistinctOrigin && (
                    <p className={styles.originName}>{movie.origin_name}</p>
                  )}
                  <div className={styles.metaRow}>
                    {movie.year && (
                      <span className={styles.metaItem}>
                        <i className="far fa-calendar-alt me-1" />
                        {movie.year}
                      </span>
                    )}
                    {movie.episode_current && (
                      <span className={styles.metaItem}>
                        {movie.episode_current}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyFallback}>
          <p className="m-0">{emptyText}</p>
        </div>
      )}
    </aside>
  );
};

export default TrendingSidebar;
