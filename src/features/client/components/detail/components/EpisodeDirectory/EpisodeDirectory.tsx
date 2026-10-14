import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { getWatchProgress } from '@/utils/watchProgress';
import type { WatchServer, WatchEpisode } from '@/features/client/components/detail/components/WatchSidebarPlaylist/WatchSidebarPlaylist';
import styles from './EpisodeDirectory.module.css';

const GROUP_SIZE = 25;

/**
 * @file EpisodeDirectory.tsx
 * @description Compact, high-density episode directory modeled after Asian streaming platforms.
 */

export interface EpisodeDirectoryProps {
  movieSlug?: string;
  servers?: WatchServer[];
  movieType?: 'series' | 'single' | string;
}

/** Watch progress shape (partial) */
interface WatchProgressPayload {
  epSlug?: string;
  serverIndex?: number;
  episodeIndex?: number;
  epName?: string;
}

const EpisodeDirectory: React.FC<EpisodeDirectoryProps> = ({
  movieSlug,
  servers = [],
  movieType = 'single'
}) => {
  const [activeServerIndex, setActiveServerIndex] = useState<number>(0);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [savedProgress, setSavedProgress] = useState<WatchProgressPayload | null>(null);

  const currentServer: WatchServer | null = servers[activeServerIndex] || servers[0] || null;
  const rawEpisodes: WatchEpisode[] = currentServer?.server_data || [];
  const totalEpisodes = rawEpisodes.length;

  // Check saved progress from localStorage on client mount
  useEffect(() => {
    if (!movieSlug) return;
    const progress = getWatchProgress(movieSlug) as WatchProgressPayload | null;
    if (progress) {
      setSavedProgress(progress);
      if (typeof progress.serverIndex === 'number' && progress.serverIndex < servers.length) {
        setActiveServerIndex(progress.serverIndex);
      }
      if (typeof progress.episodeIndex === 'number' && progress.episodeIndex >= 0) {
        setActiveGroupIndex(Math.floor(progress.episodeIndex / GROUP_SIZE));
      }
    }
  }, [movieSlug, servers.length]);

  // Single movie check
  const isSeries = movieType === 'series' || totalEpisodes > 1;

  // Filter episodes by search term
  const filteredEpisodes = useMemo((): WatchEpisode[] => {
    if (!searchTerm.trim()) return rawEpisodes;
    const clean = searchTerm.trim().toLowerCase();
    return rawEpisodes.filter(
      (ep) =>
        ep.name?.toLowerCase().includes(clean) ||
        ep.slug?.toLowerCase().includes(clean)
    );
  }, [rawEpisodes, searchTerm]);

  const totalGroups = Math.ceil(filteredEpisodes.length / GROUP_SIZE);

  // Sliced episodes for current group
  const displayedEpisodes = useMemo((): WatchEpisode[] => {
    if (searchTerm.trim()) return filteredEpisodes.slice(0, 100);
    const start = activeGroupIndex * GROUP_SIZE;
    return filteredEpisodes.slice(start, start + GROUP_SIZE);
  }, [filteredEpisodes, activeGroupIndex, searchTerm]);

  if (!isSeries && totalEpisodes <= 1) {
    const singleEp = rawEpisodes[0];
    const watchHref = singleEp?.slug
      ? `/movie/${movieSlug}/watch?ep=${encodeURIComponent(singleEp.slug)}&server=${activeServerIndex}`
      : `/movie/${movieSlug}/watch`;

    return (
      <section className={styles.container} aria-label="Nguồn phát phim">
        <div className={styles.singleSourceRow}>
          <div className={styles.singleSourceInfo}>
            <span className={styles.sourceLabel}>Nguồn phát:</span>
            <span className={styles.sourceName}>{currentServer?.server_name || 'Bản Full HD'}</span>
          </div>
          <Link href={watchHref} className={styles.btnWatchSingle}>
            <i className="fas fa-play me-1" />
            Xem Phim
          </Link>
        </div>
      </section>
    );
  }

  // Target resume episode link
  const resumeHref: string = savedProgress?.epSlug
    ? `/movie/${movieSlug}/watch?ep=${encodeURIComponent(savedProgress.epSlug)}&server=${savedProgress.serverIndex || 0}`
    : `/movie/${movieSlug}/watch`;

  return (
    <section className={styles.container} aria-label="Danh sách tập phim">
      {/* Header bar */}
      <div className={styles.headerBar}>
        <div className={styles.headerTitleWrap}>
          <h3 className={styles.headerTitle}>Danh Sách Tập</h3>
          <span className={styles.epCountBadge}>({totalEpisodes} tập)</span>
        </div>

        {/* Server selection buttons */}
        {servers.length > 1 && (
          <div className={styles.serverTabs}>
            {servers.map((srv, idx) => (
              <button
                key={srv.server_name || String(idx)}
                type="button"
                className={`${styles.serverTab} ${activeServerIndex === idx ? styles.serverTabActive : ''}`}
                onClick={() => {
                  setActiveServerIndex(idx);
                  setActiveGroupIndex(0);
                  setSearchTerm('');
                }}
              >
                {srv.server_name || `Server ${idx + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Resume Watch Banner */}
      {savedProgress && savedProgress.epName && (
        <div className={styles.resumeBanner}>
          <div className={styles.resumeInfo}>
            <span>Bạn đang xem:</span>
            <span className={styles.resumeEpHighlight}>
              {savedProgress.epName.toLowerCase().startsWith('tập')
                ? savedProgress.epName
                : `Tập ${savedProgress.epName}`}
            </span>
          </div>

          <Link href={resumeHref} className={styles.btnResumePlay}>
            Tiếp tục xem ngay
          </Link>
        </div>
      )}

      {/* Filter toolbar */}
      {totalEpisodes > 25 && (
        <div className={styles.filterBar}>
          {totalGroups > 1 && !searchTerm.trim() && (
            <div className={styles.groupSelectWrap}>
              <select
                className={styles.groupDropdownSelect}
                value={activeGroupIndex}
                onChange={(e) => setActiveGroupIndex(Number(e.target.value))}
                aria-label="Chọn khoảng tập"
              >
                {Array.from({ length: totalGroups }).map((_, gIdx) => {
                  const start = gIdx * GROUP_SIZE + 1;
                  const end = Math.min((gIdx + 1) * GROUP_SIZE, filteredEpisodes.length);
                  const isCurrentSavedGroup =
                    savedProgress &&
                    typeof savedProgress.episodeIndex === 'number' &&
                    Math.floor(savedProgress.episodeIndex / GROUP_SIZE) === gIdx;

                  return (
                    <option key={`opt-${gIdx}`} value={gIdx}>
                      Tập {start} - {end} {isCurrentSavedGroup ? '• (Đang xem dở)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className={styles.searchWrapper}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm số tập..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Compact High-Density Episode Grid */}
      <div className={styles.chipsGrid}>
        {displayedEpisodes.map((ep, idx) => {
          const epSlug = ep.slug || `tap-${ep.name}`;
          const href = `/movie/${movieSlug}/watch?ep=${encodeURIComponent(epSlug)}&server=${activeServerIndex}`;
          const displayName = ep.name?.toLowerCase().startsWith('tập') ? ep.name : `Tập ${ep.name}`;
          const isResumeEp = savedProgress && (savedProgress.epSlug === ep.slug || savedProgress.epName === ep.name);

          return (
            <Link
              key={ep.slug || String(idx)}
              href={href}
              className={`${styles.chip} ${isResumeEp ? styles.chipResume : ''}`}
              title={isResumeEp ? `Tiếp tục xem ${displayName}` : `Xem ${displayName}`}
            >
              {displayName}
            </Link>
          );
        })}
      </div>

      {displayedEpisodes.length === 0 && (
        <div className={styles.emptyNotice}>
          Không tìm thấy tập phim phù hợp với từ khóa &ldquo;{searchTerm}&rdquo;
        </div>
      )}
    </section>
  );
};

export default EpisodeDirectory;
