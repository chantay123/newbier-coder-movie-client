/**
 * @file navigationConfig.ts
 * @description Hệ thống điều hướng tập trung cho Header, Footer và Profile Menu.
 * Đồng bộ Navbar với TAXONOMY_CATEGORIES và TAXONOMY_COUNTRIES.
 */

import { TAXONOMY_CATEGORIES, TAXONOMY_COUNTRIES } from './taxonomyConfig';
import { ROUTES } from './routesConfig';

/**
 * Item dropdown cho navbar, được tạo từ taxonomy items.
 * Taxonomy items có cấu trúc { nameVi, slug, href, badge }.
 */
interface TaxonomyNavItem {
  name: string;
  slug: string;
  href: string;
  badge: string;
}

/** Item dropdown trong navbar */
interface DropdownNavItem {
  id: string;
  label: string;
  type: 'dropdown';
  dropdownType: 'genres' | 'countries';
  items: TaxonomyNavItem[];
  matchPrefix?: string;
}

/** Link trong navbar */
interface LinkNavItem {
  id: string;
  label: string;
  type: 'link';
  href: string;
  matchPrefix?: string;
  matchExact?: boolean;
}

/** Tất cả các loại item navbar */
type NavbarNavItem = DropdownNavItem | LinkNavItem;

/** User menu item */
interface UserNavItem {
  id: string;
  label: string;
  href: string;
  iconType: string;
  iconColor: string;
}

/**
 * Danh sách thể loại đã chuẩn hoá cho dropdown điều hướng.
 */
export const GENRE_NAV_ITEMS: TaxonomyNavItem[] = Object.values(TAXONOMY_CATEGORIES).map((cat) => ({
  name: cat.nameVi,
  slug: cat.slug,
  href: cat.href,
  badge: cat.badge
}));

/**
 * Danh sách quốc gia đã chuẩn hoá cho dropdown điều hướng.
 */
export const COUNTRY_NAV_ITEMS: TaxonomyNavItem[] = Object.values(TAXONOMY_COUNTRIES).map((country) => ({
  name: country.nameVi,
  slug: country.slug,
  href: country.href,
  badge: country.badge
}));

/**
 * Các mục điều hướng chính của Navbar, đúng theo spec sản phẩm:
 * 1. Chủ Đề (Dropdown)  2. Duyệt tìm (/search)
 * 3. Phim Lẻ (/movies)  4. Phim Bộ (/series)
 * 5. Quốc gia (Dropdown)  6. Diễn Viên (/performer)  7. Lịch Chiếu (/schedule)
 */
export const MAIN_NAV_ITEMS: NavbarNavItem[] = [
  {
    id: 'chu-de',
    label: 'Chủ Đề',
    type: 'dropdown',
    dropdownType: 'genres',
    items: GENRE_NAV_ITEMS,
    matchPrefix: '/genre'
  },
  {
    id: 'duyet-tim',
    label: 'Duyệt tìm',
    type: 'link',
    href: ROUTES.SEARCH,
    matchExact: true
  },
  {
    id: 'phim-le',
    label: 'Phim Lẻ',
    type: 'link',
    href: ROUTES.MOVIES,
    matchPrefix: '/movies'
  },
  {
    id: 'phim-bo',
    label: 'Phim Bộ',
    type: 'link',
    href: ROUTES.SERIES,
    matchPrefix: '/series'
  },
  {
    id: 'country',
    label: 'Quốc gia',
    type: 'dropdown',
    dropdownType: 'countries',
    items: COUNTRY_NAV_ITEMS,
    matchPrefix: '/country'
  },
  {
    id: 'dien-vien',
    label: 'Diễn Viên',
    type: 'link',
    href: '/performer',
    matchPrefix: '/performer'
  },
  {
    id: 'lich-chieu',
    label: 'Lịch Chiếu',
    type: 'link',
    href: '/schedule',
    matchExact: true
  }
];

/**
 * Các mục menu dropdown trong tài khoản người dùng.
 */
export const USER_NAV_ITEMS: UserNavItem[] = [
  {
    id: 'profile',
    label: 'Hồ sơ của tôi',
    href: ROUTES.PROFILE,
    iconType: 'user',
    iconColor: 'primary'
  },
  {
    id: 'favorites',
    label: 'Phim yêu thích',
    href: '/user/favorites',
    iconType: 'heart',
    iconColor: 'danger'
  },
  {
    id: 'watchlater',
    label: 'Danh sách xem sau',
    href: '/user/watch-later',
    iconType: 'bookmark',
    iconColor: 'warning'
  },
  {
    id: 'history',
    label: 'Lịch sử xem',
    href: '/user/history',
    iconType: 'history',
    iconColor: 'info'
  }
];

/**
 * Cấu hình tìm kiếm nhanh trên Navbar.
 */
export const NAVBAR_SEARCH_CONFIG = {
  debounceMs: 250,
  movieLimit: 6,
  actorLimit: 4,
  placeholder: 'Tìm phim, diễn viên...'
} as const;

export default {
  MAIN_NAV_ITEMS,
  USER_NAV_ITEMS,
  NAVBAR_SEARCH_CONFIG
};
