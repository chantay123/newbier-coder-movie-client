/**
 * @file index.ts
 * @description Centralized barrel export for the Shared feature module.
 * UI components truly shared between Admin and Client domains.
 */

// Layout
export { default as Navbar } from './components/Layout/Navbar';
export { default as Footer } from './components/Layout/Footer';

// UI primitives
export { default as BackToTop } from './components/UI/BackToTop';
export { default as CinemaAlert } from './components/UI/CinemaAlert';
export { default as Skeleton } from './components/UI/Skeleton';
export { default as NetworkStatusBar } from './components/UI/NetworkStatusBar';
export { default as OfflineNotice } from './components/UI/OfflineNotice';

// Ad
export { BannerAd, VideoAd, AdPlayer } from './components/Ad';

// Movie Card / Section
export { default as MovieCardHorizontal } from './components/MovieCard/MovieCardHorizontal';
export { default as MovieCardVertical } from './components/MovieCard/MovieCardVertical';
export { default as MovieSection } from './components/MovieSection/MovieSection';
export { default as SectionHeader } from './components/MovieSection/SectionHeader';

// Auth
export { default as AuthForm } from './components/Auth/AuthForm';
