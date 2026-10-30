/**
 * @file YearManagementView.tsx
 * @description Enterprise-grade Year Management UI view for the Admin panel.
 * Connects to Zustand store, provides filtering, searching, pagination, WCAG-compliant table,
 * batch actions, accessible single/bulk delete confirmation modals, and react-toastify integration.
 */

import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import {
  FaCalendarAlt,
  FaPlus,
  FaSearch,
  FaTimes,
  FaFilm,
  FaTrash,
  FaSyncAlt,
  FaPen,
  FaSpinner,
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
import EditYearModal from '@/features/admin/years/components/EditYearModal';
import DeleteConfirmModal from '@/features/admin/years/components/DeleteConfirmModal';
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
    togglingId,
    deletingId,
    isBulkDeleting,
    selectedIds,
    isCreateModalOpen,
    isEditModalOpen,
    selectedYear,
    setSearchTerm,
    setStatusFilter,
    setCurrentPage,
    setPageSize,
    openCreateModal,
    closeCreateModal,
    openEditModal,
    closeEditModal,
    selectItem,
    selectAll,
    clearSelection,
    deleteYear,
    deleteMultipleYears,
    toggleStatus,
    refresh,
  } = useAdminYears();

  const [singleDeleteTarget, setSingleDeleteTarget] = useState<YearEntity | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Indeterminate checkbox state for table header
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const isAllSelected = years.length > 0 && years.every((item) => selectedIds.includes(item.id));
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  const handleToggleSelectAll = () => {
    selectAll(years.map((y) => y.id));
  };

  const handleDeleteClick = (year: YearEntity) => {
    setSingleDeleteTarget(year);
  };

  const handleConfirmSingleDelete = async () => {
    if (!singleDeleteTarget) return;
    const success = await deleteYear(singleDeleteTarget.id);
    if (success) {
      setSingleDeleteTarget(null);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    await deleteMultipleYears(selectedIds);
    setIsBulkDeleteOpen(false);
  };

  const handleToggleStatus = async (id: string, targetState: boolean) => {
    try {
      await toggleStatus(id, targetState);
    } catch {
      // Error notifications are handled centrally in the Zustand store
    }
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

          {/* Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <div className={styles.bulkActionBar} role="region" aria-label="Thao tác hàng loạt">
              <div className={styles.bulkActionLeft}>
                <span className={styles.bulkSelectedBadge}>{selectedIds.length}</span>
                <span>năm phát hành đang được chọn</span>
              </div>
              <div className={styles.bulkActionRight}>
                <button
                  type="button"
                  className={styles.bulkClearBtn}
                  onClick={clearSelection}
                  disabled={isBulkDeleting}
                  aria-label="Bỏ chọn tất cả"
                >
                  <FaTimes aria-hidden="true" />
                  <span>Bỏ chọn</span>
                </button>
                <button
                  type="button"
                  className={styles.bulkDeleteBtn}
                  onClick={() => setIsBulkDeleteOpen(true)}
                  disabled={isBulkDeleting}
                  aria-label={`Xóa ${selectedIds.length} năm phát hành đã chọn`}
                >
                  <FaTrash aria-hidden="true" />
                  <span>Xóa {selectedIds.length} năm đã chọn</span>
                </button>
              </div>
            </div>
          )}

          {/* Table Card */}
          <div className={styles.tableCard}>
            <div className={styles.tableResponsive}>
              <table className={styles.dataTable} aria-label="Bảng danh sách năm phát hành">
                <thead>
                  <tr>
                    <th style={{ width: '4%', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        ref={headerCheckboxRef}
                        className={styles.tableCheckbox}
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        disabled={years.length === 0 || isLoading}
                        aria-label="Chọn tất cả năm trên trang này"
                      />
                    </th>
                    <th style={{ width: '38%' }}>NĂM PHÁT HÀNH</th>
                    <th style={{ width: '24%' }}>MÔ TẢ NIÊN GIÁM</th>
                    <th style={{ width: '14%' }}>SỐ PHIM LIÊN KẾT</th>
                    <th style={{ width: '12%' }}>TRẠNG THÁI</th>
                    <th style={{ width: '8%', textAlign: 'right' }}>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <TaxonomyTableSkeleton type="years" rowCount={pageSize} />
                  ) : years.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
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
                    years.map((item) => {
                      const isRowDeleting = deletingId === item.id;
                      const isRowSelected = selectedIds.includes(item.id);

                      return (
                        <tr
                          key={item.id}
                          className={`${styles.tableRow} ${
                            isRowSelected ? styles.selectedRow : ''
                          }`}
                        >
                          {/* Selection Checkbox */}
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              className={styles.tableCheckbox}
                              checked={isRowSelected}
                              onChange={() => selectItem(item.id)}
                              disabled={isRowDeleting || isBulkDeleting}
                              aria-label={`Chọn năm ${item.name}`}
                            />
                          </td>

                          {/* Name & Slug Column */}
                          <td>
                            <div className={styles.primaryCell}>
                              <div className={styles.nameBlock}>
                                <span
                                  className={styles.itemName}
                                  style={{ fontSize: '1rem', fontWeight: 700 }}
                                >
                                  {item.name || item.slug || '—'}
                                </span>
                                {item.slug ? (
                                  <span className={styles.itemSlug}>/{item.slug}</span>
                                ) : null}
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
                              <FaFilm
                                style={{ fontSize: '0.7rem', color: '#e50914' }}
                                aria-hidden="true"
                              />
                              <span>{(item.movieCount ?? 0).toLocaleString()} phim</span>
                            </span>
                          </td>

                          {/* Status Toggle Switch */}
                          <td>
                            <div className={styles.statusCell}>
                              <label
                                className={`${styles.toggleSwitch} ${
                                  togglingId === item.id || isRowDeleting ? styles.toggleDisabled : ''
                                }`}
                                title={
                                  togglingId === item.id
                                    ? 'Đang cập nhật trạng thái...'
                                    : item.isActive
                                    ? `Nhấn để tạm ẩn năm ${item.name}`
                                    : `Nhấn để kích hoạt năm ${item.name}`
                                }
                              >
                                <input
                                  type="checkbox"
                                  role="switch"
                                  aria-checked={item.isActive}
                                  checked={item.isActive}
                                  disabled={togglingId === item.id || isRowDeleting}
                                  onChange={() => handleToggleStatus(item.id, !item.isActive)}
                                  aria-label={`Thay đổi trạng thái kích hoạt năm ${item.name}`}
                                />
                                <span className={styles.toggleSlider}></span>
                              </label>
                              <span
                                className={`${styles.statusText} ${
                                  item.isActive ? styles.statusActive : styles.statusInactive
                                }`}
                              >
                                {togglingId === item.id
                                  ? 'Đang lưu...'
                                  : item.isActive
                                  ? 'Kích hoạt'
                                  : 'Tạm ẩn'}
                              </span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td>
                            <div
                              className={styles.rowActions}
                              style={{ justifyContent: 'flex-end' }}
                            >
                              <button
                                type="button"
                                className={styles.editBtn}
                                title={`Chỉnh sửa năm ${item.name}`}
                                onClick={() => openEditModal(item)}
                                disabled={isRowDeleting || isBulkDeleting}
                                aria-label={`Chỉnh sửa năm ${item.name}`}
                              >
                                <FaPen aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className={styles.deleteBtn}
                                title={`Xóa năm ${item.name}`}
                                onClick={() => handleDeleteClick(item)}
                                disabled={isRowDeleting || isBulkDeleting}
                                aria-label={`Xóa năm ${item.name}`}
                              >
                                {isRowDeleting ? (
                                  <FaSpinner
                                    className={styles.spinAnimation}
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <FaTrash aria-hidden="true" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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

        {/* Edit Year Modal */}
        <EditYearModal
          isOpen={isEditModalOpen}
          year={selectedYear}
          onClose={closeEditModal}
          onSuccess={() => {
            setTimeout(() => {
              refresh();
            }, 400);
          }}
        />

        {/* Accessible Single Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={Boolean(singleDeleteTarget)}
          targetName={singleDeleteTarget?.name}
          movieCount={singleDeleteTarget?.movieCount}
          isSubmitting={deletingId === singleDeleteTarget?.id}
          onClose={() => setSingleDeleteTarget(null)}
          onConfirm={handleConfirmSingleDelete}
        />

        {/* Accessible Bulk Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={isBulkDeleteOpen}
          isBulk
          selectedCount={selectedIds.length}
          isSubmitting={isBulkDeleting}
          onClose={() => setIsBulkDeleteOpen(false)}
          onConfirm={handleConfirmBulkDelete}
        />

        <BackToTop />
      </AdminLayout>
    </AdminRoute>
  );
}
