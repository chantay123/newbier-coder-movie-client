/**
 * @file pages/admin/countries/index.tsx
 * @description The admin page that manages the countries of the website.
 *
 * THE DATA FLOW
 * Page → `useTaxonomyManager` hook → `taxonomyAdminService` → backend.
 *
 * The backend endpoints used by this page:
 *   GET    /countries                   → the list
 *   POST   /admin/countries             → create
 *   PUT    /admin/countries/:id         → update
 *   PATCH  /admin/countries/:id/status  → toggle the active status
 *   DELETE /admin/countries/:id         → delete
 */
'use client';

import React from 'react';
import Head from 'next/head';
import AdminRoute from '@/features/shared/components/ProtectedRoute/AdminRoute';
import AdminLayout from '@/layouts/AdminLayout';
import BackToTop from '@/features/shared/components/UI/BackToTop';
import {
  FaGlobeAmericas,
  FaPlus,
  FaSearch,
  FaTimes,
  FaPen,
  FaTrash,
  FaFilm,
  FaSyncAlt,
  FaFilter
} from 'react-icons/fa';
import styles from '@/styles/AdminTaxonomies.module.css';

import CountryFormModal from '@/components/Admin/Countries/CountryFormModal';
import CountryFlag from '@/components/Admin/Countries/CountryFlag';
import TaxonomyDeleteModal from '@/components/Admin/Taxonomies/TaxonomyDeleteModal';
import AdminPagination from '@/features/admin/components/Common/AdminPagination';
import { useTaxonomyManager } from '@/features/admin/hooks/useTaxonomyManager';
import {
  ADMIN_TAXONOMY_PAGE_SIZE_OPTIONS,
  ADMIN_TAXONOMY_STATUS_FILTER_OPTIONS
} from '@/config/taxonomyAdminConfig';

/**
 * Renders the admin page of the countries.
 *
 * The page only renders the table, the filters and the modals. Every
 * request and every mutation is handled by the `useTaxonomyManager` hook.
 *
 * @returns The admin page of the countries.
 */
export default function AdminCountriesPage() {
  const {
    loading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    activeCount,
    inactiveCount,
    paginatedList,
    isFormModalOpen,
    formInitialData,
    isDeleteModalOpen,
    itemToDelete,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseFormModal,
    handleOpenDelete,
    handleCloseDeleteModal,
    handleToggleStatus,
    handleSaveItem,
    handleConfirmDelete,
    handleResetFilters
  } = useTaxonomyManager({
    type: 'countries',
    typeNameVi: 'quốc gia'
  });

  return (
    <AdminRoute>
      <AdminLayout>
        <Head>
          <title>Quản Lý Quốc Gia - Movie Admin Studio</title>
          <meta
            name="description"
            content="Quản lý danh sách quốc gia: thêm, sửa, xóa và phân loại metadata quốc gia cho hệ thống phim."
          />
        </Head>

        <div className={styles.pageContainer}>

          {/* ── Page Header ────────────────────────────────────────────── */}
          <div className={styles.pageHeader}>
            <div className={styles.headerLeft}>
              <div className={styles.headerIconBox}>
                <FaGlobeAmericas />
              </div>
              <div>
                <h1 className={styles.headerTitle}>Quản Lý Quốc Gia</h1>
                <p className={styles.headerSubtitle}>
                  Thêm, chỉnh sửa và quản lý danh sách quốc gia sản xuất phim trên toàn hệ thống
                </p>
              </div>
            </div>
            <div className={styles.headerActions}>
              {/* Summary badges */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.75rem',
                  background: 'rgba(74, 222, 128, 0.1)',
                  border: '1px solid rgba(74, 222, 128, 0.25)',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#4ade80',
                }}
              >
                {activeCount} đang hoạt động
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.75rem',
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
                id="btn-add-country"
                type="button"
                className={styles.primaryAddBtn}
                onClick={handleOpenCreate}
                aria-label="Thêm quốc gia mới"
              >
                <FaPlus />
                <span>Thêm Quốc Gia</span>
              </button>
            </div>
          </div>

          {/* ── Filter & Search Bar ─────────────────────────────────────── */}
          <div className={styles.filterBar}>
            {/* Search input */}
            <div className={styles.searchBox}>
              <FaSearch className={styles.searchIcon} aria-hidden="true" />
              <input
                id="input-search-country"
                type="text"
                className={styles.searchInput}
                placeholder="Tìm theo tên, slug hoặc mã code (VD: US, KR, VN)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Tìm kiếm quốc gia"
              />
              {searchTerm && (
                <button
                  type="button"
                  className={styles.clearSearchBtn}
                  onClick={() => setSearchTerm('')}
                  aria-label="Xóa tìm kiếm"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            {/* Status filter */}
            <div className={styles.filterControls}>
              <FaFilter style={{ color: '#6b7280', fontSize: '0.78rem' }} aria-hidden="true" />
              <select
                id="select-status-filter"
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                aria-label="Lọc theo trạng thái"
              >
                {ADMIN_TAXONOMY_STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Data Table ──────────────────────────────────────────────── */}
          <div className={styles.tableCard}>
            <div className={styles.tableResponsive}>
              <table className={styles.dataTable} aria-label="Danh sách quốc gia">
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Quốc Gia</th>
                    <th style={{ width: '9%' }}>Mã</th>
                    <th style={{ width: '28%' }}>Mô Tả</th>
                    <th style={{ width: '14%' }}>Số Phim</th>
                    <th style={{ width: '12%' }}>Trạng Thái</th>
                    <th style={{ width: '7%', textAlign: 'right' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    /* ── Loading ──────────────────────────────────────── */
                    <tr>
                      <td colSpan={6}>
                        <div className={styles.emptyState}>
                          <p className={styles.emptyText}>Đang tải danh sách quốc gia...</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedList.length === 0 ? (
                    /* ── Empty State ──────────────────────────────────── */
                    <tr>
                      <td colSpan={6}>
                        <div className={styles.emptyState}>
                          <div className={styles.emptyIcon}>
                            <FaGlobeAmericas />
                          </div>
                          <p className={styles.emptyText}>
                            {searchTerm || statusFilter !== 'all'
                              ? 'Không tìm thấy quốc gia nào phù hợp với bộ lọc hiện tại'
                              : 'Chưa có quốc gia nào. Nhấn "Thêm Quốc Gia" để bắt đầu.'}
                          </p>
                          {(searchTerm || statusFilter !== 'all') && (
                            <button
                              type="button"
                              className={styles.recalculateBtn}
                              style={{ marginTop: '0.75rem' }}
                              onClick={handleResetFilters}
                            >
                              <FaSyncAlt />
                              <span>Xóa bộ lọc</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedList.map((item) => (
                      <tr key={item.id} className={styles.tableRow}>

                        {/* Flag + Name + Slug */}
                        <td>
                          <div className={styles.primaryCell}>
                            <CountryFlag name={item.name} code={item.code} flag={item.flag} />
                            <div className={styles.nameBlock}>
                              <span className={styles.itemName}>{item.name}</span>
                              <span className={styles.itemSlug}>/{item.slug}</span>
                            </div>
                          </div>
                        </td>

                        {/* Alpha-2 Code */}
                        <td>
                          {item.code ? (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.15rem 0.5rem',
                                background: 'rgba(255,255,255,0.07)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: '5px',
                                fontFamily: 'monospace',
                                fontSize: '0.78rem',
                                color: '#cbd5e1',
                                letterSpacing: '0.05em',
                                fontWeight: 700,
                              }}
                            >
                              {item.code}
                            </span>
                          ) : (
                            <span style={{ color: '#4b5563', fontSize: '0.78rem' }}>—</span>
                          )}
                        </td>

                        {/* Description */}
                        <td>
                          <span
                            style={{
                              fontSize: '0.8rem',
                              color: '#9ca3af',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {item.description || '—'}
                          </span>
                        </td>

                        {/* Movie count */}
                        <td>
                          <span className={styles.badgeMovieCount}>
                            <FaFilm style={{ fontSize: '0.7rem', color: '#e50914' }} />
                            <span>{(item.movieCount ?? 0).toLocaleString()} phim</span>
                          </span>
                        </td>

                        {/* Status toggle */}
                        <td>
                          <div className={styles.statusCell}>
                            <label className={styles.toggleSwitch} aria-label={`${item.isActive ? 'Tắt' : 'Bật'} quốc gia ${item.name}`}>
                              <input
                                type="checkbox"
                                checked={Boolean(item.isActive)}
                                onChange={() => handleToggleStatus(item)}
                              />
                              <span className={styles.toggleSlider}></span>
                            </label>
                            <span
                              className={`${styles.statusText} ${item.isActive ? styles.statusActive : styles.statusInactive}`}
                            >
                              {item.isActive ? 'Hoạt động' : 'Tạm ẩn'}
                            </span>
                          </div>
                        </td>

                        {/* Row actions */}
                        <td>
                          <div className={styles.rowActions} style={{ justifyContent: 'flex-end' }}>
                            <button
                              id={`btn-edit-country-${item.id}`}
                              type="button"
                              className={styles.editBtn}
                              title={`Chỉnh sửa ${item.name}`}
                              aria-label={`Chỉnh sửa quốc gia ${item.name}`}
                              onClick={() => handleOpenEdit(item)}
                            >
                              <FaPen />
                            </button>
                            <button
                              id={`btn-delete-country-${item.id}`}
                              type="button"
                              className={styles.deleteBtn}
                              title={`Xóa ${item.name}`}
                              aria-label={`Xóa quốc gia ${item.name}`}
                              onClick={() => handleOpenDelete(item)}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* ── Pagination ─────────────────────────────────────────── */}
              {totalItems > 0 && !loading && (
                <AdminPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  pageSizeOptions={[...ADMIN_TAXONOMY_PAGE_SIZE_OPTIONS]}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  itemName="quốc gia"
                />
              )}
            </div>
          </div>
        </div>

        {/* ── Modals ─────────────────────────────────────────────────────── */}

        <CountryFormModal
          isOpen={isFormModalOpen}
          onClose={handleCloseFormModal}
          onSave={handleSaveItem}
          initialData={formInitialData}
        />

        <TaxonomyDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
          itemName={itemToDelete?.name ?? ''}
          itemType="Quốc Gia"
        />

        <BackToTop />
      </AdminLayout>
    </AdminRoute>
  );
}
