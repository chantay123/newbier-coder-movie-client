// src/components/Admin/Common/Pagination.tsx
'use client';

import React from 'react';
import AdminPagination, { AdminPaginationProps } from './AdminPagination';

export type { AdminPaginationProps };

interface LegacyPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  itemName?: string;
}

const Pagination: React.FC<LegacyPaginationProps> = (props) => {
  return (
    <AdminPagination
      currentPage={props.currentPage}
      totalPages={props.totalPages}
      totalItems={props.totalItems}
      pageSize={props.pageSize}
      onPageChange={props.onPageChange}
      onPageSizeChange={props.onPageSizeChange}
      itemName={props.itemName || 'mục'}
    />
  );
};

export default Pagination;
export { AdminPagination };