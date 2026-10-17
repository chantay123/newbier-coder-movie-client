// src/pages/admin/countries/index.tsx
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Head from 'next/head';
import AdminRoute from '@/features/shared/components/ProtectedRoute/AdminRoute';
import AdminLayout from '@/layouts/AdminLayout';
import BackToTop from '@/features/shared/components/UI/BackToTop';
import { showCinemaAlert } from '@/features/shared/components/UI/CinemaAlert';
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
import { TaxonomyItem } from '@/components/Admin/Taxonomies/TaxonomyFormModal';
import TaxonomyDeleteModal from '@/components/Admin/Taxonomies/TaxonomyDeleteModal';
import AdminPagination from '@/features/admin/components/Common/AdminPagination';
import { INITIAL_COUNTRIES } from '@/mock/admin';


// ─── Constants ───────────────────────────────────────────────────────────────

/** Page size options available in the pagination control. */
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

/** Default number of rows per page. */
const DEFAULT_PAGE_SIZE = 10;

/** Status filter values and labels. */
const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang kích hoạt' },
  { value: 'inactive', label: 'Tạm ẩn' },
] as const;

type StatusFilter = (typeof STATUS_FILTER_OPTIONS)[number]['value'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generates a temporary client-side id for a newly created Country item.
 * Replace with server-assigned id when the API is integrated.
 */
const generateTempId = (): string => `coun-${Date.now()}`;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * AdminCountriesPage — Standalone admin page for managing Country metadata.
 *
 * Features:
 * - Full-text search across name, slug, and country code
 * - Status filter (all / active / inactive)
 * - Create / Edit via TaxonomyFormModal (type="countries")
 * - Toggle active status inline
 * - Delete with confirmation modal
 * - Client-side pagination with configurable page size
 */
export default function AdminCountriesPage() {
  // ── Data ──────────────────────────────────────────────────────────────────
  const [countries, setCountries] = useState<TaxonomyItem[]>(
    // Normalise mock data: ensure movieCount is always a number (mock type has it as optional).
    INITIAL_COUNTRIES.map((c) => ({ ...c, movieCount: c.movieCount ?? 0 })) as TaxonomyItem[]
  );

  // ── Search & Filter ───────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // ── Pagination ────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<TaxonomyItem | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TaxonomyItem | null>(null);

  // ── Derived state ──────────────────────────────────────────────────────────

  /**
   * Applies search and status filters to the full countries list.
   * Runs whenever the source data or filter values change.
   */
  const filteredList = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return countries.filter((item) => {
      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.slug.toLowerCase().includes(term) ||
        (item.code?.toLowerCase().includes(term) ?? false);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? item.isActive : !item.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [countries, searchTerm, statusFilter]);

  // Reset to page 1 whenever filters change.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const totalItems = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  const activeCount = countries.filter((c) => c.isActive).length;
  const inactiveCount = countries.length - activeCount;

  // ── Event Handlers ────────────────────────────────────────────────────────

  /** Toggles the active status of a country and shows a toast notification. */
  const handleToggleStatus = useCallback((item: TaxonomyItem) => {
    const newStatus = !item.isActive;
    setCountries((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, isActive: newStatus } : c))
    );
    showCinemaAlert(
      `Đã ${newStatus ? 'kích hoạt' : 'tạm ẩn'} quốc gia "${item.name}" thành công!`,
      newStatus ? 'cinema' : 'warning'
    );
  }, []);

  /**
   * Creates or updates a country entry.
   * When itemData.id is present it performs an update; otherwise creates a new entry.
   */
  const handleSaveItem = useCallback((itemData: Partial<TaxonomyItem>) => {
    const isEdit = Boolean(itemData.id);
    setCountries((prev) => {
      if (isEdit) {
        return prev.map((c) =>
          c.id === itemData.id ? ({ ...c, ...itemData } as TaxonomyItem) : c
        );
      }
      const newItem: TaxonomyItem = {
        id: generateTempId(),
        name: itemData.name ?? '',
        slug: itemData.slug ?? '',
        description: itemData.description ?? '',
        code: itemData.code ?? '',
        flag: itemData.flag ?? '',
        movieCount: 0,
        isActive: itemData.isActive ?? true,
      };
      return [newItem, ...prev];
    });
    showCinemaAlert(
      `${isEdit ? 'Cập nhật' : 'Thêm mới'} quốc gia "${itemData.name}" thành công!`,
      'cinema'
    );
  }, []);

  /** Permanently removes the selected country after delete-confirmation. */
  const handleConfirmDelete = useCallback(() => {
    if (!itemToDelete) return;
    const { id, name } = itemToDelete;
    setCountries((prev) => prev.filter((c) => c.id !== id));
    showCinemaAlert(`Đã xóa quốc gia "${name}"`, 'warning');
    setItemToDelete(null);
  }, [itemToDelete]);

  const handleOpenCreateModal = () => {
    setFormInitialData(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (item: TaxonomyItem) => {
    setFormInitialData(item);
    setIsFormModalOpen(true);
  };

  const handleOpenDeleteModal = (item: TaxonomyItem) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  // ── Render ────────────────────────────────────────────────────────────────
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
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
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
                onClick={handleOpenCreateModal}
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
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                aria-label="Lọc theo trạng thái"
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
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
                  {paginatedList.length === 0 ? (
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
                            <label
                              className={styles.toggleSwitch}
                              aria-label={`${item.isActive ? 'Tắt' : 'Bật'} quốc gia ${item.name}`}
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(item.isActive)}
                                onChange={() => handleToggleStatus(item)}
                              />
                              <span className={styles.toggleSlider} />
                            </label>
                            <span
                              className={`${styles.statusText} ${
                                item.isActive ? styles.statusActive : styles.statusInactive
                              }`}
                            >
                              {item.isActive ? 'Hoạt động' : 'Tạm ẩn'}
                            </span>
                          </div>
                        </td>

                        {/* Row actions */}
                        <td>
                          <div
                            className={styles.rowActions}
                            style={{ justifyContent: 'flex-end' }}
                          >
                            <button
                              id={`btn-edit-country-${item.id}`}
                              type="button"
                              className={styles.editBtn}
                              title={`Chỉnh sửa ${item.name}`}
                              aria-label={`Chỉnh sửa quốc gia ${item.name}`}
                              onClick={() => handleOpenEditModal(item)}
                            >
                              <FaPen />
                            </button>
                            <button
                              id={`btn-delete-country-${item.id}`}
                              type="button"
                              className={styles.deleteBtn}
                              title={`Xóa ${item.name}`}
                              aria-label={`Xóa quốc gia ${item.name}`}
                              onClick={() => handleOpenDeleteModal(item)}
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
              {totalItems > 0 && (
                <AdminPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
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
          onClose={() => setIsFormModalOpen(false)}
          onSave={handleSaveItem}
          initialData={formInitialData}
        />

        <TaxonomyDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          itemName={itemToDelete?.name ?? ''}
          itemType="Quốc Gia"
        />

        <BackToTop />
      </AdminLayout>
    </AdminRoute>
  );
}
