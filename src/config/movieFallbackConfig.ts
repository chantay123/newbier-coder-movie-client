/**
 * @file movieFallbackConfig.ts
 * @description Khai báo tập trung các hằng số dự phòng cho phim và media.
 * Chỉ chứa cấu hình thuần, không có logic chuyển đổi.
 * Logic chuẩn hoá được tách riêng tại '@/utils/movieNormalizer'.
 */

// Backdrop mặc định dạng cinema chất lượng cao, lưu trên CDN toàn cầu.
// Được dùng khi backend chưa có 'backdrop_url' hoặc 'poster_url' cho phim.
export const HERO_FALLBACK_BACKDROPS: readonly string[] = [
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1574267432553-4b4628081c31?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1920&auto=format&fit=crop'
];

// Backdrop dự phòng cục bộ, nằm trong thư mục public của dự án.
// Là ảnh placeholder dạng OS, tỉ lệ 16:9.
export const LOCAL_DEFAULT_BACKDROP = '/img/placeholder-backdrop.svg';

// Poster dự phòng cục bộ, nằm trong thư mục public của dự án.
// Là ảnh placeholder dạng OS, tỉ lệ 2:3.
export const LOCAL_DEFAULT_POSTER = '/img/placeholder-poster.svg';

// Giá trị mặc định khi các thuộc tính từ backend là null, undefined hoặc rỗng.
export const MOVIE_FALLBACK_DEFAULTS = {
  // Năm phát hành mặc định khi server trả về rỗng
  year: new Date().getFullYear(),

  // Nhãn độ phân giải video mặc định
  quality: 'FHD',

  // Điểm đánh giá mặc định khi tmdb.vote_average hoặc rating bằng 0 / thiếu
  rating: '8.6',

  // Mô tả mặc định khi description / content bị thiếu
  description:
    'Khám phá ngay bộ phim hấp dẫn với chất lượng hình ảnh sắc nét, âm thanh sống động và trải nghiệm điện ảnh đỉnh cao.',

  // Quy tắc dự phòng tiêu đề phụ: nếu origin_name rỗng thì dùng movie.name
  // để tránh giao diện bị co lại.
  useNameAsSubTitle: true
} as const;

// Tái xuất các hàm chuẩn hoá từ '@/utils/movieNormalizer' để giữ tương thích ngược
// với tất cả các import hiện có.
export {
  resolveMovieBackdrop,
  resolveMovieSubTitle,
  resolveMovieCategories,
  resolveMovieYear,
  resolveMovieQuality,
  normalizeHeroMovie,
  resolveMovieActors,
  resolveMovieDirectors,
  resolveImageUrl
} from '@/utils/movieNormalizer';
