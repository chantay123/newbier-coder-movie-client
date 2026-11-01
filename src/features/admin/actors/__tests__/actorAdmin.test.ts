/// <reference types="jest" />
/**
 * @file actorAdmin.test.ts
 * @description Enterprise unit tests for Actor Validation Schema, Avatar Generator, and ActorAdminService.
 */

import { createActorSchema, CreateActorInput } from '@/features/admin/actors/types/actor.types';
import { generateActorAvatar } from '@/features/admin/actors/utils/actorAvatarGenerator';
import { generateActorSlug } from '@/features/admin/actors/hooks/useCreateActorForm';
import { ActorAdminService } from '@/features/admin/actors/services/actorAdminService';
import { AxiosInstance } from 'axios';

describe('Admin Actor Feature Unit Tests', () => {
  describe('Zod Validation: createActorSchema', () => {
    it('should validate a complete valid actor payload', () => {
      const validPayload: CreateActorInput = {
        name: 'Dương Quốc Nam',
        slug: 'duong-quoc-nam',
        birthName: 'Dương Quốc Nam',
        dateOfBirth: '1996-06-01',
        placeOfBirth: 'Kingston upon Thames, England',
        nationality: 'British',
        gender: 'male',
        height: 173,
        profileImage: 'https://example.com/tom.jpg',
        coverImage: 'https://example.com/cover.jpg',
        biography: 'English actor known for Spider-Man.',
        knownFor: 'Spider-Man',
        debutYear: 2012,
        socialMedia: {
          instagram: 'https://instagram.com/tomholland2013',
        },
        externalId: '771fc85f-cc08-4fd7-a246-ed57e1d7950e',
        source: 'manual',
        isActive: true,
        isVerified: true,
      };

      const result = createActorSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Dương Quốc Nam');
        expect(result.data.gender).toBe('male');
        expect(result.data.height).toBe(173);
      }
    });

    it('should reject actor name under 2 characters', () => {
      const invalidPayload = {
        name: 'A',
        slug: 'a',
        gender: 'male',
        profileImage: 'data:image/svg+xml;utf8,...',
      };

      const result = createActorSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Tên diễn viên phải có ít nhất 2 ký tự');
      }
    });

    it('should reject invalid slug format with spaces or special characters', () => {
      const invalidSlug = {
        name: 'Tom Holland',
        slug: 'Tom Holland_123!',
        gender: 'male',
        profileImage: 'data:image/svg+xml;utf8,...',
      };

      const result = createActorSchema.safeParse(invalidSlug);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Slug chỉ được chứa chữ thường không dấu');
      }
    });

    it('should reject invalid height (< 50cm or > 260cm)', () => {
      const badHeight = {
        name: 'Tom Holland',
        slug: 'tom-holland',
        gender: 'male',
        height: 350,
        profileImage: 'data:image/svg+xml;utf8,...',
      };

      const result = createActorSchema.safeParse(badHeight);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Chiều cao tối đa 260cm');
      }
    });
  });

  describe('DiceBear Avatar Generator: generateActorAvatar', () => {
    it('should generate a valid SVG Data URI for male actor', () => {
      const dataUri = generateActorAvatar('Tom Holland', 'male');
      expect(dataUri).toMatch(/^data:image\/svg\+xml;utf8,/);
      expect(dataUri).toContain('%3Csvg');
    });

    it('should generate a valid SVG Data URI for female actor', () => {
      const dataUri = generateActorAvatar('Zendaya', 'female');
      expect(dataUri).toMatch(/^data:image\/svg\+xml;utf8,/);
      expect(dataUri).toContain('%3Csvg');
    });

    it('should generate different avatars for different seeds', () => {
      const avatarA = generateActorAvatar('Actor A', 'male');
      const avatarB = generateActorAvatar('Actor B', 'male');
      expect(avatarA).not.toBe(avatarB);
    });
  });

  describe('Slug Normalization Utility: generateActorSlug', () => {
    it('should normalize Vietnamese diacritics and trim clean slugs', () => {
      expect(generateActorSlug('Dương Quốc Nam')).toBe('duong-quoc-nam');
      expect(generateActorSlug('Trần Thành')).toBe('tran-thanh');
      expect(generateActorSlug('Ninh Dương Lan Ngọc')).toBe('ninh-duong-lan-ngoc');
    });
  });

  describe('ActorAdminService: POST /api/v1/admin/actors', () => {
    it('should send POST request and return normalized ActorEntity', async () => {
      const mockPost = jest.fn().mockResolvedValue({
        data: {
          responseData: {
            _id: '6ae74b57be8cbd0247831969',
            name: 'Duong Quoc Nam',
            slug: 'duong-nam-quoc',
            gender: 'male',
            profileImage: 'https://example.com/tom.jpg',
            isActive: true,
            isVerified: true,
          },
        },
      });

      const mockHttp = {
        post: mockPost,
        get: jest.fn(),
      } as unknown as AxiosInstance;

      const service = new ActorAdminService(mockHttp);
      const result = await service.create({
        name: 'Duong Quoc Nam',
        slug: 'duong-nam-quoc',
        gender: 'male',
        profileImage: 'https://example.com/tom.jpg',
      });

      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining('/admin/actors'),
        expect.objectContaining({
          name: 'Duong Quoc Nam',
          slug: 'duong-nam-quoc',
          gender: 'male',
        }),
        expect.any(Object)
      );

      expect(result.id).toBe('6ae74b57be8cbd0247831969');
      expect(result.name).toBe('Duong Quoc Nam');
      expect(result.gender).toBe('male');
    });
  });
});
