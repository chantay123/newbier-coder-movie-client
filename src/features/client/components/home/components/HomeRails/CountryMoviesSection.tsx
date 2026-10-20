import React, { useState, useEffect, useMemo } from 'react';
import { MovieSection as MovieSectionRaw } from '@/features/shared/components/MovieSection';
import { filterMoviesWithValidTrailer } from '@/utils/trailer';

const MovieSection = MovieSectionRaw as unknown as React.FC<Record<string, unknown>>;

/**
 * @file CountryMoviesSection.tsx
 * @description Dynamic, config-driven component for Country Drama rails.
 * Completely decoupled: rail titles, badges, links, and data loaders are
 * defined in homeSectionsConfig.
 */

/** Rail entry từ config */
export interface RailConfig {
  id: string;
  title?: string;
  badge?: string;
  viewAllHref?: string;
  load?: (fallback?: unknown[]) => Promise<unknown[]>;
}

/**
 * Defensive: xác định một phim có poster URL hợp lệ để <img> tải được.
 * Trả về false khi payload thiếu `poster_url`/`thumb_url`/`imagePoster`
 * hoặc URL rỗng / không phải http(s). Mục đích là ẩn những phim không
 * hiển thị được ảnh trước khi truyền xuống MovieSection, tránh hiển thị
 * broken-image icon trên trang chủ.
 */
const hasDisplayablePoster = (m: Record<string, unknown>): boolean => {
  const candidates = [m.poster_url, m.posterUrl, m.thumb_url, m.thumbUrl, m.imagePoster];
  for (const raw of candidates) {
    if (typeof raw !== 'string') continue;
    const v = raw.trim();
    if (!v) continue;
    if (/^https?:\/\//i.test(v)) return true;
  }
  return false;
};

export interface CountryMoviesSectionProps {
  cardSize?: 'sm' | 'md' | 'lg';
  rails?: RailConfig[];
  onPlayTrailer?: (movie: Record<string, unknown>) => void;
}

const CountryMoviesSection: React.FC<CountryMoviesSectionProps> = ({
  cardSize = 'md',
  rails = [],
  onPlayTrailer
}) => {
  const [railData, setRailData] = useState<Record<string, unknown[]>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isSubscribed = true;

    const fetchAllRails = async (): Promise<void> => {
      try {
        setLoading(true);

        const results = await Promise.all(
          rails.map(async (rail) => {
            if (typeof rail.load !== 'function') {
              return { id: rail.id, data: [] as unknown[] };
            }
            const rawData = await rail.load([]);

            // BƯỚC 1: chỉ giữ phim có trailer hợp lệ (đồng bộ với
            // Hero/Top10 — bạn yêu cầu "chỉ hiển thị phim có trailer").
            const withTrailer = filterMoviesWithValidTrailer(
              (Array.isArray(rawData) ? rawData : []) as unknown[]
            );

            // BƯỚC 2: lọc tiếp phim không có poster URL hợp lệ, để
            // ảnh không bao giờ hiển thị icon broken-image. Defense in
            // depth: nếu MovieSection không có onError thì country
            // rail vẫn không hiển thị phim lỗi ảnh.
            const withPoster = withTrailer.filter((m) =>
              hasDisplayablePoster(m as Record<string, unknown>)
            );

            return { id: rail.id, data: withPoster };
          })
        );

        if (isSubscribed) {
          const updated: Record<string, unknown[]> = {};
          results.forEach(({ id, data }) => {
            updated[id] = data;
          });
          setRailData(updated);
        }
      } catch {
        if (isSubscribed) {
          setRailData({});
        }
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    fetchAllRails();

    return () => {
      isSubscribed = false;
    };
  }, [rails]);

  // Memo derived data so we don't recreate the movies array on every render
  const derivedRails = useMemo(
    () => rails.map((rail) => ({ ...rail, data: railData[rail.id] || [] })),
    [rails, railData]
  );

  return (
    <div className="movie-country-rails">
      {derivedRails.map((rail) => (
        <MovieSection
          key={rail.id}
          title={rail.title}
          badge={rail.badge}
          viewAllHref={rail.viewAllHref}
          layout="rail"
          variant="vertical"
          cardSize={cardSize}
          movies={rail.data}
          loading={loading}
          onPlayTrailer={onPlayTrailer}
        />
      ))}
    </div>
  );
};

export default CountryMoviesSection;
