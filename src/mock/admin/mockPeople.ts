// src/mock/admin/mockPeople.ts

export interface AwardItem {
  id: string;
  name: string;
  year: number;
  category: string;
  movieName: string;
}

export interface PersonItem {
  id: string;
  name: string;
  originalName?: string;
  slug: string;
  avatarUrl?: string;
  nationality?: string;
  birthYear?: number;
  bio?: string;
  isVerified: boolean;
  isActive: boolean;
  movieCount?: number;
  awards: AwardItem[];
  [key: string]: any;
}

export const INITIAL_ACTORS: PersonItem[] = [
  {
    id: 'act-1',
    name: 'Cillian Murphy',
    originalName: 'Cillian Murphy',
    slug: 'cillian-murphy',
    avatarUrl: 'https://image.tmdb.org/t/p/w200/iL8QvW1pL29w69C8q73f4Lz6s5.jpg',
    nationality: 'Ireland',
    birthYear: 1976,
    bio: 'Nam diễn viên nổi tiếng người Ireland, được biết đến qua các vai diễn trong Oppenheimer, Peaky Blinders, Inception.',
    isVerified: true,
    isActive: true,
    movieCount: 24,
    awards: [
      { id: 'aw-1', name: 'Oscar', year: 2024, category: 'Nam chính xuất sắc nhất', movieName: 'Oppenheimer' },
      { id: 'aw-2', name: 'Quả Cầu Vàng', year: 2024, category: 'Nam diễn viên chính xuất sắc', movieName: 'Oppenheimer' },
      { id: 'aw-3', name: 'BAFTA', year: 2024, category: 'Nam diễn viên chính xuất sắc', movieName: 'Oppenheimer' }
    ]
  },
  {
    id: 'act-2',
    name: 'Song Joong Ki',
    originalName: '송중기',
    slug: 'song-joong-ki',
    avatarUrl: 'https://image.tmdb.org/t/p/w200/98h063WzI9Xl7x6bA7hZ8zR3rP.jpg',
    nationality: 'Hàn Quốc',
    birthYear: 1985,
    bio: 'Ngôi sao hàng đầu làn sóng Hallyu, nam chính trong Vincenzo, Hậu Duệ Mặt Trời, Cậu Út Nhà Tài Phiệt.',
    isVerified: true,
    isActive: true,
    movieCount: 18,
    awards: [
      { id: 'aw-4', name: 'Baeksang Arts Awards', year: 2021, category: 'Nam diễn viên được yêu thích nhất', movieName: 'Vincenzo' },
      { id: 'aw-5', name: 'APAN Star Awards', year: 2022, category: 'Daesang Diễn xuất', movieName: 'Vincenzo' }
    ]
  },
  {
    id: 'act-3',
    name: 'Margot Robbie',
    originalName: 'Margot Robbie',
    slug: 'margot-robbie',
    avatarUrl: 'https://image.tmdb.org/t/p/w200/euDPyqLnuwaWMDoAUuq5NmNTv.jpg',
    nationality: 'Úc',
    birthYear: 1990,
    bio: 'Nữ diễn viên và nhà sản xuất tài năng, nổi tiếng với Barbie, Babylon, The Wolf of Wall Street.',
    isVerified: true,
    isActive: true,
    movieCount: 32,
    awards: [
      { id: 'aw-6', name: 'Critics Choice Awards', year: 2024, category: 'Nữ diễn viên xuất sắc', movieName: 'Barbie' },
      { id: 'aw-7', name: 'AACTA International Award', year: 2020, category: 'Nữ phụ xuất sắc', movieName: 'Bombshell' }
    ]
  },
  {
    id: 'act-4',
    name: 'Leonardo DiCaprio',
    originalName: 'Leonardo DiCaprio',
    slug: 'leonardo-dicaprio',
    avatarUrl: 'https://image.tmdb.org/t/p/w200/wo2hJpn04vbtmh0B9utCFdsQhxM.jpg',
    nationality: 'Mỹ',
    birthYear: 1974,
    bio: 'Một trong những nam tài tử vĩ đại nhất Hollywood thế hệ mới với Titanic, Inception, The Revenant.',
    isVerified: true,
    isActive: true,
    movieCount: 39,
    awards: [
      { id: 'aw-8', name: 'Oscar', year: 2016, category: 'Nam chính xuất sắc nhất', movieName: 'The Revenant' },
      { id: 'aw-9', name: 'Quả Cầu Vàng', year: 2016, category: 'Nam diễn viên phim chính kịch', movieName: 'The Revenant' }
    ]
  },
  {
    id: 'act-5',
    name: 'Ninh Dương Lan Ngọc',
    originalName: 'Ninh Dương Lan Ngọc',
    slug: 'ninh-duong-lan-ngoc',
    avatarUrl: '',
    nationality: 'Việt Nam',
    birthYear: 1990,
    bio: 'Ngọc nữ điện ảnh Việt Nam, ghi dấu ấn qua Cánh Đồng Bất Tận, Cua Lại Vợ Bầu, Gái Già Lắm Chiêu.',
    isVerified: true,
    isActive: true,
    movieCount: 16,
    awards: [
      { id: 'aw-10', name: 'Cánh Diều Vàng', year: 2011, category: 'Nữ diễn viên chính xuất sắc', movieName: 'Cánh Đồng Bất Tận' }
    ]
  },
  {
    id: 'act-6',
    name: 'Tom Holland',
    originalName: 'Tom Holland',
    slug: 'tom-holland',
    avatarUrl: 'https://image.tmdb.org/t/p/w200/bBRqqoQmgrRSLd11iavhBYWPOa.jpg',
    nationality: 'Anh Quốc',
    birthYear: 1996,
    bio: 'Nam diễn viên người Anh, nổi tiếng toàn cầu với vai Peter Parker / Spider-Man trong MCU.',
    isVerified: true,
    isActive: true,
    movieCount: 15,
    awards: [
      { id: 'aw-11', name: 'BAFTA Rising Star', year: 2017, category: 'Ngôi sao triển vọng', movieName: 'Spider-Man: Homecoming' }
    ]
  },
  {
    id: 'act-7',
    name: 'Song Kang',
    originalName: '송강',
    slug: 'song-kang',
    avatarUrl: '',
    nationality: 'Hàn Quốc',
    birthYear: 1994,
    bio: 'Nam diễn viên thế hệ mới nổi tiếng qua các tác phẩm Sweet Home, My Demon, Nevertheless.',
    isVerified: false,
    isActive: true,
    movieCount: 10,
    awards: []
  }
];

export const INITIAL_DIRECTORS: PersonItem[] = [
  {
    id: 'dir-1',
    name: 'Christopher Nolan',
    originalName: 'Christopher Nolan',
    slug: 'christopher-nolan',
    avatarUrl: 'https://image.tmdb.org/t/p/w200/xuAIuYSmsUzKlUMBFGVZaWsY342.jpg',
    nationality: 'Anh / Mỹ',
    birthYear: 1970,
    bio: 'Bậc thầy đạo diễn với phong cách kể chuyện phi tuyến tính, đạo diễn của Oppenheimer, Inception, Interstellar, The Dark Knight.',
    isVerified: true,
    isActive: true,
    movieCount: 12,
    awards: [
      { id: 'awd-1', name: 'Oscar', year: 2024, category: 'Đạo diễn xuất sắc nhất', movieName: 'Oppenheimer' },
      { id: 'awd-2', name: 'Quả Cầu Vàng', year: 2024, category: 'Đạo diễn xuất sắc nhất', movieName: 'Oppenheimer' },
      { id: 'awd-3', name: 'BAFTA', year: 2024, category: 'Đạo diễn xuất sắc nhất', movieName: 'Oppenheimer' }
    ]
  },
  {
    id: 'dir-2',
    name: 'Denis Villeneuve',
    originalName: 'Denis Villeneuve',
    slug: 'denis-villeneuve',
    avatarUrl: 'https://image.tmdb.org/t/p/w200/dvi42m3eYn6p5H2EebB6Q0v3d8j.jpg',
    nationality: 'Canada',
    birthYear: 1967,
    bio: 'Bậc thầy thẩm mỹ thị giác và âm thanh khoa học viễn tưởng đương đại: Dune 1 & 2, Blade Runner 2049, Arrival.',
    isVerified: true,
    isActive: true,
    movieCount: 11,
    awards: [
      { id: 'awd-4', name: 'Critics Choice', year: 2022, category: 'Đạo diễn xuất sắc', movieName: 'Dune: Part One' }
    ]
  },
  {
    id: 'dir-3',
    name: 'Bong Joon-ho',
    originalName: '봉준호',
    slug: 'bong-joon-ho',
    avatarUrl: '',
    nationality: 'Hàn Quốc',
    birthYear: 1969,
    bio: 'Đạo diễn làm nên lịch sử điện ảnh châu Á với kiệt tác Ký Sinh Trùng (Parasite), Memories of Murder.',
    isVerified: true,
    isActive: true,
    movieCount: 9,
    awards: [
      { id: 'awd-5', name: 'Oscar', year: 2020, category: 'Đạo diễn xuất sắc nhất', movieName: 'Parasite' },
      { id: 'awd-6', name: 'Cành Cọ Vàng (Cannes)', year: 2019, category: 'Palme d\'Or', movieName: 'Parasite' }
    ]
  },
  {
    id: 'dir-4',
    name: 'Quentin Tarantino',
    originalName: 'Quentin Tarantino',
    slug: 'quentin-tarantino',
    avatarUrl: '',
    nationality: 'Mỹ',
    birthYear: 1963,
    bio: 'Vị đạo diễn quái kiệt với lối thoại đặc sắc và bạo lực phong cách: Pulp Fiction, Django Unchained, Kill Bill.',
    isVerified: true,
    isActive: true,
    movieCount: 10,
    awards: [
      { id: 'awd-7', name: 'Oscar', year: 1995, category: 'Kịch bản gốc xuất sắc', movieName: 'Pulp Fiction' }
    ]
  },
  {
    id: 'dir-5',
    name: 'Victor Vũ',
    originalName: 'Victor Vũ',
    slug: 'victor-vu',
    avatarUrl: '',
    nationality: 'Việt Nam / Mỹ',
    birthYear: 1975,
    bio: 'Đạo diễn tiên phong đưa chất lượng điện ảnh thương mại Việt Nam vươn tầm: Mắt Biếc, Tôi Thấy Hoa Vàng Trên Cỏ Xanh.',
    isVerified: true,
    isActive: true,
    movieCount: 14,
    awards: [
      { id: 'awd-8', name: 'Bông Sen Vàng', year: 2015, category: 'Đạo diễn xuất sắc nhất', movieName: 'Tôi Thấy Hoa Vàng Trên Cỏ Xanh' }
    ]
  }
];
