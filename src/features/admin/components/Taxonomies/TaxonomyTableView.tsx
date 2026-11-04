/**
 * @file TaxonomyTableView.tsx
 * @description Reusable UI component for the admin taxonomy pages.
 *
 * The component only renders: every request and every mutation is handled
 * by the `useTaxonomyManager` hook, so the categories, the countries, the
 * formats and the years behave the same way.
 */
import React, { useState } from 'react';
import Head from 'next/head';
import {
  FaPlus,
  FaSearch,
  FaTimes,
  FaPen,
  FaTrash,
  FaFilm,
  FaSyncAlt
} from 'react-icons/fa';
import styles from '@/styles/AdminTaxonomies.module.css';

import AdminRoute from '@/features/shared/components/ProtectedRoute/AdminRoute';
import AdminLayout from '@/layouts/AdminLayout';
import BackToTop from '@/features/shared/components/UI/BackToTop';
import AdminPagination from '@/features/admin/components/Common/AdminPagination';
import CinemaDropdown from '@/features/admin/components/Common/CinemaDropdown';
import TaxonomyFormModal from '@/components/Admin/Taxonomies/TaxonomyFormModal';
import TaxonomyDeleteModal from '@/components/Admin/Taxonomies/TaxonomyDeleteModal';
import TaxonomyRecalculateModal from '@/components/Admin/Taxonomies/TaxonomyRecalculateModal';
import CountryFlag from '@/components/Admin/Countries/CountryFlag';
import TaxonomyTableSkeleton from '@/features/admin/components/Loading/TaxonomyTableSkeleton';

import { TaxonomyType } from '@/features/admin/types/taxonomy';
import { taxonomySupportsStatus } from '@/features/admin/services/taxonomyAdminService';
import { useTaxonomyManager } from '@/features/admin/hooks/useTaxonomyManager';
import { showCinemaAlert } from '@/features/shared/components/UI/CinemaAlert';

/**
 * The props of the `TaxonomyTableView` component.
 */
export interface TaxonomyTableViewProps {
  /** The taxonomy shown by the table, such as "categories" or "countries". */
  type: TaxonomyType;
  /** The title of the page. */
  title: string;
  /** The subtitle shown under the title. */
  subtitle: string;
  /** The Vietnamese label of the taxonomy, used in the alert messages. */
  typeNameVi: string;
  /** The icon of the header. */
  icon: React.ElementType;
  /** The title of the browser tab. */
  metaTitle: string;
  /** The description of the page for the search engines. */
  metaDescription: string;
  /** Whether the button that recalculates the movie counters is shown. */
  showRecalculate?: boolean;
}

/**
 * Renders the table of an admin taxonomy.
 *
 * @param props - The props of the component.
 * @returns The admin taxonomy page.
 */
export default function TaxonomyTableView({
  type,
  title,
  subtitle,
  typeNameVi,
  icon: IconComponent,
  metaTitle,
  metaDescription,
  showRecalculate = true
}: TaxonomyTableViewProps) {
  const modalType: 'categories' | 'countries' | 'formats' | 'years' =
    type === 'genres' ? 'categories' : (type as 'countries' | 'formats' | 'years');

  /**
   * The backend has no `isActive` on a format, so the status column and
   * the status toggle are hidden for that taxonomy.
   */
  const supportsStatus = taxonomySupportsStatus(type);

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
    filteredList,
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
    refresh
  } = useTaxonomyManager({
    type,
    typeNameVi
  });

  const [isRecalculateOpen, setIsRecalculateOpen] = useState(false);

  const recalculateStats = React.useMemo(() => ({
    categoriesCount: type === 'genres' || type === 'categories' ? totalItems : 12,
    countriesCount: type === 'countries' ? totalItems : 10,
    formatsCount: type === 'formats' ? totalItems : 5,
    yearsCount: type === 'years' ? totalItems : 9
  }), [type, totalItems]);

  /**
   * Recalculates the movie counters of the taxonomy and refreshes the list.
   */
  const handleRecalculateComplete = () => {
    refresh();
    showCinemaAlert(`Đã tái tính toán & đồng bộ toàn bộ ${typeNameVi} thành công!`, 'cinema');
  };

  return (
    <AdminRoute>
      <AdminLayout>
        <Head>
          <title>{metaTitle}</title>
          <meta name="description" content={metaDescription} />
        </Head>

        <div className={styles.pageContainer}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerLeft}>
              <div className={styles.headerIconBox} aria-hidden="true">
                <IconComponent />
              </div>
              <div>
                <h1 className={styles.headerTitle}>{title}</h1>
                <p className={styles.headerSubtitle}>{subtitle}</p>
              </div>
            </div>

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
                  color: '#4ade80'
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
                  color: '#9ca3af'
                }}
              >
                {inactiveCount} tạm ẩn
              </span>

              {showRecalculate && (
                <button
                  type="button"
                  className={styles.recalculateBtn}
                  onClick={() => setIsRecalculateOpen(true)}
                  title={`Tái tính toán số lượng phim của ${typeNameVi}`}
                  aria-label="Tái tính toán phân loại"
                >
                  <FaSyncAlt aria-hidden="true" />
                  <span>Tái Tính Toán</span>
                </button>
              )}

              <button
                type="button"
                className={styles.primaryAddBtn}
                onClick={handleOpenCreate}
                aria-label={`Thêm mới ${typeNameVi}`}
              >
                <FaPlus aria-hidden="true" />
                <span>Thêm {typeNameVi}</span>
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className={styles.filterBar}>
            <div className={styles.searchBox}>
              <FaSearch className={styles.searchIcon} aria-hidden="true" />
              <input
                type="text"
                className={styles.searchInput}
                placeholder={`Tìm kiếm ${typeNameVi} theo tên, slug${type === 'countries' || type === 'formats' ? ' hoặc mã...' : '...'}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label={`Tìm kiếm ${typeNameVi}`}
              />
              {searchTerm && (
                <button
                  type="button"
                  className={styles.clearSearchBtn}
                  onClick={() => setSearchTerm('')}
                  aria-label="Xóa tìm kiếm"
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
                  { value: 'inactive', label: 'Đang tạm ẩn' }
                ]}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as any)}
                prefixIcon={<FaFilm aria-hidden="true" />}
                size="filter"
                ariaLabel="Lọc theo trạng thái"
              />
            </div>
          </div>

          {/* Data Table */}
          <div className={styles.tableCard}>
            <div className={styles.tableResponsive}>
              <table className={styles.dataTable} aria-label={`Danh sách ${typeNameVi}`}>
                <thead>
                  <tr>
                    <th style={{ width: type === 'years' ? '45%' : '32%' }}>{typeNameVi.toUpperCase()}</th>
                    {type !== 'years' && (
                      <th style={{ width: type === 'countries' ? '28%' : '30%' }}>
                        {type === 'formats' ? 'MÃ ĐỊNH DẠNG / MÔ TẢ' : type === 'countries' ? 'MÃ QUỐC GIA / MÔ TẢ' : 'MÔ TẢ'}
                      </th>
                    )}
                    <th style={{ width: '16%' }}>SỐ PHIM LIÊN KẾT</th>
                    {supportsStatus && (
                      <th style={{ width: '14%' }}>TRẠNG THÁI</th>
                    )}
                    <th style={{ width: '8%', textAlign: 'right' }}>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TaxonomyTableSkeleton type={type} rowCount={pageSize} />
                  ) : filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={(type === 'years' ? 0 : 1) + (supportsStatus ? 1 : 0) + 3}>
                        <div className={styles.emptyState}>
                          <div className={styles.emptyIcon} aria-hidden="true">
                            <IconComponent />
                          </div>
                          <p className={styles.emptyText}>
                            {searchTerm || statusFilter !== 'all'
                              ? `Không tìm thấy ${typeNameVi.toLowerCase()} nào phù hợp với bộ lọc hiện tại`
                              : `Chưa có dữ liệu ${typeNameVi.toLowerCase()} nào trong hệ thống`}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedList.map((item) => (
                      <tr key={item.id} className={styles.tableRow}>
                        {/* Name Column */}
                        <td>
                          <div className={styles.primaryCell}>
                            {type === 'countries' ? (
                              <CountryFlag name={item.name} code={item.code} flag={item.flag} />
                            ) : (
                              item.flag && <span className={styles.flagIcon}>{item.flag}</span>
                            )}
                            <div className={styles.nameBlock}>
                              <span className={styles.itemName}>{item.name}</span>
                              <span className={styles.itemSlug}>/{item.slug}</span>
                            </div>
                          </div>
                        </td>

                        {/* Description / Code Column */}
                        {type !== 'years' && (
                          <td>
                            <div style={{ fontSize: '0.82rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {item.code && (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '0.15rem 0.45rem',
                                    background: 'rgba(255,255,255,0.08)',
                                    borderRadius: '4px',
                                    fontFamily: 'monospace',
                                    fontSize: '0.74rem',
                                    color: '#e2e8f0',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                  }}
                                >
                                  {item.code}
                                </span>
                              )}
                              <span>{item.description || '—'}</span>
                            </div>
                          </td>
                        )}

                        {/* Movie Count */}
                        <td>
                          <span className={styles.badgeMovieCount}>
                            <FaFilm style={{ fontSize: '0.7rem', color: '#e50914' }} aria-hidden="true" />
                            <span>{(item.movieCount ?? 0).toLocaleString()} phim</span>
                          </span>
                        </td>

                        {/* Status Toggle */}
                        {supportsStatus && (
                          <td>
                            <div className={styles.statusCell}>
                              <label className={styles.toggleSwitch}>
                                <input
                                  type="checkbox"
                                  checked={item.isActive}
                                  onChange={() => handleToggleStatus(item)}
                                  aria-label={`Thay đổi trạng thái ${item.name}`}
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
                        )}

                        {/* Actions */}
                        <td>
                          <div className={styles.rowActions} style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className={styles.editBtn}
                              title={`Chỉnh sửa ${item.name}`}
                              onClick={() => handleOpenEdit(item)}
                              aria-label={`Chỉnh sửa ${item.name}`}
                            >
                              <FaPen aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={styles.deleteBtn}
                              title={`Xóa ${item.name}`}
                              onClick={() => handleOpenDelete(item)}
                              aria-label={`Xóa ${item.name}`}
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
                totalItems={totalItems}
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

        {/* Modals */}
        <TaxonomyFormModal
          isOpen={isFormModalOpen}
          onClose={handleCloseFormModal}
          onSave={handleSaveItem}
          initialData={formInitialData as any}
          type={modalType}
        />

        <TaxonomyDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
          itemName={itemToDelete?.name || ''}
          itemType={typeNameVi}
        />

        <TaxonomyRecalculateModal
          isOpen={isRecalculateOpen}
          onClose={() => setIsRecalculateOpen(false)}
          onSuccess={handleRecalculateComplete}
          stats={recalculateStats}
        />

        <BackToTop />
      </AdminLayout>
    </AdminRoute>
  );
}
