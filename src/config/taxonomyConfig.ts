/**
 * @file taxonomyConfig.ts
 * @description Hệ thống phân loại tập trung cho backend Fastify và routing frontend.
 * Ánh xạ slug thuần (không dấu) sang slug database, nhãn hiển thị tiếng Việt, badge,
 * và từ khoá tìm kiếm dự phòng, theo schema thống nhất và mở rộng.
 */

/**
 * Factory tạo item phân loại chuẩn hoá.
 * Áp dụng schema đồng nhất cho mọi loại: thể loại, quốc gia, định dạng, tag.
 *
 * @param params Các tham số cấu hình
 * @param params.slug Slug thuần, không dấu, dùng cho URL (ví dụ 'han-quoc', 'hoat-hinh')
 * @param params.backendSlugs Các slug lưu trong database (có dấu tiếng Việt)
 * @param params.nameVi Nhãn hiển thị tiếng Việt
 * @param params.nameEn Nhãn tiếng Anh
 * @param [params.badge='CINEMA'] Nhãn badge ngắn cho header card và nhãn
 * @param [params.searchKeyword] Từ khoá tìm kiếm dự phòng cho endpoint search
 * @param [params.baseRoute='/'] Đường dẫn gốc (ví dụ '/quoc-gia', '/the-loai')
 * @returns Entity phân loại đã chuẩn hoá
 */
export function createTaxonomyItem({
  slug,
  backendSlugs = [],
  nameVi,
  nameEn,
  badge = 'CINEMA',
  searchKeyword,
  baseRoute = ''
}: {
  slug: string;
  backendSlugs?: string[];
  nameVi: string;
  nameEn?: string;
  badge?: string;
  searchKeyword?: string;
  baseRoute?: string;
}) {
  const normalizedSlug = slug.toLowerCase().trim();
  const allBackendSlugs = Array.from(new Set([normalizedSlug, ...backendSlugs.map((s: string) => s.toLowerCase().trim())]));

  return {
    slug: normalizedSlug,
    backendSlugs: allBackendSlugs,
    nameVi: nameVi || slug,
    nameEn: nameEn || slug,
    badge,
    searchKeyword: searchKeyword || normalizedSlug.replace(/-/g, ' '),
    href: `${baseRoute}/${normalizedSlug}`
  };
}

/**
 * Hệ thống các quốc gia.
 */
export const TAXONOMY_COUNTRIES = {
  'han-quoc': createTaxonomyItem({
    slug: 'han-quoc',
    backendSlugs: ['hàn-quốc', 'han-quoc'],
    nameVi: 'Hàn Quốc',
    nameEn: 'South Korea',
    badge: 'K-DRAMA',
    searchKeyword: 'han',
    baseRoute: '/quoc-gia'
  }),
  'trung-quoc': createTaxonomyItem({
    slug: 'trung-quoc',
    backendSlugs: ['trung-quốc', 'trung-quoc'],
    nameVi: 'Trung Quốc',
    nameEn: 'China',
    badge: 'C-DRAMA',
    searchKeyword: 'trung',
    baseRoute: '/quoc-gia'
  }),
  'nhat-ban': createTaxonomyItem({
    slug: 'nhat-ban',
    backendSlugs: ['nhật-bản', 'nhat-ban'],
    nameVi: 'Nhật Bản',
    nameEn: 'Japan',
    badge: 'J-DRAMA',
    searchKeyword: 'nhat',
    baseRoute: '/quoc-gia'
  }),
  'au-my': createTaxonomyItem({
    slug: 'au-my',
    backendSlugs: ['âu-mỹ', 'au-my'],
    nameVi: 'Âu Mỹ',
    nameEn: 'Western / Hollywood',
    badge: 'HOLLYWOOD',
    searchKeyword: 'my',
    baseRoute: '/quoc-gia'
  }),
  'thai-lan': createTaxonomyItem({
    slug: 'thai-lan',
    backendSlugs: ['thái-lan', 'thai-lan'],
    nameVi: 'Thái Lan',
    nameEn: 'Thailand',
    badge: 'T-DRAMA',
    searchKeyword: 'thai',
    baseRoute: '/quoc-gia'
  }),
  'viet-nam': createTaxonomyItem({
    slug: 'viet-nam',
    backendSlugs: ['việt-nam', 'viet-nam'],
    nameVi: 'Việt Nam',
    nameEn: 'Vietnam',
    badge: 'V-CINEMA',
    searchKeyword: 'viet',
    baseRoute: '/quoc-gia'
  }),
  'hong-kong': createTaxonomyItem({
    slug: 'hong-kong',
    backendSlugs: ['hồng-kông', 'hong-kong'],
    nameVi: 'Hồng Kông',
    nameEn: 'Hong Kong',
    badge: 'HK-CINEMA',
    searchKeyword: 'hong kong',
    baseRoute: '/quoc-gia'
  }),
  'dai-loan': createTaxonomyItem({
    slug: 'dai-loan',
    backendSlugs: ['đài-loan', 'dai-loan'],
    nameVi: 'Đài Loan',
    nameEn: 'Taiwan',
    badge: 'TW-DRAMA',
    searchKeyword: 'dai loan',
    baseRoute: '/quoc-gia'
  }),
  'anh': createTaxonomyItem({
    slug: 'anh',
    backendSlugs: ['anh'],
    nameVi: 'Anh',
    nameEn: 'United Kingdom',
    badge: 'UK',
    searchKeyword: 'anh',
    baseRoute: '/quoc-gia'
  })
} as const;

/**
 * Hệ thống các thể loại phim.
 */
export const TAXONOMY_CATEGORIES = {
  'hoat-hinh': createTaxonomyItem({
    slug: 'hoat-hinh',
    backendSlugs: ['hoạt-hình', 'hoat-hinh'],
    nameVi: 'Hoạt Hình & Anime',
    nameEn: 'Animation & Anime',
    badge: 'ANIME & CARTOON',
    searchKeyword: 'hoat',
    baseRoute: '/the-loai'
  }),
  'hanh-dong': createTaxonomyItem({
    slug: 'hanh-dong',
    backendSlugs: ['hành-động', 'hanh-dong'],
    nameVi: 'Hành Động',
    nameEn: 'Action',
    badge: 'ACTION',
    searchKeyword: 'hanh dong',
    baseRoute: '/the-loai'
  }),
  'tinh-cam': createTaxonomyItem({
    slug: 'tinh-cam',
    backendSlugs: ['tình-cảm', 'lãng-mạn', 'tinh-cam'],
    nameVi: 'Tình Cảm',
    nameEn: 'Romance',
    badge: 'ROMANCE',
    searchKeyword: 'tinh cam',
    baseRoute: '/the-loai'
  }),
  'kinh-di': createTaxonomyItem({
    slug: 'kinh-di',
    backendSlugs: ['kinh-dị', 'kinh-di'],
    nameVi: 'Kinh Dị',
    nameEn: 'Horror',
    badge: 'HORROR',
    searchKeyword: 'kinh di',
    baseRoute: '/the-loai'
  }),
  'co-trang': createTaxonomyItem({
    slug: 'co-trang',
    backendSlugs: ['cổ-trang', 'co-trang'],
    nameVi: 'Cổ Trang',
    nameEn: 'Period Drama',
    badge: 'PERIOD',
    searchKeyword: 'co trang',
    baseRoute: '/the-loai'
  }),
  'hai-huoc': createTaxonomyItem({
    slug: 'hai-huoc',
    backendSlugs: ['phim-hài', 'hài-hước', 'hai-huoc'],
    nameVi: 'Hài Hước',
    nameEn: 'Comedy',
    badge: 'COMEDY',
    searchKeyword: 'hai',
    baseRoute: '/the-loai'
  }),
  'khoa-hoc-vien-tuong': createTaxonomyItem({
    slug: 'khoa-hoc-vien-tuong',
    backendSlugs: ['khoa-học-viễn-tưởng', 'gia-tuong', 'khoa-hoc-vien-tuong'],
    nameVi: 'Khoa Học Viễn Tưởng',
    nameEn: 'Sci-Fi',
    badge: 'SCI-FI',
    searchKeyword: 'vien tuong',
    baseRoute: '/the-loai'
  }),
  'tam-ly': createTaxonomyItem({
    slug: 'tam-ly',
    backendSlugs: ['tâm-lý', 'chính-kịch', 'tam-ly'],
    nameVi: 'Tâm Lý - Chính Kịch',
    nameEn: 'Drama',
    badge: 'DRAMA',
    searchKeyword: 'tam ly',
    baseRoute: '/the-loai'
  })
} as const;

/**
 * Hệ thống các định dạng phim.
 */
export const TAXONOMY_FORMATS = {
  'phim-bo': createTaxonomyItem({
    slug: 'phim-bo',
    backendSlugs: ['series', 'phim-bo'],
    nameVi: 'Phim Bộ Đặc Sắc',
    nameEn: 'TV Series',
    badge: 'SERIES',
    baseRoute: '/dinh-dang'
  }),
  'phim-le': createTaxonomyItem({
    slug: 'phim-le',
    backendSlugs: ['single', 'phim-le'],
    nameVi: 'Phim Lẻ Chiếu Rạp',
    nameEn: 'Movies',
    badge: 'FEATURE',
    baseRoute: '/dinh-dang'
  }),
  'tv-shows': createTaxonomyItem({
    slug: 'tv-shows',
    backendSlugs: ['tvshows', 'tv-shows'],
    nameVi: 'Chương Trình TV',
    nameEn: 'TV Shows',
    badge: 'SHOW',
    baseRoute: '/dinh-dang'
  })
} as const;

/**
 * Tra cứu metadata quốc gia từ slug đầu vào.
 * Hỗ trợ cả slug thuần và slug có dấu.
 *
 * @param slug Slug đầu vào (thuần hoặc có dấu)
 * @returns Metadata quốc gia hoặc item mặc định
 */
export function resolveCountryTaxonomy(slug: string | null | undefined) {
  if (!slug) return null;
  const normalized = slug.toLowerCase().trim();

  if (normalized in TAXONOMY_COUNTRIES) {
    return (TAXONOMY_COUNTRIES as Record<string, ReturnType<typeof createTaxonomyItem>>)[normalized];
  }

  for (const item of Object.values(TAXONOMY_COUNTRIES as Record<string, ReturnType<typeof createTaxonomyItem>>)) {
    if (item.backendSlugs.includes(normalized)) {
      return item;
    }
  }

  return createTaxonomyItem({
    slug: normalized,
    backendSlugs: [normalized],
    nameVi: slug,
    nameEn: slug,
    baseRoute: '/quoc-gia'
  });
}

/**
 * Tra cứu metadata thể loại từ slug đầu vào.
 * Hỗ trợ cả slug thuần và slug có dấu.
 *
 * @param slug Slug đầu vào (thuần hoặc có dấu)
 * @returns Metadata thể loại hoặc item mặc định
 */
export function resolveCategoryTaxonomy(slug: string | null | undefined) {
  if (!slug) return null;
  const normalized = slug.toLowerCase().trim();

  if (normalized in TAXONOMY_CATEGORIES) {
    return (TAXONOMY_CATEGORIES as Record<string, ReturnType<typeof createTaxonomyItem>>)[normalized];
  }

  for (const item of Object.values(TAXONOMY_CATEGORIES as Record<string, ReturnType<typeof createTaxonomyItem>>)) {
    if (item.backendSlugs.includes(normalized)) {
      return item;
    }
  }

  return createTaxonomyItem({
    slug: normalized,
    backendSlugs: [normalized],
    nameVi: slug,
    nameEn: slug,
    baseRoute: '/the-loai'
  });
}

/**
 * Tra cứu metadata định dạng từ slug đầu vào.
 * Hỗ trợ cả slug thuần và slug alias.
 *
 * @param slug Slug đầu vào
 * @returns Metadata định dạng hoặc item mặc định
 */
export function resolveFormatTaxonomy(slug: string | null | undefined) {
  if (!slug) return null;
  const normalized = slug.toLowerCase().trim();

  if (normalized in TAXONOMY_FORMATS) {
    return (TAXONOMY_FORMATS as Record<string, ReturnType<typeof createTaxonomyItem>>)[normalized];
  }

  for (const item of Object.values(TAXONOMY_FORMATS as Record<string, ReturnType<typeof createTaxonomyItem>>)) {
    if (item.backendSlugs.includes(normalized)) {
      return item;
    }
  }

  return createTaxonomyItem({
    slug: normalized,
    backendSlugs: [normalized],
    nameVi: slug,
    nameEn: slug,
    baseRoute: '/dinh-dang'
  });
}
