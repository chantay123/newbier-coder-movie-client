/// <reference types="jest" />
/**
 * @file yearAdmin.test.ts
 * @description Enterprise unit tests for Year Validation Schema, YearAdminService, and Zustand Admin Store.
 */

import { createYearSchema, CreateYearInput } from '@/features/admin/years/types/year.types';
import { YearAdminService } from '@/features/admin/years/services/yearAdminService';
import { useAdminYearStore } from '@/stores/admin/useAdminYearStore';
import { AxiosInstance } from 'axios';

describe('Admin Year Feature Unit Tests', () => {
  describe('Zod Validation: createYearSchema', () => {
    it('should validate a correct year payload successfully', () => {
      const validPayload: CreateYearInput = {
        name: '2021',
        slug: '2021',
        description: 'Movies released in 2021',
        isActive: true,
      };

      const result = createYearSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('2021');
        expect(result.data.slug).toBe('2021');
        expect(result.data.isActive).toBe(true);
      }
    });

    it('should reject invalid year name formats (not 4 digits)', () => {
      const invalidPayload = {
        name: '21',
        slug: '21',
        description: 'Invalid year',
        isActive: true,
      };

      const result = createYearSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Năm phát hành phải là số 4 chữ số hợp lệ');
      }
    });

    it('should reject out-of-bounds release years (< 1900)', () => {
      const ancientPayload = {
        name: '1850',
        slug: '1850',
        description: 'Too old',
        isActive: true,
      };

      const result = createYearSchema.safeParse(ancientPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Năm phát hành phải nằm trong khoảng');
      }
    });

    it('should reject invalid slug formats with special characters or uppercase', () => {
      const badSlugPayload = {
        name: '2025',
        slug: 'Year_2025!',
        description: 'Bad slug format',
        isActive: true,
      };

      const result = createYearSchema.safeParse(badSlugPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Slug chỉ được chứa chữ thường không dấu');
      }
    });
  });

  describe('YearAdminService with Dependency Injection', () => {
    it('should create a year and normalize response', async () => {
      const mockPost = jest.fn().mockResolvedValue({
        data: {
          data: {
            id: 'yr-2021-backend',
            name: '2021',
            slug: '2021',
            description: 'Movies released in 2021',
            isActive: true,
            movieCount: 0,
          },
        },
      });

      const mockHttp = {
        post: mockPost,
        get: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
      } as unknown as AxiosInstance;

      const service = new YearAdminService(mockHttp);
      const created = await service.create({
        name: '2021',
        slug: '2021',
        description: 'Movies released in 2021',
        isActive: true,
      });

      expect(created.id).toBe('yr-2021-backend');
      expect(created.name).toBe('2021');
      expect(created.slug).toBe('2021');
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('should retrieve list of years and filter correctly', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: {
          data: [
            { id: 'yr-2026', name: '2026', slug: '2026', isActive: true, movieCount: 10 },
            { id: 'yr-2025', name: '2025', slug: '2025', isActive: false, movieCount: 50 },
          ],
        },
      });

      const mockHttp = {
        get: mockGet,
      } as unknown as AxiosInstance;

      const service = new YearAdminService(mockHttp);
      const res = await service.getAll({ status: 'active' });

      expect(res.items.length).toBe(1);
      expect(res.items[0].name).toBe('2026');
    });

    it('should toggle year status via PATCH /admin/years/:id/status', async () => {
      const mockPatch = jest.fn().mockResolvedValue({
        data: {
          data: {
            id: 'yr-2026',
            name: '2026',
            slug: '2026',
            isActive: false,
          },
        },
      });

      const mockHttp = {
        patch: mockPatch,
      } as unknown as AxiosInstance;

      const service = new YearAdminService(mockHttp);
      const updated = await service.toggleStatus('yr-2026', false);

      expect(mockPatch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/years/yr-2026/status'),
        { isActive: false },
        expect.any(Object)
      );
      expect(updated.isActive).toBe(false);
    });

    it('should throw 404 error when another admin modified/deleted item concurrently', async () => {
      const mockPatch = jest.fn().mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 404,
          data: { message: 'Year record not found' },
        },
      });

      const mockHttp = {
        patch: mockPatch,
      } as unknown as AxiosInstance;

      const service = new YearAdminService(mockHttp);
      await expect(service.toggleStatus('yr-nonexistent', true)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('Admin Zustand Store: useAdminYearStore', () => {
    it('should set search term and reset page to 1', () => {
      const store = useAdminYearStore.getState();
      store.setCurrentPage(3);
      store.setSearchTerm('2024');

      const updated = useAdminYearStore.getState();
      expect(updated.searchTerm).toBe('2024');
      expect(updated.currentPage).toBe(1);
    });

    it('should handle optimistic toggleStatus', async () => {
      // Seed store
      useAdminYearStore.setState({
        years: [{ id: 'yr-1', name: '2021', slug: '2021', description: '', isActive: true, movieCount: 0 }],
        activeCount: 1,
        inactiveCount: 0,
      });

      const mockService = {
        toggleStatus: jest.fn().mockResolvedValue({
          id: 'yr-1',
          name: '2021',
          slug: '2021',
          description: '',
          isActive: false,
          movieCount: 0,
        }),
      } as any;

      await useAdminYearStore.getState().toggleStatus('yr-1', mockService);

      const state = useAdminYearStore.getState();
      expect(state.years[0].isActive).toBe(false);
      expect(state.activeCount).toBe(0);
      expect(state.inactiveCount).toBe(1);
    });

    it('should update a year in store and recalculate active counts', async () => {
      useAdminYearStore.setState({
        years: [
          { id: 'yr-1', name: '2021', slug: '2021', description: 'Old', isActive: true, movieCount: 5 },
          { id: 'yr-2', name: '2022', slug: '2022', description: 'Normal', isActive: false, movieCount: 0 },
        ],
        activeCount: 1,
        inactiveCount: 1,
      });

      const mockService = {
        update: jest.fn().mockResolvedValue({
          id: 'yr-1',
          name: '2021',
          slug: '2021-updated',
          description: 'Updated Description',
          isActive: false,
          movieCount: 5,
        }),
      } as any;

      const result = await useAdminYearStore.getState().updateYear(
        'yr-1',
        {
          name: '2021',
          slug: '2021-updated',
          description: 'Updated Description',
          isActive: false,
        },
        mockService
      );

      expect(result.slug).toBe('2021-updated');
      const state = useAdminYearStore.getState();
      expect(state.years.find((y) => y.id === 'yr-1')?.description).toBe('Updated Description');
      expect(state.activeCount).toBe(0);
      expect(state.inactiveCount).toBe(2);
    });

    it('should remove ghost item from store if server responds with 404', async () => {
      useAdminYearStore.setState({
        years: [{ id: 'yr-ghost', name: '1999', slug: '1999', description: '', isActive: true, movieCount: 0 }],
        total: 1,
      });

      const mockService = {
        update: jest.fn().mockRejectedValue({
          isAxiosError: true,
          response: {
            status: 404,
            data: { message: 'Entity not found' },
          },
        }),
      } as any;

      await expect(
        useAdminYearStore.getState().updateYear(
          'yr-ghost',
          { name: '1999', slug: '1999', description: '', isActive: true },
          mockService
        )
      ).rejects.toThrow();

      const state = useAdminYearStore.getState();
      expect(state.years.find((y) => y.id === 'yr-ghost')).toBeUndefined();
      expect(state.total).toBe(0);
    });

    it('should handle concurrent 404 error during toggleStatus: purge item and update counts', async () => {
      useAdminYearStore.setState({
        years: [
          { id: 'yr-concurrent', name: '2023', slug: '2023', description: '', isActive: true, movieCount: 1 },
          { id: 'yr-keep', name: '2024', slug: '2024', description: '', isActive: true, movieCount: 2 },
        ],
        total: 2,
        activeCount: 2,
        inactiveCount: 0,
      });

      const mockService = {
        toggleStatus: jest.fn().mockRejectedValue({
          isAxiosError: true,
          response: {
            status: 404,
            data: { message: 'Entity not found' },
          },
        }),
      } as any;

      const result = await useAdminYearStore.getState().toggleStatus('yr-concurrent', false, mockService);
      expect(result).toBeNull();

      const state = useAdminYearStore.getState();
      // Concurrent 404 purged yr-concurrent
      expect(state.years.find((y) => y.id === 'yr-concurrent')).toBeUndefined();
      expect(state.years.find((y) => y.id === 'yr-keep')).toBeDefined();
      expect(state.total).toBe(1);
      expect(state.activeCount).toBe(1);
      expect(state.togglingId).toBeNull();
    });
  });

  describe('YearClientService: Filter inactive years for client navbar and filter', () => {
    it('should strictly exclude inactive years from public list', async () => {
      const { YearClientService } = await import('@/features/client/years/services/yearClientService');
      const service = new YearClientService();
      const activeYears = await service.getActiveYears();

      // Ensure every single item returned is active
      const hasInactive = activeYears.some((y) => y.isActive === false);
      expect(hasInactive).toBe(false);

      // Verify yr-2018 (which has isActive: false in INITIAL_YEARS) is excluded
      const yr2018 = activeYears.find((y) => y.slug === '2018' || y.name === '2018');
      expect(yr2018).toBeUndefined();
    });
  });

  describe('Year Deletion & Enterprise Concurrency Rules', () => {
    it('should delete a year normally and update store', async () => {
      useAdminYearStore.setState({
        years: [
          { id: 'yr-101', name: '2021', slug: '2021', description: '', isActive: true, movieCount: 0 },
          { id: 'yr-102', name: '2022', slug: '2022', description: '', isActive: false, movieCount: 0 },
        ],
        total: 2,
        activeCount: 1,
        inactiveCount: 1,
        selectedIds: ['yr-101'],
      });

      const mockService = {
        delete: jest.fn().mockResolvedValue({
          id: 'yr-101',
          name: '2021',
          success: true,
        }),
      } as any;

      const success = await useAdminYearStore.getState().deleteYear('yr-101', mockService);
      expect(success).toBe(true);

      const state = useAdminYearStore.getState();
      expect(state.years.find((y) => y.id === 'yr-101')).toBeUndefined();
      expect(state.total).toBe(1);
      expect(state.activeCount).toBe(0);
      expect(state.inactiveCount).toBe(1);
      expect(state.selectedIds.includes('yr-101')).toBe(false);
    });

    it('should handle item deleted by another admin (404) as UI success, remove from list and notify gently', async () => {
      useAdminYearStore.setState({
        years: [
          { id: 'yr-ghost', name: '2019', slug: '2019', description: '', isActive: true, movieCount: 0 },
        ],
        total: 1,
        activeCount: 1,
        inactiveCount: 0,
      });

      const mockService = {
        delete: jest.fn().mockResolvedValue({
          id: 'yr-ghost',
          name: '2019',
          success: true,
          alreadyDeleted: true,
          message: 'Item already deleted by another admin',
        }),
      } as any;

      const success = await useAdminYearStore.getState().deleteYear('yr-ghost', mockService);
      expect(success).toBe(true);

      const state = useAdminYearStore.getState();
      expect(state.years.find((y) => y.id === 'yr-ghost')).toBeUndefined();
      expect(state.total).toBe(0);
      expect(state.activeCount).toBe(0);
    });

    it('should retain item in list when server returns constraint violation error', async () => {
      useAdminYearStore.setState({
        years: [
          { id: 'yr-linked', name: '2020', slug: '2020', description: '', isActive: true, movieCount: 15 },
        ],
        total: 1,
        activeCount: 1,
        inactiveCount: 0,
      });

      const mockService = {
        delete: jest.fn().mockRejectedValue({
          isAxiosError: true,
          response: {
            status: 400,
            data: { message: 'Năm phát hành đang có 15 phim liên kết, không thể xóa' },
          },
        }),
      } as any;

      const success = await useAdminYearStore.getState().deleteYear('yr-linked', mockService);
      expect(success).toBe(false);

      const state = useAdminYearStore.getState();
      // Item MUST remain in list for user retry
      expect(state.years.find((y) => y.id === 'yr-linked')).toBeDefined();
      expect(state.total).toBe(1);
      expect(state.deletingId).toBeNull();
    });

    it('should handle bulk delete partial failure: remove succeeded items, retain failed ones, and detail reasons', async () => {
      useAdminYearStore.setState({
        years: [
          { id: 'yr-succeed', name: '2015', slug: '2015', description: '', isActive: true, movieCount: 0 },
          { id: 'yr-fail', name: '2016', slug: '2016', description: '', isActive: true, movieCount: 8 },
        ],
        total: 2,
        activeCount: 2,
        inactiveCount: 0,
        selectedIds: ['yr-succeed', 'yr-fail'],
      });

      const mockService = {
        deleteMultiple: jest.fn().mockResolvedValue({
          total: 2,
          successCount: 1,
          failureCount: 1,
          results: [
            { id: 'yr-succeed', name: '2015', success: true },
            { id: 'yr-fail', name: '2016', success: false, errorReason: 'Năm đang có 8 phim' },
          ],
        }),
      } as any;

      const result = await useAdminYearStore.getState().deleteMultipleYears(['yr-succeed', 'yr-fail'], mockService);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);

      const state = useAdminYearStore.getState();
      expect(state.years.find((y) => y.id === 'yr-succeed')).toBeUndefined();
      expect(state.years.find((y) => y.id === 'yr-fail')).toBeDefined();
      expect(state.total).toBe(1);
      expect(state.selectedIds).toEqual(['yr-fail']);
      expect(state.isBulkDeleting).toBe(false);
    });
  });
});
