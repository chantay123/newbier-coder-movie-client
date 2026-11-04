/**
 * @file taxonomyAdminConfig.ts
 * @description Central configuration of the admin taxonomy panel.
 *
 * WHY A SEPARATE CONFIG FILE
 * The admin taxonomy pages talk to the backend taxonomy endpoints. The
 * technical values (page size, fallback description, error messages) are
 * shared by the service, the hook and the pages, so they live here instead
 * of being repeated as inline strings.
 *
 * WHY THE FALLBACK DESCRIPTION EXISTS
 * The mongoose schema of the backend declares `description` as a REQUIRED
 * field, and an empty string is rejected with
 * `400 description: Path 'description' is required`.
 * Every taxonomy write therefore sends a non-empty description.
 */

/**
 * The number of rows one page of the admin taxonomy table shows.
 *
 * The table paginates on the client, because the hook already loads the
 * whole list in memory.
 */
export const ADMIN_TAXONOMY_TABLE_PAGE_SIZE = 10;

/**
 * The number of items the admin taxonomy list reads per request.
 *
 * The list endpoints of the backend are paginated and answer 20 items per
 * page by default, so the service asks for a bigger page.
 */
export const ADMIN_TAXONOMY_PAGE_SIZE = 100;

/**
 * The maximum number of pages the service walks when it reads a list.
 *
 * The guard keeps a broken `totalPages` value from looping forever.
 */
export const ADMIN_TAXONOMY_MAX_PAGES = 50;

/**
 * The description sent when the admin leaves the description field empty.
 *
 * The backend rejects an empty description, so a neutral text is sent
 * instead of an empty string. The text is in Vietnamese, because the admin
 * panel is written in Vietnamese.
 */
export const ADMIN_TAXONOMY_FALLBACK_DESCRIPTION = '(Chưa có mô tả)';

/**
 * The user-facing messages of the admin taxonomy panel.
 *
 * They are grouped here so the service and the hook never hardcode a
 * sentence in the middle of the business logic. The panel is in Vietnamese,
 * so the messages are in Vietnamese as well.
 */
export const ADMIN_TAXONOMY_MESSAGES = {
  /** Shown when the backend answers with a payload the client cannot read. */
  invalidResponse: 'Máy chủ trả về dữ liệu không hợp lệ.',

  /** Shown when the create request fails. */
  createFailed: 'Không thể tạo mới mục này.',

  /** Shown when the update request fails. */
  updateFailed: 'Không thể cập nhật mục này.',

  /** Shown when the delete request fails. */
  deleteFailed: 'Không thể xóa mục này.',

  /** Shown when the status request fails. */
  toggleStatusFailed: 'Không thể thay đổi trạng thái mục này.',

  /** Shown when the backend has no route to update this taxonomy. */
  updateNotSupported: 'Máy chủ chưa hỗ trợ cập nhật mục này.',

  /** Shown when the backend has no route to toggle this taxonomy. */
  statusNotSupported: 'Máy chủ chưa hỗ trợ bật/tắt mục này.',

  /** Shown when the list request fails. */
  loadFailed: 'Đã có lỗi xảy ra. Vui lòng thử lại.'
} as const;

/**
 * The number of rows the skeleton of the taxonomy table shows while the
 * list is loading.
 */
export const ADMIN_TAXONOMY_SKELETON_ROWS = 6;

/**
 * The page sizes the pagination control of the taxonomy tables offers.
 */
export const ADMIN_TAXONOMY_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

/**
 * The values and the labels of the status filter of the taxonomy tables.
 */
export const ADMIN_TAXONOMY_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang kích hoạt' },
  { value: 'inactive', label: 'Tạm ẩn' }
] as const;
