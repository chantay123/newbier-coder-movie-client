// src/mock/admin/mockTaxonomies.ts

export interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  movieCount?: number;
  isActive?: boolean;
  code?: string;
  flag?: string;
  [key: string]: any;
}

export const INITIAL_CATEGORIES: TaxonomyItem[] = [
  { id: 'cat-1', name: 'Hành Động', slug: 'hanh-dong', description: 'Phim có nhiều cảnh hành động, võ thuật hoặc rượt đuổi mạo hiểm', movieCount: 248, isActive: true },
  { id: 'cat-2', name: 'Viễn Tưởng', slug: 'vien-tuong', description: 'Khám phá thế giới tương lai, du hành vũ trụ và khoa học viễn tưởng', movieCount: 182, isActive: true },
  { id: 'cat-3', name: 'Kinh Dị', slug: 'kinh-di', description: 'Yếu tố giật gân, siêu nhiên và huyền bí gây căng thẳng', movieCount: 135, isActive: true },
  { id: 'cat-4', name: 'Tình Cảm', slug: 'tinh-cam', description: 'Câu chuyện tình yêu, lãng mạn và cuộc sống lứa đôi', movieCount: 210, isActive: true },
  { id: 'cat-5', name: 'Hoạt Hình', slug: 'hoat-hinh', description: 'Phim hoạt họa 2D, 3D, CGI phù hợp mọi lứa tuổi', movieCount: 165, isActive: true },
  { id: 'cat-6', name: 'Anime', slug: 'anime', description: 'Phong cách hoạt hình Nhật Bản đặc sắc', movieCount: 194, isActive: true },
  { id: 'cat-7', name: 'Hài Hước', slug: 'hai-huoc', description: 'Những tình huống vui nhộn, mang lại tiếng cười sảng khoái', movieCount: 112, isActive: true },
  { id: 'cat-8', name: 'Phiêu Lưu', slug: 'phieu-luu', description: 'Hành trình khám phá vùng đất mới và truy tìm kho báu', movieCount: 140, isActive: true },
  { id: 'cat-9', name: 'Tâm Lý', slug: 'tam-ly', description: 'Phân tích chiều sâu tâm trạng và diễn biến cảm xúc con người', movieCount: 98, isActive: true },
  { id: 'cat-10', name: 'Tài Liệu', slug: 'tai-lieu', description: 'Khám phá thế giới thực, lịch sử và tự nhiên hoang dã', movieCount: 45, isActive: false },
  { id: 'cat-11', name: 'Gia Đình', slug: 'gia-dinh', description: 'Phim tình cảm gia đình, giáo dục nhân văn ấm áp', movieCount: 86, isActive: true },
  { id: 'cat-12', name: 'Võ Thuật', slug: 'vo-thuat', description: 'Tinh hoa võ thuật cổ truyền và cận chiến đặc sắc', movieCount: 128, isActive: true },
];

export const INITIAL_COUNTRIES: TaxonomyItem[] = [
  { id: 'coun-1', name: 'Mỹ', slug: 'my', code: 'US', flag: '🇺🇸', description: 'Điện ảnh Hollywood và Bắc Mỹ', movieCount: 480, isActive: true },
  { id: 'coun-2', name: 'Hàn Quốc', slug: 'han-quoc', code: 'KR', flag: '🇰🇷', description: 'Điện ảnh xứ sở Kim Chi, K-Drama', movieCount: 320, isActive: true },
  { id: 'coun-3', name: 'Nhật Bản', slug: 'nhat-ban', code: 'JP', flag: '🇯🇵', description: 'Anime, J-Drama và phim điện ảnh Nhật Bản', movieCount: 260, isActive: true },
  { id: 'coun-4', name: 'Việt Nam', slug: 'viet-nam', code: 'VN', flag: '🇻🇳', description: 'Phim chiếu rạp và truyền hình Việt Nam', movieCount: 95, isActive: true },
  { id: 'coun-5', name: 'Trung Quốc', slug: 'trung-quoc', code: 'CN', flag: '🇨🇳', description: 'Cổ trang, kiếm hiệp, huyền huyễn', movieCount: 290, isActive: true },
  { id: 'coun-6', name: 'Vương Quốc Anh', slug: 'anh', code: 'GB', flag: '🇬🇧', description: 'Điện ảnh và truyền hình Anh Quốc', movieCount: 115, isActive: true },
  { id: 'coun-7', name: 'Pháp', slug: 'phap', code: 'FR', flag: '🇫🇷', description: 'Điện ảnh nghệ thuật Châu Âu', movieCount: 42, isActive: true },
  { id: 'coun-8', name: 'Thái Lan', slug: 'thai-lan', code: 'TH', flag: '🇹🇭', description: 'Kinh dị, học đường, tình cảm hài Thái Lan', movieCount: 88, isActive: true },
  { id: 'coun-9', name: 'Đài Loan', slug: 'dai-loan', code: 'TW', flag: '🇹🇼', description: 'Thanh xuân vườn trường và phim tình cảm lãng mạn', movieCount: 54, isActive: true },
  { id: 'coun-10', name: 'Tây Ban Nha', slug: 'tay-ban-nha', code: 'ES', flag: '🇪🇸', description: 'Trinh thám, giật gân hồi hộp', movieCount: 38, isActive: true },
];

export const INITIAL_FORMATS: TaxonomyItem[] = [
  { id: 'fmt-1', name: 'Phim Lẻ', slug: 'phim-le', code: 'SINGLE', description: 'Phim thời lượng đơn lẻ (Movie/Feature)', movieCount: 780, isActive: true },
  { id: 'fmt-2', name: 'Phim Bộ', slug: 'phim-bo', code: 'SERIES', description: 'Phim nhiều tập truyền hình (TV Series)', movieCount: 520, isActive: true },
  { id: 'fmt-3', name: 'Chiếu Rạp', slug: 'chieu-rap', code: 'THEATER', description: 'Phim phát hành độc quyền ngoài rạp', movieCount: 310, isActive: true },
  { id: 'fmt-4', name: 'TV Shows', slug: 'tv-shows', code: 'TV_SHOW', description: 'Chương trình truyền hình thực tế & giải trí', movieCount: 65, isActive: true },
  { id: 'fmt-5', name: 'Hoạt Hình Chiếu Rạp', slug: 'hoat-hinh-chieu-rap', code: 'ANIMATION_THEATER', description: 'Bản chiếu rạp chất lượng cao', movieCount: 92, isActive: true },
];

export const INITIAL_YEARS: TaxonomyItem[] = [
  { id: 'yr-2026', name: '2026', slug: '2026', movieCount: 34, isActive: true },
  { id: 'yr-2025', name: '2025', slug: '2025', movieCount: 215, isActive: true },
  { id: 'yr-2024', name: '2024', slug: '2024', movieCount: 310, isActive: true },
  { id: 'yr-2023', name: '2023', slug: '2023', movieCount: 280, isActive: true },
  { id: 'yr-2022', name: '2022', slug: '2022', movieCount: 195, isActive: true },
  { id: 'yr-2021', name: '2021', slug: '2021', movieCount: 160, isActive: true },
  { id: 'yr-2020', name: '2020', slug: '2020', movieCount: 145, isActive: true },
  { id: 'yr-2019', name: '2019', slug: '2019', movieCount: 120, isActive: true },
  { id: 'yr-2018', name: '2018', slug: '2018', movieCount: 98, isActive: false },
];
