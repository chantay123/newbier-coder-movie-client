/**
 * @file pages/the-loai/[slug].tsx
 * @description Category listing page (movies filtered by category slug).
 */
import React, { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import movieService from '@/API/services/movieService';
import { resolveCategoryTaxonomy } from '@/config/taxonomyConfig';
import { LOCAL_DEFAULT_POSTER } from '@/config/movieFallbackConfig';
import Skeleton from '@/components/UI/Skeleton';

interface CategoryMovie {
  _id?: string;
  slug?: string;
  name?: string;
  origin_name?: string;
  poster_url?: string;
  thumb_url?: string;
  year?: number;
  [key: string]: unknown;
}

export default function CategoryPage(): ReactElement {
  const router = useRouter();
  const slug = router.query.slug as string | undefined;
  const [movies, setMovies] = useState<CategoryMovie[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const categoryMeta = slug ? resolveCategoryTaxonomy(slug) : null;
  const categoryTitle = categoryMeta?.nameVi || (slug ? String(slug).replace(/-/g, ' ') : 'Thể loại');

  useEffect(() => {
    if (!slug) return;
    let isSubscribed = true;

    const fetchCategoryMovies = async (): Promise<void> => {
      setLoading(true);
      try {
        const list = (await movieService.getMoviesByCategory(slug, 30)) as CategoryMovie[];
        if (isSubscribed) setMovies(Array.isArray(list) ? list : []);
      } catch {
        if (isSubscribed) setMovies([]);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    fetchCategoryMovies();
    return () => { isSubscribed = false; };
  }, [slug]);

  const handleImgError = (e: React.MouseEvent<HTMLImageElement>): void => {
    (e.target as HTMLImageElement).src = LOCAL_DEFAULT_POSTER;
  };

  return (
    <>
      <Head>
        <title>{categoryTitle} - Xem Phim Online | MovieStreaming</title>
        <meta name="description" content={`Danh sách phim ${categoryTitle} chọn lọc, cập nhật mới nhất, hình ảnh sắc nét, tốc độ cao.`} />
      </Head>

      <div className="container-fluid px-3 px-lg-5 py-4" style={{ minHeight: '80vh', paddingTop: '90px' }}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
          <div>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-1 text-secondary" style={{ fontSize: '0.85rem' }}>
                <li className="breadcrumb-item"><Link href="/" className="text-secondary text-decoration-none">Trang chủ</Link></li>
                <li className="breadcrumb-item"><Link href="/search" className="text-secondary text-decoration-none">Chủ đề</Link></li>
                <li className="breadcrumb-item active text-danger" aria-current="page">{categoryTitle}</li>
              </ol>
            </nav>
            <h1 className="h3 text-white fw-bold text-uppercase m-0">{categoryTitle}</h1>
          </div>
          <span className="badge bg-danger bg-opacity-25 text-danger px-3 py-2 border border-danger border-opacity-25 rounded-pill">
            {movies.length} bộ phim
          </span>
        </div>

        {loading ? (
          <div className="row g-3">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="col-6 col-sm-4 col-md-3 col-lg-2">
                <div className="card bg-dark border-0 rounded-3 overflow-hidden">
                  <Skeleton height={260} borderRadius={8} />
                  <div className="p-2">
                    <Skeleton height={16} width="80%" />
                    <Skeleton height={12} width="50%" className="mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : movies.length > 0 ? (
          <div className="row g-3">
            {movies.map((movie) => (
              <div key={movie._id || movie.slug} className="col-6 col-sm-4 col-md-3 col-lg-2">
                <Link href={`/movie/${movie.slug}`} className="text-decoration-none">
                  <div className="card bg-dark border-0 rounded-3 overflow-hidden movie-card-hover h-100">
                    <div style={{ aspectRatio: '2 / 3', width: '100%', position: 'relative', overflow: 'hidden' }}>
                      <img
                        src={movie.poster_url || movie.thumb_url || LOCAL_DEFAULT_POSTER}
                        alt={movie.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                        onError={handleImgError}
                      />
                      <span className="badge bg-danger position-absolute top-0 start-0 m-2" style={{ fontSize: '0.7rem' }}>
                        {movie.year || 'HD'}
                      </span>
                    </div>
                    <div className="p-2 text-white">
                      <h6 className="text-truncate m-0 fw-semibold" style={{ fontSize: '0.9rem' }} title={movie.name}>
                        {movie.name}
                      </h6>
                      <p className="text-secondary text-truncate m-0" style={{ fontSize: '0.78rem' }}>
                        {movie.origin_name || movie.name}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-5 text-secondary">
            <p className="mb-3">Hiện chưa có phim nào trong danh mục này.</p>
            <Link href="/search" className="btn btn-outline-danger btn-sm rounded-pill px-4">
              Khám phá thể loại khác
            </Link>
          </div>
        )}
      </div>

      <style jsx>{`
        .movie-card-hover {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          background: #161b22 !important;
        }
        .movie-card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(229, 9, 20, 0.35);
        }
      `}</style>
    </>
  );
}
