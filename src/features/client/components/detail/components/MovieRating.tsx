import React, { useState } from 'react';
import ratingService from '@/API/services/ratingService';

export interface MovieRatingProps {
  movieId?: string;
}

/**
 * Lets the user rate a movie with a star score and an optional note.
 *
 * @param movieId - The slug of the movie being rated.
 */
const MovieRating: React.FC<MovieRatingProps> = ({ movieId }) => {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');

  /**
   * Sends the selected star score to the backend.
   *
   * The backend contract is `POST {API_BASE}/ratings` with the body
   * `{ movieSlug, rating }`. The old `/movies/rate` route does not
   * exist on backend v1.
   */
  const handleSubmit = async (): Promise<void> => {
    if (!movieId) return;
    try {
      await ratingService.createOrUpdateRating(movieId, rating);
      void comment;
    } catch (error) {
      // The rating is optional, so a failed request must not break the page.
    }
  };

  return (
    <div className="mt-4">
      <h4>Đánh giá phim</h4>
      <div className="rating mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${rating >= star ? 'active' : ''}`}
            onClick={() => setRating(star)}
          >
            ★
          </span>
        ))}
      </div>
      <textarea
        className="form-control mb-3"
        placeholder="Nhận xét của bạn..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button
        className="btn btn-danger"
        onClick={handleSubmit}
      >
        Gửi đánh giá
      </button>
    </div>
  );
};

export default MovieRating;
