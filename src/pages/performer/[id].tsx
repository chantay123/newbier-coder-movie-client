/**
 * @file pages/performer/[id].tsx
 * @description Performer detail page with biography, stats, and filmography.
 */
import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import { Container, Row, Col, Card, Spinner, Alert, Badge } from 'react-bootstrap';
import styles from '@/styles/Performer.module.css';
import { TMDB_CONFIG } from '@/config/systemConfig';

interface PerformerData {
  id: number;
  name: string;
  profile_path?: string | null;
  also_known_as?: string[];
  birthday?: string;
  place_of_birth?: string;
  known_for_department?: string;
  popularity?: number;
  biography?: string;
}

interface PerformerCredit {
  id: number;
  media_type: 'movie' | 'tv';
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  character?: string;
  job?: string;
  poster_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  credit_id?: string;
}

interface ProcessedCredit extends PerformerCredit {
  credit_type: 'cast' | 'crew';
  display_media_type: 'Phim' | 'TV';
  title: string;
  release_date?: string;
  role: string;
}

function removeVietnameseTones(str: string): string {
  return str
    .replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a')
    .replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e')
    .replace(/ì|í|ị|ỉ|ĩ/g, 'i')
    .replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o')
    .replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u')
    .replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A')
    .replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E')
    .replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I')
    .replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O')
    .replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U')
    .replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y')
    .replace(/Đ/g, 'D');
}

function createSlug(text?: string, fallbackId = 0): string {
  if (!text) return `movie-${fallbackId}`;
  return removeVietnameseTones(text).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-').trim();
}

type FilterType = 'all' | 'movies' | 'tv' | 'cast' | 'crew';

export default function PerformerDetail(): ReactElement {
  const router = useRouter();
  const id = router.query.id as string | undefined;

  const [performer, setPerformer] = useState<PerformerData | null>(null);
  const [movies, setMovies] = useState<ProcessedCredit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const moviesPerPage = 8;
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const imageBaseUrl = `${TMDB_CONFIG.imageBaseUrl}/w500`;
  const placeholderImage = '/img/default-poster.jpg';
  const profilePlaceholder = '/img/user-avatar.png';

  useEffect(() => {
    if (!id) return;
    let isSubscribed = true;

    const fetchPerformerDetails = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const baseUrl = TMDB_CONFIG.baseUrl;
        const apiKey = TMDB_CONFIG.apiKey;
        const authToken = TMDB_CONFIG.authToken;

        const personResponse = await axios.get(`${baseUrl}/person/${id}`, {
          params: { api_key: apiKey, language: 'vi-VN,en-US', append_to_response: 'images,external_ids' },
          headers: { Authorization: `Bearer ${authToken}`, accept: 'application/json' }
        });

        if (!isSubscribed) return;
        setPerformer(personResponse.data as PerformerData);

        const creditsResponse = await axios.get(`${baseUrl}/person/${id}/combined_credits`, {
          params: { api_key: apiKey, language: 'vi-VN,en-US' },
          headers: { Authorization: `Bearer ${authToken}`, accept: 'application/json' }
        });

        if (!isSubscribed) return;

        const castCredits: ProcessedCredit[] = (creditsResponse.data.cast || [])
          .filter((item: PerformerCredit) => item.media_type === 'movie' || item.media_type === 'tv')
          .map((item: PerformerCredit) => ({
            ...item,
            credit_type: 'cast' as const,
            display_media_type: (item.media_type === 'movie' ? 'Phim' : 'TV') as 'Phim' | 'TV',
            title: item.media_type === 'movie' ? item.title || '' : item.name || '',
            release_date: item.media_type === 'movie' ? item.release_date : item.first_air_date,
            role: item.character || 'Không xác định'
          }))
          .sort((a: ProcessedCredit, b: ProcessedCredit) => (b.popularity || 0) - (a.popularity || 0) || (b.vote_count || 0) - (a.vote_count || 0));

        const crewCredits: ProcessedCredit[] = (creditsResponse.data.crew || [])
          .filter((item: PerformerCredit) => item.media_type === 'movie' || item.media_type === 'tv')
          .map((item: PerformerCredit) => ({
            ...item,
            credit_type: 'crew' as const,
            display_media_type: (item.media_type === 'movie' ? 'Phim' : 'TV') as 'Phim' | 'TV',
            title: item.media_type === 'movie' ? item.title || '' : item.name || '',
            release_date: item.media_type === 'movie' ? item.release_date : item.first_air_date,
            role: item.job || 'Không xác định'
          }))
          .sort((a: ProcessedCredit, b: ProcessedCredit) => (b.popularity || 0) - (a.popularity || 0) || (b.vote_count || 0) - (a.vote_count || 0));

        const seen = new Set<string>();
        const allMovies: ProcessedCredit[] = [...castCredits, ...crewCredits].filter((m) => {
          const key = `${m.id}-${m.media_type}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        if (isSubscribed) setMovies(allMovies);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching performer data:', err);
        if (isSubscribed) {
          setError('Không thể tải thông tin diễn viên. Vui lòng thử lại sau.');
          setLoading(false);
        }
      }
    };

    fetchPerformerDetails();
    return () => { isSubscribed = false; };
  }, [id]);

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'Không có thông tin';
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const calculateAge = (birthday?: string): number | null => {
    if (!birthday) return null;
    const birth = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleFilterChange = (filter: FilterType): void => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number): void => setCurrentPage(page);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner animation="border" variant="danger" />
        <p>Đang tải thông tin diễn viên...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{error}</Alert>
        <div className="text-center mt-4">
          <button className="btn btn-primary me-3" onClick={() => router.back()}>Quay lại</button>
          <button className="btn btn-outline-light" onClick={() => router.reload()}>Thử lại</button>
        </div>
      </Container>
    );
  }
  if (!performer) return <></>;

  const filteredMovies = movies.filter((m) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'movies') return m.media_type === 'movie';
    if (activeFilter === 'tv') return m.media_type === 'tv';
    if (activeFilter === 'cast') return m.credit_type === 'cast';
    if (activeFilter === 'crew') return m.credit_type === 'crew';
    return true;
  });

  const indexOfLastMovie = currentPage * moviesPerPage;
  const indexOfFirstMovie = indexOfLastMovie - moviesPerPage;
  const currentMovies = filteredMovies.slice(indexOfFirstMovie, indexOfLastMovie);
  const totalPages = Math.ceil(filteredMovies.length / moviesPerPage);
  const pageNumbers: number[] = Array.from({ length: totalPages }, (_, i) => i + 1);

  const handleImgError = (e: React.MouseEvent<HTMLImageElement>): void => {
    (e.target as HTMLImageElement).onerror = null;
    (e.target as HTMLImageElement).src = placeholderImage;
  };

  return (
    <>
      <Head>
        <title>{performer.name} - Thông tin diễn viên | MovieStreaming</title>
        <meta name="description" content={`Thông tin chi tiết về diễn viên ${performer.name} và các bộ phim đã tham gia`} />
      </Head>
      <div
        className={styles.performerBanner}
        style={{
          backgroundImage: `url(${performer.profile_path ? `${imageBaseUrl}/original${performer.profile_path}` : profilePlaceholder})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          position: 'relative'
        }}
      >
        <div className={styles.backdropOverlay} />
        <Container className={styles.containerRelative}>
          <div className={styles.performerHeader}>
            <div className={styles.profileImageWrapper}>
              <div className={styles.profileImageContainer}>
                <img
                  src={performer.profile_path ? `${imageBaseUrl}${performer.profile_path}` : profilePlaceholder}
                  alt={performer.name}
                  className={styles.profileImage}
                  onError={handleImgError}
                />
                {performer.known_for_department && (
                  <div className={styles.departmentBadge}>
                    {performer.known_for_department === 'Acting' ? 'Diễn viên' : performer.known_for_department}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.performerDetails}>
              <h1 className={styles.performerName}>{performer.name}</h1>

              {performer.also_known_as && performer.also_known_as.length > 0 && (
                <div className={styles.alsoKnownAs}>
                  <span className={styles.infoLabel}>Tên khác:</span>
                  <span className={styles.infoValue}>{performer.also_known_as.join(', ')}</span>
                </div>
              )}

              <div className={styles.bioStats}>
                {performer.birthday && (
                  <div className={styles.bioStat}>
                    <i className="bi bi-calendar" />
                    <span className={styles.infoLabel}>Ngày sinh:</span>
                    <span className={styles.infoValue}>
                      {formatDate(performer.birthday)}
                      {calculateAge(performer.birthday) && ` (${calculateAge(performer.birthday)} tuổi)`}
                    </span>
                  </div>
                )}
                {performer.place_of_birth && (
                  <div className={styles.bioStat}>
                    <i className="bi bi-geo-alt" />
                    <span className={styles.infoLabel}>Nơi sinh:</span>
                    <span className={styles.infoValue}>{performer.place_of_birth}</span>
                  </div>
                )}
                {performer.known_for_department && (
                  <div className={styles.bioStat}>
                    <i className="bi bi-film" />
                    <span className={styles.infoLabel}>Nổi tiếng với vai trò:</span>
                    <span className={styles.infoValue}>
                      {performer.known_for_department === 'Acting' ? 'Diễn viên' : performer.known_for_department}
                    </span>
                  </div>
                )}
                <div className={styles.bioStat}>
                  <i className="bi bi-camera-reels" />
                  <span className={styles.infoLabel}>Số phim đã tham gia:</span>
                  <span className={styles.infoValue}>{movies.length}</span>
                </div>
                {performer.popularity && (
                  <div className={styles.bioStat}>
                    <i className="bi bi-graph-up" />
                    <span className={styles.infoLabel}>Độ nổi tiếng:</span>
                    <span className={styles.infoValue}>{performer.popularity.toFixed(1)}</span>
                  </div>
                )}
                <div className={styles.biography}>
                  <h3 className={styles.sectionTitle}>
                    <i className="bi bi-file-person me-2" />Tiểu sử
                  </h3>
                  <div className={styles.biographyText}>
                    {performer.biography ? (
                      <div className={styles.biographyContent}>
                        {performer.biography.split('\n').map((paragraph, idx) => (
                          <p key={idx}>{paragraph}</p>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.noBiography}>
                        <i className="bi bi-exclamation-circle me-2" />
                        <p className="text-muted">Chưa có thông tin tiểu sử về diễn viên này.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </div>

      <div className={styles.sectionBackground}>
        <Container className={styles.movieListContainer}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.filmographyTitle}>
              <i className="bi bi-film me-2" />Phim đã tham gia
            </h2>
            {movies.length > 0 && (
              <div className={styles.movieCounter}>
                <Badge bg="danger" className={styles.countBadge}>{movies.length} phim</Badge>
              </div>
            )}
          </div>

          {movies.length > 0 && (
            <div className={styles.filterControls}>
              <div className={styles.filterButtons}>
                {([
                  ['all', 'bi-grid', 'Tất cả', movies.length],
                  ['movies', 'bi-film', 'Phim', movies.filter((m) => m.media_type === 'movie').length],
                  ['tv', 'bi-tv', 'TV', movies.filter((m) => m.media_type === 'tv').length],
                  ['cast', 'bi-person-badge', 'Diễn viên', movies.filter((m) => m.credit_type === 'cast').length],
                  ['crew', 'bi-camera-reels', 'Đoàn phim', movies.filter((m) => m.credit_type === 'crew').length]
                ] as Array<[FilterType, string, string, number]>).map(([key, icon, label, count]) => (
                  <button
                    key={key}
                    onClick={() => handleFilterChange(key)}
                    className={`${styles.filterBtn} ${activeFilter === key ? styles.active : ''}`}
                  >
                    <i className={`bi ${icon} me-2`} />
                    {label} ({count})
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredMovies.length > 0 ? (
            <>
              <Row className={styles.movieGrid}>
                {currentMovies.map((movie) => {
                  const movieTitle = movie.title || `Movie-${movie.id}`;
                  const movieSlug = createSlug(movieTitle, movie.id);
                  return (
                    <Col key={`${movie.id}-${movie.credit_id || Math.random()}`} xs={6} sm={6} md={4} lg={3} xl={3} className={styles.movieCol}>
                      <Link href={`/movie/${movieSlug}`} className={styles.movieLink}>
                        <Card className={styles.movieCard}>
                          <div className={styles.posterContainer}>
                            <Card.Img
                              variant="top"
                              src={movie.poster_path ? `${imageBaseUrl}${movie.poster_path}` : placeholderImage}
                              alt={movieTitle}
                              className={styles.posterImage}
                              onError={handleImgError}
                            />
                            <div className={styles.movieOverlay}>
                              <div className={styles.characterBadge}>{movie.role || 'Không xác định'}</div>
                              <div className={styles.playButton}><i className="bi bi-play-circle-fill" /></div>
                            </div>
                            <div className={styles.ratingBadge}>
                              <i className="bi bi-star-fill me-1" />
                              {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
                            </div>
                            <Badge className={`${styles.mediaTypeBadge} ${movie.media_type === 'tv' ? styles.tvBadge : ''}`}>
                              {movie.display_media_type}
                            </Badge>
                            {movie.release_date && (
                              <div className={styles.yearBadge}>{new Date(movie.release_date).getFullYear()}</div>
                            )}
                          </div>
                          <Card.Body className={styles.cardBody}>
                            <Card.Title className={styles.movieTitle}>{movieTitle}</Card.Title>
                            <div className={styles.movieMeta}>
                              {movie.credit_type === 'cast' ? (
                                <span className={styles.characterName} title={`Vai: ${movie.role}`}>
                                  <i className="bi bi-person-fill me-1" />
                                  {movie.role.length > 15 ? `${movie.role.substring(0, 15)}...` : movie.role}
                                </span>
                              ) : (
                                <span className={styles.jobTitle} title={movie.role}>
                                  <i className="bi bi-gear-fill me-1" />
                                  {movie.role.length > 15 ? `${movie.role.substring(0, 15)}...` : movie.role}
                                </span>
                              )}
                            </div>
                          </Card.Body>
                        </Card>
                      </Link>
                    </Col>
                  );
                })}
              </Row>

              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className={styles.paginationButton}>
                    <i className="bi bi-chevron-left" />
                  </button>
                  {currentPage > 3 && (
                    <>
                      <button onClick={() => handlePageChange(1)} className={styles.paginationButton}>1</button>
                      {currentPage > 4 && <span className={styles.paginationEllipsis}>...</span>}
                    </>
                  )}
                  {pageNumbers
                    .filter((n) => Math.abs(n - currentPage) <= 2)
                    .map((n) => (
                      <button key={n} onClick={() => handlePageChange(n)} className={`${styles.paginationButton} ${currentPage === n ? styles.activePage : ''}`}>{n}</button>
                    ))}
                  {currentPage < totalPages - 2 && (
                    <>
                      {currentPage < totalPages - 3 && <span className={styles.paginationEllipsis}>...</span>}
                      <button onClick={() => handlePageChange(totalPages)} className={styles.paginationButton}>{totalPages}</button>
                    </>
                  )}
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className={styles.paginationButton}>
                    <i className="bi bi-chevron-right" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className={styles.noMoviesFound}>
              <div className={styles.noMoviesIcon}>
                <i className="bi bi-film" />
                <i className="bi bi-slash-circle overlay-icon" />
              </div>
              <h5>Không tìm thấy phim</h5>
              <p>Không có phim phù hợp với bộ lọc này.</p>
            </div>
          )}
        </Container>
      </div>
    </>
  );
}
