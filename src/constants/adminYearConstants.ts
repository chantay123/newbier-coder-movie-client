/**
 * @file adminYearConstants.ts
 * @description Centralized domain constants for Admin Year Management.
 * Follows 'as const' immutability standards to prevent magic strings and numbers.
 */

export const ADMIN_YEAR_CONSTANTS = Object.freeze({
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZE_OPTIONS: [10, 20, 50] as const,
  },
  VALIDATION: {
    MIN_YEAR: 1900,
    MAX_YEAR_OFFSET: 5, // Allows scheduling up to current year + 5
    MAX_DESCRIPTION_LENGTH: 500,
    SLUG_REGEX: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  },
  MESSAGES: {
    FETCH_ERROR: 'Không thể tải danh sách năm phát hành. Vui lòng thử lại sau.',
    CREATE_SUCCESS: (yearName: string) => `Thêm năm phát hành "${yearName}" thành công!`,
    CREATE_ERROR: 'Không thể tạo năm phát hành mới. Vui lòng kiểm tra lại.',
    UPDATE_SUCCESS: (yearName: string) => `Cập nhật năm "${yearName}" thành công!`,
    UPDATE_ERROR: 'Không thể cập nhật năm phát hành.',
    DELETE_SUCCESS: (yearName: string) => `Đã xóa năm phát hành "${yearName}".`,
    DELETE_ERROR: 'Không thể xóa năm phát hành.',
    TOGGLE_STATUS_SUCCESS: (yearName: string, isActive: boolean) =>
      `Đã ${isActive ? 'kích hoạt' : 'tạm ẩn'} năm "${yearName}".`,
    TOGGLE_STATUS_ERROR: 'Không thể thay đổi trạng thái năm phát hành.',
    VALIDATION_NAME_REQUIRED: 'Vui lòng nhập năm phát hành.',
    VALIDATION_NAME_INVALID: 'Năm phát hành phải là số 4 chữ số hợp lệ.',
    VALIDATION_SLUG_REQUIRED: 'Mã định danh (Slug) không được để trống.',
    VALIDATION_SLUG_INVALID: 'Slug chỉ được chứa chữ thường không dấu, số và dấu gạch ngang (-).',
    VALIDATION_DESC_MAX: 'Mô tả không được vượt quá 500 ký tự.',
    DUPLICATE_YEAR_ERROR: 'Năm phát hành này đã tồn tại trong hệ thống.',
    NOT_FOUND_ERROR: 'Bản ghi năm phát hành không tồn tại hoặc đã bị xóa trên máy chủ.',
    FORBIDDEN_ERROR: 'Quyền hạn đã thay đổi hoặc bạn không có quyền cập nhật bản ghi này.',
    UNAUTHORIZED_ERROR: 'Phiên làm việc đã hết hạn hoặc token đã bị thu hồi. Vui lòng đăng nhập lại.',
    NETWORK_TIMEOUT_ERROR: 'Không thể kết nối đến máy chủ hoặc phản hồi bị quá thời gian (timeout). Vui lòng thử lại hoặc kiểm tra lại trạng thái.',
    DIRTY_CONFIRM_TITLE: 'Cảnh báo: Dữ liệu chưa được lưu',
    DIRTY_CONFIRM_MESSAGE: 'Bạn đang có các thay đổi chưa được lưu. Bạn có chắc chắn muốn đóng và khôi phục về dữ liệu ban đầu?',
    RESET_SUCCESS: 'Đã khôi phục về dữ liệu ban đầu.',
  },
  STORAGE_KEYS: {
    ADMIN_TOKEN: 'auth_token',
    FALLBACK_TOKEN: 'token',
  },
} as const);

export type AdminYearConstants = typeof ADMIN_YEAR_CONSTANTS;
