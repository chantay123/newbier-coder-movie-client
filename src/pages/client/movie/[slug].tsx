/**
 * @file pages/movie/[slug].tsx
 * @description Movie Detail & Information Discovery Page. Orchestrates
 * widescreen hero header, episode directory, cast & crew, comments, and
 * related film recommendations.
 */
import React, { useCallback, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  MovieHeroHeader,
  EpisodeDirectory,
  CastCrewSection,
  MovieCommentsSection,
  TrailerModal,
  useMovieDetail
} from '@/features/movie-detail';
import type { HeroHeaderMovie } from '@/features/client/components/detail/components/MovieHeroHeader/MovieHeroHeader';
import type { CastCrewPerson } from '@/features/client/components/detail/components/CastCrewSection/CastCrewSection';
import type { TrailerMovie } from '@/features/client/components/detail/components/TrailerModal';
import { MovieSection } from '@/features/shared/components/MovieSection';
import BackToTop from '@/features/shared/components/UI/BackToTop';
import styles from '@/styles/MovieDetailPage.module.css';

interface MovieDetailPageProps {
  initialSlug?: string;
}

export default function MovieDetailPage({ initialSlug }: MovieDetailPageProps) {
  const router = useRouter();
  const slug = initialSlug || (typeof router.query.slug === 'string' ? router.query.slug : '');

  const {
    movie,
    loading,
    error,
    isFavorite,
    favoriteLoading,
    toggleFavorite,
    comments,
    commentsLoading,
    addComment,
    relatedMovies
  } = useMovieDetail(slug);

  const [activeTrailerMovie, setActiveTrailerMovie] = useState<unknown>(null);

  const handlePlayNow = useCallback(() => {
    if (slug) router.push(`/movie/${slug}/watch`);
  }, [router, slug]);

  const handleOpenTrailer = useCallback((targetMovie?: unknown) => {
    setActiveTrailerMovie(targetMovie || movie);
  }, [movie]);

  if (loading && !movie) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (!loading && (!movie || error)) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorCard}>
          <i className="fas fa-film text-danger mb-3" style={{ fontSize: '3rem' }} />
          <h2 className={styles.errorTitle}>Movie not found</h2>
          <p className={styles.errorDescription}>
            The movie you are looking for is not yet available or the link is invalid.
          </p>
          <button
            type="button"
            className="btn btn-danger px-4 py-2 mt-2"
            onClick={() => router.push('/')}
          >
            <i className="fas fa-home me-2" /> Back to Home
          </button>
        </div>
      </div>
    );
  }

  const pageTitle = movie ? `${movie.name} - Movie Info HD | MovieStreaming` : 'MovieStreaming';
  const pageDescription = (movie?.content && String(movie.content).slice(0, 160))
    || 'Movie info, trailer, cast and ratings.';

  return (
    <div className={styles.movieDetailWrapper}>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={movie?.backdrop_url || movie?.poster_url || '/img/background/movies-wall.jpg'} />
        <meta property="og:type" content="video.movie" />
      </Head>

      <MovieHeroHeader
        movie={movie as unknown as HeroHeaderMovie | null}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
        onPlayTrailer={(m) => handleOpenTrailer(m)}
      />

      <div className={styles.mainContentContainer}>
        <EpisodeDirectory
          movieSlug={slug}
          servers={movie?.episodes}
          movieType={movie?.type}
        />

        <div className={styles.sectionSpacing}>
          <CastCrewSection
            actors={movie?.actors as unknown as CastCrewPerson[] | undefined}
            directors={movie?.directors as unknown as CastCrewPerson[] | undefined}
          />
        </div>

        <div className={styles.sectionSpacing}>
          <MovieCommentsSection
            comments={comments}
            loading={commentsLoading}
            onAddComment={addComment}
          />
        </div>

        {relatedMovies.length > 0 && (
          <div className={styles.sectionSpacing}>
            <MovieSection
              layout="rail"
              variant="vertical"
              title="Similar Movies"
              movies={relatedMovies}
              onPlayTrailer={handleOpenTrailer}
            />
          </div>
        )}
      </div>

      <TrailerModal
        movie={activeTrailerMovie as TrailerMovie | null}
        onClose={() => setActiveTrailerMovie(null)}
      />

      <BackToTop />
    </div>
  );
}

export async function getServerSideProps(context: { params: { slug?: string } }) {
  const { slug } = context.params;
  return {
    props: {
      initialSlug: slug || null
    }
  };
}
