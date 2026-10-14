/**
 * @file react-slick.d.ts
 * @description Type shim for react-slick (no official @types package).
 * Using `declare module` syntax so it can be picked up without explicit import.
 */

declare module 'react-slick' {
  import React from 'react';

  export interface ResponsiveSettings {
    breakpoint: number;
    settings: {
      slidesToShow?: number;
      slidesToScroll?: number;
      arrows?: boolean;
      dots?: boolean;
      infinite?: boolean;
      speed?: number;
      [key: string]: unknown;
    };
  }

  export interface SliderSettings {
    dots?: boolean;
    arrows?: boolean;
    infinite?: boolean;
    speed?: number;
    slidesToShow?: number;
    slidesToScroll?: number;
    swipeToSlide?: boolean;
    draggable?: boolean;
    nextArrow?: React.ReactNode;
    prevArrow?: React.ReactNode;
    autoplay?: boolean;
    autoplaySpeed?: number;
    pauseOnHover?: boolean;
    responsive?: ResponsiveSettings[];
    className?: string;
    afterChange?: (current: number) => void;
    beforeChange?: (current: number, next: number) => void;
    [key: string]: unknown;
  }

  const Slider: React.ComponentType<SliderSettings>;
  export default Slider;
}
