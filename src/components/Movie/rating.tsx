import StarRatings from 'react-star-ratings';

/**
 * @file rating.tsx
 * @description Simple 5-star rating component using react-star-ratings.
 */

interface RatingProps {
  rating: number;
  onRatingChange?: (newRating: number) => void;
}

const Rating: React.FC<RatingProps> = ({ rating, onRatingChange }) => {
  return (
    <StarRatings
      rating={rating}
      starRatedColor="gold"
      changeRating={onRatingChange}
      numberOfStars={5}
      name="rating"
    />
  );
};

export default Rating;
