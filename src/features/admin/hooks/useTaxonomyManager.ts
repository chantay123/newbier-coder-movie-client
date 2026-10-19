/**
 * @file useTaxonomyManager.ts
 * @description Enterprise-grade custom hook managing taxonomy state, filtering,
 * pagination, and CRUD modal operations with dependency injection.
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  TaxonomyItem,
  TaxonomyType,
  TaxonomyStatusFilter
} from '@/features/admin/types/taxonomy';
import {
  ITaxonomyAdminService,
  taxonomyAdminService
} from '@/features/admin/services/taxonomyAdminService';
import { showCinemaAlert } from '@/features/shared/components/UI/CinemaAlert';

export interface UseTaxonomyManagerOptions {
  type: TaxonomyType;
  typeNameVi: string;
  service?: ITaxonomyAdminService;
  defaultPageSize?: number;
}

export function useTaxonomyManager({
  type,
  typeNameVi,
  service = taxonomyAdminService,
  defaultPageSize = 10
}: UseTaxonomyManagerOptions) {
  const [items, setItems] = useState<TaxonomyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<TaxonomyStatusFilter>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);

  // Modals State
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [formInitialData, setFormInitialData] = useState<TaxonomyItem | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<TaxonomyItem | null>(null);

  // Initial Data Fetching
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await service.getAll(type);
      setItems(data);
    } catch {
      showCinemaAlert(`Không thể tải danh sách ${typeNameVi}. Vui lòng thử lại.`, 'warning');
    } finally {
      setLoading(false);
    }
  }, [service, type, typeNameVi]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered List calculation
  const filteredList = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return items.filter((item) => {
      const matchSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.slug.toLowerCase().includes(term) ||
        (item.code && item.code.toLowerCase().includes(term));

      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? item.isActive
          : !item.isActive;

      return Boolean(matchSearch && matchStatus);
    });
  }, [items, searchTerm, statusFilter]);

  // Reset to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Pagination calculation
  const totalItems = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedList = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredList.slice(startIndex, startIndex + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // Counters
  const activeCount = useMemo(() => items.filter((i) => i.isActive).length, [items]);
  const inactiveCount = useMemo(() => items.length - activeCount, [items, activeCount]);

  // Modal Handlers
  const handleOpenCreate = useCallback(() => {
    setFormInitialData(null);
    setIsFormModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((item: TaxonomyItem) => {
    setFormInitialData(item);
    setIsFormModalOpen(true);
  }, []);

  const handleCloseFormModal = useCallback(() => {
    setIsFormModalOpen(false);
    setFormInitialData(null);
  }, []);

  const handleOpenDelete = useCallback((item: TaxonomyItem) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  }, []);

  const handleCloseDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  }, []);

  // CRUD Actions
  const handleToggleStatus = useCallback(
    async (item: TaxonomyItem) => {
      try {
        const updated = await service.toggleStatus(type, item.id);
        setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
        showCinemaAlert(
          `Đã ${updated.isActive ? 'kích hoạt' : 'tạm ẩn'} ${typeNameVi} "${updated.name}" thành công!`,
          updated.isActive ? 'cinema' : 'warning'
        );
      } catch {
        showCinemaAlert(`Không thể thay đổi trạng thái ${typeNameVi}.`, 'warning');
      }
    },
    [service, type, typeNameVi]
  );

  const handleSaveItem = useCallback(
    async (itemData: Partial<TaxonomyItem>) => {
      const isEdit = Boolean(itemData.id);
      try {
        if (isEdit && itemData.id) {
          const updated = await service.update(type, itemData.id, {
            name: itemData.name || '',
            slug: itemData.slug || '',
            description: itemData.description || '',
            code: itemData.code || '',
            flag: itemData.flag || '',
            isActive: itemData.isActive ?? true,
            order: itemData.order
          });
          setItems((prev) => prev.map((i) => (i.id === itemData.id ? updated : i)));
          showCinemaAlert(`Cập nhật ${typeNameVi} "${updated.name}" thành công!`, 'cinema');
        } else {
          const created = await service.create(type, {
            name: itemData.name || '',
            slug: itemData.slug || '',
            description: itemData.description || '',
            code: itemData.code || '',
            flag: itemData.flag || '',
            isActive: itemData.isActive ?? true,
            order: itemData.order
          });
          setItems((prev) => [created, ...prev]);
          showCinemaAlert(`Thêm mới ${typeNameVi} "${created.name}" thành công!`, 'cinema');
        }
        handleCloseFormModal();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Dữ liệu không hợp lệ';
        showCinemaAlert(`Lỗi lưu ${typeNameVi}: ${message}`, 'warning');
      }
    },
    [service, type, typeNameVi, handleCloseFormModal]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;
    const target = itemToDelete;
    try {
      await service.delete(type, target.id);
      setItems((prev) => prev.filter((i) => i.id !== target.id));
      showCinemaAlert(`Đã xóa ${typeNameVi} "${target.name}"`, 'warning');
      handleCloseDeleteModal();
    } catch {
      showCinemaAlert(`Không thể xóa ${typeNameVi}.`, 'warning');
    }
  }, [itemToDelete, service, type, typeNameVi, handleCloseDeleteModal]);

  const handleResetFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
  }, []);

  return {
    items,
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
    filteredList,
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
    handleResetFilters,
    refresh: loadData
  };
}
