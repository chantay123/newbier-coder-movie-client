import React, { useState } from 'react';
import Link from 'next/link';
import styles from '@/styles/MovieCards.module.css';

/**
 * @file MovieCardVertical.tsx
 * @description Classic 2:3 Hollywood cinema vertical poster card with floating micro-badges,
 * smooth hover elevation, and responsive meta details.
 */

/** Minimal movie shape (compatible across project) */
export interface MovieLite {
  _id?: string;
  slug?: string;
  name?: string;
  origin_name?: string;
  year?: number | string;
  type?: 'series' | 'single' | 'movie' | string;
  quality?: string;
  lang?: string;
  episode_current?: string;
  poster_url?: string;
  thumb_url?: string;
  backdrop_url?: string;
  vote_average?: number;
  rating?: number;
  tmdb?: { vote_average?: number };
  episodes?: Array<{ server_data?: Array<{ name?: string }> }>;
  [key: string]: unknown;
}

export interface MovieCardVerticalProps {
  movie?: MovieLite | null;
  onMouseEnter?: (movie: MovieLite) => void;
  onMouseLeave?: (movie: MovieLite) => void;
  onPlayTrailer?: (movie: MovieLite) => void;
  className?: string;
}

const MovieCardVertical: React.FC<MovieCardVerticalProps> = ({
  movie,
  onMouseEnter,
  onMouseLeave,
  onPlayTrailer,
  className = ''
}) => {
  const [imgSrc, setImgSrc] = useState<string>(
    movie?.poster_url || movie?.thumb_url || '/img/placeholder-poster.svg'
  );

  if (!movie) return null;

  // Extract rating with graceful fallback
  const rawRating: number | string | undefined = movie?.vote_average || movie?.rating || movie?.tmdb?.vote_average;
  const ratingText: string = rawRating ? Number(rawRating).toFixed(1) : '8.6';

  // Extract episode or language tag
  const episodeCount: number | undefined = movie?.episodes?.[0]?.server_data?.length;
  const bottomTag: string | null = movie?.episode_current
    || (episodeCount ? `Tập ${episodeCount}` : null)
    || movie?.lang
    || (movie?.type === 'series' ? 'Phim bộ' : 'Thuyết minh');

  return (
    <Link
      href={`/movie/${movie?.slug || ''}`}
      className={`${styles.cardVertical} ${className}`}
      onMouseEnter={() => onMouseEnter && onMouseEnter(movie)}
      onMouseLeave={() => onMouseLeave && onMouseLeave(movie)}
      aria-label={movie?.name || 'Xem phim'}
    >
      <div className={styles.posterContainer}>
        <img
          src={imgSrc}
          alt={movie?.name || 'Poster phim'}
          className={styles.posterImg}
          loading="lazy"
          onError={() => setImgSrc('/img/placeholder-poster.svg')}
        />

        {/* Top Badges: IMDb rating & resolution */}
        <div className={styles.topBadges}>
          <span className={styles.ratingBadge}>
            <svg
              className={styles.ratingStar}
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {ratingText}
          </span>
          <span className={styles.qualityBadge}>
            {movie?.quality || 'FHD'}
          </span>
        </div>

        {/* Bottom Episode / Lang Tag */}
        {bottomTag && (
          <span className={styles.episodeBadge}>
            {bottomTag}
          </span>
        )}

        <div className={styles.posterBottomFade} aria-hidden="true" />

        {/* Hover Play Overlay with Red Trailer Trigger Button */}
        <div className={styles.playOverlay}>
          <button
            type="button"
            className={styles.playCircle}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onPlayTrailer) {
                onPlayTrailer(movie);
              }
            }}
            aria-label={`Xem trailer ${movie?.name}`}
            title="Xem trailer"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Movie info below poster */}
      <div className={styles.cardInfo}>
        <h4 className={styles.movieName} title={movie?.name}>
          {movie?.name}
        </h4>
        <div className={styles.movieMeta}>
          <span>{movie?.year || new Date().getFullYear()}</span>
          <span className={styles.metaDot} aria-hidden="true" />
          <span>{movie?.type === 'series' ? 'Bộ' : 'Lẻ'}</span>
          {movie?.origin_name && (
            <>
              <span className={styles.metaDot} aria-hidden="true" />
              <span className="text-truncate" style={{ maxWidth: '110px' }}>
                {movie.origin_name}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
};

export default MovieCardVertical;
