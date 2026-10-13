// src/mock/admin/mockUsers.ts

export interface MockUserItem {
  _id: string;
  fullname: string;
  email: string;
  username: string;
  role: string | { _id: string; name: string };
  accountType: string | { _id: string; name: string };
  isActive: boolean;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  loginHistory?: Array<{
    id: string;
    ipAddress: string;
    userAgent: string;
    deviceType: string;
    location: string;
    status: 'SUCCESS' | 'FAILED';
    createdAt: string;
  }>;
}

export const MOCK_ADMIN_USERS: MockUserItem[] = [
  {
    _id: 'usr-001',
    fullname: 'Nguyễn Hoài Dương',
    email: 'hoiaiW@gmail.com',
    username: 'user_hoaiduong',
    role: { _id: 'r-admin', name: 'admin' },
    accountType: { _id: 'acc-vip', name: 'VIP' },
    isActive: true,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    createdAt: '2023-01-15T08:30:00Z',
    updatedAt: '2024-03-10T14:20:00Z',
    loginHistory: [
      { id: 'log-1', ipAddress: '113.161.45.12', userAgent: 'Chrome 122 (Windows 11)', deviceType: 'Desktop', location: 'Hồ Chí Minh, VN', status: 'SUCCESS', createdAt: '2024-03-10T14:20:00Z' },
      { id: 'log-2', ipAddress: '113.161.45.12', userAgent: 'Chrome 122 (Windows 11)', deviceType: 'Desktop', location: 'Hồ Chí Minh, VN', status: 'SUCCESS', createdAt: '2024-03-09T09:15:00Z' }
    ]
  },
  {
    _id: 'usr-002',
    fullname: 'Lê Hoàng Minh',
    email: 'hoangminh.mod@cinemax.vn',
    username: 'mod_hoangminh',
    role: { _id: 'r-mod', name: 'moderator' },
    accountType: { _id: 'acc-prem', name: 'Premium' },
    isActive: true,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    createdAt: '2023-03-20T10:00:00Z',
    updatedAt: '2024-03-08T16:45:00Z',
    loginHistory: [
      { id: 'log-3', ipAddress: '42.112.23.88', userAgent: 'Safari 17 (macOS Sonoma)', deviceType: 'MacBook', location: 'Hà Nội, VN', status: 'SUCCESS', createdAt: '2024-03-08T16:45:00Z' }
    ]
  },
  {
    _id: 'usr-003',
    fullname: 'Trần Thảo My',
    email: 'thaomy.tran98@gmail.com',
    username: 'thaomy98',
    role: { _id: 'r-user', name: 'user' },
    accountType: { _id: 'acc-vip', name: 'VIP' },
    isActive: true,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    createdAt: '2023-05-12T14:15:00Z',
    updatedAt: '2024-03-01T11:20:00Z',
    loginHistory: [
      { id: 'log-4', ipAddress: '14.162.88.90', userAgent: 'Mobile Safari (iPhone 15 Pro)', deviceType: 'iPhone', location: 'Đà Nẵng, VN', status: 'SUCCESS', createdAt: '2024-03-01T11:20:00Z' }
    ]
  },
  {
    _id: 'usr-004',
    fullname: 'Phạm Đức Duy',
    email: 'ducduy.spam@badmail.com',
    username: 'ducduy_spammer',
    role: { _id: 'r-user', name: 'user' },
    accountType: { _id: 'acc-free', name: 'Free' },
    isActive: false,
    avatar: '',
    createdAt: '2024-01-05T09:00:00Z',
    updatedAt: '2024-02-18T15:30:00Z',
    loginHistory: [
      { id: 'log-5', ipAddress: '194.26.29.110', userAgent: 'Bot script / Python requests', deviceType: 'Automated Bot', location: 'Frankfurt, DE', status: 'FAILED', createdAt: '2024-02-18T15:30:00Z' },
      { id: 'log-6', ipAddress: '194.26.29.110', userAgent: 'Bot script / Python requests', deviceType: 'Automated Bot', location: 'Frankfurt, DE', status: 'FAILED', createdAt: '2024-02-18T15:28:00Z' }
    ]
  },
  {
    _id: 'usr-005',
    fullname: 'Đặng Bảo Ngọc',
    email: 'baongoc.dang@outlook.com',
    username: 'baongoc_movie',
    role: { _id: 'r-user', name: 'user' },
    accountType: { _id: 'acc-prem', name: 'Premium' },
    isActive: true,
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    createdAt: '2023-08-22T18:00:00Z',
    updatedAt: '2024-03-06T20:10:00Z',
    loginHistory: [
      { id: 'log-7', ipAddress: '113.185.12.9', userAgent: 'Chrome Mobile (Galaxy S24)', deviceType: 'Android Mobile', location: 'Cần Thơ, VN', status: 'SUCCESS', createdAt: '2024-03-06T20:10:00Z' }
    ]
  },
  {
    _id: 'usr-006',
    fullname: 'Vũ Hải Đăng',
    email: 'haidang.mod@cinemax.vn',
    username: 'mod_haidang',
    role: { _id: 'r-mod', name: 'moderator' },
    accountType: { _id: 'acc-vip', name: 'VIP' },
    isActive: true,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    createdAt: '2023-04-10T11:30:00Z',
    updatedAt: '2024-03-09T18:00:00Z',
    loginHistory: [
      { id: 'log-8', ipAddress: '171.244.33.15', userAgent: 'Firefox 123 (Windows 11)', deviceType: 'Desktop', location: 'Hải Phòng, VN', status: 'SUCCESS', createdAt: '2024-03-09T18:00:00Z' }
    ]
  },
  {
    _id: 'usr-007',
    fullname: 'Hồ Phương Linh',
    email: 'phuonglinh.ho@gmail.com',
    username: 'linh_cinema',
    role: { _id: 'r-user', name: 'user' },
    accountType: { _id: 'acc-vip', name: 'VIP' },
    isActive: true,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    createdAt: '2023-09-14T07:45:00Z',
    updatedAt: '2024-03-07T12:00:00Z',
    loginHistory: [
      { id: 'log-9', ipAddress: '115.79.14.22', userAgent: 'Edge 122 (Windows 11)', deviceType: 'Desktop', location: 'Huế, VN', status: 'SUCCESS', createdAt: '2024-03-07T12:00:00Z' }
    ]
  },
  {
    _id: 'usr-008',
    fullname: 'Bùi Tuấn Kiệt',
    email: 'tuankiet.bui@viettel.vn',
    username: 'tuankiet_tk',
    role: { _id: 'r-user', name: 'user' },
    accountType: { _id: 'acc-free', name: 'Free' },
    isActive: true,
    avatar: '',
    createdAt: '2023-10-30T16:20:00Z',
    updatedAt: '2024-02-28T09:30:00Z',
    loginHistory: [
      { id: 'log-10', ipAddress: '118.69.182.10', userAgent: 'Chrome 122 (Ubuntu Linux)', deviceType: 'Desktop', location: 'Hồ Chí Minh, VN', status: 'SUCCESS', createdAt: '2024-02-28T09:30:00Z' }
    ]
  }
];

export const MOCK_USER_STATS = {
  totalUsers: 8,
  adminCount: 1,
  moderatorCount: 2,
  userCount: 5,
  bannedCount: 1
};
