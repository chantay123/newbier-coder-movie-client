/**
 * @file RelaatedMovie.tsx
 * @description Grid of related (same-genre) movies with default-poster fallback.
 */
import React, { MouseEvent } from 'react';
import Link from 'next/link';
import styles from '../styles/RelatedMovies.module.css';

export interface RelatedMovieItem {
  slug: string;
  name: string;
  thumb_url?: string;
  [key: string]: unknown;
}

export interface RelatedMoviesProps {
  movies: RelatedMovieItem[];
}

const RelatedMovies: React.FC<RelatedMoviesProps> = ({ movies }) => {
  const handleImgError = (e: MouseEvent<HTMLImageElement>): void => {
    const target = e.currentTarget;
    target.onerror = null;
    target.src = '/img/default-poster.jpg';
  };

  return (
    <div className={styles.relatedMoviesContainer}>
      <h5 className={styles.sectionTitle}>Phim Cùng Thể Loại</h5>
      <div className={styles.moviesGrid}>
        {movies.map((movie, index) => (
          <Link
            href={`/movie/${movie.slug}`}
            key={index}
            className={styles.movieCard}
          >
            <div className={styles.posterWrapper}>
              <img
                src={movie.thumb_url}
                alt={movie.name}
                className={styles.poster}
                onError={handleImgError}
              />
              <div className={styles.overlay}>
                <button className={styles.playButton} type="button" aria-label="Play">
                  <i className="fas fa-play" />
                </button>
              </div>
            </div>
            <h6 className={styles.movieTitle}>{movie.name}</h6>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RelatedMovies;
