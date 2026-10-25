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
  });
});
