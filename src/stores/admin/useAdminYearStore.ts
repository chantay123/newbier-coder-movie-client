/**
 * @file useAdminYearStore.ts
 * @description Dedicated Zustand store for Admin Year Management.
 * Separated into an admin-specific state architecture to prevent pollution of client stores.
 * Follows enterprise immutable state updates, optimistic mutations, and granular selectors.
 */

import { create } from 'zustand';
import {
  YearEntity,
  CreateYearInput,
  UpdateYearInput,
  YearFilterParams,
} from '@/features/admin/years/types/year.types';
import {
  IYearAdminService,
  yearAdminService as defaultYearAdminService,
} from '@/features/admin/years/services/yearAdminService';
import { ADMIN_YEAR_CONSTANTS } from '@/constants/adminYearConstants';
import { toastNotification } from '@/utils/notification/toastNotification';
import { parseApiError } from '@/utils/errors/appError';

export interface AdminYearState {
  // Data
  years: YearEntity[];
  total: number;
  activeCount: number;
  inactiveCount: number;

  // Filter & Pagination
  searchTerm: string;
  statusFilter: 'all' | 'active' | 'inactive';
  currentPage: number;
  pageSize: number;
  totalPages: number;

  // UI & Loading States
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  // Modal State
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  selectedYear: YearEntity | null;
}

export interface AdminYearActions {
  // Data Fetching
  fetchYears: (service?: IYearAdminService, signal?: AbortSignal) => Promise<void>;

  // CRUD Mutations
  createYear: (
    payload: CreateYearInput,
    service?: IYearAdminService,
    signal?: AbortSignal
  ) => Promise<YearEntity>;
  updateYear: (
    id: string,
    payload: UpdateYearInput,
    service?: IYearAdminService,
    signal?: AbortSignal
  ) => Promise<YearEntity>;
  deleteYear: (
    id: string,
    service?: IYearAdminService,
    signal?: AbortSignal
  ) => Promise<boolean>;
  toggleStatus: (
    id: string,
    service?: IYearAdminService,
    signal?: AbortSignal
  ) => Promise<YearEntity>;

  // Filters & Pagination
  setSearchTerm: (term: string) => void;
  setStatusFilter: (status: 'all' | 'active' | 'inactive') => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Modals
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openEditModal: (year: YearEntity) => void;
  closeEditModal: () => void;

  // Reset
  resetFilters: () => void;
  resetStore: () => void;
}

const initialState: AdminYearState = {
  years: [],
  total: 0,
  activeCount: 0,
  inactiveCount: 0,
  searchTerm: '',
  statusFilter: 'all',
  currentPage: ADMIN_YEAR_CONSTANTS.PAGINATION.DEFAULT_PAGE,
  pageSize: ADMIN_YEAR_CONSTANTS.PAGINATION.DEFAULT_PAGE_SIZE,
  totalPages: 1,
  isLoading: false,
  isSubmitting: false,
  error: null,
  isCreateModalOpen: false,
  isEditModalOpen: false,
  selectedYear: null,
};

export const useAdminYearStore = create<AdminYearState & AdminYearActions>()((set, get) => ({
  ...initialState,

  /**
   * Fetches release years from backend with current filter and pagination state.
   */
  fetchYears: async (service = defaultYearAdminService, signal?: AbortSignal): Promise<void> => {
    const { searchTerm, statusFilter, currentPage, pageSize, years: currentYears } = get();
    // Only show skeleton loader on initial empty load to prevent UI flickering on refresh
    if (currentYears.length === 0) {
      set({ isLoading: true, error: null });
    }

    try {
      const params: YearFilterParams = {
        search: searchTerm,
        status: statusFilter,
        page: currentPage,
        limit: pageSize,
      };

      const result = await service.getAll(params, signal);

      // Protect against read-after-write replication lag:
      // If a local item was updated more recently than the server's response, preserve the local updated version
      const currentMap = new Map(get().years.map((y) => [y.id, y]));
      const reconciledItems = result.items.map((serverItem) => {
        const localItem = currentMap.get(serverItem.id);
        if (localItem) {
          const localTime = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
          const serverTime = serverItem.updatedAt ? new Date(serverItem.updatedAt).getTime() : 0;
          if (localTime > serverTime) {
            return { ...serverItem, ...localItem };
          }
        }
        return serverItem;
      });

      const activeCount = reconciledItems.filter((item) => item.isActive).length;
      const inactiveCount = reconciledItems.length - activeCount;

      set({
        years: reconciledItems,
        total: result.total,
        totalPages: result.totalPages,
        activeCount,
        inactiveCount,
        isLoading: false,
      });
    } catch (err) {
      const parsed = parseApiError(err, ADMIN_YEAR_CONSTANTS.MESSAGES.FETCH_ERROR);
      set({ error: parsed.message, isLoading: false });
      toastNotification.error(parsed.message);
    }
  },

  /**
   * Creates a new release year, updates store optimistically and shows toast notification.
   */
  createYear: async (
    payload: CreateYearInput,
    service = defaultYearAdminService,
    signal?: AbortSignal
  ): Promise<YearEntity> => {
    set({ isSubmitting: true, error: null });

    try {
      const newYear = await service.create(payload, signal);

      // Optimistic Store Update
      set((state) => {
        const remainingYears = state.years.filter((y) => y.id !== newYear.id && y.slug !== newYear.slug);
        const updatedYears = [newYear, ...remainingYears];
        const activeCount = updatedYears.filter((y) => y.isActive).length;
        const inactiveCount = updatedYears.length - activeCount;

        return {
          years: updatedYears,
          total: updatedYears.length,
          activeCount,
          inactiveCount,
          isSubmitting: false,
          isCreateModalOpen: false,
        };
      });

      // Notification using react-toastify
      toastNotification.success(ADMIN_YEAR_CONSTANTS.MESSAGES.CREATE_SUCCESS(newYear.name));
      return newYear;
    } catch (err) {
      const parsed = parseApiError(err, ADMIN_YEAR_CONSTANTS.MESSAGES.CREATE_ERROR);
      set({ isSubmitting: false, error: parsed.message });
      toastNotification.error(parsed.message);
      throw parsed;
    }
  },

  /**
   * Updates an existing release year.
   */
  updateYear: async (
    id: string,
    payload: UpdateYearInput,
    service = defaultYearAdminService,
    signal?: AbortSignal
  ): Promise<YearEntity> => {
    set({ isSubmitting: true, error: null });

    try {
      const updated = await service.update(id, payload, signal);

      const entityWithTimestamp: YearEntity = {
        ...updated,
        updatedAt: updated.updatedAt || new Date().toISOString(),
      };

      set((state) => {
        const nextYears = state.years.map((y) =>
          y.id === id || y.id === entityWithTimestamp.id ? entityWithTimestamp : y
        );
        const activeCount = nextYears.filter((y) => y.isActive).length;
        const inactiveCount = nextYears.length - activeCount;

        return {
          years: nextYears,
          activeCount,
          inactiveCount,
          isSubmitting: false,
          isEditModalOpen: false,
          selectedYear: null,
          error: null,
        };
      });

      toastNotification.success(ADMIN_YEAR_CONSTANTS.MESSAGES.UPDATE_SUCCESS(entityWithTimestamp.name));
      return entityWithTimestamp;
    } catch (err) {
      const parsed = parseApiError(err, ADMIN_YEAR_CONSTANTS.MESSAGES.UPDATE_ERROR);

      // Handle specific HTTP status codes
      let userFriendlyMsg = parsed.message;
      if (parsed.statusCode === 404) {
        userFriendlyMsg = ADMIN_YEAR_CONSTANTS.MESSAGES.NOT_FOUND_ERROR;
        // If 404, remove ghost item from local store
        set((state) => ({
          years: state.years.filter((y) => y.id !== id),
          total: Math.max(0, state.total - 1),
        }));
      } else if (parsed.statusCode === 401) {
        userFriendlyMsg = ADMIN_YEAR_CONSTANTS.MESSAGES.UNAUTHORIZED_ERROR;
      } else if (parsed.statusCode === 403) {
        userFriendlyMsg = ADMIN_YEAR_CONSTANTS.MESSAGES.FORBIDDEN_ERROR;
      } else if (parsed.code === 'ECONNABORTED' || parsed.statusCode === 504 || parsed.message.includes('timeout')) {
        userFriendlyMsg = ADMIN_YEAR_CONSTANTS.MESSAGES.NETWORK_TIMEOUT_ERROR;
      }

      set({ isSubmitting: false, error: userFriendlyMsg });
      toastNotification.error(userFriendlyMsg);
      throw parsed;
    }
  },

  /**
   * Deletes a release year.
   */
  deleteYear: async (
    id: string,
    service = defaultYearAdminService,
    signal?: AbortSignal
  ): Promise<boolean> => {
    const target = get().years.find((y) => y.id === id);
    const targetName = target?.name || id;

    try {
      await service.delete(id, signal);

      set((state) => ({
        years: state.years.filter((y) => y.id !== id),
        total: Math.max(0, state.total - 1),
      }));

      toastNotification.success(ADMIN_YEAR_CONSTANTS.MESSAGES.DELETE_SUCCESS(targetName));
      return true;
    } catch (err) {
      const parsed = parseApiError(err, ADMIN_YEAR_CONSTANTS.MESSAGES.DELETE_ERROR);
      toastNotification.error(parsed.message);
      return false;
    }
  },

  /**
   * Toggles active/inactive status of a release year.
   */
  toggleStatus: async (
    id: string,
    service = defaultYearAdminService,
    signal?: AbortSignal
  ): Promise<YearEntity> => {
    const previousYears = get().years;
    const target = previousYears.find((y) => y.id === id);
    if (!target) throw new Error('Target year not found');

    const newActiveState = !target.isActive;

    // Optimistic UI update
    set((state) => ({
      years: state.years.map((y) => (y.id === id ? { ...y, isActive: newActiveState } : y)),
      activeCount: newActiveState ? state.activeCount + 1 : Math.max(0, state.activeCount - 1),
      inactiveCount: newActiveState ? Math.max(0, state.inactiveCount - 1) : state.inactiveCount + 1,
    }));

    try {
      const updated = await service.toggleStatus(id, signal);
      toastNotification.info(
        ADMIN_YEAR_CONSTANTS.MESSAGES.TOGGLE_STATUS_SUCCESS(updated.name, updated.isActive)
      );
      return updated;
    } catch (err) {
      // Revert optimistic update on failure
      set({ years: previousYears });
      const parsed = parseApiError(err, ADMIN_YEAR_CONSTANTS.MESSAGES.TOGGLE_STATUS_ERROR);
      toastNotification.error(parsed.message);
      throw parsed;
    }
  },

  // Filters & Pagination Actions
  setSearchTerm: (term: string) => {
    set({ searchTerm: term, currentPage: 1 });
  },

  setStatusFilter: (status: 'all' | 'active' | 'inactive') => {
    set({ statusFilter: status, currentPage: 1 });
  },

  setCurrentPage: (page: number) => {
    set({ currentPage: page });
  },

  setPageSize: (size: number) => {
    set({ pageSize: size, currentPage: 1 });
  },

  // Modal Handlers
  openCreateModal: () => set({ isCreateModalOpen: true, error: null }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
  openEditModal: (year: YearEntity) => set({ isEditModalOpen: true, selectedYear: year, error: null }),
  closeEditModal: () => set({ isEditModalOpen: false, selectedYear: null }),

  // Resets
  resetFilters: () => set({ searchTerm: '', statusFilter: 'all', currentPage: 1 }),
  resetStore: () => set(initialState),
}));
