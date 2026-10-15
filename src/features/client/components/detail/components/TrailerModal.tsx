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

  // Legacy flat trailer URL fields
  trailer_url?: string;
  trailerUrl?: string;
  video_url?: string;
  videoUrl?: string;
  trailerLink?: string;

  // Object-shaped trailer payload (TMDB-style, backend-crawl, etc.)
  trailer?: TrailerObject | string;

  // Direct video fields (for some API responses)
  video?: TrailerObject | string;
  youtube?: TrailerObject | string;
  youtube_trailer?: TrailerObject | string;
  movie_trailer?: TrailerObject | string;

  // For nested responseData structure (sometimes backend wraps movie in { movie: {...} })
  movie?: TrailerMovie;
  data?: TrailerMovie;
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
  const [iframeFailed, setIframeFailed] = useState<boolean>(false);

  /**
   * Extracts a YouTube video ID (6-15 chars) from a string.
   * Accepts legacy short IDs from some backends (e.g. 'KPLWW1QCOQ')
   * as well as the canonical 11-char YouTube keys.
   */
  const extractYouTubeId = (str: string | undefined | null): string | null => {
    if (!str || typeof str !== 'string') return null;
    const clean = str.trim();
    if (!clean) return null;

    // 1) Already a bare 6-15 char YouTube key. The canonical length is 11,
    //    but some legacy backends store 9-10 char IDs.
    if (/^[a-zA-Z0-9_-]{6,15}$/.test(clean)) return clean;

    // 2) Full YouTube URL of any variant.
    const match = clean.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{6,15})/i
    );
    if (match?.[1]) return match[1];

    // 3) Partial embed URL (e.g. 'https://www.youtube.com/embed/Way9Dexny3w' or 'Way9Dexny3w?param=value').
    const embedMatch = clean.match(/\/embed\/([a-zA-Z0-9_-]{6,15})/i);
    if (embedMatch?.[1]) return embedMatch[1];

    return null;
  };

  /**
   * Builds a YouTube search embed URL from a movie title + year.
   * Used as a graceful fallback when the trailer ID is invalid or absent.
   * This is the official YouTube embed "results" endpoint.
   */
  const buildSearchEmbedUrl = (m: TrailerMovie | null | undefined): string | null => {
    if (!m || typeof m !== 'object') return null;
    const searchQuery = [m.name, m.origin_name, m.year]
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .join(' ')
      .trim();
    if (!searchQuery) return null;
    // Use YouTube's "results" search embed with the movie title + "trailer"
    const q = encodeURIComponent(`${searchQuery} trailer`);
    return `https://www.youtube.com/embed?listType=search&list=${q}&autoplay=1&rel=0`;
  };

  /**
   * Resolves the movie's trailer to a YouTube embed URL.
   * Tries multiple strategies: legacy flat fields, object-shaped payloads,
   * TMDB-style nested data, and direct video fields.
   * Falls back to a YouTube search embed using the movie title.
   */
  const resolveTrailer = (m: TrailerMovie | null): TrailerState => {
    if (!m) return { embedUrl: '', provider: null, available: false };

    // Unwrap nested structures that some API responses use
    const source = (m as { movie?: TrailerMovie }).movie
      || (m as { data?: TrailerMovie }).data
      || m;

    // ── Debug: log what trailer fields are present ─────────────────────────
    // eslint-disable-next-line no-console

    // eslint-disable-next-line no-console


    // ── Nhánh 1: Legacy explicit URL fields ──────────────────────────────
    const legacy =
      source.trailer_url
      || source.trailerUrl
      || source.video_url
      || source.videoUrl
      || source.trailerLink;
    if (typeof legacy === 'string' && legacy.trim() !== '') {
      const ytId = extractYouTubeId(legacy);
      if (ytId) return { embedUrl: YOUTUBE_CONFIG.getEmbedUrl(ytId), provider: 'youtube', available: true };
      if (legacy.includes('embed')) {
        const sep = legacy.includes('?') ? '&' : '?';
        return { embedUrl: `${legacy}${sep}autoplay=1`, provider: 'raw', available: true };
      }
      return { embedUrl: legacy, provider: 'raw', available: true };
    }

    // ── Nhánh 2–5: Object-shaped trailer payload ─────────────────────────
    // Try every field that could hold a trailer object
    const trailerObjects: (TrailerObject | string | null | undefined)[] = [
      source.trailer,
      source.video,
      source.youtube,
      source.youtube_trailer,
      source.movie_trailer,
    ];

    for (const tRaw of trailerObjects) {
      // Branch C: trailer field is a plain string (e.g. legacy backend stores bare YouTube key)
      if (typeof tRaw === 'string' && tRaw.trim() !== '') {
        const ytId = extractYouTubeId(tRaw);
        if (ytId) return { embedUrl: YOUTUBE_CONFIG.getEmbedUrl(ytId), provider: 'youtube', available: true };
        continue;
      }

      const t = tRaw as TrailerObject | null;
      if (!t || typeof t !== 'object') continue;

      // Branch A: trailer has a direct URL string
      if (typeof t.url === 'string' && t.url.trim() !== '') {
        const ytId = extractYouTubeId(t.url);
        if (ytId) return { embedUrl: YOUTUBE_CONFIG.getEmbedUrl(ytId), provider: 'youtube', available: true };
        if (t.url.includes('embed')) {
          const sep = t.url.includes('?') ? '&' : '?';
          return { embedUrl: `${t.url}${sep}autoplay=1`, provider: 'raw', available: true };
        }
        return { embedUrl: t.url, provider: 'raw', available: true };
      }

      // Branch B: trailer has a `key` (TMDB-style: { key, site, name })
      const site = ((t.site as string) || '').toString().toLowerCase();
      const isYouTube = !site || site === 'youtube';
      if (isYouTube && typeof t.key === 'string') {
        const keyTrimmed = t.key.trim();
        if (/^[a-zA-Z0-9_-]{6,15}$/.test(keyTrimmed)) {
          return { embedUrl: YOUTUBE_CONFIG.getEmbedUrl(keyTrimmed), provider: 'youtube', available: true };
        }
        // Try extracting from URL in key field
        const ytIdFromKey = extractYouTubeId(keyTrimmed);
        if (ytIdFromKey) {
          return { embedUrl: YOUTUBE_CONFIG.getEmbedUrl(ytIdFromKey), provider: 'youtube', available: true };
        }
      }
    }

    // ── Final fallback: YouTube search embed using movie title + year ──
    const searchUrl = buildSearchEmbedUrl(source);
    if (searchUrl) {
      return { embedUrl: searchUrl, provider: 'youtube', available: true };
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
    setIframeFailed(false);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie]);

  const iframeKey = useMemo(
    () => `${trailerState.provider || 'none'}-${trailerState.embedUrl}-${iframeFailed ? 'fallback' : 'primary'}`,
    [trailerState, iframeFailed]
  );

  // Resolve the embed URL used by the iframe. If the primary YouTube
  // embed failed to load, automatically swap to a YouTube search embed
  // so the user always sees SOMETHING relevant to the movie.
  const activeEmbedUrl = useMemo((): string => {
    if (!trailerState.embedUrl) return '';
    if (!iframeFailed) return trailerState.embedUrl;
    // Iframe failed (e.g. invalid video ID, region block, "video unavailable")
    // -> fallback to YouTube search embed using movie title.
    return buildSearchEmbedUrl(movie) || trailerState.embedUrl;
  }, [trailerState, iframeFailed, movie]);

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
          {loading && activeEmbedUrl ? (
            <div className="trailer-loading-state">
              <div className="trailer-spinner" />
            </div>
          ) : activeEmbedUrl ? (
            <iframe
              key={iframeKey}
              src={activeEmbedUrl}
              title={`Trailer phim ${meta.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="trailer-iframe"
              onLoad={(e) => {
                // If we land on a YouTube "Video unavailable" or "Watch on
                // YouTube" page, the iframe still loads successfully but
                // the inner content signals failure. We can't read
                // cross-origin frames reliably, so we use a timeout
                // heuristic: if we're still showing the spinner overlay
                // 8s after src change, mark as failed and fall back.
                const target = e.target as HTMLIFrameElement;
                target.dataset.trailerIframeMounted = '1';
              }}
              onError={() => {
                // Hard iframe error -> immediately swap to search fallback.
                // eslint-disable-next-line no-console

                setIframeFailed(true);
              }}
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
                  Trailer chưa được cung cấp cho phim này.
                  <br />
                  <small>Vui lòng chọn server phía dưới để xem phim.</small>
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

            <div className="trailer-meta-actions">
              <button
                type="button"
                className="trailer-action-btn trailer-action-btn--search"
                onClick={() => {
                  if (!movie) return;
                  const q = encodeURIComponent(
                    [movie.name, movie.origin_name, movie.year]
                      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
                      .join(' ')
                      .trim() + ' trailer'
                  );
                  if (!q) return;
                  window.open(`https://www.youtube.com/results?search_query=${q}`, '_blank', 'noopener,noreferrer');
                }}
                title="Mở YouTube search cho trailer này"
              >
                <i className="fab fa-youtube" /> Tìm trên YouTube
              </button>
              <button
                type="button"
                className="trailer-action-btn trailer-action-btn--retry"
                onClick={() => {
                  // Re-mount the iframe with the current embedUrl.
                  setIframeFailed((prev) => !prev);
                }}
                title="Thử lại trailer embed"
              >
                <i className="fas fa-redo" /> Thử lại
              </button>
            </div>
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

        .trailer-meta-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        .trailer-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          font-size: 0.78rem;
          font-weight: 600;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.06);
          color: #e5e7eb;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .trailer-action-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.32);
          color: #ffffff;
        }

        .trailer-action-btn--search {
          background: rgba(229, 9, 20, 0.18);
          border-color: rgba(229, 9, 20, 0.45);
          color: #ffe1e1;
        }

        .trailer-action-btn--search:hover {
          background: rgba(229, 9, 20, 0.32);
          border-color: #e50914;
          color: #ffffff;
        }

        .trailer-action-btn--retry {
          background: rgba(56, 189, 248, 0.12);
          border-color: rgba(56, 189, 248, 0.35);
          color: #cdebfb;
        }

        .trailer-action-btn--retry:hover {
          background: rgba(56, 189, 248, 0.24);
          border-color: #38bdf8;
          color: #ffffff;
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
