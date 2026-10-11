// src/components/Admin/Movies/EpisodeManagerModal.tsx
'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FaTimes,
  FaServer,
  FaFilm,
  FaPlay,
  FaPlus,
  FaTrash,
  FaPen,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaBan,
  FaCopy,
  FaChevronDown,
  FaTh,
  FaList,
  FaSearch,
  FaPaste,
  FaExternalLinkAlt
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

const INITIAL_SERVERS: ServerGroup[] = [
  {
    id: 'srv-1',
    name: 'Server VIP #1 (FPT HLS)',
    serverType: 'HLS',
    episodes: [
      { id: 'ep-1', episodeNumber: 1, name: 'Tập 1 - Khởi Đầu', slug: 'tap-1', linkM3u8: 'https://stream.cinema.vn/hls/dune2/ep1/index.m3u8', linkEmbed: 'https://player.cinema.vn/embed/dune2-ep1', quality: '4K', status: 'ACTIVE' },
      { id: 'ep-2', episodeNumber: 2, name: 'Tập 2 - Tiên Tri', slug: 'tap-2', linkM3u8: 'https://stream.cinema.vn/hls/dune2/ep2/index.m3u8', linkEmbed: 'https://player.cinema.vn/embed/dune2-ep2', quality: '4K', status: 'ACTIVE' },
      { id: 'ep-3', episodeNumber: 3, name: 'Tập 3 - Sa Mạc Đỏ', slug: 'tap-3', linkM3u8: 'https://stream.cinema.vn/hls/dune2/ep3/index.m3u8', linkEmbed: 'https://player.cinema.vn/embed/dune2-ep3', quality: '1080p', status: 'ACTIVE' },
      { id: 'ep-4', episodeNumber: 4, name: 'Tập 4 - Cuộc Chiến', slug: 'tap-4', linkM3u8: 'https://stream.cinema.vn/hls/dune2/ep4/index.m3u8', linkEmbed: 'https://player.cinema.vn/embed/dune2-ep4', quality: '1080p', status: 'PROCESSING' },
      { id: 'ep-5', episodeNumber: 5, name: 'Tập 5 - Định Mệnh', slug: 'tap-5', linkM3u8: 'https://stream.cinema.vn/hls/dune2/ep5/broken.m3u8', linkEmbed: 'https://player.cinema.vn/embed/dune2-ep5', quality: '1080p', status: 'ERROR' }
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

  // View Mode: 'grid' | 'list'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Sub-modal 1: Single Episode Add / Edit Form Modal
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<EpisodeItem | null>(null);

  // Sub-modal 2: Batch Import Modal
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchText, setBatchText] = useState('');

  // Test Player State
  const [testPlayingEp, setTestPlayingEp] = useState<EpisodeItem | null>(null);

  // Active status dropdown menu
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Close status dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setOpenStatusMenuId(null);
      }
    };
    if (openStatusMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openStatusMenuId]);

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

  // Filtered Episodes
  const filteredEpisodes = useMemo(() => {
    if (!activeServer) return [];
    if (!searchTerm.trim()) return activeServer.episodes;
    const term = searchTerm.toLowerCase();
    return activeServer.episodes.filter(ep =>
      String(ep.episodeNumber).includes(term) ||
      ep.name.toLowerCase().includes(term) ||
      ep.slug.toLowerCase().includes(term)
    );
  }, [activeServer, searchTerm]);

  if (!isOpen || !movie) return null;

  // Change Status for an episode
  const handleSetStatus = (epId: string, newStatus: EpisodeStatus) => {
    setServers(prev => prev.map(s => {
      if (s.id !== activeServerId) return s;
      return {
        ...s,
        episodes: s.episodes.map(e => e.id === epId ? { ...e, status: newStatus } : e)
      };
    }));
    setOpenStatusMenuId(null);

    const labels: Record<EpisodeStatus, string> = {
      ACTIVE: 'Hoạt động',
      PROCESSING: 'Đang xử lý',
      ERROR: 'Lỗi link',
      DISABLED: 'Tạm ẩn'
    };

    showCinemaAlert(`Đã đổi trạng thái sang: ${labels[newStatus]}`, newStatus === 'ACTIVE' ? 'cinema' : newStatus === 'ERROR' ? 'error' : 'warning');
  };

  // Open Form to Add
  const handleOpenAddForm = () => {
    setEditingEpisode(null);
    setIsFormModalOpen(true);
  };

  // Open Form to Edit
  const handleOpenEditForm = (ep: EpisodeItem) => {
    setEditingEpisode(ep);
    setIsFormModalOpen(true);
  };

  // Save Episode from Form Modal
  const handleSaveEpisode = (formData: {
    episodeNumber: string;
    name: string;
    linkM3u8: string;
    linkEmbed: string;
    quality: string;
    status: EpisodeStatus;
  }) => {
    const num = formData.episodeNumber.trim();
    const finalName = formData.name.trim() || `Tập ${num}`;
    const slug = `tap-${num}`.toLowerCase();

    if (editingEpisode) {
      // Update
      setServers(prev => prev.map(s => {
        if (s.id !== activeServerId) return s;
        return {
          ...s,
          episodes: s.episodes.map(e => e.id === editingEpisode.id ? {
            ...e,
            episodeNumber: num,
            name: finalName,
            slug,
            linkM3u8: formData.linkM3u8.trim(),
            linkEmbed: formData.linkEmbed.trim(),
            quality: formData.quality,
            status: formData.status
          } : e)
        };
      }));
      showCinemaAlert(`Đã cập nhật ${finalName}!`, 'cinema');
    } else {
      // Add new
      const newEp: EpisodeItem = {
        id: `ep-${Date.now()}`,
        episodeNumber: num,
        name: finalName,
        slug,
        linkM3u8: formData.linkM3u8.trim(),
        linkEmbed: formData.linkEmbed.trim(),
        quality: formData.quality,
        status: formData.status
      };

      setServers(prev => prev.map(s => {
        if (s.id !== activeServerId) return s;
        return { ...s, episodes: [...s.episodes, newEp] };
      }));
      showCinemaAlert(`Đã thêm ${finalName}!`, 'cinema');
    }

    setIsFormModalOpen(false);
  };

  // Batch Import
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
      setIsBatchModalOpen(false);
    }
  };

  // Delete Episode
  const handleDeleteEpisode = (epId: string, name: string) => {
    setServers(prev => prev.map(s => {
      if (s.id !== activeServerId) return s;
      return { ...s, episodes: s.episodes.filter(e => e.id !== epId) };
    }));

    if (testPlayingEp?.id === epId) setTestPlayingEp(null);
    showCinemaAlert(`Đã xóa ${name}`, 'warning');
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

  // Render Status Interactive Button
  const renderStatusButton = (ep: EpisodeItem) => {
    const isMenuOpen = openStatusMenuId === ep.id;

    return (
      <div className={styles.statusButtonWrapper} ref={isMenuOpen ? statusMenuRef : null}>
        <button
          type="button"
          className={`${styles.interactiveStatusBtn} ${
            ep.status === 'ACTIVE' ? styles.statusActive :
            ep.status === 'PROCESSING' ? styles.statusProcessing :
            ep.status === 'ERROR' ? styles.statusError :
            styles.statusDisabled
          }`}
          title="Bấm để chuyển đổi trạng thái tập"
          onClick={(e) => {
            e.stopPropagation();
            setOpenStatusMenuId(isMenuOpen ? null : ep.id);
          }}
        >
          {ep.status === 'ACTIVE' && <FaCheckCircle />}
          {ep.status === 'PROCESSING' && <FaClock />}
          {ep.status === 'ERROR' && <FaExclamationTriangle />}
          {ep.status === 'DISABLED' && <FaBan />}
          <span>
            {ep.status === 'ACTIVE' && 'Hoạt động'}
            {ep.status === 'PROCESSING' && 'Đang xử lý'}
            {ep.status === 'ERROR' && 'Lỗi link'}
            {ep.status === 'DISABLED' && 'Tạm ẩn'}
          </span>
          <FaChevronDown className={styles.statusChevron} />
        </button>

        {isMenuOpen && (
          <div className={styles.statusMenu}>
            <button
              type="button"
              className={styles.statusMenuItem}
              onClick={() => handleSetStatus(ep.id, 'ACTIVE')}
            >
              <FaCheckCircle style={{ color: '#4ade80' }} /> Hoạt động
            </button>
            <button
              type="button"
              className={styles.statusMenuItem}
              onClick={() => handleSetStatus(ep.id, 'PROCESSING')}
            >
              <FaClock style={{ color: '#60a5fa' }} /> Đang xử lý
            </button>
            <button
              type="button"
              className={styles.statusMenuItem}
              onClick={() => handleSetStatus(ep.id, 'ERROR')}
            >
              <FaExclamationTriangle style={{ color: '#f87171' }} /> Lỗi link
            </button>
            <button
              type="button"
              className={styles.statusMenuItem}
              onClick={() => handleSetStatus(ep.id, 'DISABLED')}
            >
              <FaBan style={{ color: '#9ca3af' }} /> Tạm ẩn
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* MAIN POPUP */}
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
                  Quản Lý Tập Phim: <span>{movie.name}</span>
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
                <span>Máy chủ hiện tại: <strong className={styles.statVal}>{activeServer?.name}</strong></span>
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
                    <span>Lỗi link: <strong>{errorCount}</strong></span>
                  </div>
                </>
              )}
            </div>

            {/* Server Tabs Bar */}
            <div className={styles.serverTabsBar}>
              <div className={styles.serverTabsList}>
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
                    <span className={styles.serverBadgeCount}>
                      {server.episodes.length}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className={styles.addServerBtn}
                onClick={handleAddNewServer}
                title="Thêm máy chủ phát dự phòng"
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
                    style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.8rem' }}
                    onClick={() => setTestPlayingEp(null)}
                  >
                    <FaTimes /> Đóng Test
                  </button>
                </div>

                <div className={styles.testVideoPlaceholder}>
                  <FaPlay style={{ fontSize: '1.8rem', color: '#e50914' }} />
                  <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#38bdf8', maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {testPlayingEp.linkM3u8 || testPlayingEp.linkEmbed || 'Không có stream URL'}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>
                    Đang giả lập luồng phát Video Stream HLS độ phân giải {testPlayingEp.quality || '1080p'}
                  </span>
                </div>
              </div>
            )}

            {/* Action Toolbar */}
            <div className={styles.actionToolbar}>
              <div className={styles.toolbarLeft}>
                <button
                  type="button"
                  className={styles.primaryAddEpBtn}
                  onClick={handleOpenAddForm}
                >
                  <FaPlus /> Thêm Tập Mới
                </button>

                <button
                  type="button"
                  className={styles.secondaryBatchBtn}
                  onClick={() => setIsBatchModalOpen(true)}
                >
                  <FaPaste /> Nhập Hàng Loạt
                </button>
              </div>

              <div className={styles.toolbarRight}>
                <div className={styles.searchBox}>
                  <FaSearch className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Tìm tập..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className={styles.viewModeToggle}>
                  <button
                    type="button"
                    className={`${styles.viewModeBtn} ${viewMode === 'grid' ? styles.viewModeBtnActive : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Xem dạng Lưới Thẻ"
                  >
                    <FaTh />
                  </button>
                  <button
                    type="button"
                    className={`${styles.viewModeBtn} ${viewMode === 'list' ? styles.viewModeBtnActive : ''}`}
                    onClick={() => setViewMode('list')}
                    title="Xem dạng Danh Sách"
                  >
                    <FaList />
                  </button>
                </div>
              </div>
            </div>

            {/* MAIN CONTENT: Episodes List or Grid */}
            {filteredEpisodes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280', background: '#0a0a0c', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <FaFilm style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }} />
                <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.95rem' }}>Chưa có tập phim nào</div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  {searchTerm ? 'Không tìm thấy tập nào khớp với từ khóa tìm kiếm.' : 'Hãy bấm "+ Thêm Tập Mới" hoặc "Nhập Hàng Loạt" để bắt đầu.'}
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID VIEW */
              <div className={styles.episodesGrid}>
                {filteredEpisodes.map(ep => (
                  <div key={ep.id} className={styles.episodeCard}>
                    <div className={styles.cardHeaderRow}>
                      <div className={styles.epBadgeGroup}>
                        <span className={styles.epNumberBadge}>#{ep.episodeNumber}</span>
                        <span className={styles.epQualityBadge}>{ep.quality || '1080p'}</span>
                      </div>
                      {renderStatusButton(ep)}
                    </div>

                    <div className={styles.cardBody}>
                      <h4 className={styles.cardEpName} title={ep.name}>{ep.name}</h4>
                      <div className={styles.cardEpSlug}>/{ep.slug}</div>
                      <div className={styles.cardStreamInfo}>
                        {ep.linkM3u8 ? (
                          <>
                            <span style={{ color: '#4ade80' }}>●</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ep.linkM3u8}>
                              HLS: {ep.linkM3u8}
                            </span>
                          </>
                        ) : ep.linkEmbed ? (
                          <>
                            <span style={{ color: '#60a5fa' }}>●</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ep.linkEmbed}>
                              Embed: {ep.linkEmbed}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: '#f87171' }}>● Chưa có link</span>
                        )}
                      </div>
                    </div>

                    <div className={styles.cardFooterRow}>
                      <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                        ID: {ep.id.substring(0, 8)}
                      </span>
                      <div className={styles.cardActionGroup}>
                        <button
                          type="button"
                          className={`${styles.miniActionBtn} ${styles.miniActionBtnPlay}`}
                          title="Phát thử tập này"
                          onClick={() => setTestPlayingEp(ep)}
                        >
                          <FaPlay />
                        </button>
                        <button
                          type="button"
                          className={styles.miniActionBtn}
                          title="Sao chép link stream"
                          onClick={() => {
                            const link = ep.linkM3u8 || ep.linkEmbed || '';
                            if (link) {
                              navigator.clipboard.writeText(link);
                              showCinemaAlert('Đã sao chép link stream!', 'cinema');
                            }
                          }}
                        >
                          <FaCopy />
                        </button>
                        <button
                          type="button"
                          className={styles.miniActionBtn}
                          title="Chỉnh sửa chi tiết tập phim"
                          onClick={() => handleOpenEditForm(ep)}
                        >
                          <FaPen />
                        </button>
                        <button
                          type="button"
                          className={`${styles.miniActionBtn} ${styles.miniActionBtnDelete}`}
                          title="Xóa tập này"
                          onClick={() => handleDeleteEpisode(ep.id, ep.name)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* CLEAN LIST VIEW */
              <div className={styles.epTableCard}>
                <table className={styles.cleanTable}>
                  <thead>
                    <tr>
                      <th style={{ width: '10%' }}>Số Tập</th>
                      <th style={{ width: '25%' }}>Tên Tập / Slug</th>
                      <th style={{ width: '25%' }}>Nguồn Phát Stream</th>
                      <th style={{ width: '10%' }}>Độ Phân Giải</th>
                      <th style={{ width: '15%' }}>Trạng Thái</th>
                      <th style={{ width: '15%', textAlign: 'center' }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEpisodes.map(ep => (
                      <tr key={ep.id}>
                        <td>
                          <span className={styles.epNumberBadge}>#{ep.episodeNumber}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.86rem' }}>{ep.name}</div>
                          <div style={{ fontSize: '0.74rem', color: '#9ca3af', fontFamily: 'monospace' }}>/{ep.slug}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.76rem', color: '#cbd5e1', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ep.linkM3u8 || ep.linkEmbed || ''}>
                            {ep.linkM3u8 ? `HLS: ${ep.linkM3u8}` : ep.linkEmbed ? `Embed: ${ep.linkEmbed}` : 'Chưa có link'}
                          </div>
                        </td>
                        <td>
                          <span className={styles.epQualityBadge}>{ep.quality || '1080p'}</span>
                        </td>
                        <td>
                          {renderStatusButton(ep)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className={styles.cardActionGroup} style={{ justifyContent: 'center' }}>
                            <button
                              type="button"
                              className={`${styles.miniActionBtn} ${styles.miniActionBtnPlay}`}
                              title="Phát thử"
                              onClick={() => setTestPlayingEp(ep)}
                            >
                              <FaPlay />
                            </button>
                            <button
                              type="button"
                              className={styles.miniActionBtn}
                              title="Sửa chi tiết"
                              onClick={() => handleOpenEditForm(ep)}
                            >
                              <FaPen />
                            </button>
                            <button
                              type="button"
                              className={`${styles.miniActionBtn} ${styles.miniActionBtnDelete}`}
                              title="Xóa"
                              onClick={() => handleDeleteEpisode(ep.id, ep.name)}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={styles.modalFooter}>
            <button className={styles.doneBtn} onClick={onClose}>
              Hoàn Tất & Đóng
            </button>
          </div>
        </div>
      </div>

      {/* POPUP CON 1: EPISODE FORM SUB-MODAL */}
      {isFormModalOpen && (
        <EpisodeFormSubModal
          isOpen={isFormModalOpen}
          initialData={editingEpisode}
          onClose={() => setIsFormModalOpen(false)}
          onSave={handleSaveEpisode}
        />
      )}

      {/* POPUP CON 2: BATCH IMPORT SUB-MODAL */}
      {isBatchModalOpen && (
        <BatchImportSubModal
          isOpen={isBatchModalOpen}
          batchText={batchText}
          setBatchText={setBatchText}
          onClose={() => setIsBatchModalOpen(false)}
          onImport={handleBatchImport}
        />
      )}
    </>
  );
}

// Sub-component 1: Single Episode Add / Edit Modal (Popup Con)
interface EpisodeFormSubModalProps {
  isOpen: boolean;
  initialData: EpisodeItem | null;
  onClose: () => void;
  onSave: (data: {
    episodeNumber: string;
    name: string;
    linkM3u8: string;
    linkEmbed: string;
    quality: string;
    status: EpisodeStatus;
  }) => void;
}

function EpisodeFormSubModal({
  isOpen,
  initialData,
  onClose,
  onSave
}: EpisodeFormSubModalProps) {
  const [episodeNumber, setEpisodeNumber] = useState(initialData ? String(initialData.episodeNumber) : '');
  const [name, setName] = useState(initialData ? initialData.name : '');
  const [linkM3u8, setLinkM3u8] = useState(initialData ? initialData.linkM3u8 : '');
  const [linkEmbed, setLinkEmbed] = useState(initialData?.linkEmbed || '');
  const [quality, setQuality] = useState(initialData?.quality || '1080p');
  const [status, setStatus] = useState<EpisodeStatus>(initialData?.status || 'ACTIVE');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!episodeNumber.trim()) return;

    onSave({
      episodeNumber,
      name,
      linkM3u8,
      linkEmbed,
      quality,
      status
    });
  };

  return (
    <div className={styles.subModalOverlay} onClick={onClose}>
      <div className={styles.subModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.subModalHeader}>
          <h3 className={styles.subModalTitle}>
            {initialData ? `Chỉnh Sửa: ${initialData.name}` : 'Thêm Tập Phim Mới'}
          </h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.subModalBody}>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.75rem' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Số Tập *</label>
                <input
                  type="text"
                  placeholder="VD: 1"
                  className={styles.formInput}
                  value={episodeNumber}
                  onChange={(e) => setEpisodeNumber(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tên Hiển Thị</label>
                <input
                  type="text"
                  placeholder="VD: Tập 1 - Khởi Đầu"
                  className={styles.formInput}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Link Stream HLS (.m3u8)</label>
              <input
                type="url"
                placeholder="https://stream.server.vn/dune2/ep1/index.m3u8"
                className={styles.formInput}
                value={linkM3u8}
                onChange={(e) => setLinkM3u8(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Link Embed Player (Iframe)</label>
              <input
                type="url"
                placeholder="https://hydra.stream/embed/dune2-ep1"
                className={styles.formInput}
                value={linkEmbed}
                onChange={(e) => setLinkEmbed(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Chất Lượng Video</label>
                <select
                  className={styles.formSelect}
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                >
                  <option value="4K">4K Ultra HD</option>
                  <option value="1080p">1080p Full HD</option>
                  <option value="720p">720p HD</option>
                  <option value="480p">480p SD</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Trạng Thái Ban Đầu</label>
                <select
                  className={styles.formSelect}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EpisodeStatus)}
                >
                  <option value="ACTIVE">Hoạt động (Sẵn sàng)</option>
                  <option value="PROCESSING">Đang xử lý / render</option>
                  <option value="ERROR">Báo hỏng / lỗi link</option>
                  <option value="DISABLED">Tạm ẩn</option>
                </select>
              </div>
            </div>
          </div>

          <div className={styles.subModalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Hủy Bỏ
            </button>
            <button type="submit" className={styles.submitBtn}>
              {initialData ? 'Lưu Thay Đổi' : 'Thêm Vào Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Sub-component 2: Batch Import Modal (Popup Con)
interface BatchImportSubModalProps {
  isOpen: boolean;
  batchText: string;
  setBatchText: (text: string) => void;
  onClose: () => void;
  onImport: () => void;
}

function BatchImportSubModal({
  isOpen,
  batchText,
  setBatchText,
  onClose,
  onImport
}: BatchImportSubModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.subModalOverlay} onClick={onClose}>
      <div className={styles.subModalContent} style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
        <div className={styles.subModalHeader}>
          <h3 className={styles.subModalTitle}>
            Nhập Danh Sách Tập Hàng Loạt
          </h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.subModalBody}>
          <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
            Mỗi tập một dòng theo định dạng: <code style={{ color: '#f87171', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>Tên Tập|URL Stream</code> hoặc chỉ dán <code style={{ color: '#60a5fa', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>URL</code>.
          </div>

          <textarea
            className={styles.batchTextarea}
            placeholder={`Tập 1|https://stream.cinema.vn/ep1.m3u8\nTập 2|https://stream.cinema.vn/ep2.m3u8\nTập 3|https://stream.cinema.vn/ep3.m3u8`}
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
          />
        </div>

        <div className={styles.subModalFooter}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Hủy Bỏ
          </button>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={onImport}
            disabled={!batchText.trim()}
          >
            Tiến Hành Nhập Dữ Liệu
          </button>
        </div>
      </div>
    </div>
  );
}
