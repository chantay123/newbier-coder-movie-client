import React, { useState } from 'react';
import Link from 'next/link';
import styles from '@/styles/MovieCards.module.css';
import type { MovieLite } from './MovieCardVertical';

/**
 * @file MovieCardHorizontal.tsx
 * @description Avant-garde 16:9 Cinema Wide Panorama Card with giant typographic outline rank.
 */

export interface MovieCardHorizontalProps {
  movie?: MovieLite | null;
  rank?: number;
  badge?: string;
  onMouseEnter?: (movie: MovieLite) => void;
  onMouseLeave?: (movie: MovieLite) => void;
  onPlayTrailer?: (movie: MovieLite) => void;
  className?: string;
}

const MovieCardHorizontal: React.FC<MovieCardHorizontalProps> = ({
  movie,
  rank,
  badge,
  onMouseEnter,
  onMouseLeave,
  onPlayTrailer,
  className = ''
}) => {
  const [imgSrc, setImgSrc] = useState<string>(
    movie?.backdrop_url || movie?.poster_url || movie?.thumb_url || '/img/placeholder-backdrop.svg'
  );

  if (!movie) return null;

  // Format rank number with leading zero: "01", "02", ...
  const formattedRank: string | null = typeof rank === 'number' ? String(rank).padStart(2, '0') : null;

  // Extract rating
  const rawRating: number | string | undefined = movie?.vote_average || movie?.rating || movie?.tmdb?.vote_average;
  const ratingText: string | null = rawRating ? Number(rawRating).toFixed(1) : null;

  return (
    <Link
      href={`/movie/${movie?.slug || ''}`}
      className={`${styles.cardHorizontal} ${className}`}
      onMouseEnter={() => onMouseEnter && onMouseEnter(movie)}
      onMouseLeave={() => onMouseLeave && onMouseLeave(movie)}
      aria-label={movie?.name || 'Xem phim'}
    >
      <div className={styles.wideContainer}>
        {/* Giant Typographic Outline Rank */}
        {formattedRank && (
          <span className={styles.rankNumber} aria-hidden="true">
            {formattedRank}
          </span>
        )}

        {/* Shimmer Light Sheen Reflection across the card */}
        <span className={styles.shimmerSheen} aria-hidden="true" />

        {/* 16:9 Cinema Backdrop */}
        <img
          src={imgSrc}
          alt={movie?.name || 'Banner phim'}
          className={styles.wideBackdropImg}
          loading="lazy"
          onError={() => setImgSrc('/img/placeholder-backdrop.svg')}
        />

        {/* Bottom Ambient Vignette Gradient */}
        <div className={styles.wideBottomFade} aria-hidden="true" />

        {/* Radar Pulse Play Button */}
        <button
          type="button"
          className={styles.radarPulseBtn}
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
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </button>

        {/* Overlaid Movie Information */}
        <div className={styles.wideInfoOverlay}>
          <h4 className={styles.wideTitle} title={movie?.name}>
            {movie?.name}
          </h4>
          <div className={styles.wideMetaRow}>
            {badge && (
              <span className={styles.wideBadge}>
                {badge}
              </span>
            )}
            {ratingText && (
              <span style={{ color: '#fbbf24', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                ★ {ratingText}
              </span>
            )}
            <span>{movie?.year || new Date().getFullYear()}</span>
            <span className={styles.metaDot} aria-hidden="true" />
            <span className="text-truncate" style={{ maxWidth: '140px' }}>
              {movie?.origin_name || (movie?.type === 'series' ? 'Phim bộ' : 'Phim lẻ')}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default MovieCardHorizontal;
