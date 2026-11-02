/**
 * @file useCreateActorForm.ts
 * @description Enterprise custom hook coordinating Actor creation & update form state, Zod validation,
 * image uploading with client validation, and real-time DiceBear vector avatar generation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createActorSchema,
  CreateActorInput,
  ActorEntity,
} from '@/features/admin/actors/types/actor.types';
import {
  IActorAdminService,
  actorAdminService as defaultActorAdminService,
} from '@/features/admin/actors/services/actorAdminService';
import { generateActorAvatar } from '@/features/admin/actors/utils/actorAvatarGenerator';
import { ADMIN_ACTOR_CONSTANTS, ActorGender } from '@/constants/adminActorConstants';
import { toastNotification } from '@/utils/notification/toastNotification';
import { parseApiError } from '@/utils/errors/appError';

export interface UseActorFormOptions {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (actor: ActorEntity) => void;
  service?: IActorAdminService;
  initialData?: ActorEntity | Partial<CreateActorInput> | null;
  mode?: 'create' | 'update';
}

export type UseCreateActorFormOptions = UseActorFormOptions;

/**
 * Normalizes Vietnamese diacritics into URL-friendly slug
 */
export function generateActorSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function useActorForm({
  isOpen,
  onClose,
  onSuccess,
  service = defaultActorAdminService,
  initialData = null,
  mode = initialData ? 'update' : 'create',
}: UseActorFormOptions) {
  const isEditMode = mode === 'update';
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(isEditMode);
  const [isCustomUploaded, setIsCustomUploaded] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialAvatarRef = useRef<string>('');

  const form = useForm<CreateActorInput>({
    resolver: zodResolver(createActorSchema) as unknown as any,
    mode: 'onTouched',
    defaultValues: {
      name: '',
      slug: '',
      birthName: '',
      dateOfBirth: '',
      placeOfBirth: '',
      nationality: 'Việt Nam',
      gender: 'male',
      height: undefined,
      profileImage: '',
      coverImage: '',
      biography: '',
      knownFor: '',
      debutYear: undefined,
      socialMedia: {
        facebook: '',
        instagram: '',
        twitter: '',
        imdb: '',
        website: '',
      },
      externalId:
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      source: 'manual',
      isActive: true,
      isVerified: true,
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = form;

  const watchedName = watch('name');
  const watchedGender = watch('gender') as ActorGender;
  const watchedProfileImage = watch('profileImage');

  // Initialize or reset form state when modal opens/closes or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const currentAvatar =
          initialData.profileImage ||
          (initialData as any).avatarUrl ||
          generateActorAvatar(initialData.name || 'actor', (initialData.gender as ActorGender) || 'male');

        reset({
          name: initialData.name || '',
          slug: initialData.slug || '',
          birthName: initialData.birthName || (initialData as any).originalName || '',
          dateOfBirth: initialData.dateOfBirth || '',
          placeOfBirth: initialData.placeOfBirth || '',
          nationality: initialData.nationality || 'Việt Nam',
          gender: (initialData.gender as ActorGender) || 'male',
          height: initialData.height ?? undefined,
          profileImage: currentAvatar,
          coverImage: initialData.coverImage || '',
          biography: initialData.biography || (initialData as any).bio || '',
          knownFor: initialData.knownFor || '',
          debutYear: initialData.debutYear ?? undefined,
          socialMedia: {
            facebook: initialData.socialMedia?.facebook || '',
            instagram: initialData.socialMedia?.instagram || '',
            twitter: initialData.socialMedia?.twitter || '',
            imdb: initialData.socialMedia?.imdb || '',
            website: initialData.socialMedia?.website || '',
          },
          externalId: initialData.externalId || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          source: (initialData.source as any) || 'manual',
          isActive: initialData.isActive !== undefined ? initialData.isActive : true,
          isVerified: initialData.isVerified !== undefined ? initialData.isVerified : true,
        });

        setAvatarPreview(currentAvatar);
        setIsCustomUploaded(
          Boolean(
            currentAvatar &&
            !currentAvatar.startsWith('data:image/svg+xml') &&
            !currentAvatar.includes('dicebear')
          )
        );
        setIsSlugManuallyEdited(true);
      } else {
        const defaultAvatar = generateActorAvatar('new-actor', 'male');
        initialAvatarRef.current = defaultAvatar;
        reset({
          name: '',
          slug: '',
          birthName: '',
          dateOfBirth: '',
          placeOfBirth: '',
          nationality: 'Việt Nam',
          gender: 'male',
          height: undefined,
          profileImage: defaultAvatar,
          coverImage: '',
          biography: '',
          knownFor: '',
          debutYear: undefined,
          socialMedia: {
            facebook: '',
            instagram: '',
            twitter: '',
            imdb: '',
            website: '',
          },
          externalId:
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          source: 'manual',
          isActive: true,
          isVerified: true,
        });
        setAvatarPreview(defaultAvatar);
        setIsCustomUploaded(false);
        setIsSlugManuallyEdited(false);
      }
    }
  }, [isOpen, initialData, reset]);

  // Synchronize avatar automatically when name or gender changes (only if admin hasn't uploaded a custom photo)
  useEffect(() => {
    if (!isOpen || isCustomUploaded) return;

    const seed = watchedName && watchedName.trim() ? watchedName.trim() : 'actor-preview';
    const autoAvatar = generateActorAvatar(seed, watchedGender);
    setValue('profileImage', autoAvatar, { shouldValidate: true });
    setAvatarPreview(autoAvatar);
  }, [isOpen, watchedName, watchedGender, isCustomUploaded, setValue]);

  // Auto-generate slug when name changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue('name', val, { shouldValidate: true });

    if (!isSlugManuallyEdited) {
      const autoSlug = generateActorSlug(val);
      setValue('slug', autoSlug, { shouldValidate: true });
    }
  };

  // Re-roll random DiceBear vector avatar silently without toast alert
  const handleRegenerateAvatar = useCallback(() => {
    const randomSeed = `${watchedName || 'actor'}-${Math.random().toString(36).substring(2, 9)}`;
    const newAvatar = generateActorAvatar(randomSeed, watchedGender);
    setValue('profileImage', newAvatar, { shouldValidate: true });
    setAvatarPreview(newAvatar);
    setIsCustomUploaded(false);
  }, [watchedName, watchedGender, setValue]);

  // Handle client-side file upload with banking-grade security validation
  const handleFileUpload = useCallback(
    (file: File) => {
      // 1. Validate file size (max 5MB)
      if (file.size > ADMIN_ACTOR_CONSTANTS.VALIDATION.MAX_IMAGE_SIZE_BYTES) {
        toastNotification.error(ADMIN_ACTOR_CONSTANTS.MESSAGES.IMAGE_FILE_TOO_LARGE);
        return;
      }

      // 2. Validate MIME type
      const allowedTypes = ADMIN_ACTOR_CONSTANTS.VALIDATION.ALLOWED_IMAGE_TYPES as readonly string[];
      if (!allowedTypes.includes(file.type)) {
        toastNotification.error(ADMIN_ACTOR_CONSTANTS.MESSAGES.IMAGE_FILE_INVALID_TYPE);
        return;
      }

      // 3. Read image as Data URL for instant preview & persistence
      const reader = new FileReader();
      reader.onload = (e) => {
        const resultUrl = e.target?.result as string;
        if (resultUrl) {
          setIsCustomUploaded(true);
          setValue('profileImage', resultUrl, { shouldValidate: true });
          setAvatarPreview(resultUrl);
          toastNotification.success(ADMIN_ACTOR_CONSTANTS.MESSAGES.IMAGE_UPLOAD_SUCCESS);
        }
      };
      reader.onerror = () => {
        toastNotification.error('Không thể đọc file ảnh. Vui lòng thử lại.');
      };
      reader.readAsDataURL(file);
    },
    [setValue]
  );

  // Revert back to auto-generated avatar
  const handleResetToAutoAvatar = useCallback(() => {
    setIsCustomUploaded(false);
    const seed = watchedName && watchedName.trim() ? watchedName.trim() : 'actor-preview';
    const autoAvatar = generateActorAvatar(seed, watchedGender);
    setValue('profileImage', autoAvatar, { shouldValidate: true });
    setAvatarPreview(autoAvatar);
  }, [watchedName, watchedGender, setValue]);

  // Form submission handler: handles both Create and Update
  const onSubmit = async (values: CreateActorInput) => {
    setIsSubmitting(true);

    try {
      const payload: CreateActorInput = {
        ...values,
        profileImage:
          values.profileImage ||
          avatarPreview ||
          generateActorAvatar(values.name || 'actor', values.gender),
        birthName: values.birthName || values.name,
      };

      let resultActor: ActorEntity;

      if (isEditMode && (initialData as any)?.id) {
        // UPDATE MODE
        resultActor = await service.update((initialData as any).id, payload);
        toastNotification.success(
          ADMIN_ACTOR_CONSTANTS.MESSAGES.UPDATE_SUCCESS(resultActor.name)
        );
      } else {
        // CREATE MODE
        resultActor = await service.create(payload);
        toastNotification.success(
          ADMIN_ACTOR_CONSTANTS.MESSAGES.CREATE_SUCCESS(resultActor.name)
        );
      }

      if (onSuccess) {
        onSuccess(resultActor);
      }
      onClose();
    } catch (err) {
      const errorMsg = isEditMode
        ? ADMIN_ACTOR_CONSTANTS.MESSAGES.UPDATE_ERROR
        : ADMIN_ACTOR_CONSTANTS.MESSAGES.CREATE_ERROR;
      const parsed = parseApiError(err, errorMsg);
      toastNotification.error(parsed.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    register,
    handleSubmit: handleSubmit(onSubmit as any),
    errors,
    isValid,
    isSubmitting,
    isEditMode,
    avatarPreview,
    isCustomUploaded,
    watchedGender,
    watchedName,
    watchedProfileImage,
    isSlugManuallyEdited,
    setIsSlugManuallyEdited,
    handleNameChange,
    handleFileUpload,
    handleRegenerateAvatar,
    handleResetToAutoAvatar,
    setValue,
    watch,
  };
}

export const useCreateActorForm = useActorForm;
