// src/components/Admin/Movies/EpisodeManagerModal.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  FaTimes,
  FaServer,
  FaFilm,
  FaPlay,
  FaPlus,
  FaTrash,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaBan,
  FaCopy,
  FaExternalLinkAlt,
  FaListOl,
  FaPaste
} from 'react-icons/fa';
import styles from '@/styles/EpisodeManager.module.css';
import { showCinemaAlert } from '@/components/UI/CinemaAlert';

export type EpisodeStatus = 'ACTIVE' | 'PROCESSING' | 'ERROR' | 'DISABLED';

export interface EpisodeItem {
  id: string;
  episodeNumber: number | string;
  name: string;
  slug: string;
  linkM3u8: string;
  linkEmbed?: string;
  quality?: string;
  status: EpisodeStatus;
}

export interface ServerGroup {
  id: string;
  name: string;
  serverType: string;
  episodes: EpisodeItem[];
}

interface EpisodeManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  movie: {
    id?: string;
    _id?: string;
    name: string;
    origin_name?: string;
    slug?: string;
  } | null;
}

// Initial Mock Servers & Episodes
const INITIAL_SERVERS: ServerGroup[] = [
  {
    id: 'srv-1',
    name: 'Server VIP #1 (FPT HLS)',
    serverType: 'HLS',
    episodes: [
      { id: 'ep-1', episodeNumber: 1, name: 'Tập 1', slug: 'tap-1', linkM3u8: 'https://stream.cinema.vn/hls/dune2/ep1/index.m3u8', linkEmbed: 'https://player.cinema.vn/embed/dune2-ep1', quality: '4K', status: 'ACTIVE' },
      { id: 'ep-2', episodeNumber: 2, name: 'Tập 2', slug: 'tap-2', linkM3u8: 'https://stream.cinema.vn/hls/dune2/ep2/index.m3u8', linkEmbed: 'https://player.cinema.vn/embed/dune2-ep2', quality: '4K', status: 'ACTIVE' },
      { id: 'ep-3', episodeNumber: 3, name: 'Tập 3', slug: 'tap-3', linkM3u8: 'https://stream.cinema.vn/hls/dune2/ep3/index.m3u8', linkEmbed: 'https://player.cinema.vn/embed/dune2-ep3', quality: '1080p', status: 'ACTIVE' },
      { id: 'ep-4', episodeNumber: 4, name: 'Tập 4', slug: 'tap-4', linkM3u8: 'https://stream.cinema.vn/hls/dune2/ep4/index.m3u8', linkEmbed: 'https://player.cinema.vn/embed/dune2-ep4', quality: '1080p', status: 'PROCESSING' },
      { id: 'ep-5', episodeNumber: 5, name: 'Tập 5', slug: 'tap-5', linkM3u8: 'https://stream.cinema.vn/hls/dune2/ep5/broken.m3u8', linkEmbed: 'https://player.cinema.vn/embed/dune2-ep5', quality: '1080p', status: 'ERROR' }
    ]
  },
  {
    id: 'srv-2',
    name: 'Server Dự Phòng #2 (Cloudflare CDN)',
    serverType: 'CDN',
    episodes: [
      { id: 'ep-cf-1', episodeNumber: 1, name: 'Tập 1', slug: 'tap-1', linkM3u8: 'https://cdn.backup-stream.net/dune2/ep1.m3u8', quality: '1080p', status: 'ACTIVE' },
      { id: 'ep-cf-2', episodeNumber: 2, name: 'Tập 2', slug: 'tap-2', linkM3u8: 'https://cdn.backup-stream.net/dune2/ep2.m3u8', quality: '1080p', status: 'ACTIVE' }
    ]
  },
  {
    id: 'srv-3',
    name: 'Server Embed #3 (Hydra Player)',
    serverType: 'EMBED',
    episodes: [
      { id: 'ep-emb-1', episodeNumber: 1, name: 'Tập 1', slug: 'tap-1', linkM3u8: '', linkEmbed: 'https://hydra.stream/e/dune-p2-01', quality: '720p', status: 'ACTIVE' }
    ]
  }
];

export default function EpisodeManagerModal({
  isOpen,
  onClose,
  movie
}: EpisodeManagerModalProps) {
  const [servers, setServers] = useState<ServerGroup[]>(INITIAL_SERVERS);
  const [activeServerId, setActiveServerId] = useState<string>('srv-1');

  // Input Modes: 'single' | 'batch'
  const [inputMode, setInputMode] = useState<'single' | 'batch'>('single');

  // Single Add Episode Form State
  const [epNum, setEpNum] = useState<string>('');
  const [epName, setEpName] = useState<string>('');
  const [epM3u8, setEpM3u8] = useState<string>('');
  const [epEmbed, setEpEmbed] = useState<string>('');
  const [epQuality, setEpQuality] = useState<string>('1080p');

  // Batch paste state
  const [batchText, setBatchText] = useState<string>('');

  // Test player state
  const [testPlayingEp, setTestPlayingEp] = useState<EpisodeItem | null>(null);

  const activeServer = useMemo(() => {
    return servers.find(s => s.id === activeServerId) || servers[0];
  }, [servers, activeServerId]);

  // Overall Stats
  const totalEpisodesCount = useMemo(() => {
    return activeServer ? activeServer.episodes.length : 0;
  }, [activeServer]);

  const activeCount = useMemo(() => {
    return activeServer ? activeServer.episodes.filter(e => e.status === 'ACTIVE').length : 0;
  }, [activeServer]);

  const errorCount = useMemo(() => {
    return activeServer ? activeServer.episodes.filter(e => e.status === 'ERROR').length : 0;
  }, [activeServer]);

  if (!isOpen || !movie) return null;

  // Cycle Status (ACTIVE -> PROCESSING -> ERROR -> DISABLED -> ACTIVE)
  const handleCycleStatus = (ep: EpisodeItem) => {
    const statusMap: Record<EpisodeStatus, EpisodeStatus> = {
      ACTIVE: 'PROCESSING',
      PROCESSING: 'ERROR',
      ERROR: 'DISABLED',
      DISABLED: 'ACTIVE'
    };

    const nextStatus = statusMap[ep.status];

    setServers(prev => prev.map(s => {
      if (s.id !== activeServerId) return s;
      return {
        ...s,
        episodes: s.episodes.map(e => e.id === ep.id ? { ...e, status: nextStatus } : e)
      };
    }));

    const statusLabels: Record<EpisodeStatus, string> = {
      ACTIVE: 'Hoạt động',
      PROCESSING: 'Đang xử lý / render',
      ERROR: 'Báo hỏng / lỗi link',
      DISABLED: 'Tạm ẩn'
    };

    showCinemaAlert(
      `Đã chuyển trạng thái ${ep.name} sang: ${statusLabels[nextStatus]}`,
      nextStatus === 'ACTIVE' ? 'cinema' : nextStatus === 'ERROR' ? 'error' : 'warning'
    );
  };

  // Add Single Episode
  const handleAddSingleEpisode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!epNum.trim()) return;

    const num = epNum.trim();
    const finalName = epName.trim() || `Tập ${num}`;
    const slug = `tap-${num}`.toLowerCase();

    const newEp: EpisodeItem = {
      id: `ep-${Date.now()}`,
      episodeNumber: num,
      name: finalName,
      slug,
      linkM3u8: epM3u8.trim(),
      linkEmbed: epEmbed.trim(),
      quality: epQuality,
      status: 'ACTIVE'
    };

    setServers(prev => prev.map(s => {
      if (s.id !== activeServerId) return s;
      return { ...s, episodes: [...s.episodes, newEp] };
    }));

    showCinemaAlert(`Đã thêm ${finalName} vào ${activeServer?.name}!`, 'cinema');

    // Reset
    setEpNum('');
    setEpName('');
    setEpM3u8('');
    setEpEmbed('');
  };

  // Batch Import Episodes
  const handleBatchImport = () => {
    if (!batchText.trim()) return;

    const lines = batchText.split('\n').filter(l => l.trim().length > 0);
    const parsedEpisodes: EpisodeItem[] = [];

    lines.forEach((line, index) => {
      const parts = line.split('|').map(p => p.trim());
      let parsedNum = `${index + 1}`;
      let parsedName = `Tập ${index + 1}`;
      let parsedUrl = '';

      if (parts.length >= 2) {
        parsedName = parts[0];
        parsedNum = parts[0].replace(/[^0-9]/g, '') || `${index + 1}`;
        parsedUrl = parts[1];
      } else {
        parsedUrl = parts[0];
      }

      parsedEpisodes.push({
        id: `ep-batch-${Date.now()}-${index}`,
        episodeNumber: parsedNum,
        name: parsedName,
        slug: `tap-${parsedNum}`.toLowerCase(),
        linkM3u8: parsedUrl.endsWith('.m3u8') ? parsedUrl : '',
        linkEmbed: !parsedUrl.endsWith('.m3u8') ? parsedUrl : '',
        quality: '1080p',
        status: 'ACTIVE'
      });
    });

    if (parsedEpisodes.length > 0) {
      setServers(prev => prev.map(s => {
        if (s.id !== activeServerId) return s;
        return { ...s, episodes: [...s.episodes, ...parsedEpisodes] };
      }));

      showCinemaAlert(`Đã nhập thành công ${parsedEpisodes.length} tập phim hàng loạt!`, 'cinema');
      setBatchText('');
      setInputMode('single');
    }
  };

  // Delete Episode
  const handleDeleteEpisode = (epId: string, name: string) => {
    setServers(prev => prev.map(s => {
      if (s.id !== activeServerId) return s;
      return { ...s, episodes: s.episodes.filter(e => e.id !== epId) };
    }));

    showCinemaAlert(`Đã xóa ${name}`, 'warning');
    if (testPlayingEp?.id === epId) setTestPlayingEp(null);
  };

  // Add Server
  const handleAddNewServer = () => {
    const srvIndex = servers.length + 1;
    const newServer: ServerGroup = {
      id: `srv-${Date.now()}`,
      name: `Server Mới #${srvIndex} (Dự phòng)`,
      serverType: 'HLS',
      episodes: []
    };

    setServers(prev => [...prev, newServer]);
    setActiveServerId(newServer.id);
    showCinemaAlert(`Đã tạo ${newServer.name}!`, 'cinema');
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIconBox}>
              <FaFilm />
            </div>
            <div>
              <h2 className={styles.movieTitle}>
                Quản Lý Tập Phim & Stream Server: <span>{movie.name}</span>
              </h2>
              <div className={styles.movieSub}>
                {movie.origin_name && `${movie.origin_name} • `}
                /{movie.slug || 'phim'}
              </div>
            </div>
          </div>

          <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {/* Stats Ribbon */}
          <div className={styles.statsRibbon}>
            <div className={styles.statItem}>
              <FaServer style={{ color: '#e50914' }} />
              <span>Máy chủ: <strong className={styles.statVal}>{activeServer?.name}</strong></span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span>Tổng số: <strong className={styles.statVal}>{totalEpisodesCount} tập</strong></span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem} style={{ color: '#4ade80' }}>
              <FaCheckCircle />
              <span>Hoạt động: <strong>{activeCount}</strong></span>
            </div>
            {errorCount > 0 && (
              <>
                <div className={styles.statDivider}></div>
                <div className={styles.statItem} style={{ color: '#ef4444' }}>
                  <FaExclamationTriangle />
                  <span>Báo lỗi link: <strong>{errorCount}</strong></span>
                </div>
              </>
            )}
          </div>

          {/* Server Tabs */}
          <div className={styles.serverTabsBar}>
            {servers.map(server => (
              <button
                key={server.id}
                type="button"
                className={`${styles.serverTab} ${server.id === activeServerId ? styles.serverTabActive : ''}`}
                onClick={() => {
                  setActiveServerId(server.id);
                  setTestPlayingEp(null);
                }}
              >
                <FaServer style={{ fontSize: '0.75rem', color: server.id === activeServerId ? '#e50914' : '#9ca3af' }} />
                <span>{server.name}</span>
                <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.08)' }}>
                  {server.episodes.length}
                </span>
              </button>
            ))}

            <button
              type="button"
              className={styles.addServerBtn}
              onClick={handleAddNewServer}
              title="Thêm server phát dự phòng"
            >
              <FaPlus /> Thêm Server
            </button>
          </div>

          {/* Test Player Banner (If active) */}
          {testPlayingEp && (
            <div className={styles.testPlayerCard}>
              <div className={styles.testPlayerHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FaPlay style={{ color: '#e50914', fontSize: '0.75rem' }} />
                  <strong>Kiểm tra phát: {testPlayingEp.name} ({activeServer?.name})</strong>
                </div>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
                  onClick={() => setTestPlayingEp(null)}
                >
                  <FaTimes /> Đóng Test
                </button>
              </div>

              <div className={styles.testVideoPlaceholder}>
                <FaPlay style={{ fontSize: '1.8rem', color: '#e50914' }} />
                <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#38bdf8' }}>
                  {testPlayingEp.linkM3u8 || testPlayingEp.linkEmbed || 'Không có stream URL'}
                </span>
                <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>
                  Đang giả lập luồng phát Video Stream HLS độ phân giải {testPlayingEp.quality}
                </span>
              </div>
            </div>
          )}

          {/* Input Controls Mode Selector */}
          <div className={styles.controlsBar}>
            <div className={styles.modeToggleGroup}>
              <button
                type="button"
                className={`${styles.modeBtn} ${inputMode === 'single' ? styles.modeBtnActive : ''}`}
                onClick={() => setInputMode('single')}
              >
                <FaListOl style={{ marginRight: '0.35rem' }} /> Thêm Tập Lẻ
              </button>
              <button
                type="button"
                className={`${styles.modeBtn} ${inputMode === 'batch' ? styles.modeBtnActive : ''}`}
                onClick={() => setInputMode('batch')}
              >
                <FaPaste style={{ marginRight: '0.35rem' }} /> Nhập Hàng Loạt (Batch Paste)
              </button>
            </div>
          </div>

          {/* Single Episode Form */}
          {inputMode === 'single' ? (
            <form onSubmit={handleAddSingleEpisode} style={{ background: '#0a0a0c', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: '80px 140px 1fr 1fr 100px auto', gap: '0.65rem', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '0.74rem', color: '#9ca3af', display: 'block', marginBottom: '0.25rem' }}>Số tập *</label>
                <input
                  type="text"
                  placeholder="VD: 1"
                  value={epNum}
                  onChange={(e) => setEpNum(e.target.value)}
                  style={{ width: '100%', height: '34px', background: '#141416', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', padding: '0 0.5rem', fontSize: '0.82rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#9ca3af', display: 'block', marginBottom: '0.25rem' }}>Tên hiển thị</label>
                <input
                  type="text"
                  placeholder="VD: Tập 1"
                  value={epName}
                  onChange={(e) => setEpName(e.target.value)}
                  style={{ width: '100%', height: '34px', background: '#141416', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', padding: '0 0.5rem', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#9ca3af', display: 'block', marginBottom: '0.25rem' }}>Link Stream HLS (.m3u8)</label>
                <input
                  type="url"
                  placeholder="https://.../index.m3u8"
                  value={epM3u8}
                  onChange={(e) => setEpM3u8(e.target.value)}
                  style={{ width: '100%', height: '34px', background: '#141416', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', padding: '0 0.5rem', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#9ca3af', display: 'block', marginBottom: '0.25rem' }}>Link Embed (Iframe)</label>
                <input
                  type="url"
                  placeholder="https://.../embed/..."
                  value={epEmbed}
                  onChange={(e) => setEpEmbed(e.target.value)}
                  style={{ width: '100%', height: '34px', background: '#141416', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', padding: '0 0.5rem', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#9ca3af', display: 'block', marginBottom: '0.25rem' }}>Chất lượng</label>
                <select
                  value={epQuality}
                  onChange={(e) => setEpQuality(e.target.value)}
                  style={{ width: '100%', height: '34px', background: '#141416', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', padding: '0 0.4rem', fontSize: '0.82rem' }}
                >
                  <option value="4K">4K</option>
                  <option value="1080p">1080p</option>
                  <option value="720p">720p</option>
                </select>
              </div>

              <button
                type="submit"
                className={styles.triggerAddBtn}
                style={{ height: '34px' }}
              >
                <FaPlus /> Thêm
              </button>
            </form>
          ) : (
            <div className={styles.batchBox}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>
                  Dán Danh Sách Đường Dẫn (Mỗi tập 1 dòng):
                </span>
                <span className={styles.batchHint}>Định dạng: <code>Tên Tập|URL</code> hoặc chỉ <code>URL</code></span>
              </div>
              <textarea
                className={styles.batchTextarea}
                placeholder={`Tập 1|https://stream.server.com/ep1.m3u8\nTập 2|https://stream.server.com/ep2.m3u8\nTập 3|https://stream.server.com/ep3.m3u8`}
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={styles.triggerAddBtn}
                  onClick={handleBatchImport}
                >
                  + Xử Lý & Nhập Hàng Loạt
                </button>
              </div>
            </div>
          )}

          {/* Episodes List Table */}
          <div className={styles.episodesTableCard}>
            <table className={styles.epTable}>
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>Tập</th>
                  <th style={{ width: '16%' }}>Tên Tập / Slug</th>
                  <th style={{ width: '38%' }}>Stream Link (HLS / Embed)</th>
                  <th style={{ width: '10%' }}>Chất Lượng</th>
                  <th style={{ width: '14%' }}>Trạng Thái</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {activeServer && activeServer.episodes.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                      Server này chưa có tập phim nào. Hãy thêm tập lẻ hoặc dán danh sách hàng loạt ở trên.
                    </td>
                  </tr>
                ) : (
                  activeServer?.episodes.map(ep => (
                    <tr key={ep.id} className={styles.epRow}>
                      {/* Number */}
                      <td>
                        <span className={styles.epNumBadge}>#{ep.episodeNumber}</span>
                      </td>

                      {/* Name / Slug */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.84rem' }}>{ep.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#9ca3af', fontFamily: 'monospace' }}>/{ep.slug}</div>
                      </td>

                      {/* Link preview */}
                      <td>
                        <div className={styles.streamLinkText} title={ep.linkM3u8 || ep.linkEmbed || 'Chưa có link'}>
                          {ep.linkM3u8 || ep.linkEmbed || <em style={{ color: '#ef4444' }}>Chưa có link</em>}
                        </div>
                      </td>

                      {/* Quality */}
                      <td>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}>
                          {ep.quality || '1080p'}
                        </span>
                      </td>

                      {/* Status Selector */}
                      <td>
                        <button
                          type="button"
                          className={`${styles.statusPill} ${
                            ep.status === 'ACTIVE' ? styles.statusActive :
                            ep.status === 'PROCESSING' ? styles.statusProcessing :
                            ep.status === 'ERROR' ? styles.statusError :
                            styles.statusDisabled
                          }`}
                          title="Bấm để chuyển đổi trạng thái tập"
                          onClick={() => handleCycleStatus(ep)}
                        >
                          {ep.status === 'ACTIVE' && <><FaCheckCircle /> Hoạt động</>}
                          {ep.status === 'PROCESSING' && <><FaClock /> Đang xử lý</>}
                          {ep.status === 'ERROR' && <><FaExclamationTriangle /> Lỗi link</>}
                          {ep.status === 'DISABLED' && <><FaBan /> Tạm ẩn</>}
                        </button>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            title="Kiểm tra phát tập này"
                            onClick={() => setTestPlayingEp(ep)}
                          >
                            <FaPlay style={{ fontSize: '0.65rem' }} />
                          </button>
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            title="Xóa tập này"
                            onClick={() => handleDeleteEpisode(ep.id, ep.name)}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.doneBtn} onClick={onClose}>
            Xong & Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
