/**
 * The central configuration for the SEO and the social metadata.
 *
 * It standardizes the title, the OpenGraph tags and the default metadata.
 */

export const SEO_CONFIG = {
  siteName: 'MovieStreaming',
  titleSuffix: 'MovieStreaming',
  defaultTitle: 'MovieStreaming - Xem Phim Online HD Vietsub Miễn Phí',
  defaultDescription:
    'Website xem phim online chuẩn HD miễn phí, cập nhật nhanh nhất các bộ phim bom tấn, phim chiếu rạp, phim bộ Hàn Quốc, Trung Quốc, Âu Mỹ chất lượng cao.',
  defaultKeywords:
    'xem phim online, phim moi, phim le, phim bo, phim chieu rap, anime, vietsub, thuyet minh',
  defaultImage: '/img/phimlogo-removebg-preview.png',
  locale: 'vi_VN',
  twitterCard: 'summary_large_image',

  /**
   * Builds the title of the document.
   *
   * @param pageTitle - The title of the page.
   * @returns The formatted title, for example "Movie Listing | MovieStreaming".
   */
  formatTitle: (pageTitle: string | null | undefined): string => {
    if (!pageTitle) return SEO_CONFIG.defaultTitle;
    return `${pageTitle} | ${SEO_CONFIG.titleSuffix}`;
  }
} as const;

export default SEO_CONFIG;
