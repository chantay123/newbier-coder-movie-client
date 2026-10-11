// src/pages/admin/taxonomies.tsx
'use client';

import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import AdminRoute from '@/components/ProtectedRoute/AdminRoute';
import AdminLayout from '@/components/Layout/AdminLayout';
import BackToTop from '@/components/UI/BackToTop';
import { showCinemaAlert } from '@/components/UI/CinemaAlert';
import {
  FaTags,
  FaGlobeAmericas,
  FaFilm,
  FaCalendarAlt,
  FaSyncAlt,
  FaPlus,
  FaSearch,
  FaTimes,
  FaPen,
  FaTrash,
  FaLayerGroup
} from 'react-icons/fa';
import styles from '@/styles/AdminTaxonomies.module.css';

import TaxonomyFormModal, { TaxonomyItem } from '@/components/Admin/Taxonomies/TaxonomyFormModal';
import TaxonomyRecalculateModal from '@/components/Admin/Taxonomies/TaxonomyRecalculateModal';
import TaxonomyDeleteModal from '@/components/Admin/Taxonomies/TaxonomyDeleteModal';
import CinemaDropdown from '@/components/Admin/Common/CinemaDropdown';
import { ADMIN_TAXONOMIES_I18N } from '@/config/i18n/admin';
import {
  INITIAL_CATEGORIES as MOCK_CATEGORIES,
  INITIAL_COUNTRIES as MOCK_COUNTRIES,
  INITIAL_FORMATS as MOCK_FORMATS,
  INITIAL_YEARS as MOCK_YEARS
} from '@/mock/admin';

type TaxonomyTab = 'categories' | 'countries' | 'formats' | 'years';

// Rich initial data sets
const INITIAL_CATEGORIES: TaxonomyItem[] = [
  { id: 'cat-1', name: 'Hành Động', slug: 'hanh-dong', description: 'Phim có nhiều cảnh hành động, võ thuật hoặc rượt đuổi mạo hiểm', movieCount: 248, isActive: true },
  { id: 'cat-2', name: 'Viễn Tưởng', slug: 'vien-tuong', description: 'Khám phá thế giới tương lai, du hành vũ trụ và khoa học viễn tưởng', movieCount: 182, isActive: true },
  { id: 'cat-3', name: 'Kinh Dị', slug: 'kinh-di', description: 'Yếu tố giật gân, siêu nhiên và huyền bí gây căng thẳng', movieCount: 135, isActive: true },
  { id: 'cat-4', name: 'Tình Cảm', slug: 'tinh-cam', description: 'Câu chuyện tình yêu, lãng mạn và cuộc sống lứa đôi', movieCount: 210, isActive: true },
  { id: 'cat-5', name: 'Hoạt Hình', slug: 'hoat-hinh', description: 'Phim hoạt họa 2D, 3D, CGI phù hợp mọi lứa tuổi', movieCount: 165, isActive: true },
  { id: 'cat-6', name: 'Anime', slug: 'anime', description: 'Phong cách hoạt hình Nhật Bản đặc sắc', movieCount: 194, isActive: true },
  { id: 'cat-7', name: 'Hài Hước', slug: 'hai-huoc', description: 'Những tình huống vui nhộn, mang lại tiếng cười sảng khoái', movieCount: 112, isActive: true },
  { id: 'cat-8', name: 'Phiêu Lưu', slug: 'phieu-luu', description: 'Hành trình khám phá vùng đất mới và truy tìm kho báu', movieCount: 140, isActive: true },
  { id: 'cat-9', name: 'Tâm Lý', slug: 'tam-ly', description: 'Phân tích chiều sâu tâm trạng và diễn biến cảm xúc con người', movieCount: 98, isActive: true },
  { id: 'cat-10', name: 'Tài Liệu', slug: 'tai-lieu', description: 'Khám phá thế giới thực, lịch sử và tự nhiên hoang dã', movieCount: 45, isActive: false },
];

const INITIAL_COUNTRIES: TaxonomyItem[] = [
  { id: 'coun-1', name: 'Mỹ', slug: 'my', code: 'US', flag: '🇺🇸', description: 'Điện ảnh Hollywood và Bắc Mỹ', movieCount: 480, isActive: true },
  { id: 'coun-2', name: 'Hàn Quốc', slug: 'han-quoc', code: 'KR', flag: '🇰🇷', description: 'Điện ảnh xứ sở Kim Chi, K-Drama', movieCount: 320, isActive: true },
  { id: 'coun-3', name: 'Nhật Bản', slug: 'nhat-ban', code: 'JP', flag: '🇯🇵', description: 'Anime, J-Drama và phim điện ảnh Nhật Bản', movieCount: 260, isActive: true },
  { id: 'coun-4', name: 'Việt Nam', slug: 'viet-nam', code: 'VN', flag: '🇻🇳', description: 'Phim chiếu rạp và truyền hình Việt Nam', movieCount: 95, isActive: true },
  { id: 'coun-5', name: 'Trung Quốc', slug: 'trung-quoc', code: 'CN', flag: '🇨🇳', description: 'Cổ trang, kiếm hiệp, huyền huyễn', movieCount: 290, isActive: true },
  { id: 'coun-6', name: 'Vương Quốc Anh', slug: 'anh', code: 'GB', flag: '🇬🇧', description: 'Điện ảnh và truyền hình Anh Quốc', movieCount: 115, isActive: true },
  { id: 'coun-7', name: 'Pháp', slug: 'phap', code: 'FR', flag: '🇫🇷', description: 'Điện ảnh nghệ thuật Châu Âu', movieCount: 42, isActive: true },
  { id: 'coun-8', name: 'Thái Lan', slug: 'thai-lan', code: 'TH', flag: '🇹🇭', description: 'Kinh dị, học đường, tình cảm hài Thái Lan', movieCount: 88, isActive: true },
];

const INITIAL_FORMATS: TaxonomyItem[] = [
  { id: 'fmt-1', name: 'Phim Lẻ', slug: 'phim-le', code: 'SINGLE', description: 'Phim thời lượng đơn lẻ (Movie/Feature)', movieCount: 780, isActive: true },
  { id: 'fmt-2', name: 'Phim Bộ', slug: 'phim-bo', code: 'SERIES', description: 'Phim nhiều tập truyền hình (TV Series)', movieCount: 520, isActive: true },
  { id: 'fmt-3', name: 'Chiếu Rạp', slug: 'chieu-rap', code: 'THEATER', description: 'Phim phát hành độc quyền ngoài rạp', movieCount: 310, isActive: true },
  { id: 'fmt-4', name: 'TV Shows', slug: 'tv-shows', code: 'TV_SHOW', description: 'Chương trình truyền hình thực tế & giải trí', movieCount: 65, isActive: true },
  { id: 'fmt-5', name: 'Hoạt Hình Chiếu Rạp', slug: 'hoat-hinh-chieu-rap', code: 'ANIMATION_THEATER', description: 'Bản chiếu rạp chất lượng cao', movieCount: 92, isActive: true },
];

const INITIAL_YEARS: TaxonomyItem[] = [
  { id: 'yr-2026', name: '2026', slug: '2026', movieCount: 34, isActive: true },
  { id: 'yr-2025', name: '2025', slug: '2025', movieCount: 215, isActive: true },
  { id: 'yr-2024', name: '2024', slug: '2024', movieCount: 310, isActive: true },
  { id: 'yr-2023', name: '2023', slug: '2023', movieCount: 280, isActive: true },
  { id: 'yr-2022', name: '2022', slug: '2022', movieCount: 195, isActive: true },
  { id: 'yr-2021', name: '2021', slug: '2021', movieCount: 160, isActive: true },
  { id: 'yr-2020', name: '2020', slug: '2020', movieCount: 145, isActive: true },
  { id: 'yr-2019', name: '2019', slug: '2019', movieCount: 120, isActive: true },
  { id: 'yr-2018', name: '2018', slug: '2018', movieCount: 98, isActive: false },
];

export default function TaxonomiesAdminPage() {
  const [activeTab, setActiveTab] = useState<TaxonomyTab>('categories');

  // State collections
  const [categories, setCategories] = useState<TaxonomyItem[]>(MOCK_CATEGORIES);
  const [countries, setCountries] = useState<TaxonomyItem[]>(MOCK_COUNTRIES);
  const [formats, setFormats] = useState<TaxonomyItem[]>(MOCK_FORMATS);
  const [years, setYears] = useState<TaxonomyItem[]>(MOCK_YEARS);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<TaxonomyItem | null>(null);

  const [isRecalculateModalOpen, setIsRecalculateModalOpen] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TaxonomyItem | null>(null);

  // Current dataset selector
  const currentList = useMemo(() => {
    switch (activeTab) {
      case 'categories': return categories;
      case 'countries': return countries;
      case 'formats': return formats;
      case 'years': return years;
      default: return [];
    }
  }, [activeTab, categories, countries, formats, years]);

  // Filtered dataset
  const filteredList = useMemo(() => {
    return currentList.filter(item => {
      const matchSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        item.slug.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase().trim()));

      const matchStatus =
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? item.isActive :
        !item.isActive;

      return matchSearch && matchStatus;
    });
  }, [currentList, searchTerm, statusFilter]);

  // Current Tab Title / Name
  const currentTabName = useMemo(() => {
    switch (activeTab) {
      case 'categories': return 'Thể Loại';
      case 'countries': return 'Quốc Gia';
      case 'formats': return 'Định Dạng';
      case 'years': return 'Năm Phát Hành';
    }
  }, [activeTab]);

  // Toggle Status
  const handleToggleStatus = (item: TaxonomyItem) => {
    const newStatus = !item.isActive;
    const updater = (list: TaxonomyItem[]) =>
      list.map(i => i.id === item.id ? { ...i, isActive: newStatus } : i);

    if (activeTab === 'categories') setCategories(updater);
    else if (activeTab === 'countries') setCountries(updater);
    else if (activeTab === 'formats') setFormats(updater);
    else if (activeTab === 'years') setYears(updater);

    showCinemaAlert(
      `Đã ${newStatus ? 'kích hoạt' : 'tạm ẩn'} "${item.name}" thành công!`,
      newStatus ? 'cinema' : 'warning'
    );
  };

  // Save (Create / Update)
  const handleSaveItem = (itemData: Partial<TaxonomyItem>) => {
    const isEdit = !!itemData.id;

    const updater = (prev: TaxonomyItem[]): TaxonomyItem[] => {
      if (isEdit) {
        return prev.map(i => i.id === itemData.id ? { ...i, ...itemData } as TaxonomyItem : i);
      } else {
        const newItem: TaxonomyItem = {
          id: `${activeTab.slice(0, 3)}-${Date.now()}`,
          name: itemData.name || '',
          slug: itemData.slug || '',
          description: itemData.description || '',
          code: itemData.code || '',
          flag: itemData.flag || '',
          movieCount: 0,
          isActive: itemData.isActive ?? true
        };
        return [newItem, ...prev];
      }
    };

    if (activeTab === 'categories') setCategories(updater);
    else if (activeTab === 'countries') setCountries(updater);
    else if (activeTab === 'formats') setFormats(updater);
    else if (activeTab === 'years') setYears(updater);

    showCinemaAlert(
      `${isEdit ? 'Cập nhật' : 'Thêm mới'} ${currentTabName.toLowerCase()} "${itemData.name}" thành công!`,
      'cinema'
    );
  };

  // Delete
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const id = itemToDelete.id;

    const remover = (prev: TaxonomyItem[]) => prev.filter(i => i.id !== id);
    if (activeTab === 'categories') setCategories(remover);
    else if (activeTab === 'countries') setCountries(remover);
    else if (activeTab === 'formats') setFormats(remover);
    else if (activeTab === 'years') setYears(remover);

    showCinemaAlert(`Đã xóa ${currentTabName.toLowerCase()} "${itemToDelete.name}"`, 'warning');
    setItemToDelete(null);
  };

  return (
    <AdminRoute>
      <AdminLayout>
        <Head>
          <title>Quản Lý Phân Loại & Metadata - Movie Admin Studio</title>
        </Head>

        <div className={styles.pageContainer}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerLeft}>
              <div className={styles.headerIconBox}>
                <FaLayerGroup />
              </div>
              <div>
                <h1 className={styles.headerTitle}>Trung Tâm Phân Loại & Thuộc Tính</h1>
                <p className={styles.headerSubtitle}>
                  Quản lý danh mục Thể loại, Quốc gia, Định dạng và Năm phát hành hiển thị toàn hệ thống
                </p>
              </div>
            </div>

            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.recalculateBtn}
                onClick={() => setIsRecalculateModalOpen(true)}
                title="Tái tính toán số lượng phim và đồng bộ toàn bộ danh mục"
              >
                <FaSyncAlt />
                <span>Tái Tính Toán Phân Loại</span>
              </button>

              <button
                type="button"
                className={styles.primaryAddBtn}
                onClick={() => {
                  setFormInitialData(null);
                  setIsFormModalOpen(true);
                }}
              >
                <FaPlus />
                <span>Thêm {currentTabName}</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className={styles.tabsContainer}>
            <button
              type="button"
              className={`${styles.tabItem} ${activeTab === 'categories' ? styles.tabItemActive : ''}`}
              onClick={() => { setActiveTab('categories'); setSearchTerm(''); }}
            >
              <FaTags />
              <span>Thể Loại</span>
              <span className={styles.tabBadge}>{categories.length}</span>
            </button>

            <button
              type="button"
              className={`${styles.tabItem} ${activeTab === 'countries' ? styles.tabItemActive : ''}`}
              onClick={() => { setActiveTab('countries'); setSearchTerm(''); }}
            >
              <FaGlobeAmericas />
              <span>Quốc Gia</span>
              <span className={styles.tabBadge}>{countries.length}</span>
            </button>

            <button
              type="button"
              className={`${styles.tabItem} ${activeTab === 'formats' ? styles.tabItemActive : ''}`}
              onClick={() => { setActiveTab('formats'); setSearchTerm(''); }}
            >
              <FaFilm />
              <span>Định Dạng Phim</span>
              <span className={styles.tabBadge}>{formats.length}</span>
            </button>

            <button
              type="button"
              className={`${styles.tabItem} ${activeTab === 'years' ? styles.tabItemActive : ''}`}
              onClick={() => { setActiveTab('years'); setSearchTerm(''); }}
            >
              <FaCalendarAlt />
              <span>Năm Phát Hành</span>
              <span className={styles.tabBadge}>{years.length}</span>
            </button>
          </div>

          {/* Filter & Search Bar */}
          <div className={styles.filterBar}>
            <div className={styles.searchBox}>
              <FaSearch className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder={`Tìm kiếm ${currentTabName.toLowerCase()} theo tên hoặc slug...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

            <div className={styles.filterControls}>
              <CinemaDropdown
                options={[
                  { value: 'all', label: ADMIN_TAXONOMIES_I18N.filters.allStatuses },
                  { value: 'active', label: ADMIN_TAXONOMIES_I18N.filters.statusActive },
                  { value: 'inactive', label: ADMIN_TAXONOMIES_I18N.filters.statusInactive }
                ]}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as any)}
                prefixIcon={<FaFilm />}
                size="filter"
                ariaLabel="Lọc theo trạng thái"
              />
            </div>
          </div>

          {/* Data Table */}
          <div className={styles.tableCard}>
            <div className={styles.tableResponsive}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>{currentTabName}</th>
                    {activeTab !== 'years' && <th style={{ width: '25%' }}>Mô Tả / Mã</th>}
                    <th style={{ width: '15%' }}>Số Phim Liên Kết</th>
                    <th style={{ width: '15%' }}>Trạng Thái</th>
                    <th style={{ width: '10%', textAlign: 'right' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className={styles.emptyState}>
                          <div className={styles.emptyIcon}>
                            <FaTags />
                          </div>
                          <p className={styles.emptyText}>
                            Không tìm thấy {currentTabName.toLowerCase()} nào phù hợp với bộ lọc
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((item) => (
                      <tr key={item.id} className={styles.tableRow}>
                        {/* Name Column */}
                        <td>
                          <div className={styles.primaryCell}>
                            {item.flag && <span className={styles.flagIcon}>{item.flag}</span>}
                            <div className={styles.nameBlock}>
                              <span className={styles.itemName}>{item.name}</span>
                              <span className={styles.itemSlug}>/{item.slug}</span>
                            </div>
                          </div>
                        </td>

                        {/* Description / Code Column */}
                        {activeTab !== 'years' && (
                          <td>
                            <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                              {item.code && (
                                <span style={{
                                  display: 'inline-block',
                                  padding: '0.1rem 0.4rem',
                                  background: 'rgba(255,255,255,0.08)',
                                  borderRadius: '4px',
                                  fontFamily: 'monospace',
                                  fontSize: '0.74rem',
                                  marginRight: '0.4rem'
                                }}>
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
                            <FaFilm style={{ fontSize: '0.7rem', color: '#e50914' }} />
                            <span>{item.movieCount.toLocaleString()} phim</span>
                          </span>
                        </td>

                        {/* Status Toggle Switch */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <label className={styles.toggleSwitch}>
                              <input
                                type="checkbox"
                                checked={item.isActive}
                                onChange={() => handleToggleStatus(item)}
                              />
                              <span className={styles.toggleSlider}></span>
                            </label>
                            <span className={`${styles.statusText} ${item.isActive ? styles.statusActive : styles.statusInactive}`}>
                              {item.isActive ? 'Kích hoạt' : 'Tạm ẩn'}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td>
                          <div className={styles.rowActions} style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className={styles.editBtn}
                              title={`Chỉnh sửa ${item.name}`}
                              onClick={() => {
                                setFormInitialData(item);
                                setIsFormModalOpen(true);
                              }}
                            >
                              <FaPen />
                            </button>
                            <button
                              type="button"
                              className={styles.deleteBtn}
                              title={`Xóa ${item.name}`}
                              onClick={() => {
                                setItemToDelete(item);
                                setIsDeleteModalOpen(true);
                              }}
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
            </div>
          </div>
        </div>

        {/* Modals */}
        <TaxonomyFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          onSave={handleSaveItem}
          initialData={formInitialData}
          type={activeTab}
        />

        <TaxonomyRecalculateModal
          isOpen={isRecalculateModalOpen}
          onClose={() => setIsRecalculateModalOpen(false)}
          onSuccess={() => {
            // Cập nhật ngẫu nhiên số đếm mô phỏng việc recalculate thành công
            setCategories(prev => prev.map(c => ({ ...c, movieCount: c.movieCount + Math.floor(Math.random() * 5) })));
          }}
          stats={{
            categoriesCount: categories.length,
            countriesCount: countries.length,
            formatsCount: formats.length,
            yearsCount: years.length
          }}
        />

        <TaxonomyDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          itemName={itemToDelete?.name || ''}
          itemType={currentTabName}
        />

        <BackToTop />
      </AdminLayout>
    </AdminRoute>
  );
}
