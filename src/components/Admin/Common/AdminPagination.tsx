// src/components/Admin/Common/AdminPagination.tsx
'use client';

import React, { useState } from 'react';
import {
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight
} from 'react-icons/fa';
import styles from '@/styles/AdminPagination.module.css';

export interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  itemName?: string;
  showJump?: boolean;
}

export default function AdminPagination({
  currentPage,
  totalPages,
  totalItems = 0,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  itemName = 'mục',
  showJump = true
}: AdminPaginationProps) {
  const [jumpPage, setJumpPage] = useState('');

  if (totalPages <= 0 && totalItems <= 0) return null;

  const validTotalPages = Math.max(1, totalPages || 1);
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = totalItems > 0 ? Math.min(currentPage * pageSize, totalItems) : 0;

  // Generate pagination numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 2; // how many pages to show around current

    if (validTotalPages <= 7) {
      for (let i = 1; i <= validTotalPages; i++) pages.push(i);
      return pages;
    }

    const left = currentPage - delta;
    const right = currentPage + delta;

    pages.push(1);
    if (left > 2) pages.push('ellipsis-left');

    for (let i = Math.max(2, left); i <= Math.min(validTotalPages - 1, right); i++) {
      pages.push(i);
    }

    if (right < validTotalPages - 1) pages.push('ellipsis-right');
    pages.push(validTotalPages);

    return pages;
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= validTotalPages) {
      onPageChange(pageNum);
      setJumpPage('');
    }
  };

  return (
    <div className={styles.paginationContainer}>
      {/* Left: Summary and Page Size */}
      <div className={styles.paginationLeft}>
        <div className={styles.totalInfo}>
          {totalItems > 0 ? (
            <span>
              Hiển thị <strong>{startItem} - {endItem}</strong> trên <strong>{totalItems.toLocaleString()}</strong> {itemName}
            </span>
          ) : (
            <span>
              Trang <strong>{currentPage}</strong> / <strong>{validTotalPages}</strong>
            </span>
          )}
        </div>

        {onPageSizeChange && (
          <div className={styles.pageSizeWrapper}>
            <span>Mỗi trang:</span>
            <select
              className={styles.pageSizeSelect}
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Buttons & Quick Jump */}
      <div className={styles.paginationRight}>
        {/* First Page */}
        <button
          type="button"
          className={styles.pageBtn}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          title="Trang đầu"
        >
          <FaAngleDoubleLeft />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          className={styles.pageBtn}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          title="Trang trước"
        >
          <FaChevronLeft />
        </button>

        {/* Page Numbers */}
        {getPageNumbers().map((item, idx) => {
          if (typeof item === 'string') {
            return (
              <span key={`ellipsis-${idx}`} className={styles.ellipsis}>
                …
              </span>
            );
          }

          return (
            <button
              key={`page-${item}`}
              type="button"
              className={`${styles.pageBtn} ${currentPage === item ? styles.pageBtnActive : ''}`}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          );
        })}

        {/* Next Page */}
        <button
          type="button"
          className={styles.pageBtn}
          disabled={currentPage >= validTotalPages}
          onClick={() => onPageChange(currentPage + 1)}
          title="Trang sau"
        >
          <FaChevronRight />
        </button>

        {/* Last Page */}
        <button
          type="button"
          className={styles.pageBtn}
          disabled={currentPage >= validTotalPages}
          onClick={() => onPageChange(validTotalPages)}
          title="Trang cuối"
        >
          <FaAngleDoubleRight />
        </button>

        {/* Quick Jump Input */}
        {showJump && validTotalPages > 5 && (
          <form onSubmit={handleJumpSubmit} className={styles.jumpBox}>
            <span>Đến:</span>
            <input
              type="text"
              className={styles.jumpInput}
              value={jumpPage}
              placeholder="#"
              onChange={(e) => setJumpPage(e.target.value)}
            />
          </form>
        )}
      </div>
    </div>
  );
}
