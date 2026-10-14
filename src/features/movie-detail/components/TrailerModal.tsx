import React, { useState, useEffect, useMemo } from 'react';
import { YOUTUBE_CONFIG } from '@/config/systemConfig';
import {
  resolveMovieBackdrop,
  resolveMovieSubTitle,
  resolveMovieCategories,
  resolveMovieYear
} from '@/utils/movieNormalizer';

/**
 * @file TrailerModal.tsx
 * @description Cinematic trailer modal that embeds the movie's real trailer
 * (from `movie.trailer` or its legacy aliases) directly in a YouTube iframe.
 * Falls back to a poster + metadata panel when no playable trailer is
 * available. Never auto-redirects to YouTube.
 */

/** Category entry từ movie */
interface CategoryEntry {
  slug?: string;
  name?: string;
}

/** Trailer object dạng TMDB-style */
interface TrailerObject {
  url?: string;
  key?: string;
  site?: string;
}

/** Movie payload - loose shape từ API */
export interface TrailerMovie {
  _id?: string;
  slug?: string;
  title?: string;
  name?: string;
  origin_name?: string;
  description?: string;
  content?: string;
  overview?: string;
  synopsis?: string;
  duration?: number | string;
  runtime?: number | string;
  episode_time?: number | string;
  poster_url?: string;
  thumb_url?: string;
  backdrop_url?: string;
  year?: number | string;
  category?: CategoryEntry[];
  trailer_url?: string;
  trailerUrl?: string;
  video_url?: string;
  trailer?: TrailerObject | string;
}

export interface TrailerModalProps {
  movie: TrailerMovie | null;
  onClose: () => void;
}

interface TrailerState {
  embedUrl: string;
  provider: 'youtube' | 'raw' | null;
  available: boolean;
}

interface MetaInfo {
  title: string;
  originTitle: string;
  backdrop: string;
  poster: string;
  year: number | string | null;
  categories: CategoryEntry[];
  description: string;
  duration: number | string | null;
}

const TrailerModal: React.FC<TrailerModalProps> = ({ movie, onClose }) => {
  const [trailerState, setTrailerState] = useState<TrailerState>({
    embedUrl: '',
    provider: null,
    available: false,
  });
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * Extracts an 11-char YouTube video ID from a string.
   */
  const extractYouTubeId = (str: string | undefined | null): string | null => {
    if (!str || typeof str !== 'string') return null;
    const clean = str.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
    const match = clean.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i
    );
    return match ? match[1] : null;
  };

  /**
   * Resolves the movie's trailer to a YouTube embed URL.
   */
  const resolveTrailer = (m: TrailerMovie | null): TrailerState => {
    if (!m) return { embedUrl: '', provider: null, available: false };

    // 1) Legacy explicit URL fields win.
    const legacy = m.trailer_url || m.trailerUrl || m.video_url;
    if (typeof legacy === 'string' && legacy.trim() !== '') {
      const ytId = extractYouTubeId(legacy);
      if (ytId) return { embedUrl: YOUTUBE_CONFIG.getEmbedUrl(ytId), provider: 'youtube', available: true };
      if (legacy.includes('embed')) {
        const sep = legacy.includes('?') ? '&' : '?';
        return { embedUrl: `${legacy}${sep}autoplay=1`, provider: 'raw', available: true };
      }
      return { embedUrl: legacy, provider: 'raw', available: true };
    }

    // 2/3) Object-shaped trailer payload
    const t = m.trailer;
    if (t && typeof t === 'object') {
      if (typeof t.url === 'string' && t.url.trim() !== '') {
        const ytId = extractYouTubeId(t.url);
        if (ytId) return { embedUrl: YOUTUBE_CONFIG.getEmbedUrl(ytId), provider: 'youtube', available: true };
        if (t.url.includes('embed')) {
          const sep = t.url.includes('?') ? '&' : '?';
          return { embedUrl: `${t.url}${sep}autoplay=1`, provider: 'raw', available: true };
        }
        return { embedUrl: t.url, provider: 'raw', available: true };
      }

      const site = (t.site || '').toString().toLowerCase();
      const isYouTube = !site || site === 'youtube';
      if (isYouTube && typeof t.key === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(t.key.trim())) {
        return { embedUrl: YOUTUBE_CONFIG.getEmbedUrl(t.key.trim()), provider: 'youtube', available: true };
      }
    }

    return { embedUrl: '', provider: null, available: false };
  };

  const meta = useMemo<MetaInfo | null>(() => {
    if (!movie) return null;
    const title = movie.title || movie.name || movie.origin_name || 'Trailer Phim';
    const originTitle =
      movie.origin_name && movie.origin_name !== title ? movie.origin_name : '';
    const backdrop = resolveMovieBackdrop(movie as never) || '';
    const poster = movie.poster_url || movie.thumb_url || backdrop;
    const year = resolveMovieYear(movie as never);
    const categories = resolveMovieCategories(movie as never) || [];
    const description =
      movie.description ||
      movie.content ||
      movie.overview ||
      movie.synopsis ||
      '';
    const duration = movie.duration || movie.runtime || movie.episode_time || null;
    return { title, originTitle, backdrop, poster, year, categories, description, duration };
  }, [movie]);

  useEffect(() => {
    if (!movie) {
      setTrailerState({ embedUrl: '', provider: null, available: false });
      setLoading(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    const result = resolveTrailer(movie);
    setTrailerState(result);
    setLoading(!!result.embedUrl);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie]);

  const iframeKey = useMemo(
    () => `${trailerState.provider || 'none'}-${trailerState.embedUrl}`,
    [trailerState]
  );

  useEffect(() => {
    return () => {
      // No-op: iframe is unmounted with the component, which stops playback.
    };
  }, []);

  if (!movie || !meta) return null;

  return (
    <div
      className="modal-backdrop-overlay"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('modal-backdrop-overlay')) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Trailer phim ${meta.title}`}
    >
      <div className="trailer-modal-box">
        {/* Close Button */}
        <button
          type="button"
          className="trailer-close-btn"
          onClick={onClose}
          aria-label="Đóng trailer"
          title="Đóng (Esc)"
        >
          <i className="fas fa-times" />
        </button>

        {/* Video Player / Poster Fallback */}
        <div className="trailer-video-wrap">
          {loading && trailerState.embedUrl ? (
            <div className="trailer-loading-state">
              <div className="trailer-spinner" />
            </div>
          ) : trailerState.embedUrl ? (
            <iframe
              key={iframeKey}
              src={trailerState.embedUrl}
              title={`Trailer phim ${meta.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="trailer-iframe"
            />
          ) : (
            <div className="trailer-fallback-stage">
              {meta.backdrop && (
                <img
                  src={meta.backdrop}
                  alt={meta.title}
                  className="fallback-backdrop-blur"
                />
              )}
              <div className="fallback-dark-mask" />

              <div className="fallback-content-card">
                <div className="fallback-icon-circle">
                  <i className="fas fa-film text-danger" />
                </div>
                <h4 className="fallback-heading">{meta.title}</h4>
                <p className="fallback-subtext">
                  Phim chưa có trailer khả dụng.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Movie Metadata Panel */}
        <div className="trailer-meta-panel">
          <div className="trailer-meta-poster">
            {meta.poster && (
              <img
                src={meta.poster}
                alt={meta.title}
                className="trailer-meta-poster-img"
                loading="lazy"
              />
            )}
          </div>

          <div className="trailer-meta-body">
            <h3 className="trailer-meta-title">{meta.title}</h3>
            {meta.originTitle && (
              <p className="trailer-meta-origin">{meta.originTitle}</p>
            )}

            <div className="trailer-meta-tags">
              {meta.year && (
                <span className="trailer-meta-tag">{meta.year}</span>
              )}
              {Array.isArray(meta.categories) && meta.categories.slice(0, 3).map((cat) => (
                <span key={cat.slug || cat.name} className="trailer-meta-tag">
                  {cat.name}
                </span>
              ))}
              {meta.duration && (
                <span className="trailer-meta-tag">{meta.duration} phút</span>
              )}
            </div>

            {meta.description && (
              <p className="trailer-meta-description">{meta.description}</p>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-backdrop-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(12px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          padding: 24px 20px;
          animation: modalFadeIn 0.2s ease-out;
        }

        .trailer-modal-box {
          position: relative;
          width: 100%;
          max-width: 960px;
          animation: modalSlideUp 0.24s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .trailer-close-btn {
          position: absolute;
          top: -18px;
          right: -18px;
          z-index: 30;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #161b22;
          border: 2px solid rgba(255, 255, 255, 0.25);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1.05rem;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.7);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .trailer-close-btn:hover {
          background: #e50914;
          border-color: #e50914;
          color: #ffffff;
          transform: scale(1.12);
        }

        .trailer-close-btn:active {
          transform: scale(0.96);
        }

        .trailer-video-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          background: #000000;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.95), 0 0 40px rgba(0, 0, 0, 0.75);
        }

        .trailer-iframe {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
        }

        .trailer-loading-state {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #06080c;
        }

        .trailer-spinner {
          width: 38px;
          height: 38px;
          border: 3px solid rgba(229, 9, 20, 0.2);
          border-top-color: #e50914;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .trailer-fallback-stage {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 24px;
        }

        .fallback-backdrop-blur {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: blur(16px) brightness(0.35);
          transform: scale(1.08);
        }

        .fallback-dark-mask {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle, rgba(13, 17, 23, 0.6) 0%, rgba(13, 17, 23, 0.95) 100%);
        }

        .fallback-content-card {
          position: relative;
          z-index: 2;
          text-align: center;
          max-width: 520px;
          padding: 24px;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          backdrop-filter: blur(12px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
        }

        .fallback-icon-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(229, 9, 20, 0.15);
          border: 1px solid rgba(229, 9, 20, 0.3);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          margin-bottom: 12px;
        }

        .fallback-heading {
          font-size: 1.1rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 8px;
        }

        .fallback-subtext {
          font-size: 0.82rem;
          color: #94a3b8;
          line-height: 1.5;
          margin-bottom: 0;
        }

        .trailer-meta-panel {
          display: flex;
          gap: 18px;
          margin-top: 18px;
          padding: 16px;
          background: rgba(15, 23, 42, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55);
        }

        .trailer-meta-poster {
          flex: 0 0 auto;
          width: 110px;
          height: 160px;
          border-radius: 8px;
          overflow: hidden;
          background: #0d1117;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .trailer-meta-poster-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .trailer-meta-body {
          flex: 1 1 auto;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
          color: #ffffff;
        }

        .trailer-meta-title {
          font-size: 1.15rem;
          font-weight: 700;
          margin: 0;
          line-height: 1.3;
          color: #ffffff;
        }

        .trailer-meta-origin {
          font-size: 0.85rem;
          color: #94a3b8;
          margin: 0;
          font-style: italic;
        }

        .trailer-meta-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 2px;
        }

        .trailer-meta-tag {
          display: inline-flex;
          align-items: center;
          font-size: 0.72rem;
          font-weight: 600;
          color: #e5e7eb;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 3px 9px;
          border-radius: 999px;
          letter-spacing: 0.02em;
        }

        .trailer-meta-description {
          font-size: 0.85rem;
          color: #cbd5e1;
          line-height: 1.55;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 768px) {
          .trailer-close-btn {
            top: 10px;
            right: 10px;
            width: 36px;
            height: 36px;
            font-size: 0.95rem;
            background: rgba(0, 0, 0, 0.7);
          }

          .trailer-meta-panel {
            flex-direction: row;
            gap: 12px;
            padding: 12px;
          }

          .trailer-meta-poster {
            width: 78px;
            height: 112px;
          }

          .trailer-meta-title {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default TrailerModal;
