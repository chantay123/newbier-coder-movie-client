// src/mock/admin/mockMovies.ts

export interface MockMovieItem {
  _id: string;
  name: string;
  origin_name: string;
  slug: string;
  year: number;
  type: 'series' | 'single';
  status: 'active' | 'inactive';
  thumb_url: string;
  poster_url?: string;
  category: Array<{ id: string; name: string; slug: string }>;
  views: number;
  view?: number;
  quality: string;
  lang: string;
  content: string;
  director: string[];
  actor: string[];
  country: Array<{ id: string; name: string }>;
  time: string;
  showtimes?: string;
  episode_current: string;
  episode_total: string;
  is_copyright: boolean;
  sub_docquyen: boolean;
  chieurap: boolean;
  rating: number;
  vote_count: number;
  createdAt: string;
  updatedAt: string;
  episodes: Array<{
    server_name: string;
    server_data: Array<{
      name: string;
      slug: string;
      filename: string;
      link_embed: string;
      link_m3u8: string;
    }>;
  }>;
}

export const MOCK_ADMIN_MOVIES: MockMovieItem[] = [
  {
    _id: 'mov-001',
    name: 'Dune: Hành Tinh Cát - Phần Hai',
    origin_name: 'Dune: Part Two',
    slug: 'dune-part-two',
    year: 2024,
    type: 'single',
    status: 'active',
    thumb_url: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    poster_url: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    category: [
      { id: 'cat-1', name: 'Hành Động', slug: 'hanh-dong' },
      { id: 'cat-2', name: 'Viễn Tưởng', slug: 'vien-tuong' },
      { id: 'cat-8', name: 'Phiêu Lưu', slug: 'phieu-luu' }
    ],
    views: 125400,
    quality: '4K Ultra HD',
    lang: 'Vietsub + Thuyết Minh',
    content: 'Paul Atreides liên minh với Chani và người Fremen để trả thù những kẻ đã hủy diệt gia tộc mình, đối mặt với sự lựa chọn giữa tình yêu và định mệnh vũ trụ.',
    director: ['Denis Villeneuve'],
    actor: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson', 'Austin Butler'],
    country: [{ id: 'coun-1', name: 'Mỹ' }],
    time: '166 phút',
    episode_current: 'Full',
    episode_total: '1 Tập',
    is_copyright: true,
    sub_docquyen: true,
    chieurap: true,
    rating: 8.9,
    vote_count: 1420,
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-05T12:00:00Z',
    episodes: [
      {
        server_name: 'VIP Server #1 (HLS 4K)',
        server_data: [
          {
            name: 'Full',
            slug: 'full',
            filename: 'dune-part-two-4k.m3u8',
            link_embed: 'https://example.com/embed/dune-2',
            link_m3u8: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
          }
        ]
      }
    ]
  },
  {
    _id: 'mov-002',
    name: 'Oppenheimer',
    origin_name: 'Oppenheimer',
    slug: 'oppenheimer',
    year: 2023,
    type: 'single',
    status: 'active',
    thumb_url: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    poster_url: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    category: [
      { id: 'cat-9', name: 'Tâm Lý', slug: 'tam-ly' },
      { id: 'cat-10', name: 'Tài Liệu', slug: 'tai-lieu' }
    ],
    views: 310500,
    quality: '4K Ultra HD',
    lang: 'Vietsub',
    content: 'Câu chuyện về nhà vật lý lý thuyết J. Robert Oppenheimer, người đứng đầu Dự án Manhattan phát triển vũ khí nguyên tử đầu tiên cho nhân loại.',
    director: ['Christopher Nolan'],
    actor: ['Cillian Murphy', 'Emily Blunt', 'Matt Damon', 'Robert Downey Jr.'],
    country: [{ id: 'coun-1', name: 'Mỹ' }, { id: 'coun-6', name: 'Vương Quốc Anh' }],
    time: '180 phút',
    episode_current: 'Full',
    episode_total: '1 Tập',
    is_copyright: true,
    sub_docquyen: false,
    chieurap: true,
    rating: 9.1,
    vote_count: 2850,
    createdAt: '2023-08-15T08:00:00Z',
    updatedAt: '2023-08-20T10:00:00Z',
    episodes: [
      {
        server_name: 'Server VIP #1',
        server_data: [
          {
            name: 'Full',
            slug: 'full',
            filename: 'oppenheimer-fhd.m3u8',
            link_embed: 'https://example.com/embed/oppenheimer',
            link_m3u8: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
          }
        ]
      }
    ]
  },
  {
    _id: 'mov-003',
    name: 'Arcane: Liên Minh Huyền Thoại (Mùa 2)',
    origin_name: 'Arcane Season 2',
    slug: 'arcane-season-2',
    year: 2024,
    type: 'series',
    status: 'active',
    thumb_url: 'https://image.tmdb.org/t/p/w500/abf8tHznhSvl9BAElxDuv0YvyKT.jpg',
    poster_url: 'https://image.tmdb.org/t/p/w500/abf8tHznhSvl9BAElxDuv0YvyKT.jpg',
    category: [
      { id: 'cat-5', name: 'Hoạt Hình', slug: 'hoat-hinh' },
      { id: 'cat-1', name: 'Hành Động', slug: 'hanh-dong' },
      { id: 'cat-2', name: 'Viễn Tưởng', slug: 'vien-tuong' }
    ],
    views: 489000,
    quality: '4K Ultra HD',
    lang: 'Lồng Tiếng + Vietsub',
    content: 'Xung đột đẫm máu giữa thành phố công nghệ Piltover và khu ổ chuột Zaun đẩy hai chị em Vi và Jinx vào hai đầu chiến tuyến tàn khốc.',
    director: ['Christian Linke', 'Alex Yee'],
    actor: ['Hailee Steinfeld', 'Ella Purnell', 'Katie Leung'],
    country: [{ id: 'coun-1', name: 'Mỹ' }],
    time: '45 phút/tập',
    episode_current: 'Tập 9',
    episode_total: '9 Tập',
    is_copyright: true,
    sub_docquyen: true,
    chieurap: false,
    rating: 9.4,
    vote_count: 5120,
    createdAt: '2024-11-10T14:00:00Z',
    updatedAt: '2024-11-25T16:00:00Z',
    episodes: [
      {
        server_name: 'VIP Server #1',
        server_data: [
          { name: 'Tập 1', slug: 'tap-1', filename: 'arcane-s2-ep1.m3u8', link_embed: '', link_m3u8: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
          { name: 'Tập 2', slug: 'tap-2', filename: 'arcane-s2-ep2.m3u8', link_embed: '', link_m3u8: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
          { name: 'Tập 3', slug: 'tap-3', filename: 'arcane-s2-ep3.m3u8', link_embed: '', link_m3u8: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
        ]
      }
    ]
  },
  {
    _id: 'mov-004',
    name: 'Ký Sinh Trùng',
    origin_name: 'Parasite (Gisaengchung)',
    slug: 'ky-sinh-trung-parasite',
    year: 2019,
    type: 'single',
    status: 'active',
    thumb_url: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    poster_url: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    category: [
      { id: 'cat-9', name: 'Tâm Lý', slug: 'tam-ly' },
      { id: 'cat-3', name: 'Kinh Dị', slug: 'kinh-di' }
    ],
    views: 520000,
    quality: 'Full HD 1080p',
    lang: 'Vietsub + Thuyết Minh',
    content: 'Một gia đình nghèo từng bước thâm nhập và làm việc cho một gia đình giàu có, dẫn đến những bi kịch không thể lường trước.',
    director: ['Bong Joon-ho'],
    actor: ['Song Kang-ho', 'Lee Sun-kyun', 'Cho Yeo-jeong', 'Choi Woo-shik'],
    country: [{ id: 'coun-2', name: 'Hàn Quốc' }],
    time: '132 phút',
    episode_current: 'Full',
    episode_total: '1 Tập',
    is_copyright: true,
    sub_docquyen: false,
    chieurap: true,
    rating: 9.2,
    vote_count: 4200,
    createdAt: '2019-09-01T10:00:00Z',
    updatedAt: '2023-01-10T12:00:00Z',
    episodes: [
      {
        server_name: 'Server Phổ Thông',
        server_data: [
          { name: 'Full', slug: 'full', filename: 'parasite-fhd.m3u8', link_embed: '', link_m3u8: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
        ]
      }
    ]
  },
  {
    _id: 'mov-005',
    name: 'Mai',
    origin_name: 'Mai',
    slug: 'phim-mai-2024',
    year: 2024,
    type: 'single',
    status: 'active',
    thumb_url: 'https://image.tmdb.org/t/p/w500/czembW0Rk1Ke7lCJGhkAiBhQ9la.jpg',
    poster_url: 'https://image.tmdb.org/t/p/w500/czembW0Rk1Ke7lCJGhkAiBhQ9la.jpg',
    category: [
      { id: 'cat-4', name: 'Tình Cảm', slug: 'tinh-cam' },
      { id: 'cat-9', name: 'Tâm Lý', slug: 'tam-ly' }
    ],
    views: 680000,
    quality: 'Full HD 1080p',
    lang: 'Nguyên Bản (Tiếng Việt)',
    content: 'Tác phẩm điện ảnh tình cảm xoay quanh cuộc đời của người phụ nữ tên Mai và mối tình nhiều sóng gió với chàng nhạc công trẻ tuổi Dương.',
    director: ['Trấn Thành'],
    actor: ['Phương Anh Đào', 'Tuấn Trần', 'Hồng Đào', 'Uyển Ân'],
    country: [{ id: 'coun-4', name: 'Việt Nam' }],
    time: '131 phút',
    episode_current: 'Full',
    episode_total: '1 Tập',
    is_copyright: true,
    sub_docquyen: true,
    chieurap: true,
    rating: 7.8,
    vote_count: 3100,
    createdAt: '2024-02-10T08:00:00Z',
    updatedAt: '2024-03-01T10:00:00Z',
    episodes: [
      {
        server_name: 'VIP Server Rạp',
        server_data: [
          { name: 'Full', slug: 'full', filename: 'mai-2024-fhd.m3u8', link_embed: '', link_m3u8: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
        ]
      }
    ]
  },
  {
    _id: 'mov-006',
    name: 'Chàng Quỷ Của Tôi',
    origin_name: 'My Demon',
    slug: 'my-demon',
    year: 2023,
    type: 'series',
    status: 'active',
    thumb_url: 'https://image.tmdb.org/t/p/w500/y9xL0tXy9Jz1aW5Y6Y1x3K7b8g.jpg',
    poster_url: 'https://image.tmdb.org/t/p/w500/y9xL0tXy9Jz1aW5Y6Y1x3K7b8g.jpg',
    category: [
      { id: 'cat-4', name: 'Tình Cảm', slug: 'tinh-cam' },
      { id: 'cat-2', name: 'Viễn Tưởng', slug: 'vien-tuong' },
      { id: 'cat-7', name: 'Hài Hước', slug: 'hai-huoc' }
    ],
    views: 410000,
    quality: 'Full HD 1080p',
    lang: 'Vietsub + Thuyết Minh',
    content: 'Một ác quỷ mất đi siêu năng lực sau khi vướng vào mối quan hệ với một nữ thừa kế tài phiệt lạnh lùng.',
    director: ['Kim Jang-han'],
    actor: ['Song Kang', 'Kim Yoo-jung', 'Lee Sang-yi'],
    country: [{ id: 'coun-2', name: 'Hàn Quốc' }],
    time: '60 phút/tập',
    episode_current: 'Tập 16 (Full)',
    episode_total: '16 Tập',
    is_copyright: true,
    sub_docquyen: false,
    chieurap: false,
    rating: 8.4,
    vote_count: 1890,
    createdAt: '2023-11-24T12:00:00Z',
    updatedAt: '2024-01-20T14:00:00Z',
    episodes: [
      {
        server_name: 'HLS Fast CDN',
        server_data: [
          { name: 'Tập 1', slug: 'tap-1', filename: 'my-demon-ep1.m3u8', link_embed: '', link_m3u8: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
        ]
      }
    ]
  },
  {
    _id: 'mov-007',
    name: 'Chú Thuật Hồi Chiến: Mùa 2',
    origin_name: 'Jujutsu Kaisen Season 2',
    slug: 'jujutsu-kaisen-season-2',
    year: 2023,
    type: 'series',
    status: 'active',
    thumb_url: 'https://image.tmdb.org/t/p/w500/hD1bS46XpQfN2Zl7V6p8v3t9.jpg',
    poster_url: 'https://image.tmdb.org/t/p/w500/hD1bS46XpQfN2Zl7V6p8v3t9.jpg',
    category: [
      { id: 'cat-6', name: 'Anime', slug: 'anime' },
      { id: 'cat-1', name: 'Hành Động', slug: 'hanh-dong' },
      { id: 'cat-3', name: 'Kinh Dị', slug: 'kinh-di' }
    ],
    views: 730000,
    quality: 'Full HD 1080p',
    lang: 'Vietsub',
    content: 'Biến cố Shibuya bùng nổ, ranh giới giữa nguyền hồn và các chú thuật sư đối mặt với sự sụp đổ lớn nhất lịch sử.',
    director: ['Shota Goshozono'],
    actor: ['Junya Enoki', 'Yuma Uchida', 'Asami Seto', 'Yuichi Nakamura'],
    country: [{ id: 'coun-3', name: 'Nhật Bản' }],
    time: '24 phút/tập',
    episode_current: 'Tập 23 (Full)',
    episode_total: '23 Tập',
    is_copyright: true,
    sub_docquyen: false,
    chieurap: false,
    rating: 9.3,
    vote_count: 6200,
    createdAt: '2023-07-06T15:00:00Z',
    updatedAt: '2023-12-28T18:00:00Z',
    episodes: [
      {
        server_name: 'Tokyo Anime CDN',
        server_data: [
          { name: 'Tập 1', slug: 'tap-1', filename: 'jjk-s2-ep1.m3u8', link_embed: '', link_m3u8: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
        ]
      }
    ]
  },
  {
    _id: 'mov-008',
    name: 'Người Nhện: Không Còn Nhà',
    origin_name: 'Spider-Man: No Way Home',
    slug: 'spider-man-no-way-home',
    year: 2021,
    type: 'single',
    status: 'active',
    thumb_url: 'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg',
    poster_url: 'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg',
    category: [
      { id: 'cat-1', name: 'Hành Động', slug: 'hanh-dong' },
      { id: 'cat-2', name: 'Viễn Tưởng', slug: 'vien-tuong' },
      { id: 'cat-8', name: 'Phiêu Lưu', slug: 'phieu-luu' }
    ],
    views: 890000,
    quality: '4K Ultra HD',
    lang: 'Vietsub + Thuyết Minh',
    content: 'Peter Parker nhờ đến Doctor Strange để giấu lại danh tính của mình, vô tình mở ra cánh cổng đa vũ trụ đưa các phản diện và Spider-Man khác trở lại.',
    director: ['Jon Watts'],
    actor: ['Tom Holland', 'Zendaya', 'Benedict Cumberbatch', 'Tobey Maguire', 'Andrew Garfield'],
    country: [{ id: 'coun-1', name: 'Mỹ' }],
    time: '148 phút',
    episode_current: 'Full',
    episode_total: '1 Tập',
    is_copyright: true,
    sub_docquyen: false,
    chieurap: true,
    rating: 8.8,
    vote_count: 8900,
    createdAt: '2021-12-17T10:00:00Z',
    updatedAt: '2022-03-01T12:00:00Z',
    episodes: [
      {
        server_name: 'Server VIP 4K',
        server_data: [
          { name: 'Full', slug: 'full', filename: 'spiderman-nwh-4k.m3u8', link_embed: '', link_m3u8: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
        ]
      }
    ]
  },
  {
    _id: 'mov-009',
    name: 'Interstellar: Hố Đen Tử Thần',
    origin_name: 'Interstellar',
    slug: 'interstellar',
    year: 2014,
    type: 'single',
    status: 'active',
    thumb_url: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    poster_url: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    category: [
      { id: 'cat-2', name: 'Viễn Tưởng', slug: 'vien-tuong' },
      { id: 'cat-9', name: 'Tâm Lý', slug: 'tam-ly' }
    ],
    views: 940000,
    quality: '4K Ultra HD',
    lang: 'Vietsub',
    content: 'Một nhóm phi hành gia vượt qua lỗ sâu không gian để tìm kiếm ngôi nhà mới cho nhân loại trước nguy cơ tuyệt chủng trên Trái Đất.',
    director: ['Christopher Nolan'],
    actor: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine'],
    country: [{ id: 'coun-1', name: 'Mỹ' }],
    time: '169 phút',
    episode_current: 'Full',
    episode_total: '1 Tập',
    is_copyright: true,
    sub_docquyen: false,
    chieurap: true,
    rating: 9.3,
    vote_count: 12500,
    createdAt: '2014-11-07T10:00:00Z',
    updatedAt: '2020-05-15T10:00:00Z',
    episodes: [
      {
        server_name: 'Main Server VIP',
        server_data: [
          { name: 'Full', slug: 'full', filename: 'interstellar-4k.m3u8', link_embed: '', link_m3u8: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
        ]
      }
    ]
  },
  {
    _id: 'mov-010',
    name: 'Avatar: Dòng Chảy Của Nước',
    origin_name: 'Avatar: The Way of Water',
    slug: 'avatar-the-way-of-water',
    year: 2022,
    type: 'single',
    status: 'inactive',
    thumb_url: 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
    poster_url: 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
    category: [
      { id: 'cat-1', name: 'Hành Động', slug: 'hanh-dong' },
      { id: 'cat-2', name: 'Viễn Tưởng', slug: 'vien-tuong' }
    ],
    views: 610000,
    quality: '4K Ultra HD',
    lang: 'Vietsub + Thuyết Minh',
    content: 'Jake Sully cùng Neytiri và các con phải rời bỏ rừng già để tìm kiếm sự chở che từ tộc người biển Metkayina khi hiểm họa cũ quay trở lại.',
    director: ['James Cameron'],
    actor: ['Sam Worthington', 'Zoe Saldana', 'Sigourney Weaver', 'Stephen Lang'],
    country: [{ id: 'coun-1', name: 'Mỹ' }],
    time: '192 phút',
    episode_current: 'Full',
    episode_total: '1 Tập',
    is_copyright: true,
    sub_docquyen: false,
    chieurap: true,
    rating: 8.6,
    vote_count: 7300,
    createdAt: '2022-12-16T10:00:00Z',
    updatedAt: '2023-04-10T11:00:00Z',
    episodes: [
      {
        server_name: 'Server 4K HLS',
        server_data: [
          { name: 'Full', slug: 'full', filename: 'avatar-2-4k.m3u8', link_embed: '', link_m3u8: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
        ]
      }
    ]
  }
];
