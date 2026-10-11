import React, { useState } from 'react';
import {
  FaEye, FaGlobe, FaLock, FaCopy, FaCheck,
  FaExternalLinkAlt, FaCalendarAlt
} from 'react-icons/fa';
import MovieCardVertical from '@/components/common/MovieCard/MovieCardVertical';
import TrailerModal from '@/features/movie-detail/components/TrailerModal';
import { showCinemaAlert } from '@/components/UI/CinemaAlert';
import styles from '@/styles/AdminAddMovie.module.css';

const MovieCardVerticalAny = MovieCardVertical as any;

interface MovieWebSimulationProps {
  name: string;
  originName: string;
  slug: string;
  posterUrl: string;
  thumbUrl: string;
  trailerUrl?: string;
  quality: string;
  year: number;
  type: string;
  time: string;
  lang?: string;
  categories?: string;
  countries?: string;
  actors?: string[];
  directors?: string[];
  episodeCurrent: string;
  voteAverage: number;
  voteCount: number;
  content: string;
  notify?: string;
  showtimes?: string;
  isUpcoming: boolean;
  releaseDescription?: string;
  releaseDateTime?: string;
  servers?: any[];
}

export const MovieWebSimulation: React.FC<MovieWebSimulationProps> = ({
  name,
  originName,
  slug,
  posterUrl,
  thumbUrl,
  trailerUrl,
  quality,
  year,
  type,
  time,
  lang,
  categories,
  countries,
  actors,
  directors,
  episodeCurrent,
  voteAverage,
  voteCount,
  content,
  notify,
  showtimes,
  isUpcoming,
  releaseDescription,
  releaseDateTime,
  servers
}) => {
  // State for real cinematic trailer modal
  const [playingTrailerMovie, setPlayingTrailerMovie] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Trigger trailer on card's red play button click
  const handlePlayTrailer = () => {
    if (trailerUrl && trailerUrl.trim()) {
      setPlayingTrailerMovie({
        name: name || 'Trailer Phim',
        title: name || 'Trailer Phim',
        origin_name: originName || '',
        trailer_url: trailerUrl.trim(),
        poster_url: posterUrl || thumbUrl,
        thumb_url: thumbUrl || posterUrl
      });
    } else {
      showCinemaAlert('Chưa có link video trailer cho phim này. Bạn có thể nhập link trailer tại Bước 3 (Hình ảnh & Video)!', 'warning');
    }
  };

  const cleanSlug = slug ? slug.trim() : 'preview-movie';
  const detailPath = `/movie/${cleanSlug}`;
  const watchPath = `/watch/${cleanSlug}?ep=1`;

  // Copy full URL to clipboard
  const handleCopyUrl = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${detailPath}` : detailPath;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(fullUrl).then(() => {
        setCopied(true);
        showCinemaAlert(`Đã sao chép đường dẫn: ${fullUrl}`, 'success');
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        showCinemaAlert(`Đã sao chép đường dẫn: ${detailPath}`, 'success');
      });
    } else {
      showCinemaAlert(`Đường dẫn công khai: ${fullUrl}`, 'info');
    }
  };

  // Open live example / demo in a new tab with draft data passed via sessionStorage (No 404 error!)
  const handleOpenLiveDemo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const targetSlug = slug?.trim() || 'demo-preview';

    // Store comprehensive draft movie into sessionStorage for live preview
    const draftPayload = {
      name: name || 'Tên Phim Xem Thử',
      origin_name: originName || '',
      slug: targetSlug,
      poster_url: posterUrl || thumbUrl || '/img/placeholder-poster.svg',
      thumb_url: thumbUrl || posterUrl || '/img/placeholder-poster.svg',
      backdrop_url: thumbUrl || posterUrl || '/img/placeholder-poster.svg',
      trailer_url: trailerUrl || '',
      quality: quality || 'FHD',
      year: year || 2024,
      type: type || 'single',
      lang: lang || 'Vietsub',
      time: time || '110 phút',
      episode_current: isUpcoming ? 'Sắp ra mắt' : (episodeCurrent || (type === 'series' ? 'Tập 1' : 'Full')),
      vote_average: voteAverage,
      content: content || 'Nội dung bộ phim đang được cập nhật.',
      notify: notify || '',
      showtimes: showtimes || '',
      is_upcoming: isUpcoming,
      status: isUpcoming ? 'upcoming' : 'completed',
      release_description: releaseDescription || '',
      release_datetime: releaseDateTime || '',
      category: categories ? categories.split(', ').map(c => ({ name: c, slug: c })) : [],
      country: countries ? countries.split(', ').map(c => ({ name: c, slug: c })) : [],
      actors: (actors || []).map(a => ({ name: a })),
      directors: (directors || []).map(d => ({ name: d })),
      episodes: servers && servers.length > 0 ? servers : [
        {
          server_name: 'Vietsub #1 (VIP 4K)',
          server_data: [
            { name: 'Tập 1', slug: 'tap-1', filename: 'tap-1', link_embed: '', link_m3u8: '' }
          ]
        }
      ]
    };

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('admin_movie_preview_draft', JSON.stringify(draftPayload));
      } catch (err) {
        console.error('SessionStorage setItem failed', err);
      }
    }

    const previewUrl = `/movie/${targetSlug}?preview=true`;
    window.open(previewUrl, '_blank');
  };

  const movieData = {
    name: name || 'Tên phim hiển thị',
    origin_name: originName || '',
    slug: cleanSlug,
    poster_url: posterUrl || thumbUrl || '/img/placeholder-poster.svg',
    thumb_url: thumbUrl || posterUrl || '/img/placeholder-poster.svg',
    trailer_url: trailerUrl || '',
    quality: quality || 'FHD',
    year: year || 2024,
    type: type || 'single',
    lang: lang || 'Vietsub',
    episode_current: isUpcoming ? 'Sắp ra mắt' : (episodeCurrent || (type === 'series' ? 'Tập 1' : 'Full')),
    vote_average: voteAverage,
    rating: voteAverage,
    tmdb: { vote_average: voteAverage, vote_count: voteCount },
    time: time || '110 phút'
  };

  return (
    <>
      <div className={styles.glassCard} style={{ margin: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className={styles.cardHeader} style={{ padding: '0.65rem 0.9rem' }}>
          <h3 className={styles.cardTitle} style={{ fontSize: '0.88rem', margin: 0 }}>
            <FaEye className={styles.cardTitleIcon} /> Xem Trước & Liên Kết Web
          </h3>
          <span
            style={{
              background: isUpcoming ? 'rgba(229, 9, 20, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: isUpcoming ? '#f87171' : '#34d399',
              border: isUpcoming ? '1px solid rgba(229, 9, 20, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: 4,
              padding: '2px 7px',
              fontSize: '0.68rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            {isUpcoming ? <FaCalendarAlt size={9} /> : <span style={{ fontSize: 9 }}>●</span>}
            {isUpcoming ? 'Sắp Ra Mắt' : 'Sẵn Sàng Phát Hành'}
          </span>
        </div>

        {/* Body: Card Preview on top, Clean Public Route & Example Link box below */}
        <div
          className={styles.cardBody}
          style={{
            padding: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            flex: 1
          }}
        >
          {/* Real MovieCardVertical with working red play trailer button */}
          <div
            style={{
              maxWidth: 210,
              margin: '0 auto',
              width: '100%',
              filter: 'drop-shadow(0 6px 16px rgba(0, 0, 0, 0.45))'
            }}
            onClick={(e) => {
              // Prevent accidental link navigation in admin preview if not clicking trailer
              const target = e.target as HTMLElement;
              if (!target.closest('button')) {
                e.preventDefault();
              }
            }}
          >
            <MovieCardVerticalAny
              movie={movieData}
              onPlayTrailer={handlePlayTrailer}
            />
          </div>

          {/* Public Route & Example Destination Box */}
          <div
            style={{
              background: '#121216',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              padding: '0.75rem 0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}
          >
            {/* Header: Label */}
            <div className="d-flex align-items-center justify-content-between">
              <span className="text-white fw-bold d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                <FaGlobe className="text-danger" size={12} />
                Đường Dẫn Truy Cập Khán Giả
              </span>
              <span className="text-muted" style={{ fontSize: '0.68rem' }}>
                Next.js Route
              </span>
            </div>

            {/* Mini Address Bar */}
            <div
              style={{
                background: '#0a0a0c',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 6,
                padding: '0.35rem 0.55rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <FaLock size={10} className="text-muted flex-shrink-0" />
              <div
                style={{
                  flex: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.73rem',
                  color: '#9ca3af',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={detailPath}
              >
                <span className="text-muted opacity-75">/movie/</span>
                <strong className="text-light">{slug || 'ten-phim'}</strong>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-dark"
                style={{
                  height: 24,
                  padding: '0 0.5rem',
                  fontSize: '0.68rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#e2e8f0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  cursor: 'pointer'
                }}
                onClick={handleCopyUrl}
                title="Sao chép đường dẫn này"
              >
                {copied ? <FaCheck size={9} className="text-success" /> : <FaCopy size={9} />}
                <span>{copied ? 'Đã chép' : 'Chép'}</span>
              </button>
            </div>

            {/* Route paths breakdown */}
            <div
              style={{
                fontSize: '0.7rem',
                color: '#9ca3af',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '0.45rem 0.6rem',
                borderRadius: 5,
                border: '1px solid rgba(255, 255, 255, 0.04)'
              }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <span className="text-muted">Trang chi tiết:</span>
                <code className="text-danger" style={{ fontSize: '0.7rem' }}>{detailPath}</code>
              </div>
              <div className="d-flex align-items-center justify-content-between">
                <span className="text-muted">Trang phát phim (Player):</span>
                <code className="text-light" style={{ fontSize: '0.7rem' }}>{watchPath}</code>
              </div>
              {isUpcoming && releaseDescription && (
                <div className="d-flex align-items-center justify-content-between pt-1 border-top border-secondary border-opacity-10">
                  <span className="text-muted">Khởi chiếu:</span>
                  <span className="text-white fw-semibold" style={{ fontSize: '0.68rem' }}>{releaseDescription}</span>
                </div>
              )}
            </div>

            {/* Action button to open live example with draft data (No 404!) */}
            <button
              type="button"
              className="btn w-100"
              style={{
                height: 32,
                background: '#e50914',
                border: '1px solid #e50914',
                color: '#ffffff',
                fontSize: '0.74rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                borderRadius: 5,
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              onClick={handleOpenLiveDemo}
              title="Mở tab mới xem thử giao diện trang phim với dữ liệu đang nhập (không bị 404)"
            >
              <FaExternalLinkAlt size={10} />
              <span>Xem Thử Trang Chi Tiết (Live Demo) ↗</span>
            </button>

            {/* Quick reference to existing sample movie */}
            <div className="d-flex align-items-center justify-content-between pt-1 border-top border-secondary border-opacity-10 text-muted" style={{ fontSize: '0.67rem' }}>
              <span>Hoặc xem trang phim mẫu có sẵn:</span>
              <a
                href="/movie/oppenheimer-ke-che-tao-bom-nguyen-tu"
                target="_blank"
                rel="noreferrer"
                className="text-danger text-decoration-none fw-semibold"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                title="Mở trang mẫu Oppenheimer có sẵn để tham khảo layout"
              >
                Mẫu Oppenheimer <FaExternalLinkAlt size={8} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Real Cinematic Video Trailer Modal */}
      {playingTrailerMovie && (
        <TrailerModal
          movie={playingTrailerMovie}
          onClose={() => setPlayingTrailerMovie(null)}
        />
      )}
    </>
  );
};

export default MovieWebSimulation;
