/**
 * @file adminActorConstants.ts
 * @description Centralized domain constants for Admin Actor / Performer Management.
 * Follows 'as const' immutability standards to prevent magic strings and numbers.
 */

export interface CountryOption {
  code: string;
  nameVi: string;
  nameEn: string;
  flag: string;
}

export const POPULAR_COUNTRIES: readonly CountryOption[] = Object.freeze([
  { code: 'VN', nameVi: 'Việt Nam', nameEn: 'Vietnam', flag: '🇻🇳' },
  { code: 'KR', nameVi: 'Hàn Quốc', nameEn: 'South Korea', flag: '🇰🇷' },
  { code: 'US', nameVi: 'Hoa Kỳ (Mỹ)', nameEn: 'United States', flag: '🇺🇸' },
  { code: 'CN', nameVi: 'Trung Quốc', nameEn: 'China', flag: '🇨🇳' },
  { code: 'JP', nameVi: 'Nhật Bản', nameEn: 'Japan', flag: '🇯🇵' },
  { code: 'GB', nameVi: 'Vương Quốc Anh', nameEn: 'United Kingdom', flag: '🇬🇧' },
  { code: 'TH', nameVi: 'Thái Lan', nameEn: 'Thailand', flag: '🇹🇭' },
  { code: 'HK', nameVi: 'Hồng Kông', nameEn: 'Hong Kong', flag: '🇭🇰' },
  { code: 'TW', nameVi: 'Đài Loan', nameEn: 'Taiwan', flag: '🇹🇼' },
  { code: 'FR', nameVi: 'Pháp', nameEn: 'France', flag: '🇫🇷' },
  { code: 'DE', nameVi: 'Đức', nameEn: 'Germany', flag: '🇩🇪' },
  { code: 'CA', nameVi: 'Canada', nameEn: 'Canada', flag: '🇨🇦' },
  { code: 'AU', nameVi: 'Úc (Australia)', nameEn: 'Australia', flag: '🇦🇺' },
  { code: 'IN', nameVi: 'Ấn Độ', nameEn: 'India', flag: '🇮🇳' },
  { code: 'ES', nameVi: 'Tây Ban Nha', nameEn: 'Spain', flag: '🇪🇸' },
  { code: 'IT', nameVi: 'Ý (Italy)', nameEn: 'Italy', flag: '🇮🇹' },
  { code: 'SG', nameVi: 'Singapore', nameEn: 'Singapore', flag: '🇸🇬' },
  { code: 'PH', nameVi: 'Philippines', nameEn: 'Philippines', flag: '🇵🇭' },
  { code: 'ID', nameVi: 'Indonesia', nameEn: 'Indonesia', flag: '🇮🇩' },
  { code: 'MY', nameVi: 'Malaysia', nameEn: 'Malaysia', flag: '🇲🇾' },
  { code: 'RU', nameVi: 'Nga', nameEn: 'Russia', flag: '🇷🇺' },
  { code: 'MX', nameVi: 'Mexico', nameEn: 'Mexico', flag: '🇲🇽' },
  { code: 'BR', nameVi: 'Brazil', nameEn: 'Brazil', flag: '🇧🇷' },
]);

export const ACTOR_YEAR_OPTIONS: readonly number[] = Object.freeze(
  Array.from(
    { length: new Date().getFullYear() + 2 - 1920 + 1 },
    (_, i) => new Date().getFullYear() + 2 - i
  )
);

export const ADMIN_ACTOR_CONSTANTS = Object.freeze({
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 20,
    PAGE_SIZE_OPTIONS: [10, 20, 50] as const,
  },
  GENDER_OPTIONS: [
    { value: 'male', label: 'Nam (Male)' },
    { value: 'female', label: 'Nữ (Female)' },
    { value: 'other', label: 'Khác (Other)' },
  ] as const,
  VALIDATION: {
    MIN_NAME_LENGTH: 2,
    MAX_NAME_LENGTH: 100,
    MAX_BIO_LENGTH: 2000,
    MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    ALLOWED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    SLUG_REGEX: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  },
  MESSAGES: {
    FETCH_ERROR: 'Không thể tải danh sách diễn viên. Vui lòng thử lại sau.',
    CREATE_SUCCESS: (actorName: string) => `Thêm diễn viên "${actorName}" thành công!`,
    CREATE_ERROR: 'Không thể tạo diễn viên mới. Vui lòng kiểm tra lại thông tin.',
    UPDATE_SUCCESS: (actorName: string) => `Cập nhật thông tin diễn viên "${actorName}" thành công!`,
    UPDATE_ERROR: 'Không thể cập nhật diễn viên.',
    DELETE_SUCCESS: (actorName: string) => `Đã xóa diễn viên "${actorName}".`,
    DELETE_ERROR: 'Không thể xóa diễn viên.',
    VALIDATION_NAME_REQUIRED: 'Vui lòng nhập tên diễn viên (tối thiểu 2 ký tự).',
    VALIDATION_SLUG_REQUIRED: 'Mã định danh (Slug) không được để trống.',
    VALIDATION_SLUG_INVALID: 'Slug chỉ được chứa chữ thường không dấu, số và dấu gạch ngang (-).',
    VALIDATION_BIO_MAX: 'Tiểu sử diễn viên không được vượt quá 2000 ký tự.',
    VALIDATION_IMAGE_REQUIRED: 'Vui lòng cung cấp ảnh đại diện hoặc chọn sinh ảnh tự động.',
    IMAGE_FILE_TOO_LARGE: 'Kích thước ảnh đại diện vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.',
    IMAGE_FILE_INVALID_TYPE: 'Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPG, PNG, WEBP hoặc GIF.',
    IMAGE_UPLOAD_SUCCESS: 'Tải lên và xem trước ảnh đại diện thành công!',
    IMAGE_AUTO_GENERATED: (gender: string) =>
      `Đã sinh tự động ảnh đại diện theo phong cách Adventurer (${gender === 'female' ? 'Nữ' : gender === 'male' ? 'Nam' : 'Ngẫu nhiên'})!`,
    UNAUTHORIZED_ERROR: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
    FORBIDDEN_ERROR: 'Bạn không có quyền quản trị để thực hiện thao tác này.',
    NETWORK_TIMEOUT_ERROR: 'Yêu cầu tới máy chủ quá thời gian chờ (timeout). Vui lòng thử lại.',
  },
} as const);

export type AdminActorConstants = typeof ADMIN_ACTOR_CONSTANTS;
export type ActorGender = 'male' | 'female' | 'other';
