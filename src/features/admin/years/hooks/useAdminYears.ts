/**
 * @file useAdminYears.ts
 * @description Coordinator custom hook for the Admin Years Management feature.
 * Connects the UI to useAdminYearStore with debounced search, dependency injection support,
 * and automatic lifecycle management (AbortController on unmount).
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAdminYearStore } from '@/stores/admin/useAdminYearStore';
import { IYearAdminService } from '@/features/admin/years/services/yearAdminService';

export interface UseAdminYearsOptions {
  service?: IYearAdminService;
  debounceMs?: number;
}

export function useAdminYears({ service, debounceMs = 300 }: UseAdminYearsOptions = {}) {
  const years = useAdminYearStore((state) => state.years);
  const total = useAdminYearStore((state) => state.total);
  const activeCount = useAdminYearStore((state) => state.activeCount);
  const inactiveCount = useAdminYearStore((state) => state.inactiveCount);
  const searchTerm = useAdminYearStore((state) => state.searchTerm);
  const statusFilter = useAdminYearStore((state) => state.statusFilter);
  const currentPage = useAdminYearStore((state) => state.currentPage);
  const pageSize = useAdminYearStore((state) => state.pageSize);
  const totalPages = useAdminYearStore((state) => state.totalPages);
  const isLoading = useAdminYearStore((state) => state.isLoading);
  const isSubmitting = useAdminYearStore((state) => state.isSubmitting);
  const togglingId = useAdminYearStore((state) => state.togglingId);
  const deletingId = useAdminYearStore((state) => state.deletingId);
  const isBulkDeleting = useAdminYearStore((state) => state.isBulkDeleting);
  const selectedIds = useAdminYearStore((state) => state.selectedIds);
  const isCreateModalOpen = useAdminYearStore((state) => state.isCreateModalOpen);
  const isEditModalOpen = useAdminYearStore((state) => state.isEditModalOpen);
  const selectedYear = useAdminYearStore((state) => state.selectedYear);

  // Store actions
  const fetchYears = useAdminYearStore((state) => state.fetchYears);
  const deleteYear = useAdminYearStore((state) => state.deleteYear);
  const deleteMultipleYears = useAdminYearStore((state) => state.deleteMultipleYears);
  const toggleStatus = useAdminYearStore((state) => state.toggleStatus);
  const selectItem = useAdminYearStore((state) => state.selectItem);
  const selectAll = useAdminYearStore((state) => state.selectAll);
  const clearSelection = useAdminYearStore((state) => state.clearSelection);
  const setSearchTerm = useAdminYearStore((state) => state.setSearchTerm);
  const setStatusFilter = useAdminYearStore((state) => state.setStatusFilter);
  const setCurrentPage = useAdminYearStore((state) => state.setCurrentPage);
  const setPageSize = useAdminYearStore((state) => state.setPageSize);
  const openCreateModal = useAdminYearStore((state) => state.openCreateModal);
  const closeCreateModal = useAdminYearStore((state) => state.closeCreateModal);
  const openEditModal = useAdminYearStore((state) => state.openEditModal);
  const closeEditModal = useAdminYearStore((state) => state.closeEditModal);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch data on dependency changes with debounce for search
  useEffect(() => {
    const controller = new AbortController();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchYears(service, controller.signal);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      controller.abort();
    };
  }, [fetchYears, service, searchTerm, statusFilter, currentPage, pageSize, debounceMs]);

  const handleRefresh = useCallback(() => {
    fetchYears(service);
  }, [fetchYears, service]);

  return {
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
    isSubmitting,
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
    deleteYear: (id: string) => deleteYear(id, service),
    deleteMultipleYears: (ids: string[]) => deleteMultipleYears(ids, service),
    toggleStatus: async (id: string, targetState?: boolean) => {
      try {
        return await toggleStatus(id, targetState, service);
      } catch {
        return null;
      }
    },
    refresh: handleRefresh,
  };
}
