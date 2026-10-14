// src/config/i18n/admin/adminTaxonomiesI18n.ts
/**
 * Taxonomies & Metadata module text dictionary
 */
export const ADMIN_TAXONOMIES_I18N = {
  pageTitle: 'Phân Loại & Thuộc Tính',
  pageSubtitle: 'Quản trị danh mục phân loại phim, quốc gia, định dạng phát sóng và năm phát hành',
  recalculate: 'Tái Tính Toán Phân Loại',
  tabs: {
    categories: 'Thể Loại',
    countries: 'Quốc Gia',
    formats: 'Định Dạng Phim',
    years: 'Năm Phát Hành'
  },
  actions: {
    add: (tabName: string) => `Thêm ${tabName}`,
    edit: (tabName: string) => `Sửa ${tabName}`,
    delete: (tabName: string) => `Xóa ${tabName}`
  },
  filters: {
    allStatuses: 'Tất cả trạng thái',
    statusActive: 'Đang hiển thị',
    statusInactive: 'Đang tạm ẩn',
    searchPlaceholder: (tabName: string) => `Tìm kiếm ${tabName.toLowerCase()} theo tên hoặc slug...`
  },
  tableHeaders: {
    name: 'TÊN GỌI',
    slug: 'ĐƯỜNG DẪN (SLUG)',
    movieCount: 'SỐ PHIM',
    status: 'TRẠNG THÁI',
    actions: 'THAO TÁC'
  },
  emptyState: {
    noResults: (tabName: string) => `Không tìm thấy ${tabName.toLowerCase()} nào phù hợp với từ khóa`
  }
};
