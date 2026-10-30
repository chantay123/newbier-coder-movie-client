/**
 * A standalone admin page for managing the movie release years.
 */
'use client';

import React from 'react';
import { FaCalendarAlt } from 'react-icons/fa';
import TaxonomyTableView from '@/features/admin/components/Taxonomies/TaxonomyTableView';

export default function AdminYearsPage() {
  return (
    <TaxonomyTableView
      type="years"
      title="Quản Lý Năm Phát Hành"
      subtitle="Quản lý danh mục niên giám và năm phát hành của kho phim trên toàn hệ thống"
      typeNameVi="Năm Phát Hành"
      icon={FaCalendarAlt}
      metaTitle="Quản Lý Năm Phát Hành - Movie Admin Studio"
      metaDescription="Quản lý danh sách các năm phát hành phim, theo dõi số lượng phim theo từng năm"
      showRecalculate={true}
    />
  );
}
