/**
 * @file YearManagementView.tsx
 * @description Enterprise-grade Year Management UI view for the Admin panel.
 * Connects to Zustand store, provides filtering, searching, pagination, WCAG-compliant table,
 * and quick-add year modal with react-toastify integration.
 */

import React, { useState } from 'react';
import Head from 'next/head';
import {
  FaCalendarAlt,
  FaPlus,
  FaSearch,
  FaTimes,
  FaFilm,
  FaTrash,
  FaSyncAlt,
} from 'react-icons/fa';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import styles from '@/styles/AdminTaxonomies.module.css';
import AdminRoute from '@/features/shared/components/ProtectedRoute/AdminRoute';
import AdminLayout from '@/layouts/AdminLayout';
import BackToTop from '@/features/shared/components/UI/BackToTop';
import AdminPagination from '@/features/admin/components/Common/AdminPagination';
import CinemaDropdown from '@/features/admin/components/Common/CinemaDropdown';
import TaxonomyTableSkeleton from '@/features/admin/components/Loading/TaxonomyTableSkeleton';
import CreateYearModal from '@/features/admin/years/components/CreateYearModal';
import { useAdminYears } from '@/features/admin/years/hooks/useAdminYears';
import { YearEntity } from '@/features/admin/years/types/year.types';

export interface YearManagementViewProps {
  metaTitle?: string;
  metaDescription?: string;
}

export default function YearManagementView({
  metaTitle = 'Quản Lý Năm Phát Hành - Movie Admin Studio',
  metaDescription = 'Quản lý danh sách các năm phát hành phim, thêm năm mới và phân loại kho phim hệ thống.',
}: YearManagementViewProps) {
  const {
    years,
    total,
    activeCount,
    inactiveCount,
    searchTerm,
    statusFilter,
    currentPage,
    pageSize,
    totalPages,
    isLoading,
    isCreateModalOpen,
    setSearchTerm,
    setStatusFilter,
    setCurrentPage,
    setPageSize,
    openCreateModal,
    closeCreateModal,
    deleteYear,
    toggleStatus,
    refresh,
  } = useAdminYears();

  const [yearToDelete, setYearToDelete] = useState<YearEntity | null>(null);

  const handleDeleteClick = (year: YearEntity) => {
    setYearToDelete(year);
  };

  const handleConfirmDelete = async () => {
    if (!yearToDelete) return;
    await deleteYear(yearToDelete.id);
    setYearToDelete(null);
  };

  return (
    <AdminRoute>
      <AdminLayout>
        <Head>
          <title>{metaTitle}</title>
          <meta name="description" content={metaDescription} />
        </Head>

        {/* Global Toast Container for notifications */}
        <ToastContainer
          position="top-right"
          autoClose={3500}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />

        <div className={styles.pageContainer}>
          {/* Header */}
          <header className={styles.pageHeader}>
            <div className={styles.headerLeft}>
              <div className={styles.headerIconBox} aria-hidden="true">
                <FaCalendarAlt />
              </div>
              <div>
                <h1 className={styles.headerTitle}>Quản Lý Năm Phát Hành</h1>
                <p className={styles.headerSubtitle}>
                  Quản lý danh mục niên giám và năm phát hành của kho phim trên toàn hệ thống
                </p>
              </div>
            </div>

            {/* Header Stats & Add Action */}
            <div className={styles.headerActions}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  background: 'rgba(74, 222, 128, 0.1)',
                  border: '1px solid rgba(74, 222, 128, 0.25)',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#4ade80',
                }}
              >
                {activeCount} đang hiển thị
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#9ca3af',
                }}
              >
                {inactiveCount} tạm ẩn
              </span>

              <button
                type="button"
                className={styles.recalculateBtn}
                onClick={refresh}
                title="Làm mới danh sách năm"
                aria-label="Làm mới dữ liệu"
              >
                <FaSyncAlt aria-hidden="true" />
                <span>Làm Mới</span>
              </button>

              <button
                type="button"
                className={styles.primaryAddBtn}
                onClick={openCreateModal}
                aria-label="Thêm mới năm phát hành"
              >
                <FaPlus aria-hidden="true" />
                <span>Thêm Năm Phát Hành</span>
              </button>
            </div>
          </header>

          {/* Search & Filter Controls */}
          <section className={styles.filterBar} aria-label="Bộ lọc tìm kiếm năm phát hành">
            <div className={styles.searchBox}>
              <FaSearch className={styles.searchIcon} aria-hidden="true" />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Tìm kiếm năm theo số (VD: 2026, 2025)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Tìm kiếm năm phát hành"
              />
              {searchTerm && (
                <button
                  type="button"
                  className={styles.clearSearchBtn}
                  onClick={() => setSearchTerm('')}
                  aria-label="Xóa nội dung tìm kiếm"
                >
                  <FaTimes aria-hidden="true" />
                </button>
              )}
            </div>

            <div className={styles.filterControls}>
              <CinemaDropdown
                options={[
                  { value: 'all', label: 'Tất cả trạng thái' },
                  { value: 'active', label: 'Đang hiển thị' },
                  { value: 'inactive', label: 'Đang tạm ẩn' },
                ]}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as 'all' | 'active' | 'inactive')}
                prefixIcon={<FaFilm aria-hidden="true" />}
                size="filter"
                ariaLabel="Lọc năm theo trạng thái hoạt động"
              />
            </div>
          </section>

          {/* Table Card */}
          <div className={styles.tableCard}>
            <div className={styles.tableResponsive}>
              <table className={styles.dataTable} aria-label="Bảng danh sách năm phát hành">
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>NĂM PHÁT HÀNH</th>
                    <th style={{ width: '25%' }}>MÔ TẢ NIÊN GIÁM</th>
                    <th style={{ width: '15%' }}>SỐ PHIM LIÊN KẾT</th>
                    <th style={{ width: '12%' }}>TRẠNG THÁI</th>
                    <th style={{ width: '8%', textAlign: 'right' }}>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <TaxonomyTableSkeleton type="years" rowCount={pageSize} />
                  ) : years.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className={styles.emptyState}>
                          <div className={styles.emptyIcon} aria-hidden="true">
                            <FaCalendarAlt />
                          </div>
                          <p className={styles.emptyText}>
                            {searchTerm || statusFilter !== 'all'
                              ? 'Không tìm thấy năm phát hành nào phù hợp với bộ lọc hiện tại'
                              : 'Chưa có dữ liệu năm phát hành nào trong hệ thống'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    years.map((item) => (
                      <tr key={item.id} className={styles.tableRow}>
                        {/* Name & Slug Column */}
                        <td>
                          <div className={styles.primaryCell}>
                            <div className={styles.nameBlock}>
                              <span className={styles.itemName} style={{ fontSize: '1rem', fontWeight: 700 }}>
                                {item.name || item.slug || '—'}
                              </span>
                              {item.slug ? <span className={styles.itemSlug}>/{item.slug}</span> : null}
                            </div>
                          </div>
                        </td>

                        {/* Description Column */}
                        <td>
                          <div
                            style={{
                              fontSize: '0.82rem',
                              color: '#cbd5e1',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '280px',
                            }}
                          >
                            {item.description || '—'}
                          </div>
                        </td>

                        {/* Movie Count */}
                        <td>
                          <span className={styles.badgeMovieCount}>
                            <FaFilm style={{ fontSize: '0.7rem', color: '#e50914' }} aria-hidden="true" />
                            <span>{(item.movieCount ?? 0).toLocaleString()} phim</span>
                          </span>
                        </td>

                        {/* Status Toggle Switch */}
                        <td>
                          <div className={styles.statusCell}>
                            <label className={styles.toggleSwitch}>
                              <input
                                type="checkbox"
                                checked={item.isActive}
                                onChange={() => toggleStatus(item.id)}
                                aria-label={`Thay đổi trạng thái kích hoạt năm ${item.name}`}
                              />
                              <span className={styles.toggleSlider}></span>
                            </label>
                            <span
                              className={`${styles.statusText} ${
                                item.isActive ? styles.statusActive : styles.statusInactive
                              }`}
                            >
                              {item.isActive ? 'Kích hoạt' : 'Tạm ẩn'}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td>
                          <div className={styles.rowActions} style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className={styles.deleteBtn}
                              title={`Xóa năm ${item.name}`}
                              onClick={() => handleDeleteClick(item)}
                              aria-label={`Xóa năm ${item.name}`}
                            >
                              <FaTrash aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <AdminPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={total}
                pageSize={pageSize}
                pageSizeOptions={[10, 20, 50]}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
              />
            )}
          </div>
        </div>

        {/* Create Year Modal */}
        <CreateYearModal
          isOpen={isCreateModalOpen}
          onClose={closeCreateModal}
          onSuccess={() => {
            refresh();
          }}
        />

        {/* Delete Confirmation Modal */}
        {yearToDelete && (
          <div className={styles.modalOverlay} onClick={() => setYearToDelete(null)} role="presentation">
            <div
              className={styles.modalContent}
              style={{ maxWidth: '420px' }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Xác Nhận Xóa Năm Phát Hành</h3>
                <button
                  type="button"
                  className={styles.closeModalBtn}
                  onClick={() => setYearToDelete(null)}
                  aria-label="Đóng"
                >
                  <FaTimes />
                </button>
              </div>
              <div className={styles.modalBody}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1' }}>
                  Bạn có chắc chắn muốn xóa năm phát hành{' '}
                  <strong style={{ color: '#ffffff' }}>"{yearToDelete.name}"</strong>? Hành động này sẽ
                  loại bỏ danh mục năm phát hành này khỏi hệ thống.
                </p>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setYearToDelete(null)}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  style={{
                    background: '#e50914',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onClick={handleConfirmDelete}
                >
                  Xác Nhận Xóa
                </button>
              </div>
            </div>
          </div>
        )}

        <BackToTop />
      </AdminLayout>
    </AdminRoute>
  );
}
