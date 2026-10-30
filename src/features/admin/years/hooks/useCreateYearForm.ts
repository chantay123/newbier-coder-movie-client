/**
 * @file useCreateYearForm.ts
 * @description Enterprise custom hook powering the Create Year Modal.
 * Integrates React Hook Form with Zod schema resolver, real-time auto-slug generation,
 * anti-double-submission lock, and react-toastify notifications.
 */

import { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createYearSchema,
  CreateYearInput,
  YearEntity,
} from '@/features/admin/years/types/year.types';
import { useAdminYearStore } from '@/stores/admin/useAdminYearStore';

export interface UseCreateYearFormProps {
  isOpen: boolean;
  onSuccess?: (created: YearEntity) => void;
  onClose: () => void;
}

export interface CreateYearFormValues {
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
}

/**
 * Utility: Generates URL-friendly slug from title/year input.
 * Strips Vietnamese diacritics and special characters.
 */
export function generateYearSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function useCreateYearForm({ isOpen, onSuccess, onClose }: UseCreateYearFormProps) {
  const createYearAction = useAdminYearStore((state) => state.createYear);
  const isSubmittingStore = useAdminYearStore((state) => state.isSubmitting);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  // Cast resolver cleanly to resolve Zod v4 type inference variance
  const formResolver = zodResolver(createYearSchema) as unknown as Resolver<CreateYearFormValues>;

  const form = useForm<CreateYearFormValues>({
    resolver: formResolver,
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      isActive: true,
    },
    mode: 'onChange',
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid, isSubmitting },
  } = form;

  const watchedName = watch('name');

  // Auto-generate slug when name changes, unless user manually edited slug
  useEffect(() => {
    if (!isSlugManuallyEdited && watchedName) {
      setValue('slug', generateYearSlug(watchedName), { shouldValidate: true });
    }
  }, [watchedName, isSlugManuallyEdited, setValue]);

  // Reset form when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      reset({
        name: '',
        slug: '',
        description: '',
        isActive: true,
      });
      setIsSlugManuallyEdited(false);
    }
  }, [isOpen, reset]);

  /**
   * Handle form submission
   */
  const onSubmit: SubmitHandler<CreateYearFormValues> = useCallback(
    async (data) => {
      try {
        const payload: CreateYearInput = {
          name: data.name.trim(),
          slug: data.slug.trim(),
          description: data.description.trim(),
          isActive: Boolean(data.isActive),
        };
        const created = await createYearAction(payload);
        onSuccess?.(created);
        onClose();
      } catch {
        // Error toast is handled automatically by the Zustand store
      }
    },
    [createYearAction, onSuccess, onClose]
  );

  return {
    form,
    register,
    handleSubmit: handleSubmit(onSubmit),
    errors,
    isValid,
    isSubmitting: isSubmitting || isSubmittingStore,
    isSlugManuallyEdited,
    setIsSlugManuallyEdited,
    setValue,
    watch,
  };
}
