import React, { useRef, useState, useEffect, useCallback } from 'react';
import SectionHeader from '@/features/shared/components/MovieSection/SectionHeader';
import MovieCardVertical from '@/features/shared/components/MovieCard/MovieCardVertical';
import MovieCardHorizontal from '@/features/shared/components/MovieCard/MovieCardHorizontal';
import Skeleton from '@/features/shared/components/UI/Skeleton';
import type { MovieLite } from '@/features/shared/components/MovieCard/MovieCardVertical';

/**
 * @file MovieCarouselSection.tsx
 * @description Ultra-smooth, hardware-accelerated native horizontal scroll rail for movies.
 */

type Variant = 'vertical' | 'horizontal';
type ScrollDirection = 'left' | 'right';

export interface MovieCarouselSectionProps {
  title: string;
  badge?: string;
  icon?: React.ReactNode;
  viewAllHref?: string;
  movies?: MovieLite[];
  variant?: Variant;
  loading?: boolean;
  onPlayTrailer?: (movie: MovieLite) => void;
}

const MovieCarouselSection: React.FC<MovieCarouselSectionProps> = ({
  title,
  badge,
  icon,
  viewAllHref,
  movies = [],
  variant = 'vertical',
  loading = false,
  onPlayTrailer
}) => {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(true);
  const isHorizontal: boolean = variant === 'horizontal';

  const updateScrollBounds = useCallback((): void => {
    const el = railRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    updateScrollBounds();
    el.addEventListener('scroll', updateScrollBounds, { passive: true });
    window.addEventListener('resize', updateScrollBounds);
    return () => {
      el.removeEventListener('scroll', updateScrollBounds);
      window.removeEventListener('resize', updateScrollBounds);
    };
  }, [movies, updateScrollBounds]);

  const handleScroll = (direction: ScrollDirection): void => {
    const el = railRef.current;
    if (!el) return;
    const distance = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth'
    });
  };

  if (!loading && (!movies || movies.length === 0)) {
    return null;
  }

  return (
    <section className="movie-rail-section mb-4 mb-md-5" aria-label={title}>
      <SectionHeader
        title={title}
        badge={badge}
        icon={icon}
        viewAllHref={viewAllHref}
      />

      <div className="rail-wrapper">
        {canScrollLeft && (
          <button
            type="button"
            className="rail-nav-btn rail-nav-prev d-none d-md-flex"
            onClick={() => handleScroll('left')}
            aria-label="Cuộn sang trái"
          >
            <i className="fas fa-chevron-left" />
          </button>
        )}

        <div
          ref={railRef}
          className="movie-scroll-track"
          role="region"
          aria-label={`Danh sách ${title}`}
        >
          {loading && (!movies || movies.length === 0) ? (
            [...Array(6)].map((_, i) => (
              <div
                key={`skel-${i}`}
                className={`rail-card-item ${isHorizontal ? 'card-item-horizontal' : 'card-item-vertical'}`}
              >
                <Skeleton
                  height={isHorizontal ? '170px' : '280px'}
                  borderRadius="8px"
                />
              </div>
            ))
          ) : (
            movies.map((movie, index) => (
              <div
                key={movie._id || movie.slug || String(index)}
                className={`rail-card-item ${isHorizontal ? 'card-item-horizontal' : 'card-item-vertical'}`}
              >
                {isHorizontal ? (
                  <MovieCardHorizontal
                    movie={movie}
                    rank={index + 1}
                    onPlayTrailer={onPlayTrailer}
                  />
                ) : (
                  <MovieCardVertical
                    movie={movie}
                    onPlayTrailer={onPlayTrailer}
                  />
                )}
              </div>
            ))
          )}
        </div>

        {canScrollRight && (
          <button
            type="button"
            className="rail-nav-btn rail-nav-next d-none d-md-flex"
            onClick={() => handleScroll('right')}
            aria-label="Cuộn sang phải"
          >
            <i className="fas fa-chevron-right" />
          </button>
        )}
      </div>

      <style jsx>{`
        .movie-rail-section {
          position: relative;
        }

        .rail-wrapper {
          position: relative;
          margin: 0 -8px;
        }

        .movie-scroll-track {
          display: flex;
          overflow-x: auto;
          overflow-y: hidden;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x proximity;
          gap: 12px;
          padding: 8px 8px 16px 8px;
          user-select: none;

          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .movie-scroll-track::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }

        .rail-card-item {
          flex: 0 0 auto;
          scroll-snap-align: start;
        }

        .card-item-vertical {
          width: 200px;
        }

        @media (max-width: 1400px) {
          .card-item-vertical {
            width: 185px;
          }
        }

        @media (max-width: 992px) {
          .card-item-vertical {
            width: 165px;
          }
        }

        @media (max-width: 576px) {
          .card-item-vertical {
            width: 142px;
          }
          .movie-scroll-track {
            gap: 10px;
            padding: 4px 6px 12px 6px;
          }
          .rail-wrapper {
            margin: 0 -4px;
          }
        }

        @media (max-width: 380px) {
          .card-item-vertical {
            width: 132px;
          }
        }

        .card-item-horizontal {
          width: 340px;
        }

        @media (max-width: 1400px) {
          .card-item-horizontal {
            width: 310px;
          }
        }

        @media (max-width: 992px) {
          .card-item-horizontal {
            width: 280px;
          }
        }

        @media (max-width: 576px) {
          .card-item-horizontal {
            width: 260px;
          }
        }

        .rail-nav-btn {
          position: absolute;
          top: calc(50% - 10px);
          transform: translateY(-50%);
          z-index: 15;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(15, 18, 24, 0.88);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.65);
        }

        .rail-nav-prev {
          left: -12px;
        }

        .rail-nav-next {
          right: -12px;
        }

        .rail-nav-btn:hover {
          background: #e50914;
          border-color: #e50914;
          transform: translateY(-50%) scale(1.12);
          box-shadow: 0 10px 28px rgba(229, 9, 20, 0.45);
        }

        .rail-nav-btn:active {
          transform: translateY(-50%) scale(0.96);
        }
      `}</style>
    </section>
  );
};

export default MovieCarouselSection;
