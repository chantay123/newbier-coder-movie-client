// src/config/i18n/admin/adminUsersI18n.ts
/**
 * User management module text dictionary
 */
export const ADMIN_USERS_I18N = {
  pageTitle: 'Quản Lý Người Dùng',
  pageSubtitle: 'Quản lý tài khoản, phân quyền quản trị, trạng thái kích hoạt và lịch sử đăng nhập',
  addNewUser: 'Thêm Người Dùng',
  stats: {
    totalUsers: 'Tổng Người Dùng',
    admin: 'Quản Trị Viên (Admin)',
    moderator: 'Điều Hành Viên (Mod)',
    banned: 'Tài Khoản Bị Khóa'
  },
  filters: {
    allRoles: 'Tất cả vai trò',
    roleAdmin: 'Quản trị viên (Admin)',
    roleModerator: 'Điều hành viên (Moderator)',
    roleUser: 'Thành viên thường (User)',
    searchPlaceholder: 'Tìm theo họ tên hoặc email...'
  },
  tableHeaders: {
    fullName: 'HỌ TÊN',
    email: 'EMAIL',
    role: 'VAI TRÒ',
    accountType: 'GÓI TÀI KHOẢN',
    status: 'TRẠNG THÁI',
    createdAt: 'NGÀY TẠO',
    actions: 'THAO TÁC'
  },
  emptyState: {
    title: 'Không tìm thấy người dùng nào',
    subtitle: 'Không có tài khoản nào phù hợp với điều kiện tìm kiếm hoặc bộ lọc.',
    resetFilter: 'Đặt lại bộ lọc'
  },
  tooltips: {
    edit: 'Chỉnh sửa thông tin tài khoản',
    history: 'Xem lịch sử đăng nhập & IP thiết bị',
    ban: 'Khóa tài khoản này',
    unban: 'Mở khóa tài khoản này',
    delete: 'Xóa vĩnh viễn tài khoản'
  }
};
