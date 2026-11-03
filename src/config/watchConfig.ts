/**
 * The central configuration for the watch page and the video player.
 *
 * It gathers the episode group size, the sidebar recommendations, the UI
 * labels, the fallbacks and the SEO defaults, so that the components never
 * hardcode a value.
 */

export const WATCH_CONFIG = {
  // The number of episodes in one group of the playlist. 24 episodes per
  // group keep a balanced layout.
  episodesPerGroup: 24,

  // The configuration of the sidebar recommendation widget.
  recommendations: {
    limit: 10,
    title: 'Phim Đề Xuất',
    emptyText: 'Đang cập nhật danh sách đề xuất...'
  },

  // The labels and the texts used by the UI.
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

  // The SEO and the head defaults.
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
