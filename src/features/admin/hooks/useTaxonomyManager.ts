/**
 * @file useTaxonomyManager.ts
 * @description Custom hook that owns the state of an admin taxonomy panel.
 *
 * THE DATA FLOW
 * Page → this hook → `taxonomyAdminService` → backend → the `TaxonomyItem`
 * list the page renders.
 *
 * The hook is the only place that knows how to load, filter, paginate and
 * mutate a taxonomy, so every admin page behaves the same way.
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
import {
  ADMIN_TAXONOMY_MESSAGES,
  ADMIN_TAXONOMY_TABLE_PAGE_SIZE
} from '@/config/taxonomyAdminConfig';

/**
 * Turns an error of the API layer into a message the admin can read.
 *
 * The backend puts the real reason in `responseStatus.responseMessage`
 * (for example "Category with slug 'hanh-dong' already exists" or
 * "Category still has movies referencing it"), and `parseApiError` already
 * extracts it into the `message` of the error.
 *
 * @param error - The error thrown by the service.
 * @returns The message to show in the alert.
 */
function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return ADMIN_TAXONOMY_MESSAGES.loadFailed;
}

/**
 * The options of the `useTaxonomyManager` hook.
 */
export interface UseTaxonomyManagerOptions {
  /** The taxonomy to manage, such as "categories" or "countries". */
  type: TaxonomyType;
  /** The Vietnamese label of the taxonomy, used in the alert messages. */
  typeNameVi: string;
  /** The service used to talk to the backend. It is replaced in the tests. */
  service?: ITaxonomyAdminService;
  /** The number of rows of one page. */
  defaultPageSize?: number;
}

/**
 * Manages the list, the filters and the CRUD actions of an admin taxonomy.
 *
 * The hook loads the items from the backend, keeps the search, the status
 * filter and the pagination, and exposes the handlers the modal and the
 * table need.
 *
 * @param options - The options of the hook.
 * @param options.type - The taxonomy to manage.
 * @param options.typeNameVi - The Vietnamese label of the taxonomy.
 * @param options.service - The service used to talk to the backend.
 * @param options.defaultPageSize - The number of rows of one page.
 * @returns The state, the derived lists and the handlers of the panel.
 */
export function useTaxonomyManager({
  type,
  typeNameVi,
  service = taxonomyAdminService,
  defaultPageSize = ADMIN_TAXONOMY_TABLE_PAGE_SIZE
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

  /**
   * Loads the items of the taxonomy from the backend.
   *
   * The load runs again when the taxonomy changes, because the list of the
   * categories is not the list of the countries.
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await service.getAll(type);
      setItems(data);
    } catch (error) {
      showCinemaAlert(
        `Không thể tải danh sách ${typeNameVi}: ${describeError(error)}`,
        'warning'
      );
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

  // Counters shown above the table.
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

  /**
   * Toggles the active state of an item and updates the list.
   *
   * @param item - The item to toggle.
   */
  const handleToggleStatus = useCallback(
    async (item: TaxonomyItem) => {
      try {
        const updated = await service.toggleStatus(type, item.id, !item.isActive);
        setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
        showCinemaAlert(
          `Đã ${updated.isActive ? 'kích hoạt' : 'tạm ẩn'} ${typeNameVi} "${updated.name}" thành công!`,
          updated.isActive ? 'cinema' : 'warning'
        );
      } catch (error) {
        showCinemaAlert(
          `Không thể thay đổi trạng thái ${typeNameVi}: ${describeError(error)}`,
          'warning'
        );
      }
    },
    [service, type, typeNameVi]
  );

  /**
   * Creates or updates an item, depending on whether it has an id.
   *
   * @param itemData - The values of the form.
   */
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
        showCinemaAlert(`Lỗi lưu ${typeNameVi}: ${describeError(err)}`, 'warning');
      }
    },
    [service, type, typeNameVi, handleCloseFormModal]
  );

  /**
   * Deletes the item the admin confirmed in the delete modal.
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;
    const target = itemToDelete;
    try {
      await service.delete(type, target.id);
      setItems((prev) => prev.filter((i) => i.id !== target.id));
      showCinemaAlert(`Đã xóa ${typeNameVi} "${target.name}"`, 'warning');
      handleCloseDeleteModal();
    } catch (err) {
      showCinemaAlert(`Không thể xóa ${typeNameVi}: ${describeError(err)}`, 'warning');
    }
  }, [itemToDelete, service, type, typeNameVi, handleCloseDeleteModal]);

  /**
   * Clears the search term and the status filter.
   */
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
