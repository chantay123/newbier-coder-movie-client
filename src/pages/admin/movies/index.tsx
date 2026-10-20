// src/pages/admin/movies.tsx
'use client';

declare global {
  interface Window {
    searchTimeout?: NodeJS.Timeout;
  }
}

import React, { useState, useCallback, useEffect, useRef } from 'react';
import AdminRoute from '@/features/shared/components/ProtectedRoute/AdminRoute';
import {
  FaPlus,
  FaSearch,
  FaPen,
  FaTrash,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaEye,
  FaEyeSlash,
  FaFilter,
  FaCalendarAlt,
  FaSync,
  FaStar,
  FaStarHalfAlt,
  FaRegStar,
  FaArrowUp,
  FaInfoCircle,
  FaFilm,
  FaAlignLeft,
  FaServer,
  FaCode,
  FaStream,
  FaCopy,
  FaCheckCircle,
  FaExternalLinkAlt,
  FaSave,
  FaBolt,
  FaUser,
  FaDownload,
  FaHeart
} from 'react-icons/fa';
import styles from '@/styles/AdminMovies.module.css';
import darkStyles from '@/styles/AdminMoviesDark.module.css';
import cinemaTable from '@/styles/CinemaTable.module.css';
import ratingStyles from '@/styles/AdminRatings.module.css';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import AdminLayout from '@/layouts/AdminLayout';
import CrawlModal from '@/features/admin/components/Movies/CrawlModal';
import EpisodeManagerModal from '@/features/admin/components/Movies/FormFields/EpisodeManagerModal';
import MovieDetailModal from '@/features/admin/components/Movies/FormFields/MovieDetailModal';
import BackToTop from '@/features/shared/components/UI/BackToTop';
import CinemaDropdown from '@/features/admin/components/Common/CinemaDropdown';
import AdminPagination from '@/features/admin/components/Common/AdminPagination';
import { ADMIN_MOVIES_I18N, ADMIN_COMMON_I18N } from '@/config/i18n/admin';
import { MOCK_ADMIN_MOVIES, INITIAL_CATEGORIES } from '@/mock/admin';
import axiosInstance from '@/API/config/axiosConfig';

import {
  getMoviesForAdmin,
  deleteMovieByAdmin,
  toggleMovieVisibility,
  searchMoviesWithElasticsearch,
  checkElasticsearchStatus,
  ElasticsearchStatus
} from '@/features/admin/services/movieAdminService';

import {
  getMovieRatings,
  syncMovieRatings,
  syncAllMovieRatings,
  RatingStats
} from '@/features/admin/services/ratingAdminService';

const combinedStyles = {
  ...styles,
  ...ratingStyles,
  ...darkStyles
};

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Movie {
  _id: string;
  name: string;
  origin_name: string;
  year: number;
  type: 'series' | 'single';
  status: 'active' | 'inactive';
  thumb_url: string;
  category: Category[] | string[];
  views: number;
  view?: number;
  quality: string;
  lang: string;
  content?: string;
  director?: string[] | string;
  actor?: string[] | string;
  country?: { id: string; name: string }[] | string;
  time?: string;
  showtimes?: string;
  episode_current?: string | number;
  episode_total?: string | number;
  is_copyright?: boolean;
  sub_docquyen?: boolean;
  chieurap?: boolean;
  source?: string;
  file_size?: string;
  tags?: string[];
  episodes?: {
    server_name: string;
    server_data: Array<{
      name: string;
      slug: string;
      filename: string;
      link_embed: string;
      link_m3u8: string;
    }>;
  }[];
  createdAt: string;
  updatedAt: string;
  expiryDate?: string;
  rating: number;
  vote_count: number;
  slug: string;
  isHidden?: boolean;
  userRating?: number;
}

interface DeleteModalProps {
  isOpen: boolean;
  movie: Movie | null;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, movie, onClose, onConfirm }) => {
  if (!isOpen || !movie) return null;

  return (
    <div className={combinedStyles.modalOverlay} onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className={combinedStyles.deleteModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={combinedStyles.deleteModalHeader}>
          <FaExclamationTriangle className={combinedStyles.deleteWarningIcon} />
          <h3 className={combinedStyles.deleteModalTitle}>Xác nhận xóa</h3>
        </div>
        <div className={combinedStyles.deleteModalBody}>
          <p className={combinedStyles.deleteQuestion}>
            Bạn có chắc chắn muốn xóa phim <strong>&quot;{movie.name}&quot;</strong>?
          </p>
          <p className={combinedStyles.deleteWarningText}>
            <FaExclamationTriangle style={{ marginRight: '8px' }} />
            Thao tác này không thể hoàn tác.
          </p>
        </div>
        <div className={combinedStyles.deleteModalFooter}>
          <button className={combinedStyles.cancelButton} onClick={onClose}>
            <FaChevronLeft style={{ fontSize: '14px' }} /> Hủy
          </button>
          <button
            className={combinedStyles.confirmDeleteButton}
            onClick={() => {
              onConfirm();
            }}
          >
            Xác nhận xóa <FaTrash style={{ fontSize: '14px', marginLeft: '5px' }} />
          </button>
        </div>
      </div>
    </div>  );
}


const MoviesAdmin = () => {
  const topRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMovies, setTotalMovies] = useState(0);
  const [loading, setLoading] = useState(true);  const [movies, setMovies] = useState<Movie[]>([]);
  const [syncingAllRatings, setSyncingAllRatings] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; movie: Movie | null }>({
    isOpen: false,
    movie: null
  });  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; movie: Movie | null }>({
    isOpen: false,
    movie: null
  });
  const [episodeModal, setEpisodeModal] = useState<{ isOpen: boolean; movie: any | null }>({
    isOpen: false,
    movie: null
  });
  const [crawlModalOpen, setCrawlModalOpen] = useState(false);
  const [sortField, setSortField] = useState<string>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [moviesPerPage, setMoviesPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterYear, setFilterYear] = useState<number | undefined>(undefined);
  const [filterType, setFilterType] = useState<string>('');
  const [isOfflineMock, setIsOfflineMock] = useState<boolean>(false);

  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [elasticsearchStatus, setElasticsearchStatus] = useState<ElasticsearchStatus | null>(null);
  const [esStatusChecked, setEsStatusChecked] = useState<boolean>(false);

  useEffect(() => {
    const checkESStatus = async () => {
      try {
        const status = await checkElasticsearchStatus();
        setElasticsearchStatus(status);
        setEsStatusChecked(true);
      } catch (error) {

        setElasticsearchStatus({
          status: 'error',
          message: 'Không thể kết nối tới Elasticsearch'
        });
        setEsStatusChecked(true);
      }
    };

    checkESStatus();
  }, []);

  const searchMovies = async (query: string, page: number) => {
    try {
      setLoading(true);
      const currentPageToUse = page || currentPage;

      try {
        let response;
        if (query && query.trim() !== '' && elasticsearchStatus?.status === 'active') {
          if (!isSearching) setIsSearching(true);
          response = await searchMoviesWithElasticsearch(
            currentPageToUse,
            moviesPerPage,
            query,
            selectedCategory || undefined,
            filterStatus !== 'all' ? filterStatus : undefined,
            filterYear,
            filterType || undefined
          );
        } else {
          if (!query || query.trim() === '') setIsSearching(false);
          response = await getMoviesForAdmin(
            currentPageToUse,
            moviesPerPage,
            sortField,
            sortDirection,
            selectedCategory || undefined,
            filterStatus !== 'all' ? filterStatus : undefined,
            query,
            filterYear,
            filterType || undefined
          );
        }

        if (response && response.movies && Array.isArray(response.movies) && response.movies.length > 0) {
          setMovies(response.movies);
          setIsOfflineMock(false);
          const pagination = response.pagination || {};
          setTotalMovies(pagination.totalItems || response.movies.length);
          setTotalPages(pagination.totalPages || 1);
          setLoading(false);
          return;
        }
      } catch (apiError) {

      }

      // Fallback search in mock dataset
      setIsOfflineMock(true);
      const q = (query || '').toLowerCase().trim();
      let filtered = MOCK_ADMIN_MOVIES.filter(m =>
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.origin_name.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q)
      );

      if (selectedCategory) {
        filtered = filtered.filter(m => m.category.some(c => c.id === selectedCategory));
      }
      if (filterStatus !== 'all') {
        filtered = filtered.filter(m => m.status === filterStatus);
      }
      if (filterYear) {
        filtered = filtered.filter(m => m.year === filterYear);
      }
      if (filterType) {
        filtered = filtered.filter(m => m.type === filterType);
      }

      setMovies(filtered as any);
      setTotalMovies(filtered.length);
      setTotalPages(Math.max(1, Math.ceil(filtered.length / moviesPerPage)));
      setLoading(false);
    } catch (error) {

      setLoading(false);
    }
  };

  const fetchMovies = useCallback(async (page: number) => {
    try {
      if (searchQuery && searchQuery.trim() !== '') {
        await searchMovies(searchQuery, page);
        return;
      }

      setLoading(true);

      try {
        const response = await getMoviesForAdmin(
          page,
          moviesPerPage,
          sortField,
          sortDirection,
          selectedCategory || undefined,
          filterStatus !== 'all' ? filterStatus : undefined,
          '',
          filterYear,
          filterType || undefined
        );

        if (response && response.movies && Array.isArray(response.movies) && response.movies.length > 0) {
          setMovies(response.movies);
          setIsOfflineMock(false);
          const pagination = response.pagination || {};
          setTotalMovies(pagination.totalItems || response.movies.length);
          setTotalPages(pagination.totalPages || 1);
          setLoading(false);
          return;
        }
      } catch (apiError) {

      }

      // Fallback to rich mock dataset
      setIsOfflineMock(true);
      let filtered = [...MOCK_ADMIN_MOVIES];

      if (selectedCategory) {
        filtered = filtered.filter(m => m.category.some(c => c.id === selectedCategory));
      }
      if (filterStatus !== 'all') {
        filtered = filtered.filter(m => m.status === filterStatus);
      }
      if (filterYear) {
        filtered = filtered.filter(m => m.year === filterYear);
      }
      if (filterType) {
        filtered = filtered.filter(m => m.type === filterType);
      }

      setMovies(filtered as any);
      setTotalMovies(filtered.length);
      setTotalPages(Math.max(1, Math.ceil(filtered.length / moviesPerPage)));
      setLoading(false);
    } catch (error) {

      setLoading(false);
    }
  }, [searchQuery, moviesPerPage, sortField, sortDirection, selectedCategory,
      filterStatus, filterYear, filterType, elasticsearchStatus]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Set the new search query value
    setSearchQuery(newValue);

    // Reset to page 1 when search query changes
    setCurrentPage(1);

    // Clear any existing search timeout
    if (window.searchTimeout) {
      clearTimeout(window.searchTimeout);
    }

    if (!newValue || newValue.trim() === '') {
      setIsSearching(false);

      // Directly call getMoviesForAdmin instead of fetchMovies to avoid circular dependency issues
      setLoading(true);
      getMoviesForAdmin(
        1,
        moviesPerPage,
        sortField,
        sortDirection,
        selectedCategory || undefined,
        filterStatus !== 'all' ? filterStatus : undefined,
        '',
        filterYear,
        filterType || undefined
      ).then(response => {

        if (response && response.movies && Array.isArray(response.movies)) {
          setMovies(response.movies as unknown as Movie[]);

          const pagination = response.pagination || {};
          setTotalMovies(pagination.totalItems || 0);
          setTotalPages(pagination.totalPages || 1);
        } else {

          setMovies([]);
          setTotalMovies(0);
          setTotalPages(1);
        }

        setLoading(false);
      }).catch(error => {

        toast.error('Không thể tải danh sách phim');
        setLoading(false);
        setMovies([]);
        setTotalMovies(0);
        setTotalPages(1);
      });
    } else {
      // Set a timeout for search to avoid too many API calls while typing
      window.searchTimeout = setTimeout(() => {
        searchMovies(newValue, 1);
      }, 300);
    }
  }, [moviesPerPage, sortField, sortDirection, selectedCategory, filterStatus, filterYear, filterType]);

  useEffect(() => {
    if (searchQuery === '') {
      fetchMovies(currentPage);
    }
  }, [currentPage, moviesPerPage, sortField, sortDirection, selectedCategory, filterStatus, filterYear, filterType, isSearching]);  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axiosInstance.get('/admin/movies/categories');
        if (response.data && response.data.categories && response.data.categories.length > 0) {
          setCategories(response.data.categories);
          return;
        }
      } catch (error) {

      }
      setCategories(INITIAL_CATEGORIES as any);
    };

    fetchCategories();
  }, [movies]); // Add movies as a dependency to update categories when movies list changes

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const yearValue = e.target.value ? parseInt(e.target.value) : undefined;
    setFilterYear(yearValue);
    setCurrentPage(1);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterType(e.target.value);
    setCurrentPage(1);
  };

  const handleAddMovie = () => {
    router.push('/admin/movies/add');
  };

  const handleEdit = (id: string) => {
    router.push(`/admin/movies/edit/${id}`);
  };

  const handleDeleteClick = (movie: Movie) => {
    setDeleteModal({ isOpen: true, movie });
  };

  const handleDeleteConfirm = async () => {
    if (deleteModal.movie) {
      try {
        await deleteMovieByAdmin(deleteModal.movie._id);
        toast.success('Xóa phim thành công');
        fetchMovies(currentPage);
        setDeleteModal({ isOpen: false, movie: null });
      } catch (error) {

        toast.error('Không thể xóa phim');
      }
    }
  };

  const handleToggleStatus = async (movie: Movie) => {
    try {
      if (!movie || !movie._id) {

        toast.error('Không thể cập nhật trạng thái - Thiếu thông tin phim');
        return;
      }

      const movieId = String(movie._id).trim();

      if (!movieId || movieId.length < 24) {

        toast.error('ID phim không hợp lệ, không thể cập nhật trạng thái');
        return;
      }

      const loadingToast = toast.loading('Đang cập nhật trạng thái phim...');

      const response = await toggleMovieVisibility(movieId);

      toast.dismiss(loadingToast);

      const newIsHidden = !movie.isHidden;
      toast.success(`Đã ${newIsHidden ? 'ẩn' : 'hiện'} phim thành công`);

      setMovies(prevMovies =>
        prevMovies.map(m =>
          m._id === movieId ? { ...m, isHidden: newIsHidden } : m
        )
      );
    } catch (error) {

      toast.error('Không thể cập nhật trạng thái hiển thị phim');
    }
  };

  // const handleSort = (field: string) => {
  //   if (sortField === field) {
  //     setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  //   } else {
  //     setSortField(field);
  //     setSortDirection('asc');
  //   }
  //   setCurrentPage(1);
  // };

  const handlePerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMoviesPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };
  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
    const handleSyncAllRatings = async () => {
    try {
      setSyncingAllRatings(true);
      const loadingToast = toast.loading('Đang đồng bộ tất cả đánh giá...');

      await syncAllMovieRatings();

      toast.dismiss(loadingToast);
      toast.success('Đồng bộ tất cả đánh giá thành công!');

      // Refresh movie data to show updated ratings
      fetchMovies(currentPage);
    } catch (error) {

      toast.error('Không thể đồng bộ đánh giá');
    } finally {
      setSyncingAllRatings(false);
    }  };

  return (
    <div className={combinedStyles.container}>
      <header className={combinedStyles.header}>
        <div className="d-flex align-items-center gap-2">
          <h1 className={combinedStyles.headerTitle}>{ADMIN_MOVIES_I18N.pageTitle}</h1>
          {isOfflineMock && (
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(229, 9, 20, 0.12)',
                color: '#f87171',
                border: '1px solid rgba(229, 9, 20, 0.3)',
                fontSize: '0.74rem',
                fontWeight: 500,
                padding: '0.35rem 0.65rem'
              }}
              title={ADMIN_COMMON_I18N.notices.offlineHint}
            >
              {ADMIN_COMMON_I18N.notices.offlineMode}
            </span>
          )}
        </div>

        {esStatusChecked && (
          <div className={combinedStyles.elasticsearchStatus}>
            {elasticsearchStatus && (
              <div className={`${combinedStyles.esStatusBadge} ${combinedStyles[elasticsearchStatus.status]}`}>
                {elasticsearchStatus.status === 'active' ? (
                  <span title={`${elasticsearchStatus.documentCount || 0} documents indexed`}>
                    Elasticsearch: {isSearching && searchQuery.trim() ? 'Đang sử dụng' : 'Sẵn sàng'}
                  </span>
                ) : elasticsearchStatus.status === 'inactive' ? (
                  <span title="Elasticsearch is not available">
                    Elasticsearch: Không khả dụng
                  </span>
                ) : (
                  <span title={elasticsearchStatus.message}>
                    Elasticsearch: Lỗi
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      <div className={combinedStyles.toolBar}>
        <div className={combinedStyles.toolBarHeader}>
          <div className={combinedStyles.searchInput}>
            <div className={combinedStyles.searchIcon}>
              <FaSearch />
            </div>
            <input
              type="text"
              placeholder={isSearching && searchQuery.trim() ? "Tìm kiếm phim bằng Elasticsearch..." : "Tìm kiếm phim..."}
              value={searchQuery}
              onChange={handleSearch}
              className={combinedStyles.input}
            />
            {isSearching && searchQuery.trim() && (
              <div className={combinedStyles.searchBadge} title="Đang sử dụng Elasticsearch">
                <FaBolt className={combinedStyles.esBadgeIcon} />
              </div>
            )}
          </div>

          <div className={combinedStyles.actionButtons}>
            <button
              className={combinedStyles.syncAllRatingsButton}
              onClick={handleSyncAllRatings}
              disabled={syncingAllRatings}
              title="Đồng bộ đánh giá cho tất cả phim"
            >
              <FaSync className={syncingAllRatings ? combinedStyles.spinningIcon : ''} />
              <span>{syncingAllRatings ? 'Đang đồng bộ...' : 'Đồng bộ đánh giá'}</span>
            </button>

            <button
              className={combinedStyles.crawlButton}
              onClick={() => setCrawlModalOpen(true)}
              title="Crawl phim từ nguồn bên ngoài"
            >
              <FaDownload className={combinedStyles.crawlIcon} />
              <span>Crawl Phim</span>
            </button>

            <button className={combinedStyles.addButton} onClick={handleAddMovie}>
              <FaPlus />
              <span>Thêm Phim Mới</span>
            </button>
          </div>
        </div>

        <div className={combinedStyles.filterControls} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem', alignItems: 'center' }}>
          <CinemaDropdown
            options={[
              { value: '', label: ADMIN_MOVIES_I18N.filters.allCategories },
              ...categories.map((c) => ({ value: c.id, label: c.name }))
            ]}
            value={selectedCategory}
            onChange={(val) => {
              setSelectedCategory(val);
              setCurrentPage(1);
            }}
            prefixIcon={<FaFilter />}
            size="filter"
            ariaLabel="Lọc theo thể loại"
          />

          <CinemaDropdown
            options={[
              { value: 'all', label: ADMIN_MOVIES_I18N.filters.allStatuses },
              { value: 'active', label: ADMIN_MOVIES_I18N.filters.statusActive },
              { value: 'inactive', label: ADMIN_MOVIES_I18N.filters.statusInactive }
            ]}
            value={filterStatus}
            onChange={(val) => {
              setFilterStatus(val);
              setCurrentPage(1);
            }}
            prefixIcon={<FaEye />}
            size="filter"
            ariaLabel="Lọc theo trạng thái"
          />

          <CinemaDropdown
            options={[
              { value: '', label: ADMIN_MOVIES_I18N.filters.allYears },
              ...Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map((y) => ({
                value: y.toString(),
                label: `Năm ${y}`
              }))
            ]}
            value={filterYear?.toString() || ''}
            onChange={(val) => {
              setFilterYear(val ? parseInt(val) : undefined);
              setCurrentPage(1);
            }}
            prefixIcon={<FaCalendarAlt />}
            size="filter"
            ariaLabel="Lọc theo năm"
          />

          <CinemaDropdown
            options={[
              { value: '', label: ADMIN_MOVIES_I18N.filters.allTypes },
              { value: 'series', label: ADMIN_MOVIES_I18N.filters.typeSeries },
              { value: 'single', label: ADMIN_MOVIES_I18N.filters.typeSingle }
            ]}
            value={filterType}
            onChange={(val) => {
              setFilterType(val);
              setCurrentPage(1);
            }}
            prefixIcon={<FaFilm />}
            size="filter"
            ariaLabel="Lọc theo loại phim"
          />

          <CinemaDropdown
            options={[
              { value: 10, label: '10 phim / trang' },
              { value: 20, label: '20 phim / trang' },
              { value: 50, label: '50 phim / trang' }
            ]}
            value={moviesPerPage}
            onChange={(val) => {
              setMoviesPerPage(Number(val));
              setCurrentPage(1);
            }}
            size="filter"
            ariaLabel="Số phim mỗi trang"
          />

          <button
            className={combinedStyles.refreshButton}
            onClick={() => fetchMovies(currentPage)}
            title="Làm mới dữ liệu"
          >
            <FaSync />
          </button>
        </div>
      </div>

      <div className={cinemaTable.tableCard}>
        <div className={cinemaTable.tableResponsive}>
          <table className={cinemaTable.dataTable}>
            <thead>
              <tr>
                <th style={{ minWidth: 260 }}>{ADMIN_MOVIES_I18N.tableHeaders.movieName}</th>
                <th className={cinemaTable.hideMobile} style={{ minWidth: 160 }}>Thể loại & Quốc gia</th>
                <th className={cinemaTable.hideTablet} style={{ minWidth: 140 }}>Tương tác</th>
                <th style={{ minWidth: 110 }}>Trạng thái</th>
                <th style={{ textAlign: 'center', width: 140 }}>{ADMIN_MOVIES_I18N.tableHeaders.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className={combinedStyles.emptyTableRow}>
                    <div className={cinemaTable.emptyStateContainer}>
                      <FaSync className={`${combinedStyles.emptyStateIcon} ${combinedStyles.spinningIcon}`} />
                      <div className={cinemaTable.emptyStateTitle}>{ADMIN_COMMON_I18N.notices.loading}</div>
                    </div>
                  </td>
                </tr>
              ) : movies.length === 0 ? (
                <tr>
                  <td colSpan={5} className={combinedStyles.emptyTableRow}>
                    <div className={cinemaTable.emptyStateContainer}>
                      <FaFilm className={cinemaTable.emptyStateIcon} />
                      <div className={cinemaTable.emptyStateTitle}>
                        {ADMIN_MOVIES_I18N.emptyState.title}
                      </div>
                      <div className={cinemaTable.emptyStateSubtitle}>
                        {ADMIN_MOVIES_I18N.emptyState.subtitle}
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem' }}
                        onClick={() => {
                          setSelectedCategory('');
                          setFilterStatus('all');
                          setFilterYear(undefined);
                          setFilterType('');
                          setSearchQuery('');
                          setCurrentPage(1);
                        }}
                      >
                        {ADMIN_MOVIES_I18N.emptyState.resetFilter}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                movies.map((movie) => (
                  <tr
                    key={movie._id}
                    className={combinedStyles.movieRow}
                  >
                    <td>
                      <div className={cinemaTable.posterCell} onClick={() => setDetailModal({ isOpen: true, movie })} style={{ cursor: 'pointer' }}>
                        <div className={cinemaTable.posterThumb}>
                          <img
                            src={movie.thumb_url || movie.poster_url || '/placeholder.jpg'}
                            alt={movie.name}
                            className={cinemaTable.posterImg}
                            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }}
                          />
                        </div>
                        <div className={cinemaTable.titleBlock}>
                          <div className={cinemaTable.primaryTitle} title={movie.name}>{movie.name}</div>
                          <div className={cinemaTable.secondaryTitle}>{movie.origin_name || 'N/A'}</div>
                          <div className={cinemaTable.metaRow}>
                            <span className={`${cinemaTable.metaChip} ${movie.type === 'series' ? cinemaTable.metaChipSeries : cinemaTable.metaChipSingle}`}>
                              {movie.type === 'series' ? 'Phim Bộ' : 'Phim Lẻ'}
                            </span>
                            <span>{movie.year || '2024'}</span>
                            {movie.time && <span>• {movie.time}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className={cinemaTable.hideMobile}>
                      <div className={cinemaTable.badgeList}>
                        {movie.category && movie.category.length > 0 ? (
                          movie.category.slice(0, 2).map((cat, idx) => (
                            <span key={idx} className={cinemaTable.genreBadge}>{cat.name}</span>
                          ))
                        ) : (
                          <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>Đang cập nhật</span>
                        )}
                      </div>
                      <div style={{ color: '#9ca3af', fontSize: '0.74rem', marginTop: '4px' }}>
                        {movie.country?.map((c) => c.name).join(', ') || 'N/A'}
                      </div>
                    </td>

                    <td className={cinemaTable.hideTablet}>
                      <div className={cinemaTable.metricCell}>
                        <div className={cinemaTable.metricItem} title="Tổng lượt xem">
                          <FaEye className={cinemaTable.metricIconViews} />
                          <span className={cinemaTable.metricValue}>
                            {((movie.view_count || movie.views || 18450)).toLocaleString()}
                          </span>
                          <span style={{ color: '#6b7280', fontSize: '0.72rem' }}>views</span>
                        </div>
                        <div className={cinemaTable.metricItem} title="Lượt yêu thích & Đánh giá">
                          <FaHeart className={cinemaTable.metricIconLikes} />
                          <span>{((movie.like_count || 1260)).toLocaleString()}</span>
                          <span style={{ color: '#f59e0b', fontSize: '0.75rem', marginLeft: '4px' }}>
                            ★ {(movie.rating || 8.5).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <label className={cinemaTable.statusSwitch} title={movie.isHidden ? 'Nhấn để hiển thị phim' : 'Nhấn để ẩn phim'}>
                        <span className={cinemaTable.toggleSwitch}>
                          <input
                            type="checkbox"
                            checked={!movie.isHidden}
                            onChange={() => handleToggleStatus(movie)}
                          />
                          <span className={cinemaTable.toggleSlider}></span>
                        </span>
                        <span className={`${cinemaTable.statusLabel} ${!movie.isHidden ? cinemaTable.statusLabelActive : cinemaTable.statusLabelInactive}`}>
                          {!movie.isHidden ? 'Hiển thị' : 'Tạm ẩn'}
                        </span>
                      </label>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <div className={cinemaTable.rowActions} style={{ justifyContent: 'center' }}>
                        <button
                          className={`${cinemaTable.actionBtn} ${cinemaTable.actionBtnView}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailModal({ isOpen: true, movie });
                          }}
                          title="Xem chi tiết phim"
                        >
                          <FaEye />
                        </button>
                        <button
                          className={`${cinemaTable.actionBtn} ${cinemaTable.actionBtnEpisode}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEpisodeModal({ isOpen: true, movie });
                          }}
                          title="Quản lý tập phim & Stream Server"
                        >
                          <FaFilm />
                        </button>
                        <button
                          className={`${cinemaTable.actionBtn} ${cinemaTable.actionBtnEdit}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/movies/edit/${movie._id || movie.id}`);
                          }}
                          title="Chỉnh sửa thông tin phim"
                        >
                          <FaPen />
                        </button>
                        <button
                          className={`${cinemaTable.actionBtn} ${cinemaTable.actionBtnDelete}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(movie);
                          }}
                          title="Xóa phim"
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

        {totalMovies > 0 && (
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages || 1}
            totalItems={totalMovies}
            pageSize={moviesPerPage}
            onPageChange={(p) => {
              setCurrentPage(p);
              fetchMovies(p);
            }}
            onPageSizeChange={(newSize) => {
              setMoviesPerPage(newSize);
              setCurrentPage(1);
            }}
            itemName="phim"
          />
        )}

        <BackToTop />

      <MovieDetailModal
        isOpen={detailModal.isOpen}
        movie={detailModal.movie}
        onClose={() => setDetailModal({ isOpen: false, movie: null })}
        onOpenEpisodeManager={(m) => setEpisodeModal({ isOpen: true, movie: m })}
      />
      <DeleteModal
        isOpen={deleteModal.isOpen}
        movie={deleteModal.movie}
        onClose={() => setDeleteModal({ isOpen: false, movie: null })}
        onConfirm={handleDeleteConfirm}
      />

      <CrawlModal
        isOpen={crawlModalOpen}
        onClose={() => setCrawlModalOpen(false)}
        onSuccess={() => fetchMovies(1)}
      />

      <EpisodeManagerModal
        isOpen={episodeModal.isOpen}
        movie={episodeModal.movie}
        onClose={() => setEpisodeModal({ isOpen: false, movie: null })}
      />
    </div>
  );
};

MoviesAdmin.getLayout = (page: React.ReactElement) => {
  return (
    <AdminRoute>
      <AdminLayout>{page}</AdminLayout>
    </AdminRoute>
  );
};

export default MoviesAdmin;