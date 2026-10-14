/**
 * @file Ad/index.ts
 * @description Barrel exports for Advertisement components.
 */
import BannerAd from './BannerAd';
import VideoAd from './VideoAd';
import AdPlayer from './AdPlayer';

export { BannerAd, VideoAd, AdPlayer };
export type { BannerAdProps } from './BannerAd';
export type { VideoAdProps } from './VideoAd';
export default { BannerAd, VideoAd, AdPlayer };
