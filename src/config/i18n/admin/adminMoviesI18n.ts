// src/config/i18n/admin/adminMoviesI18n.ts
/**
 * Movie management module text dictionary
 */
export const ADMIN_MOVIES_I18N = {
  pageTitle: 'Quản Lý Phim',
  pageSubtitle: 'Quản lý kho phim, nguồn phát video, thông tin và trạng thái phát hành',
  addNewMovie: 'Thêm Phim Mới',
  filters: {
    allCategories: 'Tất cả thể loại',
    allStatuses: 'Tất cả trạng thái',
    allYears: 'Tất cả năm',
    allTypes: 'Tất cả định dạng',
    statusActive: 'Đang hiển thị',
    statusInactive: 'Đang ẩn',
    typeSingle: 'Phim lẻ (Movie)',
    typeSeries: 'Phim bộ (Series)',
    searchPlaceholder: 'Tìm kiếm theo tên phim, tên gốc hoặc slug...'
  },
  tableHeaders: {
    movieName: 'TÊN PHIM',
    info: 'THÔNG TIN',
    rating: 'ĐÁNH GIÁ',
    status: 'TRẠNG THÁI',
    actions: 'THAO TÁC'
  },
  emptyState: {
    title: 'Không tìm thấy phim nào',
    subtitle: 'Không có dữ liệu phù hợp với bộ lọc hiện tại hoặc từ khóa tìm kiếm.',
    resetFilter: 'Đặt lại bộ lọc'
  },
  tooltips: {
    viewDetail: 'Xem chi tiết phim',
    manageEpisodes: 'Quản lý các tập & server phát',
    editMovie: 'Chỉnh sửa thông tin phim',
    deleteMovie: 'Xóa phim khỏi hệ thống'
  }
};
