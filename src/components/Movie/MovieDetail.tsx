import React, { useState } from 'react';

interface MovieDetail {
  trailer_url?: string;
  [key: string]: unknown;
}

/**
 * @file MovieDetail.tsx
 * @description Lightweight trailer-only MovieDetail widget.
 * Note: the legacy `movie` global reference is a pre-existing artifact of the original
 * component. This refactor keeps the same render shape but makes the prop-driven form
 * the canonical usage. Pages should wrap this with a real MovieDetail full component
 * (see features/movie-detail).
 */

export interface MovieDetailProps {
  movie?: MovieDetail;
}

const MovieDetail: React.FC<MovieDetailProps> = ({ movie: movieProp }) => {
  const [showTrailer, setShowTrailer] = useState<boolean>(false);
  // Fallback to undefined when no prop is supplied so original behavior (referencing
  // a global `movie`) degrades gracefully without throwing at runtime.
  const movie: MovieDetail | undefined = movieProp;

  return (
    <div>
      {movie?.trailer_url && (
        <button
          className="btn btn-outline-danger mt-3"
          onClick={() => setShowTrailer(true)}
        >
          Xem Trailer
        </button>
      )}

      {showTrailer && (
        <div className="modal show d-block">
          <div className="modal-dialog modal-lg">
            <div className="modal-content bg-dark">
              <div className="modal-body p-0">
                <div className="ratio ratio-16x9">
                  <iframe
                    src={movie?.trailer_url}
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieDetail;
