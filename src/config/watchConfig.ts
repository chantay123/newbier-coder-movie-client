/**
 * @file watchConfig.ts
 * @description Cấu hình tập trung cho trang xem phim và trình phát.
 * Gom kích thước tập phim, đề xuất sidebar, nhãn UI, fallback và mặc định SEO,
 * tránh hardcode giá trị trong component UI.
 */

export const WATCH_CONFIG = {
  // Số tập phim mỗi nhóm trong playlist (24 tập mỗi nhóm cho layout cân đối)
  episodesPerGroup: 24,

  // Cấu hình widget đề xuất sidebar
  recommendations: {
    limit: 10,
    title: 'Phim Đề Xuất',
    emptyText: 'Đang cập nhật danh sách đề xuất...'
  },

  // Nhãn và text cho UI
  labels: {
    playlistTitle: 'Danh Sách Tập',
    totalEpisodesSuffix: 'tập',
    versionLabel: 'Bản chiếu:',
    pinEpisodeTitle: 'Ghim tập này để dễ dàng theo dõi',
    pinEpisodeText: 'Ghim tập',
    pinnedEpisodeTitle: 'Bỏ ghim tập này',
    pinnedEpisodeText: 'Đã ghim',
    prevEpisode: 'Tập trước',
    nextEpisode: 'Tập tiếp',
    favorite: 'Yêu thích',
    favorited: 'Đã lưu',
    share: 'Chia sẻ',
    shareCopied: 'Đã sao chép',
    synopsisTitle: 'Tóm tắt nội dung',
    backToMovieDetail: 'Về trang thông tin phim',
    homeCrumb: 'Trang chủ',
    defaultEpisodePrefix: 'Tập',
    defaultEpisodeName: 'Tập phim'
  },

  // Mặc định SEO & Head
  seo: {
    siteName: 'MovieStreaming',
    defaultBackdrop: '/img/background/movies-wall.jpg',
    buildPageTitle: (movieName: string, epTitle?: string) =>
      `Xem phim ${movieName}${epTitle ? ` - ${epTitle}` : ''} | MovieStreaming`,
    buildDescription: (movieName: string, epTitle?: string) =>
      `Xem phim ${movieName}${epTitle ? ` ${epTitle}` : ''} chất lượng cao trực tuyến miễn phí.`
  }
} as const;

export default WATCH_CONFIG;
