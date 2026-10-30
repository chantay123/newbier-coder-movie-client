/**
 * @file useEditYearForm.ts
 * @description Enterprise custom hook powering the Edit Year Modal.
 * Integrates React Hook Form with Zod validation, dirty state tracking,
 * unsaved changes guard (beforeunload & modal close confirmation),
 * anti-double-submission lock, reset-to-original capability, and retry on error.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, SubmitHandler, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  updateYearSchema,
  UpdateYearInput,
  YearEntity,
} from '@/features/admin/years/types/year.types';
import { useAdminYearStore } from '@/stores/admin/useAdminYearStore';
import { generateYearSlug } from '@/features/admin/years/hooks/useCreateYearForm';
import { toastNotification } from '@/utils/notification/toastNotification';
import { ADMIN_YEAR_CONSTANTS } from '@/constants/adminYearConstants';
import { AppError, parseApiError } from '@/utils/errors/appError';

export interface UseEditYearFormProps {
  isOpen: boolean;
  year: YearEntity | null;
  onClose: () => void;
  onSuccess?: (updated: YearEntity) => void;
}

export interface EditYearFormValues {
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
}

export function useEditYearForm({ isOpen, year, onClose, onSuccess }: UseEditYearFormProps) {
  const updateYearAction = useAdminYearStore((state) => state.updateYear);
  const fetchYearsAction = useAdminYearStore((state) => state.fetchYears);
  const isSubmittingStore = useAdminYearStore((state) => state.isSubmitting);

  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [showDirtyConfirm, setShowDirtyConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<AppError | null>(null);

  // Initial form values derived from year
  const defaultValues: EditYearFormValues = useMemo(
    () => ({
      name: year?.name || '',
      slug: year?.slug || '',
      description: year?.description || '',
      isActive: year?.isActive ?? true,
    }),
    [year]
  );

  const formResolver = zodResolver(updateYearSchema) as unknown as Resolver<EditYearFormValues>;

  const form = useForm<EditYearFormValues>({
    resolver: formResolver,
    defaultValues,
    mode: 'onChange',
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid, isDirty, isSubmitting },
  } = form;

  const watchedName = watch('name');

  // Populate/Reset form values whenever year prop changes or modal opens
  useEffect(() => {
    if (isOpen && year) {
      reset({
        name: year.name || '',
        slug: year.slug || '',
        description: year.description || '',
        isActive: year.isActive ?? true,
      });
      setIsSlugManuallyEdited(year.slug !== year.name);
      setSubmitError(null);
      setShowDirtyConfirm(false);
    }
  }, [isOpen, year, reset]);

  // Real-time auto-slug sync if not manually modified
  useEffect(() => {
    if (!isSlugManuallyEdited && watchedName && watchedName !== year?.name) {
      setValue('slug', generateYearSlug(watchedName), {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [watchedName, isSlugManuallyEdited, setValue, year?.name]);

  // Window beforeunload listener: warn user if refreshing page with unsaved dirty form
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isOpen && isDirty) {
        e.preventDefault();
        e.returnValue = ADMIN_YEAR_CONSTANTS.MESSAGES.DIRTY_CONFIRM_MESSAGE;
        return ADMIN_YEAR_CONSTANTS.MESSAGES.DIRTY_CONFIRM_MESSAGE;
      }
    };

    if (isOpen && isDirty) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOpen, isDirty]);

  /**
   * Reset form values back to original initial entity data
   */
  const handleResetToOriginal = useCallback(() => {
    if (year) {
      reset({
        name: year.name || '',
        slug: year.slug || '',
        description: year.description || '',
        isActive: year.isActive ?? true,
      });
      setIsSlugManuallyEdited(year.slug !== year.name);
      setSubmitError(null);
      toastNotification.info(ADMIN_YEAR_CONSTANTS.MESSAGES.RESET_SUCCESS);
    }
  }, [year, reset]);

  /**
   * Safe modal close request: checks dirty state first
   */
  const handleRequestClose = useCallback(() => {
    if (isSubmitting || isSubmittingStore) return;
    if (isDirty) {
      setShowDirtyConfirm(true);
    } else {
      onClose();
    }
  }, [isDirty, isSubmitting, isSubmittingStore, onClose]);

  /**
   * User confirms discarding unsaved changes
   */
  const handleConfirmDiscard = useCallback(() => {
    setShowDirtyConfirm(false);
    handleResetToOriginal();
    onClose();
  }, [handleResetToOriginal, onClose]);

  /**
   * User cancels discarding unsaved changes
   */
  const handleCancelDiscard = useCallback(() => {
    setShowDirtyConfirm(false);
  }, []);

  /**
   * Submit handler invoking Zustand store action
   */
  const onSubmit: SubmitHandler<EditYearFormValues> = useCallback(
    async (data) => {
      if (!year?.id) return;
      setSubmitError(null);

      try {
        const payload: UpdateYearInput = {
          name: data.name.trim(),
          slug: data.slug.trim(),
          description: data.description.trim(),
          isActive: Boolean(data.isActive),
        };

        const updated = await updateYearAction(year.id, payload);
        onSuccess?.(updated);
        onClose();
      } catch (err) {
        const parsed = parseApiError(err);
        setSubmitError(parsed);
        // Form values remain untouched (thất bại: giữ nguyên form, không mất dữ liệu)
      }
    },
    [year?.id, updateYearAction, onSuccess, onClose]
  );

  /**
   * Retry submission with current form state
   */
  const handleRetry = useCallback(() => {
    handleSubmit(onSubmit)();
  }, [handleSubmit, onSubmit]);

  /**
   * Verify server status in case of network timeout
   */
  const handleCheckStatus = useCallback(async () => {
    await fetchYearsAction();
    const currentYears = useAdminYearStore.getState().years;
    const match = currentYears.find((y) => y.id === year?.id);
    if (match && match.name === watchedName) {
      toastNotification.success('Bản ghi đã được cập nhật thành công trên hệ thống!');
      onClose();
    } else {
      toastNotification.info('Chưa ghi nhận bản cập nhật mới trên máy chủ. Bạn có thể bấm Thử Lại.');
    }
  }, [fetchYearsAction, year?.id, watchedName, onClose]);

  return {
    form,
    register,
    handleSubmit: handleSubmit(onSubmit),
    errors,
    isValid,
    isDirty,
    isSubmitting: isSubmitting || isSubmittingStore,
    isSlugManuallyEdited,
    setIsSlugManuallyEdited,
    showDirtyConfirm,
    submitError,
    handleResetToOriginal,
    handleRequestClose,
    handleConfirmDiscard,
    handleCancelDiscard,
    handleRetry,
    handleCheckStatus,
    setValue,
    watch,
  };
}
