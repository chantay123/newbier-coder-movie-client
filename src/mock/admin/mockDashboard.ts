// src/mock/admin/mockDashboard.ts - Realistic Mock Dataset for Admin Dashboard

export const MOCK_DASHBOARD_STATS = {
  totalMovies: 124,
  engagementRate: '78.4%',
  newUsers: 1420,
  reports: 3,
  feedback: {
    total: 28,
    unread: 4
  }
};

export const MOCK_ANALYTICS_DATA = {
  viewsByDay: {
    labels: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'],
    data: [12400, 15800, 14200, 19500, 26800, 34200, 29800]
  },
  genreDistribution: {
    labels: ['Hành Động', 'Viễn Tưởng', 'Kinh Dị', 'Tình Cảm', 'Hoạt Hình', 'Khác'],
    data: [35, 22, 16, 14, 10, 3]
  },
  recentMovies: [
    {
      _id: 'mov-001',
      title: 'Dune: Hành Tinh Cát - Phần Hai',
      poster: 'https://image.tmdb.org/t/p/w300/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
      createdAt: '2024-03-01T10:00:00Z',
      views: 245800
    },
    {
      _id: 'mov-002',
      title: 'Oppenheimer',
      poster: 'https://image.tmdb.org/t/p/w300/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
      createdAt: '2024-02-15T14:30:00Z',
      views: 198400
    },
    {
      _id: 'mov-003',
      title: 'Arcane: Liên Minh Huyền Thoại (Mùa 2)',
      poster: 'https://image.tmdb.org/t/p/w300/fqldf2t8ztc9aiwn396mLQiixPI.jpg',
      createdAt: '2024-03-10T08:00:00Z',
      views: 312500
    },
    {
      _id: 'mov-004',
      title: 'Interstellar: Hố Đen Tử Thần',
      poster: 'https://image.tmdb.org/t/p/w300/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      createdAt: '2024-01-20T16:00:00Z',
      views: 184200
    }
  ]
};

export const MOCK_FEEDBACK_DATA = {
  recent: [
    {
      _id: 'fb-001',
      subject: 'Lỗi phát tập 4 phim Arcane server VIP',
      name: 'Nguyễn Hoài Dương',
      type: 'Lỗi kỹ thuật',
      isRead: false,
      status: 'pending',
      createdAt: '2024-03-14T08:30:00Z'
    },
    {
      _id: 'fb-002',
      subject: 'Yêu cầu bổ sung phụ đề tiếng Hàn phim Parasite',
      name: 'Trần Thảo My',
      type: 'Góp ý nội dung',
      isRead: false,
      status: 'pending',
      createdAt: '2024-03-13T16:45:00Z'
    },
    {
      _id: 'fb-003',
      subject: 'Đã thanh toán gói VIP nhưng chưa kích hoạt',
      name: 'Phạm Đức Duy',
      type: 'Tài khoản & Thanh toán',
      isRead: true,
      status: 'resolved',
      createdAt: '2024-03-12T11:20:00Z'
    }
  ],
  byType: [
    { _id: 'Lỗi kỹ thuật', count: 12 },
    { _id: 'Góp ý nội dung', count: 8 },
    { _id: 'Tài khoản & Thanh toán', count: 6 },
    { _id: 'Khác', count: 2 }
  ],
  byStatus: [
    { _id: 'pending', count: 4 },
    { _id: 'resolved', count: 24 }
  ],
  byDay: {
    labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
    data: [3, 5, 2, 6, 4, 7, 1]
  }
};

export const MOCK_REPORT_DATA = {
  total: 8,
  new: 3,
  byStatus: {
    pending: 3,
    'in-progress': 1,
    resolved: 4,
    rejected: 0
  },
  byType: {
    'Link hỏng': 4,
    'Lỗi âm thanh': 2,
    'Phụ đề lệch': 2
  }
};
