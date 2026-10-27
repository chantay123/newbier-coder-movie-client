/**
 * @file EditYearModal.tsx
 * @description Enterprise-grade modal dialog for editing an existing release year.
 * Complies with WCAG AA accessibility standards.
 * Features:
 * - Zod validation with React Hook Form
 * - Dirty state tracking (Save enabled only when form is valid & dirty)
 * - Safe close confirmation if user has unsaved changes
 * - Reset to original data button
 * - In-form error banner for 404, 401/403, and 500/timeout with Retry & Check Status actions
 * - Anti-double-submit protection
 */

import React, { useEffect, useRef } from 'react';
import {
  FaTimes,
  FaPen,
  FaSpinner,
  FaExclamationCircle,
  FaRedo,
  FaExclamationTriangle,
  FaCheckCircle,
} from 'react-icons/fa';
import styles from '@/styles/AdminTaxonomies.module.css';
import { useEditYearForm } from '@/features/admin/years/hooks/useEditYearForm';
import { YearEntity } from '@/features/admin/years/types/year.types';

export interface EditYearModalProps {
  isOpen: boolean;
  year: YearEntity | null;
  onClose: () => void;
  onSuccess?: (updated: YearEntity) => void;
}

export default function EditYearModal({ isOpen, year, onClose, onSuccess }: EditYearModalProps) {
  const {
    register,
    handleSubmit,
    errors,
    isValid,
    isDirty,
    isSubmitting,
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
  } = useEditYearForm({ isOpen, year, onClose, onSuccess });

  const modalRef = useRef<HTMLDivElement>(null);

  // Close on ESC key press with dirty check
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        handleRequestClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, handleRequestClose]);

  if (!isOpen || !year) return null;

  const watchedDesc = watch('description') || '';
  const isActive = watch('isActive');

  const isTimeoutError =
    submitError?.code === 'ECONNABORTED' ||
    submitError?.statusCode === 504 ||
    submitError?.message?.toLowerCase().includes('timeout');

  return (
    <>
      <div
        className={styles.modalOverlay}
        onClick={handleRequestClose}
        role="presentation"
      >
        <div
          className={styles.modalContent}
          ref={modalRef}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-year-modal-title"
        >
          {/* Header */}
          <div className={styles.modalHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60a5fa',
                  fontSize: '0.95rem',
                }}
                aria-hidden="true"
              >
                <FaPen />
              </div>
              <div>
                <h3 id="edit-year-modal-title" className={styles.modalTitle}>
                  Chỉnh Sửa Năm Phát Hành
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  ID: <code style={{ color: '#cbd5e1' }}>{year.id}</code>
                </span>
              </div>
            </div>
            <button
              type="button"
              className={styles.closeModalBtn}
              onClick={handleRequestClose}
              disabled={isSubmitting}
              aria-label="Đóng cửa sổ chỉnh sửa năm"
            >
              <FaTimes aria-hidden="true" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.modalBody}>
              {/* Error Banner with Retry & Status check for 500/timeout/404/401 */}
              {submitError && (
                <div
                  style={{
                    padding: '0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    fontSize: '0.82rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                  role="alert"
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <FaExclamationCircle style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                    <span style={{ lineHeight: 1.4 }}>{submitError.message}</span>
                  </div>

                  {/* Actions for network/timeout errors */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={handleRetry}
                      disabled={isSubmitting}
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: '6px',
                        background: 'rgba(239, 68, 68, 0.25)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <FaRedo aria-hidden="true" />
                      <span>Thử Lại</span>
                    </button>

                    {isTimeoutError && (
                      <button
                        type="button"
                        onClick={handleCheckStatus}
                        style={{
                          padding: '0.3rem 0.65rem',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#e2e8f0',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Kiểm Tra Lại Trạng Thái
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Field: Name */}
              <div className={styles.formGroup}>
                <label htmlFor="edit-year-name-input" className={styles.formLabel}>
                  Năm Phát Hành (Name) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  id="edit-year-name-input"
                  type="text"
                  className={styles.formInput}
                  placeholder="VD: 2026"
                  maxLength={4}
                  disabled={isSubmitting}
                  {...register('name')}
                  style={{
                    borderColor: errors.name ? '#ef4444' : undefined,
                    boxShadow: errors.name ? '0 0 0 1px #ef4444' : undefined,
                  }}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'edit-year-name-error' : undefined}
                />
                {errors.name && (
                  <div
                    id="edit-year-name-error"
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
                )}
              </div>

              {/* Field: Slug */}
              <div className={styles.formGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="edit-year-slug-input" className={styles.formLabel}>
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
                  id="edit-year-slug-input"
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
                  aria-describedby={errors.slug ? 'edit-year-slug-error' : 'edit-year-slug-hint'}
                />
                {errors.slug ? (
                  <div
                    id="edit-year-slug-error"
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
                  <span id="edit-year-slug-hint" className={styles.formHint}>
                    Đường dẫn liên kết: /nam-phat-hanh/{watch('slug') || '...'}
                  </span>
                )}
              </div>

              {/* Field: Description */}
              <div className={styles.formGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="edit-year-desc-input" className={styles.formLabel}>
                    Mô Tả Niên Giám (Tùy chọn)
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {watchedDesc.length}/500
                  </span>
                </div>
                <textarea
                  id="edit-year-desc-input"
                  className={styles.formTextarea}
                  placeholder="Mô tả tóm tắt về kho phim phát hành trong năm này..."
                  rows={3}
                  disabled={isSubmitting}
                  {...register('description')}
                  style={{
                    borderColor: errors.description ? '#ef4444' : undefined,
                  }}
                  aria-invalid={Boolean(errors.description)}
                />
                {errors.description && (
                  <div
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
                    htmlFor="edit-year-active-toggle"
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
                    id="edit-year-active-toggle"
                    type="checkbox"
                    disabled={isSubmitting}
                    checked={isActive}
                    onChange={(e) => setValue('isActive', e.target.checked, { shouldValidate: true, shouldDirty: true })}
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className={styles.modalFooter}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {/* Left action: Reset to Original button */}
              <button
                type="button"
                onClick={handleResetToOriginal}
                disabled={!isDirty || isSubmitting}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: isDirty && !isSubmitting ? '#cbd5e1' : '#64748b',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: isDirty && !isSubmitting ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease',
                }}
                title="Khôi phục các trường về dữ liệu ban đầu"
              >
                <FaRedo aria-hidden="true" style={{ fontSize: '0.75rem' }} />
                <span>Khôi Phục Gốc</span>
              </button>

              {/* Right actions: Cancel & Save */}
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={handleRequestClose}
                  disabled={isSubmitting}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={!isDirty || !isValid || isSubmitting}
                  style={{
                    opacity: !isDirty || !isValid || isSubmitting ? 0.5 : 1,
                    cursor: !isDirty || !isValid || isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: '#2563eb',
                  }}
                  title={
                    !isDirty
                      ? 'Chưa có thông tin nào thay đổi'
                      : !isValid
                      ? 'Vui lòng sửa các trường lỗi trước khi lưu'
                      : 'Lưu các thay đổi'
                  }
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="fa-spin" aria-hidden="true" />
                      <span>Đang Lưu...</span>
                    </>
                  ) : (
                    <>
                      <FaCheckCircle aria-hidden="true" />
                      <span>Lưu Thay Đổi</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Dirty Warning Confirmation Sub-Modal */}
      {showDirtyConfirm && (
        <div
          className={styles.modalOverlay}
          style={{ zIndex: 1100 }}
          onClick={handleCancelDiscard}
          role="presentation"
        >
          <div
            className={styles.modalContent}
            style={{ maxWidth: '420px', border: '1px solid rgba(245, 158, 11, 0.4)' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dirty-confirm-title"
          >
            <div className={styles.modalHeader} style={{ background: '#1c1917' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}>
                <FaExclamationTriangle />
                <h4 id="dirty-confirm-title" className={styles.modalTitle} style={{ fontSize: '0.98rem' }}>
                  Hủy Bỏ Các Thay Đổi?
                </h4>
              </div>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={handleCancelDiscard}
                aria-label="Đóng"
              >
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                Bạn đang có các thông tin đã chỉnh sửa nhưng chưa được lưu vào hệ thống. Nếu rời đi bây giờ,
                toàn bộ thay đổi của bạn sẽ bị hủy bỏ.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={handleCancelDiscard}
              >
                Ở Lại Tiếp Tục
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Rời Đi & Hủy Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
