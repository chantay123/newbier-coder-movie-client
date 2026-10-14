// src/config/i18n/admin/adminPeopleI18n.ts
/**
 * People (Actors & Directors) management module text dictionary
 */
export const ADMIN_PEOPLE_I18N = {
  pageTitle: 'Diễn Viên & Đạo Diễn',
  pageSubtitle: 'Quản lý cơ sở dữ liệu nghệ sĩ, tiểu sử, hồ sơ giải thưởng và tích xanh xác thực',
  tabs: {
    actors: 'Diễn Viên',
    directors: 'Đạo Diễn'
  },
  actions: {
    addPerson: (type: string) => `Thêm ${type}`,
    openAwards: 'Hồ sơ giải thưởng',
    toggleVerified: 'Bật/Tắt tích xanh'
  },
  filters: {
    allVerified: 'Tất cả xác minh',
    verifiedOnly: 'Đã có tích xanh',
    unverifiedOnly: 'Chưa xác minh',
    allStatuses: 'Tất cả trạng thái',
    statusActive: 'Đang hoạt động',
    statusInactive: 'Tạm ẩn',
    searchPlaceholder: (type: string) => `Tìm kiếm ${type.toLowerCase()} theo tên hoặc quốc tịch...`
  },
  tableHeaders: {
    name: 'NGHỆ SĨ',
    nationalityAndAge: 'QUỐC TỊCH & TUỔI',
    worksCount: 'TÁC PHẨM',
    awardsProfile: 'HỒ SƠ GIẢI THƯỞNG',
    status: 'TRẠNG THÁI',
    actions: 'THAO TÁC'
  },
  emptyState: {
    noResults: (type: string) => `Không tìm thấy ${type.toLowerCase()} nào phù hợp với điều kiện lọc`
  }
};
