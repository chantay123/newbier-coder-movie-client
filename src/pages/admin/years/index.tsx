/**
 * @file years/index.tsx
 * @description Standalone Admin page for managing Movie Release Years (Năm Phát Hành).
 * Integrates dedicated Zustand admin state, Zod validation, and react-toastify notifications.
 */
'use client';

import React from 'react';
import YearManagementView from '@/features/admin/years/components/YearManagementView';

export default function AdminYearsPage() {
  return (
    <YearManagementView
      metaTitle="Quản Lý Năm Phát Hành - Movie Admin Studio"
      metaDescription="Quản lý danh sách các năm phát hành phim, thêm năm mới và phân loại kho phim hệ thống."
    />
  );
}
