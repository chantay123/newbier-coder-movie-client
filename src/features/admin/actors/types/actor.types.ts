/**
 * @file actor.types.ts
 * @description Domain types, DTOs, and Zod validation schemas for Admin Actor entity.
 * Single source of truth for Actor form validation and API communications.
 */

import { z } from 'zod';
import { ADMIN_ACTOR_CONSTANTS } from '@/constants/adminActorConstants';

/**
 * Social media links object schema
 */
export const actorSocialMediaSchema = z.object({
  facebook: z.string().trim().optional(),
  instagram: z.string().trim().optional(),
  twitter: z.string().trim().optional(),
  imdb: z.string().trim().optional(),
  website: z.string().trim().optional(),
});

export type ActorSocialMedia = z.infer<typeof actorSocialMediaSchema>;

/**
 * Zod validation schema for creating a new actor.
 * Single source of truth for client and server validation.
 */
export const createActorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(
      ADMIN_ACTOR_CONSTANTS.VALIDATION.MIN_NAME_LENGTH,
      ADMIN_ACTOR_CONSTANTS.MESSAGES.VALIDATION_NAME_REQUIRED
    )
    .max(
      ADMIN_ACTOR_CONSTANTS.VALIDATION.MAX_NAME_LENGTH,
      `Tên diễn viên không được vượt quá ${ADMIN_ACTOR_CONSTANTS.VALIDATION.MAX_NAME_LENGTH} ký tự`
    ),
  slug: z
    .string()
    .trim()
    .min(1, ADMIN_ACTOR_CONSTANTS.MESSAGES.VALIDATION_SLUG_REQUIRED)
    .regex(
      ADMIN_ACTOR_CONSTANTS.VALIDATION.SLUG_REGEX,
      ADMIN_ACTOR_CONSTANTS.MESSAGES.VALIDATION_SLUG_INVALID
    ),
  birthName: z.string().trim().max(100).optional(),
  dateOfBirth: z.string().trim().optional(),
  placeOfBirth: z.string().trim().max(200).optional(),
  nationality: z.string().trim().max(100).optional(),
  gender: z.enum(['male', 'female', 'other']),
  height: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().int().min(50, 'Chiều cao tối thiểu 50cm').max(260, 'Chiều cao tối đa 260cm').optional()
  ),
  profileImage: z
    .string()
    .trim()
    .min(1, ADMIN_ACTOR_CONSTANTS.MESSAGES.VALIDATION_IMAGE_REQUIRED),
  coverImage: z.string().trim().optional(),
  biography: z
    .string()
    .trim()
    .max(
      ADMIN_ACTOR_CONSTANTS.VALIDATION.MAX_BIO_LENGTH,
      ADMIN_ACTOR_CONSTANTS.MESSAGES.VALIDATION_BIO_MAX
    )
    .optional(),
  knownFor: z.string().trim().max(200).optional(),
  debutYear: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z
      .number()
      .int()
      .min(1900, 'Năm ra mắt từ 1900 trở đi')
      .max(new Date().getFullYear() + 2, 'Năm ra mắt không hợp lệ')
      .optional()
  ),
  socialMedia: actorSocialMediaSchema.optional(),
  externalId: z.string().optional(),
  source: z.literal('manual').optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

export type CreateActorInput = z.infer<typeof createActorSchema>;

/**
 * Domain entity representing an Actor in MongoDB
 */
export interface ActorEntity {
  _id?: string;
  id: string;
  name: string;
  slug: string;
  birthName?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  gender: 'male' | 'female' | 'other';
  height?: number;
  profileImage: string;
  coverImage?: string;
  biography?: string;
  knownFor?: string;
  debutYear?: number;
  socialMedia?: ActorSocialMedia;
  movieCount?: number;
  popularity?: number;
  viewCount?: number;
  isActive: boolean;
  isVerified: boolean;
  source: string;
  externalId?: string;
  awards?: unknown[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ActorFilterParams {
  search?: string;
  gender?: 'male' | 'female' | 'other' | 'all';
  page?: number;
  limit?: number;
}
