/**
 * @file pages/performer/[id].tsx
 * @description Performer (cast/crew) detail page: bio, filmography, and
 * filterable / paginated movie grid powered by the TMDB API.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import { Container, Row, Col, Card, Spinner, Alert, Badge } from 'react-bootstrap';
import styles from '@/styles/Performer.module.css';
import { TMDB_CONFIG } from '@/config/systemConfig';

type FilterValue = 'all' | 'movies' | 'tv' | 'cast' | 'crew';
type MediaType = 'movie' | 'tv';
type CreditType = 'cast' | 'crew';

interface Performer {
  id: number;
  name: string;
  profile_path?: string | null;
  known_for_department?: string;
  also_known_as?: string[];
  birthday?: string | null;
  place_of_birth?: string | null;
  popularity?: number;
  biography?: string;
  [key: string]: unknown;
}

interface PerformerCredit {
  id: number;
  media_type?: MediaType;
  credit_type?: CreditType;
  display_media_type?: string;
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
  role?: string;
  [key: string]: unknown;
}

const stripTones = (str: string): string => {
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
};

const createSlug = (text: string, fallback: string | number): string => {
  if (!text) return `movie-${fallback}`;
  return stripTones(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
};

const PerformerDetail: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [performer, setPerformer] = useState<Performer | null>(null);
  const [movies, setMovies] = useState<PerformerCredit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [moviesPerPage] = useState<number>(8);
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all');

  const imageBaseUrl = `${TMDB_CONFIG.imageBaseUrl}/w500`;
  const placeholderImage = '/img/default-poster.jpg';
  const profilePlaceholder = '/img/user-avatar.png';

  useEffect(() => {
    if (!id) return;
    const fetchPerformerDetails = async () => {
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
        setPerformer(personResponse.data as Performer);

        const creditsResponse = await axios.get(`${baseUrl}/person/${id}/combined_credits`, {
          params: { api_key: apiKey, language: 'vi-VN,en-US' },
          headers: { Authorization: `Bearer ${authToken}`, accept: 'application/json' }
        });
        const creditsData = creditsResponse.data as { cast?: PerformerCredit[]; crew?: PerformerCredit[] };

        const castCredits: PerformerCredit[] = Array.isArray(creditsData.cast)
          ? creditsData.cast
            .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
            .map((item) => ({
              ...item,
              credit_type: 'cast' as CreditType,
              display_media_type: item.media_type === 'movie' ? 'Movie' : 'TV',
              title: item.media_type === 'movie' ? item.title : item.name,
              release_date: item.media_type === 'movie' ? item.release_date : item.first_air_date
            }))
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0) || (b.vote_count || 0) - (a.vote_count || 0))
          : [];

        const crewCredits: PerformerCredit[] = Array.isArray(creditsData.crew)
          ? creditsData.crew
            .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
            .map((item) => ({
              ...item,
              credit_type: 'crew' as CreditType,
              display_media_type: item.media_type === 'movie' ? 'Movie' : 'TV',
              title: item.media_type === 'movie' ? item.title : item.name,
              release_date: item.media_type === 'movie' ? item.release_date : item.first_air_date
            }))
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0) || (b.vote_count || 0) - (a.vote_count || 0))
          : [];

        let allMovies: PerformerCredit[] = [...castCredits, ...crewCredits];
        const uniqueIds = new Set<string>();
        allMovies = allMovies.filter((movie) => {
          const key = `${movie.id}-${movie.media_type}`;
          if (!uniqueIds.has(key)) {
            uniqueIds.add(key);
            return true;
          }
          return false;
        });
        allMovies = allMovies.map((movie) => ({
          ...movie,
          role: movie.character || movie.job || 'N/A'
        }));

        setMovies(allMovies);
        setLoading(false);
      } catch (err) {
        const e = err as Error;

        setError('Could not load performer data. Please try again later.');
        setLoading(false);
      }
    };

    fetchPerformerDetails();
  }, [id]);

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return 'No information';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const calculateAge = (birthday?: string | null): number | null => {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner animation="border" variant="danger" />
        <p>Loading performer info...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{error}</Alert>
        <div className="text-center mt-4">
          <button className="btn btn-primary me-3" onClick={() => router.back()}>Go back</button>
          <button className="btn btn-outline-light" onClick={() => router.reload()}>Retry</button>
        </div>
      </Container>
    );
  }
  if (!performer) return null;

  const indexOfLastMovie = currentPage * moviesPerPage;
  const indexOfFirstMovie = indexOfLastMovie - moviesPerPage;

  const filteredMovies = movies.filter((movie) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'movies') return movie.media_type === 'movie';
    if (activeFilter === 'tv') return movie.media_type === 'tv';
    if (activeFilter === 'cast') return movie.credit_type === 'cast';
    if (activeFilter === 'crew') return movie.credit_type === 'crew';
    return true;
  });

  const currentMovies = filteredMovies.slice(indexOfFirstMovie, indexOfLastMovie);
  const totalPages = Math.ceil(filteredMovies.length / moviesPerPage);
  const pageNumbers: number[] = [];
  for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);

  const paginate = (pageNumber: number): void => setCurrentPage(pageNumber);
  const goToPreviousPage = (): void => { if (currentPage > 1) setCurrentPage(currentPage - 1); };
  const goToNextPage = (): void => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };

  return (
    <>
      <Head>
        <title>{String(performer.name || 'Performer')} - Performer info | MovieStreaming</title>
        <meta name="description" content={`Detailed information about ${performer.name} and the movies they have been in.`} />
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
        <div className={styles.backdropOverlay}></div>
        <Container className={styles.containerRelative}>
          <div className={styles.performerHeader}>
            <div className={styles.profileImageWrapper}>
              <div className={styles.profileImageContainer}>
                <img
                  src={performer.profile_path ? `${imageBaseUrl}${performer.profile_path}` : profilePlaceholder}
                  alt={performer.name}
                  className={styles.profileImage}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = profilePlaceholder;
                  }}
                />
                {performer.known_for_department && (
                  <div className={styles.departmentBadge}>
                    {performer.known_for_department === 'Acting' ? 'Actor' : performer.known_for_department}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.performerDetails}>
              <h1 className={styles.performerName}>{performer.name}</h1>

              {performer.also_known_as && performer.also_known_as.length > 0 && (
                <div className={styles.alsoKnownAs}>
                  <span className={styles.infoLabel}>Also known as:</span>
                  <span className={styles.infoValue}>{performer.also_known_as.join(', ')}</span>
                </div>
              )}

              <div className={styles.bioStats}>
                {performer.birthday && (
                  <div className={styles.bioStat}>
                    <i className="bi bi-calendar"></i>
                    <span className={styles.infoLabel}>Born:</span>
                    <span className={styles.infoValue}>
                      {formatDate(performer.birthday)}
                      {calculateAge(performer.birthday) !== null && ` (${calculateAge(performer.birthday)} years old)`}
                    </span>
                  </div>
                )}

                {performer.place_of_birth && (
                  <div className={styles.bioStat}>
                    <i className="bi bi-geo-alt"></i>
                    <span className={styles.infoLabel}>Place of birth:</span>
                    <span className={styles.infoValue}>{performer.place_of_birth}</span>
                  </div>
                )}

                {performer.known_for_department && (
                  <div className={styles.bioStat}>
                    <i className="bi bi-film"></i>
                    <span className={styles.infoLabel}>Known for:</span>
                    <span className={styles.infoValue}>
                      {performer.known_for_department === 'Acting' ? 'Acting' : performer.known_for_department}
                    </span>
                  </div>
                )}

                <div className={styles.bioStat}>
                  <i className="bi bi-camera-reels"></i>
                  <span className={styles.infoLabel}>Credits:</span>
                  <span className={styles.infoValue}>{movies.length}</span>
                </div>

                {performer.popularity && (
                  <div className={styles.bioStat}>
                    <i className="bi bi-graph-up"></i>
                    <span className={styles.infoLabel}>Popularity:</span>
                    <span className={styles.infoValue}>
                      {Number(performer.popularity).toFixed(1)}
                    </span>
                  </div>
                )}
                <div className={styles.biography}>
                  <h3 className={styles.sectionTitle}>
                    <i className="bi bi-file-person me-2"></i>
                    Biography
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
                        <i className="bi bi-exclamation-circle me-2"></i>
                        <p className="text-muted">No biography available for this performer.</p>
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
              <i className="bi bi-film me-2"></i>
              Filmography
            </h2>
            {movies.length > 0 && (
              <div className={styles.movieCounter}>
                <Badge bg="danger" className={styles.countBadge}>{movies.length} movies</Badge>
              </div>
            )}
          </div>

          {movies.length > 0 && (
            <div className={styles.filterControls}>
              <div className={styles.filterButtons}>
                <button
                  onClick={() => { setActiveFilter('all'); setCurrentPage(1); }}
                  className={`${styles.filterBtn} ${activeFilter === 'all' ? styles.active : ''}`}
                >
                  <i className="bi bi-grid me-2"></i>
                  All ({movies.length})
                </button>
                <button
                  onClick={() => { setActiveFilter('movies'); setCurrentPage(1); }}
                  className={`${styles.filterBtn} ${activeFilter === 'movies' ? styles.active : ''}`}
                >
                  <i className="bi bi-film me-2"></i>
                  Movies ({movies.filter((m) => m.media_type === 'movie').length})
                </button>
                <button
                  onClick={() => { setActiveFilter('tv'); setCurrentPage(1); }}
                  className={`${styles.filterBtn} ${activeFilter === 'tv' ? styles.active : ''}`}
                >
                  <i className="bi bi-tv me-2"></i>
                  TV ({movies.filter((m) => m.media_type === 'tv').length})
                </button>
                <button
                  onClick={() => { setActiveFilter('cast'); setCurrentPage(1); }}
                  className={`${styles.filterBtn} ${activeFilter === 'cast' ? styles.active : ''}`}
                >
                  <i className="bi bi-person-badge me-2"></i>
                  Acting ({movies.filter((m) => m.credit_type === 'cast').length})
                </button>
                <button
                  onClick={() => { setActiveFilter('crew'); setCurrentPage(1); }}
                  className={`${styles.filterBtn} ${activeFilter === 'crew' ? styles.active : ''}`}
                >
                  <i className="bi bi-camera-reels me-2"></i>
                  Crew ({movies.filter((m) => m.credit_type === 'crew').length})
                </button>
              </div>
            </div>
          )}

          {filteredMovies.length > 0 ? (
            <>
              <Row className={styles.movieGrid}>
                {currentMovies.map((movie) => {
                  const movieTitle = movie.title || movie.name || `Movie-${movie.id}`;
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
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = placeholderImage;
                              }}
                            />
                            <div className={styles.movieOverlay}>
                              <div className={styles.characterBadge}>{movie.role || 'N/A'}</div>
                              <div className={styles.playButton}>
                                <i className="bi bi-play-circle-fill"></i>
                              </div>
                            </div>
                            <div className={styles.ratingBadge}>
                              <i className="bi bi-star-fill me-1"></i>
                              {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
                            </div>
                            <Badge className={`${styles.mediaTypeBadge} ${movie.media_type === 'tv' ? styles.tvBadge : ''}`}>
                              {movie.display_media_type}
                            </Badge>
                            {movie.release_date && (
                              <div className={styles.yearBadge}>
                                {new Date(movie.release_date).getFullYear()}
                              </div>
                            )}
                          </div>
                          <Card.Body className={styles.cardBody}>
                            <Card.Title className={styles.movieTitle}>{movieTitle}</Card.Title>
                            <div className={styles.movieMeta}>
                              {movie.credit_type === 'cast' ? (
                                <span className={styles.characterName} title={`Role: ${movie.role}`}>
                                  <i className="bi bi-person-fill me-1"></i>
                                  {String(movie.role || '').length > 15 ? String(movie.role).substring(0, 15) + '...' : movie.role}
                                </span>
                              ) : (
                                <span className={styles.jobTitle} title={String(movie.role || '')}>
                                  <i className="bi bi-gear-fill me-1"></i>
                                  {String(movie.role || '').length > 15 ? String(movie.role).substring(0, 15) + '...' : movie.role}
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
                  <button onClick={goToPreviousPage} disabled={currentPage === 1} className={styles.paginationButton}>
                    <i className="bi bi-chevron-left"></i>
                  </button>

                  {currentPage > 3 && (
                    <>
                      <button onClick={() => paginate(1)} className={styles.paginationButton}>1</button>
                      {currentPage > 4 && <span className={styles.paginationEllipsis}>...</span>}
                    </>
                  )}

                  {pageNumbers
                    .filter((number) => Math.abs(number - currentPage) <= 2)
                    .map((number) => (
                      <button
                        key={number}
                        onClick={() => paginate(number)}
                        className={`${styles.paginationButton} ${currentPage === number ? styles.activePage : ''}`}
                      >
                        {number}
                      </button>
                    ))
                  }

                  {currentPage < totalPages - 2 && (
                    <>
                      {currentPage < totalPages - 3 && <span className={styles.paginationEllipsis}>...</span>}
                      <button onClick={() => paginate(totalPages)} className={styles.paginationButton}>{totalPages}</button>
                    </>
                  )}

                  <button onClick={goToNextPage} disabled={currentPage === totalPages} className={styles.paginationButton}>
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className={styles.noMoviesFound}>
              <div className={styles.noMoviesIcon}>
                <i className="bi bi-film"></i>
                <i className="bi bi-slash-circle overlay-icon"></i>
              </div>
              <h5>No movies found</h5>
              <p>No {activeFilter !== 'all' ? `${activeFilter === 'movies' ? 'movies' : (activeFilter === 'tv' ? 'TV shows' : (activeFilter === 'cast' ? 'roles' : 'crew jobs'))} for` : ''} this performer in the database.</p>
            </div>
          )}
        </Container>
      </div>
    </>
  );
};

export default PerformerDetail;
