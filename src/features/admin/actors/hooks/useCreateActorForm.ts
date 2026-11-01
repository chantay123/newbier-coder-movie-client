/**
 * @file useCreateActorForm.ts
 * @description Enterprise custom hook coordinating Actor creation form state, Zod validation,
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

export interface UseCreateActorFormOptions {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newActor: ActorEntity) => void;
  service?: IActorAdminService;
}

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

export function useCreateActorForm({
  isOpen,
  onClose,
  onSuccess,
  service = defaultActorAdminService,
}: UseCreateActorFormOptions) {
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
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

  // Initialize or reset form state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen, reset]);

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
      const generated = generateActorSlug(val);
      setValue('slug', generated, { shouldValidate: true });
    }
  };

  // Re-generate a fresh random avatar with DiceBear
  const handleRegenerateAvatar = useCallback(() => {
    const randomSeed = `${watchedName || 'actor'}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newAvatar = generateActorAvatar(randomSeed, watchedGender);

    setIsCustomUploaded(false);
    setValue('profileImage', newAvatar, { shouldValidate: true });
    setAvatarPreview(newAvatar);

    toastNotification.info(ADMIN_ACTOR_CONSTANTS.MESSAGES.IMAGE_AUTO_GENERATED(watchedGender));
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
      reader.onload = (event) => {
        const resultUrl = event.target?.result as string;
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

  // Form submission handler
  const onSubmit = async (values: CreateActorInput) => {
    setIsSubmitting(true);

    try {
      // Ensure profileImage has a fallback if somehow empty
      const payload: CreateActorInput = {
        ...values,
        profileImage:
          values.profileImage ||
          avatarPreview ||
          generateActorAvatar(values.name || 'actor', values.gender),
        birthName: values.birthName || values.name,
      };

      const createdActor = await service.create(payload);

      toastNotification.success(
        ADMIN_ACTOR_CONSTANTS.MESSAGES.CREATE_SUCCESS(createdActor.name)
      );

      if (onSuccess) {
        onSuccess(createdActor);
      }
      onClose();
    } catch (err) {
      const parsed = parseApiError(err, ADMIN_ACTOR_CONSTANTS.MESSAGES.CREATE_ERROR);
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
