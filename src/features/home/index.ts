/**
 * @file features/home/index.ts
 * @description Backward-compatible barrel re-export from new location.
 * All home feature exports are now in features/client/components/home/.
 */
export { default as HeroBanner } from '@/features/client/components/home/components/HeroBanner';
export { default as FeaturedCarousel3D } from '@/features/client/components/home/components/FeaturedCarousel3D';
export { default as BigSlideBanner } from '@/features/client/components/home/components/BigSlideBanner';
export { default as CommunityCommentSection } from '@/features/client/components/home/components/CommunityCommentSection';
export { default as TrendingRadarSection } from '@/features/client/components/home/components/TrendingRadarSection';

export {
  TopRecommendedSection,
  TrendingTop10Section,
  UpcomingMoviesSection,
  CountryMoviesSection,
  LatestMoviesGridSection,
  AnimationMoviesSection
} from '@/features/client/components/home/components/HomeRails';

export { useHomeData } from '@/features/client/components/home/hooks/useHomeData';
