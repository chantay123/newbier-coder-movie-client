/**
 * @file pages/movie/[slug].js
 * @description Cinema-grade Movie Detail & Information Discovery Page.
 * Orchestrates widescreen backdrop hero header, interactive episode directory,
 * bento metadata grid, cast & crew showcase, community discussion,
 * and related film recommendations.
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
import { MovieSection } from '@/components/common/MovieSection';
import BackToTop from '@/components/UI/BackToTop';
import styles from '@/styles/MovieDetailPage.module.css';

/**
 * Main Movie Detail Page Component
 * @param {Object} props
 * @param {string} [props.initialSlug] - Slug provided via getServerSideProps
 * @returns {JSX.Element}
 */
export default function MovieDetailPage({ initialSlug }) {
  const router = useRouter();
  const slug = initialSlug || router.query.slug;
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
          setDraftMovie(normalized);
        }
      } catch (e) {
        console.error('Failed to parse admin preview draft', e);
      }
    }
  }, [isPreview, slug]);

  const movie = (isPreview && draftMovie) ? draftMovie : fetchedMovie;
  const loading = isPreview ? !draftMovie : fetchLoading;

  const [activeTrailerMovie, setActiveTrailerMovie] = useState(null);

  // Navigate directly to dedicated Watch Page when user clicks "Xem Phim Ngay"
  const handlePlayNow = useCallback(() => {
    if (slug) {
      router.push(`/movie/${slug}/watch`);
    }
  }, [router, slug]);

  // Open trailer modal
  const handleOpenTrailer = useCallback((targetMovie) => {
    setActiveTrailerMovie(targetMovie || movie);
  }, [movie]);

  // Loading screen
  if (loading && !movie) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
      </div>
    );
  }

  // Error / Not found state
  if (!loading && (!movie || error)) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorCard}>
          <i className="fas fa-film text-danger mb-3" style={{ fontSize: '3rem' }} />
          <h2 className={styles.errorTitle}>Không tìm thấy phim</h2>
          <p className={styles.errorDescription}>
            Nội dung phim bạn đang tìm kiếm hiện chưa có trên hệ thống hoặc đường dẫn không khả dụng.
          </p>
          <button
            type="button"
            className="btn btn-danger px-4 py-2 mt-2"
            onClick={() => router.push('/')}
          >
            <i className="fas fa-home me-2" /> Về Trang Chủ
          </button>
        </div>
      </div>
    );
  }

  const pageTitle = movie ? `${movie.name} - Thông Tin Phim HD | MovieStreaming` : 'MovieStreaming';
  const pageDescription = movie?.content?.slice(0, 160) || 'Xem thông tin phim, trailer, dàn diễn viên và đánh giá chi tiết.';

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
        movie={movie}
        isFavorite={isFavorite}
        favoriteLoading={favoriteLoading}
        onToggleFavorite={toggleFavorite}
        onPlayNow={handlePlayNow}
        onPlayTrailer={handleOpenTrailer}
      />

      {/* 2. Main Content Flow Container */}
      <div className={styles.mainContentContainer}>
        {/* Episode Directory / Episode Cards */}
        <EpisodeDirectory
          movieSlug={slug}
          servers={movie.episodes}
          movieType={movie.type}
        />

        {/* Cast & Crew Section */}
        <div className={styles.sectionSpacing}>

          <CastCrewSection
            actors={movie.actors}
            directors={movie.directors}
          />
        </div>

        {/* Community Comments Section */}
        <div className={styles.sectionSpacing}>
          <MovieCommentsSection
            comments={comments}
            loading={commentsLoading}
            onAddComment={addComment}
          />
        </div>

        {/* Related & Recommended Movies Rail */}
        {relatedMovies.length > 0 && (
          <div className={styles.sectionSpacing}>
            <MovieSection
              layout="rail"
              variant="vertical"
              title="Phim Cùng Thể Loại"
              movies={relatedMovies}
              onPlayTrailer={handleOpenTrailer}
            />
          </div>
        )}
      </div>

      {/* Trailer Modal */}
      <TrailerModal
        movie={activeTrailerMovie}
        onClose={() => setActiveTrailerMovie(null)}
      />

      <BackToTop />
    </div>
  );
}

/**
 * Server-side props to extract slug before hydration
 */
export async function getServerSideProps(context) {
  const { slug } = context.params;

  return {
    props: {
      initialSlug: slug || null,
    },
  };
}