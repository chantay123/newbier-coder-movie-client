/**
 * @file pages/movie/[slug].tsx
 * @description Movie Detail & Information Discovery Page. Orchestrates
 * widescreen hero header, episode directory, cast & crew, comments, and
 * related film recommendations.
 */
import React, { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  MovieHeroHeader,
  EpisodeDirectory,
  CastCrewSection,
  MovieCommentsSection,
  TrailerModal,
  useMovieDetail,
  normalizeMovieDetail
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
  const isPreview = router.query.preview === 'true';

  const {
    movie: fetchedMovie,
    loading: fetchLoading,
    error,
    isFavorite,
    favoriteLoading,
    toggleFavorite,
    comments,
    commentsLoading,
    addComment,
    relatedMovies
  } = useMovieDetail(isPreview ? null : slug);

  // Live draft state when viewed from Admin Live Demo
  const [draftMovie, setDraftMovie] = useState(null);

  useEffect(() => {
    if (isPreview && typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('admin_movie_preview_draft');
        if (stored) {
          const parsed = JSON.parse(stored);
          const normalized = normalizeMovieDetail(parsed, slug);
          setDraftMovie(normalized as any);
        }
      } catch (e) {
        console.error('Failed to parse admin preview draft', e);
      }
    }
  }, [isPreview, slug]);

  const movie = (isPreview && draftMovie) ? draftMovie : fetchedMovie;
  const loading = isPreview ? !draftMovie : fetchLoading;

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

      {/* 0. Live Preview Mode Top Banner */}
      {isPreview && draftMovie && (
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 9999,
          background: 'rgba(18, 18, 22, 0.96)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(229, 9, 20, 0.6)',
          color: '#ffffff',
          padding: '0.45rem 1.25rem',
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div className="d-flex align-items-center gap-2">
            <span style={{
              background: '#e50914',
              color: '#fff',
              padding: '1px 7px',
              borderRadius: 3,
              fontSize: '0.68rem',
              fontWeight: 700
            }}>
              LIVE DRAFT
            </span>
            <span>Chế độ Xem Thử Dữ Liệu Bản Nháp • Phim chưa lưu vào cơ sở dữ liệu</span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-light"
            style={{ fontSize: '0.7rem', padding: '0.15rem 0.55rem' }}
            onClick={() => window.close()}
          >
            ✕ Đóng xem thử
          </button>
        </div>
      )}

      {/* 1. Cinema 21:9 Hero Header */}
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
