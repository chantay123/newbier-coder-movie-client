/**
 * @file genres/index.tsx
 * @description Standalone Admin page for managing Movie Genres (Thể Loại).
 */
'use client';

import React from 'react';
import { FaTags } from 'react-icons/fa';
import TaxonomyTableView from '@/features/admin/components/Taxonomies/TaxonomyTableView';

export default function AdminGenresPage() {
  return (
    <TaxonomyTableView
      type="genres"
      title="Quản Lý Thể Loại"
      subtitle="Quản lý và biên tập danh mục thể loại phim hiển thị trên toàn hệ thống"
      typeNameVi="Thể Loại"
      icon={FaTags}
      metaTitle="Quản Lý Thể Loại - Movie Admin Studio"
      metaDescription="Quản lý danh mục thể loại phim: thêm mới, chỉnh sửa, ẩn/hiện và đồng bộ số lượng phim"
      showRecalculate={true}
    />
  );
}
