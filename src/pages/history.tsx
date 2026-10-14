/**
 * @file pages/history.tsx
 * @description Standalone watch-history page listing recently watched movies with
 * local persistence, API fallback, search filter, and clear-all action.
 */
import React, { useState, useEffect, useMemo, useCallback, ChangeEvent, MouseEvent } from 'react';
import type { ReactElement } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Layout/Navbar';
import Footer from '../components/Layout/Footer';
import movieService from '../API/services/movieService';
import {
  getAllRecentWatches,
  removeRecentWatch,
  clearAllRecentWatches
} from '../utils/watchProgress';
import { LOCAL_DEFAULT_POSTER } from '../config/movieFallbackConfig';
import { FaPlay, FaTrash, FaHistory, FaSearch, FaTimes, FaFilm } from 'react-icons/fa';
import styles from '../styles/HistoryPage.module.css';

interface HistoryItem {
  slug: string;
  movieName: string;
  originName?: string;
  posterUrl: string;
  epName: string;
  epSlug: string;
  serverIndex: number;
  episodeIndex: number;
  progressPercent: number;
  updatedAt: number;
  isSampleFromApi: boolean;
}

function formatRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) return 'Gần đây';
  const diffSec = Math.floor((Date.now() - Number(timestamp)) / 1000);
  if (diffSec < 60) return 'Vừa xong';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  if (diffSec < 259200) return `${Math.floor(diffSec / 86400)} ngày trước`;
  const date = new Date(timestamp);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function normalizeApiMovieToHistory(
  movie: Record<string, unknown>,
  index: number
): HistoryItem {
  const epNumber = (index % 12) + 1;
  const progressPercent = Math.min(95, Math.max(20, 100 - index * 7));
  const simulatedTime = Date.now() - index * 3600000 * (index < 4 ? 2 : 12);

  return {
    slug: (movie.slug as string) || `movie-${index}`,
    movieName: (movie.name as string) || 'Phim rạp',
    originName: movie.origin_name as string | undefined,
    posterUrl:
      (movie.poster_url as string) ||
      (movie.thumb_url as string) ||
      LOCAL_DEFAULT_POSTER,
    epName: `Tập ${epNumber}`,
    epSlug: `tap-${epNumber}`,
    serverIndex: 0,
    episodeIndex: epNumber - 1,
    progressPercent,
    updatedAt: simulatedTime,
    isSampleFromApi: true
  };
}

function HistoryContent({ inProfilePage = false }: { inProfilePage?: boolean }): ReactElement {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadHistory = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const localWatches = getAllRecentWatches() as Array<Record<string, unknown>>;

      if (localWatches && localWatches.length > 0) {
        const mapped: HistoryItem[] = localWatches.map((item, idx) => ({
          slug: (item.slug as string) || '',
          movieName: (item.movieName as string) || (item.slug as string) || '',
          originName: item.origin_name as string | undefined,
          posterUrl: (item.posterUrl as string) || LOCAL_DEFAULT_POSTER,
          epName: (item.epName as string) || `Tập ${((item.episodeIndex as number) || 0) + 1}`,
          epSlug: (item.epSlug as string) || '',
          serverIndex: (item.serverIndex as number) || 0,
          episodeIndex: (item.episodeIndex as number) || 0,
          progressPercent: 75,
          updatedAt: (item.updatedAt as number) || Date.now() - idx * 3600000,
          isSampleFromApi: false
        }));
        setHistoryItems(mapped);
      } else {
        const apiResponse = (await movieService.getMoviesPage(1, 14)) as Array<Record<string, unknown>>;
        const list = Array.isArray(apiResponse) ? apiResponse : [];

        if (list.length > 0) {
          setHistoryItems(list.map((m, idx) => normalizeApiMovieToHistory(m, idx)));
        } else {
          const trending = (await movieService.getTrendingMovies()) as Array<Record<string, unknown>>;
          const trendingList = Array.isArray(trending) ? trending.slice(0, 14) : [];
          setHistoryItems(trendingList.map((m, idx) => normalizeApiMovieToHistory(m, idx)));
        }
      }
    } catch {
      setHistoryItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();

    const handleWatchUpdate = (): void => {
      const local = getAllRecentWatches() as Array<Record<string, unknown>>;
      if (local && local.length > 0) {
        setHistoryItems(
          local.map((item, idx) => ({
            slug: (item.slug as string) || '',
            movieName: (item.movieName as string) || (item.slug as string) || '',
            originName: item.origin_name as string | undefined,
            posterUrl: (item.posterUrl as string) || LOCAL_DEFAULT_POSTER,
            epName:
              (item.epName as string) ||
              `Tập ${((item.episodeIndex as number) || 0) + 1}`,
            epSlug: (item.epSlug as string) || '',
            serverIndex: (item.serverIndex as number) || 0,
            episodeIndex: (item.episodeIndex as number) || 0,
            progressPercent: 75,
            updatedAt: (item.updatedAt as number) || Date.now() - idx * 3600000,
            isSampleFromApi: false
          }))
        );
      }
    };

    window.addEventListener('watchProgressUpdated', handleWatchUpdate);
    return () => window.removeEventListener('watchProgressUpdated', handleWatchUpdate);
  }, [loadHistory]);

  const handleDeleteItem = (e: MouseEvent<HTMLButtonElement>, slug: string): void => {
    e.preventDefault();
    e.stopPropagation();
    removeRecentWatch(slug);
    setHistoryItems((prev) => prev.filter((item) => item.slug !== slug));
  };

  const handleClearAll = (): void => {
    if (historyItems.length === 0) return;
    if (
      window.confirm(
        'Bạn có chắc muốn xoá toàn bộ lịch sử xem phim?'
      )
    ) {
      clearAllRecentWatches();
      setHistoryItems([]);
    }
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>): void =>
    setSearchQuery(e.target.value);
  const handleClearSearch = (): void => setSearchQuery('');

  const displayedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return historyItems;
    return historyItems.filter((item) =>
      (item.movieName || '').toLowerCase().includes(q)
    );
  }, [historyItems, searchQuery]);

  return (
    <div className={inProfilePage ? '' : styles.historyContainer}>
      {!inProfilePage && (
        <nav className={styles.breadcrumbBar} aria-label="Đường dẫn trang">
          <Link href="/" className={styles.crumbLink}>
            Trang chủ
          </Link>
          <span className={styles.crumbDivider}>/</span>
          <span className={styles.crumbActive}>Lịch sử xem</span>
        </nav>
      )}

      <div className={styles.toolbarHeader}>
        <div className={styles.titleArea}>
          <h1 className={styles.mainTitle}>
            <FaHistory className={styles.titleIcon} />
            <span>Lịch sử xem phim</span>
          </h1>
          {historyItems.length > 0 && (
            <span className={styles.countBadge}>
              {historyItems.length} phim
            </span>
          )}
        </div>

        <div className={styles.actionsArea}>
          {historyItems.length > 0 && (
            <>
              <div className={styles.searchBox}>
                <FaSearch className={styles.searchIcon} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Tìm phim đã xem..."
                  className={styles.searchInput}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className={styles.clearSearchBtn}
                    aria-label="Xoá tìm kiếm"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>

              <button
                type="button"
                className={styles.clearAllBtn}
                onClick={handleClearAll}
                title="Xoá toàn bộ lịch sử"
              >
                <FaTrash />
                <span>Xoá tất cả</span>
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p className="text-secondary small">Đang nạp dữ liệu lịch sử xem...</p>
        </div>
      ) : displayedItems.length > 0 ? (
        <div className={styles.movieGrid}>
          {displayedItems.map((item) => {
            const watchUrl = item.epSlug
              ? `/movie/${item.slug}/watch?ep=${encodeURIComponent(item.epSlug)}`
              : `/movie/${item.slug}/watch`;

            return (
              <div key={item.slug} className={styles.historyCard}>
                <Link
                  href={watchUrl}
                  className={styles.posterWrapper}
                  title={`Tiếp tục xem ${item.movieName}`}
                >
                  <img
                    src={item.posterUrl || LOCAL_DEFAULT_POSTER}
                    alt={item.movieName}
                    className={styles.posterImg}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = LOCAL_DEFAULT_POSTER;
                    }}
                  />

                  <div className={styles.playOverlay}>
                    <div className={styles.playCircle}>
                      <FaPlay style={{ marginLeft: '2px' }} />
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.deleteItemBtn}
                    onClick={(e) => handleDeleteItem(e, item.slug)}
                    title="Xoá phim khỏi lịch sử"
                    aria-label={`Xoá ${item.movieName} khỏi lịch sử`}
                  >
                    <FaTrash />
                  </button>

                  <div className={styles.progressBarTrack}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${item.progressPercent || 70}%` }}
                    />
                  </div>
                </Link>

                <div className={styles.cardContent}>
                  <Link href={watchUrl} className={styles.movieTitleLink} title={item.movieName}>
                    <h3 className={styles.movieTitle}>{item.movieName}</h3>
                  </Link>

                  <div className={styles.metaRow}>
                    <span className={styles.epTag}>{item.epName || 'Đang xem'}</span>
                    <span className={styles.timeText}>
                      {formatRelativeTime(item.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <FaFilm className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>
            {searchQuery ? 'Không tìm thấy phim phù hợp' : 'Chưa có phim nào trong lịch sử'}
          </h3>
          <p className={styles.emptyText}>
            {searchQuery
              ? 'Thử tìm với từ khoá khác hoặc xoá bộ lọc tìm kiếm.'
              : 'Các bộ phim bạn đã theo dõi sẽ được lưu tự động tại đây để bạn có thể tiếp tục xem bất cứ lúc nào.'}
          </p>
          <Link href="/" className={styles.exploreBtn}>
            <FaPlay style={{ fontSize: '0.75rem' }} />
            <span>Khám phá phim ngay</span>
          </Link>
        </div>
      )}
    </div>
  );
}

export function HistoryContentExport(props: { inProfilePage?: boolean }): ReactElement {
  return <HistoryContent {...props} />;
}

export default function HistoryPage(): ReactElement {
  return (
    <div className={styles.historyPageWrapper}>
      <Head>
        <title>Lịch sử xem phim | MovieStreaming</title>
        <meta
          name="description"
          content="Xem lại danh sách các bộ phim đã xem và tiếp tục theo dõi các tập phim yêu thích."
        />
        <meta property="og:title" content="Lịch sử xem phim | MovieStreaming" />
      </Head>

      <Navbar />

      <main>
        <HistoryContent inProfilePage={false} />
      </main>

      <Footer />
    </div>
  );
}
