/**
 * @file pages/movie/[slug].tsx
 * @description Cinema-grade Movie Detail & Information Discovery Page.
 */
import React, { useState, useCallback } from 'react';
import type { ReactElement } from 'react';
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
import type { TrailerMovie } from '@/features/movie-detail/components/TrailerModal';
import type { CastCrewPerson } from '@/features/movie-detail/components/CastCrewSection/CastCrewSection';
import type { HeroHeaderMovie } from '@/features/movie-detail/components/MovieHeroHeader/MovieHeroHeader';
import { MovieSection } from '@/components/common/MovieSection';
import BackToTop from '@/components/UI/BackToTop';
import styles from '@/styles/MovieDetailPage.module.css';

interface MovieDetailPageProps {
  initialSlug?: string;
}

export default function MovieDetailPage({ initialSlug }: MovieDetailPageProps): ReactElement {
  const router = useRouter();
  const slug = initialSlug || (router.query.slug as string | undefined);

  const {
    movie,
    loading,
    error,
    comments,
    commentsLoading,
    addComment,
    relatedMovies
  } = useMovieDetail(slug);

  const [activeTrailerMovie, setActiveTrailerMovie] = useState<TrailerMovie | null>(null);

  const handlePlayNow = useCallback((): void => {
    if (slug) router.push(`/movie/${slug}/watch`);
  }, [router, slug]);

  const handleOpenTrailer = useCallback((targetMovie?: HeroHeaderMovie): void => {
    setActiveTrailerMovie((targetMovie || (movie as unknown as TrailerMovie)) ?? null);
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
          <h2 className={styles.errorTitle}>Không tìm thấy phim</h2>
          <p className={styles.errorDescription}>
            Nội dung phim bạn đang tìm kiếm hiện chưa có trên hệ thống hoặc đường dẫn không khả dụng.
          </p>
          <button type="button" className="btn btn-danger px-4 py-2 mt-2" onClick={() => router.push('/')}>
            <i className="fas fa-home me-2" />Về Trang Chủ
          </button>
        </div>
      </div>
    );
  }

  if (!movie) return <></>;

  const pageTitle = `${movie.name} - Thông Tin Phim HD | MovieStreaming`;
  const pageDescription = (movie.content?.slice(0, 160) as string) || 'Xem thông tin phim, trailer, dàn diễn viên và đánh giá chi tiết.';

  return (
    <div className={styles.movieDetailWrapper}>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={movie.backdrop_url || movie.poster_url || '/img/background/movies-wall.jpg'} />
        <meta property="og:type" content="video.movie" />
      </Head>

      <MovieHeroHeader
        movie={movie as unknown as HeroHeaderMovie}
        onPlayTrailer={handleOpenTrailer}
      />

      <div className={styles.mainContentContainer}>
        <EpisodeDirectory
          movieSlug={slug}
          servers={movie.episodes}
          movieType={movie.type}
        />

        <div className={styles.sectionSpacing}>
          <CastCrewSection actors={(movie.actors as CastCrewPerson[]) || []} directors={(movie.directors as CastCrewPerson[]) || []} />
        </div>

        <div className={styles.sectionSpacing}>
          <MovieCommentsSection comments={comments} loading={commentsLoading} onAddComment={addComment} />
        </div>

        {relatedMovies && relatedMovies.length > 0 && (
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

      <TrailerModal movie={activeTrailerMovie} onClose={() => setActiveTrailerMovie(null)} />

      <BackToTop />
    </div>
  );
}

export async function getServerSideProps(context: { params?: { slug?: string } }) {
  const slug = context.params?.slug;
  return {
    props: { initialSlug: slug || null }
  };
}
