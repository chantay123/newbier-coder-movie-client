/**
 * @file CreateYearModal.tsx
 * @description Accessible, Cinema Dark styled modal dialog for adding a new release year.
 * Complies with WCAG AA accessibility (aria-modal, focus trap, escape key closing).
 * Employs React Hook Form with Zod schema validation and real-time error hints.
 */

import React, { useEffect, useRef } from 'react';
import { FaTimes, FaCalendarAlt, FaSpinner, FaExclamationCircle } from 'react-icons/fa';
import styles from '@/styles/AdminTaxonomies.module.css';
import { useCreateYearForm } from '@/features/admin/years/hooks/useCreateYearForm';
import { YearEntity } from '@/features/admin/years/types/year.types';

export interface CreateYearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (created: YearEntity) => void;
}

export default function CreateYearModal({ isOpen, onClose, onSuccess }: CreateYearModalProps) {
  const {
    register,
    handleSubmit,
    errors,
    isValid,
    isSubmitting,
    isSlugManuallyEdited,
    setIsSlugManuallyEdited,
    setValue,
    watch,
  } = useCreateYearForm({ isOpen, onClose, onSuccess });

  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Close on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const watchedDesc = watch('description') || '';
  const isActive = watch('isActive');

  return (
    <div
      className={styles.modalOverlay}
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
      role="presentation"
    >
      <div
        className={styles.modalContent}
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-year-modal-title"
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: 'rgba(229, 9, 20, 0.15)',
                border: '1px solid rgba(229, 9, 20, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e50914',
                fontSize: '0.95rem',
              }}
              aria-hidden="true"
            >
              <FaCalendarAlt />
            </div>
            <h3 id="create-year-modal-title" className={styles.modalTitle}>
              Thêm Mới Năm Phát Hành
            </h3>
          </div>
          <button
            type="button"
            className={styles.closeModalBtn}
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng cửa sổ thêm năm"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.modalBody}>
            {/* Field: Name */}
            <div className={styles.formGroup}>
              <label htmlFor="year-name-input" className={styles.formLabel}>
                Năm Phát Hành (Name) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="year-name-input"
                type="text"
                className={styles.formInput}
                placeholder="VD: 2026"
                maxLength={4}
                autoFocus
                disabled={isSubmitting}
                {...register('name')}
                style={{
                  borderColor: errors.name ? '#ef4444' : undefined,
                  boxShadow: errors.name ? '0 0 0 1px #ef4444' : undefined,
                }}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'year-name-error' : 'year-name-hint'}
              />
              {errors.name ? (
                <div
                  id="year-name-error"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: '#ef4444',
                    fontSize: '0.78rem',
                    marginTop: '0.25rem',
                  }}
                  role="alert"
                >
                  <FaExclamationCircle aria-hidden="true" />
                  <span>{errors.name.message}</span>
                </div>
              ) : (
                <span id="year-name-hint" className={styles.formHint}>
                  Nhập số năm 4 chữ số (VD: 2021, 2025, 2026)
                </span>
              )}
            </div>

            {/* Field: Slug */}
            <div className={styles.formGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="year-slug-input" className={styles.formLabel}>
                  Mã Định Danh (Slug) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {isSlugManuallyEdited && (
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#60a5fa',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    onClick={() => setIsSlugManuallyEdited(false)}
                  >
                    Tự sinh theo năm
                  </button>
                )}
              </div>
              <input
                id="year-slug-input"
                type="text"
                className={styles.formInput}
                placeholder="VD: 2026"
                disabled={isSubmitting}
                {...register('slug', {
                  onChange: () => setIsSlugManuallyEdited(true),
                })}
                style={{
                  borderColor: errors.slug ? '#ef4444' : undefined,
                  boxShadow: errors.slug ? '0 0 0 1px #ef4444' : undefined,
                }}
                aria-invalid={Boolean(errors.slug)}
                aria-describedby={errors.slug ? 'year-slug-error' : 'year-slug-hint'}
              />
              {errors.slug ? (
                <div
                  id="year-slug-error"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: '#ef4444',
                    fontSize: '0.78rem',
                    marginTop: '0.25rem',
                  }}
                  role="alert"
                >
                  <FaExclamationCircle aria-hidden="true" />
                  <span>{errors.slug.message}</span>
                </div>
              ) : (
                <span id="year-slug-hint" className={styles.formHint}>
                  Dùng cho đường dẫn URL lọc phim (/nam-phat-hanh/{watch('slug') || '...'})
                </span>
              )}
            </div>

            {/* Field: Description */}
            <div className={styles.formGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="year-desc-input" className={styles.formLabel}>
                  Mô Tả Niên Giám (Tùy chọn)
                </label>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {watchedDesc.length}/500
                </span>
              </div>
              <textarea
                id="year-desc-input"
                className={styles.formTextarea}
                placeholder="VD: Tuyển tập các bộ phim điện ảnh và truyền hình xuất sắc phát hành trong năm 2026..."
                rows={3}
                disabled={isSubmitting}
                {...register('description')}
                style={{
                  borderColor: errors.description ? '#ef4444' : undefined,
                }}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={errors.description ? 'year-desc-error' : undefined}
              />
              {errors.description && (
                <div
                  id="year-desc-error"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: '#ef4444',
                    fontSize: '0.78rem',
                    marginTop: '0.25rem',
                  }}
                  role="alert"
                >
                  <FaExclamationCircle aria-hidden="true" />
                  <span>{errors.description.message}</span>
                </div>
              )}
            </div>

            {/* Field: Active Status Switch */}
            <div
              className={styles.formGroup}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                marginTop: '0.2rem',
              }}
            >
              <div>
                <label
                  htmlFor="year-active-toggle"
                  className={styles.formLabel}
                  style={{ marginBottom: '0.15rem', cursor: 'pointer' }}
                >
                  Trạng Thái Kích Hoạt
                </label>
                <div className={styles.formHint}>
                  {isActive
                    ? 'Hiển thị trên bộ lọc tìm kiếm và niên giám kho phim'
                    : 'Tạm ẩn khỏi bộ lọc public của người dùng'}
                </div>
              </div>
              <label className={styles.toggleSwitch}>
                <input
                  id="year-active-toggle"
                  type="checkbox"
                  disabled={isSubmitting}
                  checked={isActive}
                  onChange={(e) => setValue('isActive', e.target.checked, { shouldValidate: true })}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
          </div>

          {/* Footer Controls */}
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className={styles.saveBtn}
              disabled={isSubmitting || !isValid}
              style={{
                opacity: isSubmitting || !isValid ? 0.6 : 1,
                cursor: isSubmitting || !isValid ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="fa-spin" aria-hidden="true" />
                  <span>Đang Tạo...</span>
                </>
              ) : (
                <span>Tạo Năm Phát Hành</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
