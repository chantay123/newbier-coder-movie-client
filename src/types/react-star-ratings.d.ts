/**
 * @file react-star-ratings.d.ts
 * @description Minimal type shim for react-star-ratings.
 */

declare module 'react-star-ratings' {
  import React from 'react';

  export interface StarRatingsProps {
    rating: number;
    starRatedColor?: string;
    starEmptyColor?: string;
    starHoverColor?: string;
    changeRating?: (newRating: number, name?: string) => void;
    numberOfStars?: number;
    name?: string;
    starDimension?: string;
    starSpacing?: string;
    className?: string;
    svgIconPath?: string;
    svgIconViewBox?: string;
  }

  const StarRatings: React.ComponentType<StarRatingsProps>;
  export default StarRatings;
}
