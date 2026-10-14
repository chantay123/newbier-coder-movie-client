/**
 * @file pages/user/favorites.tsx
 */
import React, { useState, useEffect, useMemo, MouseEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FaHeart, FaSync, FaTrash, FaCheckSquare, FaSort } from 'react-icons/fa';
import favoritesService from '@/API/services/favoritesService';
import { useAuth } from '@/utils/auth';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from '@/styles/Favorites.module.css';

type SortOption = 'a-z' | 'z-a' | 'highest-rating' | 'lowest-rating' | 'newest' | 'oldest' | 'year-desc' | 'year-asc';
type FilterTab = 'all' | 'movie' | 'series';

interface FavoriteMovie {
  id: string;
  title: string;
  original_title?: string;
  slug: string;
  thumbnail?: string;
  year: number;
  quality: string;
  rating: number;
  type: string;
  dateAdded: string;
}

interface FavoritesApiResponse {
  statusCode?: number;
  data?: FavoriteMovie[];
  message?: string;
}

interface FavoritesServiceResult {
  success: boolean;
  message?: string;
}

export default function FavoritesPage({ inProfilePage = false }: { inProfilePage?: boolean }) {
  const [favorites, setFavorites] = useState<FavoriteMovie[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterTab>('all');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [showSortOptions, setShowSortOptions] = useState<boolean>(false);
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated && !inProfilePage) {
      router.push('/auth/login');
      return;
    }
    fetchFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, router, inProfilePage]);

  const fetchFavorites = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const token: string | null =
        localStorage.getItem('auth_token') || localStorage.getItem('token');

      if (!token) {
        setError('Bạn cần đăng nhập để xem danh sách yêu thích');
        setLoading(false);
        return;
      }

      const apiUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/favorites`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        credentials: 'include'
      });

      const rawText: string = await response.text();
      let data: FavoritesApiResponse;
      try {
        data = JSON.parse(rawText) as FavoritesApiResponse;
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        setError('Lỗi xử lý dữ liệu từ server');
        setLoading(false);
        return;
      }

      if (data && (data.statusCode === 200 || response.status === 200)) {
        if (data.data && Array.isArray(data.data)) {
          const normalizedFavorites: FavoriteMovie[] = data.data.map((rawMovie) => {
            const movie = rawMovie as unknown as Record<string, unknown>;
            const pick = <T,>(k1: string, k2: string, fallback: T): T => {
              const v1 = movie[k1] as T | undefined;
              const v2 = movie[k2] as T | undefined;
              return (v1 !== undefined ? v1 : v2 !== undefined ? v2 : fallback) as T;
            };
            return {
              id: pick<string>('id', '_id', ''),
              title: pick<string>('name', 'title', 'Không có tiêu đề'),
              original_title: pick<string>('origin_name', 'original_title', ''),
              slug: pick<string>('slug', 'slug', ''),
              thumbnail: pick<string>('thumb_url', 'thumbnail', ''),
              year: pick<number>('year', 'year', new Date().getFullYear()),
              quality: pick<string>('quality', 'quality', 'HD'),
              rating: pick<number>('rating', 'rating', 0),
              type: pick<string>('type', 'type', 'movie'),
              dateAdded: pick<string>('createdAt', 'updatedAt', new Date().toISOString())
            };
          });
          setFavorites(normalizedFavorites);
        } else {
          setFavorites([]);
        }
      } else {
        setError(data.message || 'Không thể tải danh sách yêu thích');
        setFavorites([]);
      }
    } catch (err) {
      const e = err as Error;
      console.error('Error in fetchFavorites:', err);
      setError('Có lỗi xảy ra khi tải danh sách yêu thích: ' + e.message);
      setFavorites([]);
    } finally {
      setLoading(false);
      setSelectMode(false);
      setSelectedItems([]);
    }
  };

  const handleRefresh = async (): Promise<void> => {
    try {
      setRefreshing(true);
      toast.info('Đang làm mới danh sách yêu thích...', { autoClose: 1500 });
      await fetchFavorites();
      toast.success('Danh sách yêu thích đã được làm mới!');
    } catch (err) {
      console.error('[FAVORITES] Error refreshing:', err);
      toast.error('Không thể làm mới danh sách yêu thích');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemoveFavorite = async (movie: FavoriteMovie): Promise<void> => {
    try {
      setIsDeleting(true);
      const movieId: string = movie.id;
      setFavorites((prev) => prev.filter((m) => m.id !== movieId));
      const result = (await favoritesService.removeFromFavorites(movieId)) as FavoritesServiceResult;

      if (result.success) {
        toast.success('Đã xóa phim khỏi danh sách yêu thích!', {
          position: 'top-right',
          autoClose: 3000
        });
      } else {
        toast.error(result.message || 'Không thể xóa phim khỏi danh sách yêu thích');
        fetchFavorites();
      }
    } catch (err) {
      console.error('[FAVORITES] Error removing movie:', err);
      toast.error('Có lỗi xảy ra khi xóa phim khỏi danh sách yêu thích');
      fetchFavorites();
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectMode = (): void => {
    setSelectMode((prev) => !prev);
    setSelectedItems([]);
  };

  const toggleSelectItem = (movieId: string): void => {
    setSelectedItems((prev) =>
      prev.includes(movieId) ? prev.filter((id) => id !== movieId) : [...prev, movieId]
    );
  };

  const sortFavorites = (movies: FavoriteMovie[]): FavoriteMovie[] => {
    if (!Array.isArray(movies)) return [];
    const copy = [...movies];
    switch (sortOption) {
      case 'a-z': return copy.sort((a, b) => a.title.localeCompare(b.title));
      case 'z-a': return copy.sort((a, b) => b.title.localeCompare(a.title));
      case 'highest-rating': return copy.sort((a, b) => b.rating - a.rating);
      case 'lowest-rating': return copy.sort((a, b) => a.rating - b.rating);
      case 'newest': return copy.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
      case 'oldest': return copy.sort((a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime());
      case 'year-desc': return copy.sort((a, b) => b.year - a.year);
      case 'year-asc': return copy.sort((a, b) => a.year - b.year);
      default: return copy;
    }
  };

  const filteredFavorites: FavoriteMovie[] = useMemo(() => {
    if (selectedFilter === 'all') return favorites;
    if (selectedFilter === 'movie') return favorites.filter((m) => m.type === 'movie' || m.type === 'single');
    if (selectedFilter === 'series') return favorites.filter((m) => m.type === 'series' || m.type === 'tv');
    return favorites;
  }, [favorites, selectedFilter]);

  const filteredList: FavoriteMovie[] = useMemo(() => sortFavorites(filteredFavorites), [filteredFavorites, sortOption]);

  const getSortOptionName = (): string => {
    switch (sortOption) {
      case 'a-z': return 'A-Z';
      case 'z-a': return 'Z-A';
      case 'highest-rating': return 'Đánh giá cao nhất';
      case 'lowest-rating': return 'Đánh giá thấp nhất';
      case 'newest': return 'Mới nhất';
      case 'oldest': return 'Cũ nhất';
      case 'year-desc': return 'Năm mới nhất';
      case 'year-asc': return 'Năm cũ nhất';
      default: return 'Mới nhất';
    }
  };

  const handleSortChange = (option: SortOption): void => {
    setSortOption(option);
    setShowSortOptions(false);
  };

  const handleSelectAll = (): void => {
    if (selectedItems.length === filteredList.length) setSelectedItems([]);
    else setSelectedItems(filteredList.map((m) => m.id));
  };

  const handleRemoveSelected = async (): Promise<void> => {
    if (selectedItems.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một phim để xóa');
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedItems.length} phim đã chọn khỏi danh sách yêu thích?`)) {
      try {
        setIsDeleting(true);
        let successCount = 0;
        let errorCount = 0;
        for (const movieId of selectedItems) {
          try {
            const result = (await favoritesService.removeFromFavorites(movieId)) as FavoritesServiceResult;
            if (result.success) successCount++;
            else {
              errorCount++;
              console.error(`Error removing movie ${movieId}:`, result.message);
            }
          } catch (err) {
            errorCount++;
            console.error(`Error removing movie ${movieId}:`, err);
          }
        }
        setFavorites((prev) => prev.filter((movie) => !selectedItems.includes(movie.id)));
        setSelectedItems([]);
        if (successCount > 0 && errorCount === 0) {
          toast.success(`Đã xóa ${successCount} phim khỏi danh sách yêu thích!`);
        } else if (successCount > 0 && errorCount > 0) {
          toast.warning(`Đã xóa ${successCount} phim, nhưng không thể xóa ${errorCount} phim`);
        } else {
          toast.error('Không thể xóa các phim đã chọn');
        }
      } catch (err) {
        console.error('[FAVORITES] Error removing selected movies:', err);
        toast.error('Có lỗi xảy ra khi xóa các phim đã chọn');
      } finally {
        setIsDeleting(false);
        setSelectMode(false);
      }
    }
  };

  const handleImgError = (e: MouseEvent<HTMLImageElement>): void => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = '/img/Phim.png';
  };

  const mainContent = (
    <>
      <div className={inProfilePage ? '' : 'container pt-3 pb-5'}>
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
          {!inProfilePage && <h2 className="text-white">Phim yêu thích</h2>}
          {inProfilePage && <h3 className="section-header" style={{ marginTop: '20px' }}>Phim yêu thích</h3>}

          <div className="d-flex flex-wrap gap-2">
            <button
              className={inProfilePage ? 'refresh-button' : 'btn btn-outline-light d-flex align-items-center'}
              onClick={handleRefresh}
              disabled={refreshing}
              type="button"
            >
              <FaSync className={`me-2 ${refreshing ? 'spin' : ''}`} />
              {refreshing ? 'Đang làm mới' : 'Làm mới'}
            </button>

            {!loading && filteredList.length > 0 && (
              <>
                <div className="dropdown">
                  <button
                    className="btn btn-outline-light dropdown-toggle"
                    type="button"
                    onClick={() => setShowSortOptions((s) => !s)}
                    aria-expanded={showSortOptions}
                  >
                    <FaSort className="me-1" /> {getSortOptionName()}
                  </button>
                  {showSortOptions && (
                    <ul className="dropdown-menu dropdown-menu-dark show">
                      {(['newest','oldest','a-z','z-a','highest-rating','lowest-rating','year-desc','year-asc'] as SortOption[]).map((opt) => (
                        <li key={opt}>
                          <button
                            className="dropdown-item"
                            onClick={() => handleSortChange(opt)}
                            type="button"
                          >
                            {opt === 'a-z' ? 'A-Z' : opt === 'z-a' ? 'Z-A' : opt === 'highest-rating' ? 'Đánh giá cao nhất' : opt === 'lowest-rating' ? 'Đánh giá thấp nhất' : opt === 'newest' ? 'Mới nhất' : opt === 'oldest' ? 'Cũ nhất' : opt === 'year-desc' ? 'Năm mới nhất' : 'Năm cũ nhất'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button
                  className={`btn ${selectMode ? 'btn-danger' : 'btn-outline-light'} d-flex align-items-center`}
                  onClick={toggleSelectMode}
                  type="button"
                >
                  <FaCheckSquare className="me-2" /> Chọn nhiều
                </button>

                {selectMode && (
                  <>
                    <button className="btn btn-outline-light" onClick={handleSelectAll} type="button">
                      {selectedItems.length === filteredList.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={handleRemoveSelected}
                      disabled={selectedItems.length === 0 || isDeleting}
                      type="button"
                    >
                      <FaTrash className="me-1" /> Xóa đã chọn ({selectedItems.length})
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="filter-buttons mb-4">
          {(['all', 'movie', 'series'] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`btn ${selectedFilter === tab ? 'btn-danger' : 'btn-outline-danger'} me-2 mb-2 mb-md-0`}
              onClick={() => setSelectedFilter(tab)}
            >
              {tab === 'all' ? 'Tất cả' : tab === 'movie' ? 'Phim lẻ' : 'Phim bộ'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-5 my-5">
            <div className="spinner-border text-danger" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Đang tải...</span>
            </div>
            <p className="text-white mt-3">Đang tải danh sách yêu thích...</p>
          </div>
        ) : error ? (
          <div className="text-center py-5 my-5">
            <div className="mb-4 text-warning" style={{ fontSize: '4rem' }}>
              <FaHeart />
            </div>
            <h3 className="text-white mb-3">Đã xảy ra lỗi khi tải danh sách yêu thích</h3>
            <p className="text-white bg-danger bg-opacity-25 p-3 rounded d-inline-block">{error}</p>
            <div className="mt-4 d-flex justify-content-center flex-wrap gap-2">
              <button className="btn btn-danger" onClick={handleRefresh} disabled={refreshing} type="button">
                <FaSync className={`me-2 ${refreshing ? 'spin' : ''}`} /> Thử lại
              </button>
              <Link href="/" className="btn btn-outline-light">Về trang chủ</Link>
            </div>
          </div>
        ) : filteredList.length === 0 ? (
          <div className={styles.emptyStateContainer}>
            <i className="bi bi-heart-fill display-1 text-danger mb-3"></i>
            <h4 className="text-white">Danh sách yêu thích trống</h4>
            <p className="text-muted">Bạn chưa có phim nào trong danh sách yêu thích</p>
            <Link href="/" className="btn btn-danger">Khám phá phim</Link>
          </div>
        ) : (
          <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 g-4">
            {filteredList.map((movie) => (
              <div key={movie.id} className="col">
                <div className={styles.movieCard}>
                  <div className={styles.movieImageContainer}>
                    {selectMode && (
                      <div
                        className="position-absolute top-0 start-0 m-2"
                        style={{ zIndex: 10 }}
                        onClick={() => toggleSelectItem(movie.id)}
                        role="checkbox"
                        aria-checked={selectedItems.includes(movie.id)}
                        tabIndex={0}
                      >
                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            border: selectedItems.includes(movie.id) ? '2px solid #dc3545' : '2px solid #fff',
                            backgroundColor: selectedItems.includes(movie.id) ? '#dc3545' : 'transparent',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                        >
                          {selectedItems.includes(movie.id) && (
                            <i className="bi bi-check"
                              style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                color: 'white',
                                fontSize: '14px'
                              }}
                            ></i>
                          )}
                        </div>
                      </div>
                    )}
                    <Link href={`/movie/${movie.slug}`}>
                      <img
                        src={movie.thumbnail || '/img/Phim.png'}
                        alt={movie.title}
                        className={styles.movieImage}
                        onError={handleImgError}
                      />
                    </Link>
                    <div className={styles.movieOverlay}>
                      {!selectMode && (
                        <>
                          <button
                            type="button"
                            className={styles.removeButton}
                            onClick={() => handleRemoveFavorite(movie)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                          <Link href={`/movie/${movie.slug}`} className={styles.watchButton}>
                            <i className="bi bi-play-fill"></i>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={styles.movieInfo}>
                    <h5 className={styles.movieTitle}>{movie.title}</h5>
                    {movie.original_title && (
                      <p className={styles.movieOriginalTitle}>{movie.original_title}</p>
                    )}
                    <div className={styles.movieMetaContainer}>
                      {movie.year && (
                        <span className={styles.movieMeta}>
                          <i className="bi bi-calendar-event-fill"></i> {movie.year}
                        </span>
                      )}
                      {movie.type && (
                        <span className={styles.movieMeta}>
                          {movie.type === 'series' || movie.type === 'tv' ? 'Phim bộ' : 'Phim lẻ'}
                        </span>
                      )}
                      {movie.quality && (
                        <span className={`${styles.movieMeta} ${styles.quality}`}>{movie.quality}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );

  if (inProfilePage) return mainContent;
  return <div className="bg-black min-vh-100">{mainContent}</div>;
}
