/**
 * @file actorAdminService.ts
 * @description Enterprise-grade Admin Service for Actors / Performers.
 * Handles API communications via Axios, enterprise error normalization, and fallback resilience.
 */

import { AxiosInstance } from 'axios';
import axiosAdminInstance from '@/config/axiosAdminConfig';
import { ADMIN_API_CONFIG_MAP, AdminApiConfigMap } from '@/config/adminApiConfig';
import {
  CreateActorInput,
  UpdateActorInput,
  ActorEntity,
  createActorSchema,
} from '@/features/admin/actors/types/actor.types';
import { parseApiError } from '@/utils/errors/appError';
import { ADMIN_ACTOR_CONSTANTS } from '@/constants/adminActorConstants';

export interface IActorAdminService {
  create(payload: CreateActorInput, signal?: AbortSignal): Promise<ActorEntity>;
  update(id: string, payload: UpdateActorInput, signal?: AbortSignal): Promise<ActorEntity>;
  getAll(params?: { search?: string; page?: number; limit?: number }, signal?: AbortSignal): Promise<ActorEntity[]>;
}

/**
 * Normalizes raw actor payload from server envelope
 */
export function normalizeActorEntity(raw: Record<string, unknown>, overrides: Partial<ActorEntity> = {}): ActorEntity {
  const id = String(raw._id || raw.id || overrides.id || `act-${Date.now()}`);
  const name = String(raw.name || overrides.name || '');
  const slug = String(raw.slug || overrides.slug || name.toLowerCase().replace(/\s+/g, '-'));

  return {
    _id: raw._id ? String(raw._id) : undefined,
    id,
    name,
    slug,
    birthName: raw.birthName ? String(raw.birthName) : overrides.birthName,
    dateOfBirth: raw.dateOfBirth ? String(raw.dateOfBirth) : overrides.dateOfBirth,
    placeOfBirth: raw.placeOfBirth ? String(raw.placeOfBirth) : overrides.placeOfBirth,
    nationality: raw.nationality ? String(raw.nationality) : overrides.nationality,
    gender: (raw.gender === 'female' || raw.gender === 'other' ? raw.gender : 'male') as 'male' | 'female' | 'other',
    height: typeof raw.height === 'number' ? raw.height : overrides.height,
    profileImage: String(raw.profileImage || overrides.profileImage || ''),
    coverImage: raw.coverImage ? String(raw.coverImage) : overrides.coverImage,
    biography: raw.biography ? String(raw.biography) : overrides.biography,
    knownFor: raw.knownFor ? String(raw.knownFor) : overrides.knownFor,
    debutYear: typeof raw.debutYear === 'number' ? raw.debutYear : overrides.debutYear,
    socialMedia: (raw.socialMedia && typeof raw.socialMedia === 'object' ? raw.socialMedia : overrides.socialMedia) as any,
    movieCount: typeof raw.movieCount === 'number' ? raw.movieCount : 0,
    popularity: typeof raw.popularity === 'number' ? raw.popularity : 0,
    viewCount: typeof raw.viewCount === 'number' ? raw.viewCount : 0,
    isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : true,
    isVerified: raw.isVerified !== undefined ? Boolean(raw.isVerified) : true,
    source: String(raw.source || 'manual'),
    externalId: raw.externalId ? String(raw.externalId) : overrides.externalId,
    createdAt: raw.createdAt ? String(raw.createdAt) : new Date().toISOString(),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : new Date().toISOString(),
  };
}

export class ActorAdminService implements IActorAdminService {
  private readonly http: AxiosInstance;
  private readonly config: AdminApiConfigMap;
  private fallbackCache: ActorEntity[] = [];

  constructor(
    http: AxiosInstance = axiosAdminInstance,
    config: AdminApiConfigMap = ADMIN_API_CONFIG_MAP
  ) {
    this.http = http;
    this.config = config;
  }

  /**
   * Creates a new actor on the backend:
   * POST /api/v1/admin/actors
   *
   * @param payload Validated input data conforming to createActorSchema
   * @param signal Optional AbortSignal
   */
  async create(payload: CreateActorInput, signal?: AbortSignal): Promise<ActorEntity> {
    const validated = createActorSchema.parse(payload);
    const endpoint = this.config.actors.create();

    const requestPayload = {
      name: validated.name,
      slug: validated.slug,
      birthName: validated.birthName || validated.name,
      dateOfBirth: validated.dateOfBirth || undefined,
      placeOfBirth: validated.placeOfBirth || undefined,
      nationality: validated.nationality || undefined,
      gender: validated.gender,
      height: validated.height || undefined,
      source: 'manual',
      coverImage: validated.coverImage || validated.profileImage,
      profileImage: validated.profileImage,
      biography: validated.biography || undefined,
      knownFor: validated.knownFor || undefined,
      debutYear: validated.debutYear || undefined,
      socialMedia: validated.socialMedia || {},
      externalId: validated.externalId,
      isActive: validated.isActive,
      isVerified: validated.isVerified,
    };

    try {
      const response = await this.http.post(endpoint, requestPayload, {
        signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      // Check enterprise responseStatus
      if (
        response.data?.responseStatus &&
        response.data.responseStatus.responseCode &&
        response.data.responseStatus.responseCode !== '000000'
      ) {
        throw new Error(
          response.data.responseStatus.responseMessage ||
          ADMIN_ACTOR_CONSTANTS.MESSAGES.CREATE_ERROR
        );
      }

      const rawRecord = (response.data?.responseData || response.data?.data || response.data) as Record<string, unknown>;
      const entity = normalizeActorEntity(rawRecord, requestPayload);
      this.fallbackCache.unshift(entity);
      return entity;
    } catch (error) {
      const parsed = parseApiError(error, ADMIN_ACTOR_CONSTANTS.MESSAGES.CREATE_ERROR);

      // In local development or if server route is not yet deployed, fallback gracefully
      if (
        process.env.NODE_ENV === 'development' ||
        parsed.statusCode === 404 ||
        parsed.code === 'ERR_NETWORK' ||
        parsed.code === 'ECONNREFUSED'
      ) {
        const localEntity = normalizeActorEntity(
          {
            _id: `local-act-${Date.now()}`,
            ...requestPayload,
          },
          requestPayload
        );
        this.fallbackCache.unshift(localEntity);
        return localEntity;
      }

      throw parsed;
    }
  }

  /**
   * Updates an existing actor on the backend:
   * PUT /api/v1/admin/actors/:id
   *
   * @param id Actor MongoDB ID or identifier
   * @param payload Updated actor fields
   * @param signal Optional AbortSignal
   */
  async update(
    id: string,
    payload: UpdateActorInput,
    signal?: AbortSignal
  ): Promise<ActorEntity> {
    const endpoint = this.config.actors.update(id);

    const requestPayload: Record<string, unknown> = {};
    if (payload.name !== undefined) requestPayload.name = payload.name;
    if (payload.slug !== undefined) requestPayload.slug = payload.slug;
    if (payload.birthName !== undefined) requestPayload.birthName = payload.birthName;
    if (payload.dateOfBirth !== undefined) requestPayload.dateOfBirth = payload.dateOfBirth;
    if (payload.placeOfBirth !== undefined) requestPayload.placeOfBirth = payload.placeOfBirth;
    if (payload.nationality !== undefined) requestPayload.nationality = payload.nationality;
    if (payload.gender !== undefined) requestPayload.gender = payload.gender;
    if (payload.height !== undefined) requestPayload.height = payload.height;
    if (payload.profileImage !== undefined) requestPayload.profileImage = payload.profileImage;
    if (payload.coverImage !== undefined) requestPayload.coverImage = payload.coverImage;
    if (payload.biography !== undefined) requestPayload.biography = payload.biography;
    if (payload.knownFor !== undefined) requestPayload.knownFor = payload.knownFor;
    if (payload.debutYear !== undefined) requestPayload.debutYear = payload.debutYear;
    if (payload.socialMedia !== undefined) requestPayload.socialMedia = payload.socialMedia;
    if (payload.isActive !== undefined) requestPayload.isActive = payload.isActive;
    if (payload.isVerified !== undefined) requestPayload.isVerified = payload.isVerified;

    try {
      const response = await this.http.put(endpoint, requestPayload, {
        signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      if (
        response.data?.responseStatus &&
        response.data.responseStatus.responseCode &&
        response.data.responseStatus.responseCode !== '000000'
      ) {
        throw new Error(
          response.data.responseStatus.responseMessage ||
          ADMIN_ACTOR_CONSTANTS.MESSAGES.UPDATE_ERROR
        );
      }

      const rawRecord = (response.data?.responseData || response.data?.data || response.data) as Record<string, unknown>;
      const entity = normalizeActorEntity(rawRecord, { id, ...(requestPayload as Partial<ActorEntity>) });

      const idx = this.fallbackCache.findIndex((a) => a.id === id || a._id === id);
      if (idx !== -1) {
        this.fallbackCache[idx] = entity;
      } else {
        this.fallbackCache.unshift(entity);
      }

      return entity;
    } catch (error) {
      const parsed = parseApiError(error, ADMIN_ACTOR_CONSTANTS.MESSAGES.UPDATE_ERROR);

      if (
        process.env.NODE_ENV === 'development' ||
        parsed.statusCode === 404 ||
        parsed.code === 'ERR_NETWORK' ||
        parsed.code === 'ECONNREFUSED'
      ) {
        const localEntity = normalizeActorEntity(
          {
            _id: id,
            id,
            ...requestPayload,
          },
          requestPayload as Partial<ActorEntity>
        );
        const idx = this.fallbackCache.findIndex((a) => a.id === id || a._id === id);
        if (idx !== -1) {
          this.fallbackCache[idx] = localEntity;
        } else {
          this.fallbackCache.unshift(localEntity);
        }
        return localEntity;
      }

      throw parsed;
    }
  }

  /**
   * Retrieves list of actors with optional search filtering
   */
  async getAll(
    params?: { search?: string; page?: number; limit?: number },
    signal?: AbortSignal
  ): Promise<ActorEntity[]> {
    const endpoint = this.config.actors.list(params);

    try {
      const response = await this.http.get(endpoint, {
        signal,
        headers: { Accept: 'application/json' },
      });

      const list = (response.data?.responseData?.items || response.data?.data || response.data?.items || []) as Record<string, unknown>[];
      const entities = list.map((item) => normalizeActorEntity(item));
      this.fallbackCache = entities;
      return entities;
    } catch {
      return this.fallbackCache;
    }
  }
}

export const actorAdminService = new ActorAdminService();
