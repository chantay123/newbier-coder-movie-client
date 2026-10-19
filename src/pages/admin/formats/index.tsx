/**
 * @file formats/index.tsx
 * @description Standalone Admin page for managing Movie Formats (Định Dạng Phim).
 */
'use client';

import React from 'react';
import { FaLayerGroup } from 'react-icons/fa';
import TaxonomyTableView from '@/features/admin/components/Taxonomies/TaxonomyTableView';

export default function AdminFormatsPage() {
  return (
    <TaxonomyTableView
      type="formats"
      title="Quản Lý Định Dạng Phim"
      subtitle="Quản lý các định dạng phát hành như Phim Lẻ, Phim Bộ, Chiếu Rạp, TV Shows"
      typeNameVi="Định Dạng Phim"
      icon={FaLayerGroup}
      metaTitle="Quản Lý Định Dạng Phim - Movie Admin Studio"
      metaDescription="Quản lý danh sách định dạng phim: phân loại phim lẻ, phim bộ, chiếu rạp và hoạt hình"
      showRecalculate={true}
    />
  );
}
