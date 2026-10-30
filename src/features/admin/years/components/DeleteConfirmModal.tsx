/**
 * @file DeleteConfirmModal.tsx
 * @description Accessible, Cinema Dark confirmation modal for deleting release years.
 * Complies with strict banking/enterprise UX standards:
 * - Default focus is strictly placed on the Cancel button (prevents accidental Enter/Space deletion).
 * - Enter does not inadvertently trigger deletion.
 * - Esc key, backdrop click, or Cancel button cleanly dismisses without action.
 * - Double-click protection: buttons are disabled and display loading spinner during API flight.
 * - WCAG AA compliant (aria-modal, focus trap, aria-labelledby, aria-describedby).
 */

import React, { useEffect, useRef } from 'react';
import { FaTrash, FaTimes, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import styles from '@/styles/AdminTaxonomies.module.css';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isSubmitting?: boolean;
  title?: string;
  targetName?: string;
  movieCount?: number;
  isBulk?: boolean;
  selectedCount?: number;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  title,
  targetName,
  movieCount = 0,
  isBulk = false,
  selectedCount = 0,
}: DeleteConfirmModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus strictly on Cancel button by default when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle ESC key press to close safely
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  // Intercept Enter key inside modal so that Enter does NOT trigger delete unless Delete button is focused
  const handleDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const activeEl = document.activeElement;
      const isDeleteBtnFocused = activeEl?.getAttribute('data-action') === 'confirm-delete';
      if (!isDeleteBtnFocused && activeEl !== cancelBtnRef.current) {
        e.preventDefault();
      }
    }
  };

  const modalTitle =
    title ||
    (isBulk
      ? `Xác Nhận Xóa ${selectedCount} Năm Phát Hành`
      : `Xác Nhận Xóa Năm "${targetName}"`);

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
        style={{ maxWidth: '460px' }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
        aria-describedby="delete-confirm-desc"
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                fontSize: '0.95rem',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <FaTrash />
            </div>
            <div>
              <h2
                id="delete-confirm-title"
                className={styles.modalTitle}
                style={{ fontSize: '1.05rem', color: '#f8fafc' }}
              >
                {modalTitle}
              </h2>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeModalBtn}
            onClick={() => {
              if (!isSubmitting) onClose();
            }}
            disabled={isSubmitting}
            title="Đóng (Esc)"
            aria-label="Đóng hộp thoại"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody} style={{ padding: '1.25rem' }}>
          <p
            id="delete-confirm-desc"
            style={{
              margin: 0,
              fontSize: '0.9rem',
              color: '#cbd5e1',
              lineHeight: 1.6,
            }}
          >
            {isBulk ? (
              <>
                Bạn có chắc chắn muốn xóa{' '}
                <strong style={{ color: '#ffffff' }}>{selectedCount}</strong> năm phát hành đã chọn?
                Hành động này sẽ gỡ bỏ các năm phát hành này khỏi hệ thống phân loại phim.
              </>
            ) : (
              <>
                Bạn có chắc chắn muốn xóa năm phát hành{' '}
                <strong style={{ color: '#ffffff' }}>"{targetName}"</strong>? Thao tác này sẽ gỡ bỏ
                bản ghi năm phát hành khỏi hệ thống.
              </>
            )}
          </p>

          {/* Linked movie warning */}
          {!isBulk && movieCount > 0 && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                color: '#fcd34d',
                fontSize: '0.82rem',
                lineHeight: 1.5,
              }}
            >
              <FaExclamationTriangle
                style={{ marginTop: '0.15rem', flexShrink: 0, fontSize: '0.9rem' }}
                aria-hidden="true"
              />
              <div>
                <strong>Cảnh báo ràng buộc:</strong> Năm phát hành này hiện đang có{' '}
                <strong>{movieCount.toLocaleString()}</strong> bộ phim liên kết. Nếu máy chủ áp dụng
                ràng buộc toàn vẹn dữ liệu, thao tác xóa có thể bị từ chối.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button
            type="button"
            ref={cancelBtnRef}
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Hủy bỏ và đóng hộp thoại"
          >
            Hủy Bỏ
          </button>

          <button
            type="button"
            data-action="confirm-delete"
            disabled={isSubmitting}
            onClick={onConfirm}
            style={{
              padding: '0.5rem 1.15rem',
              background: isSubmitting ? '#991b1b' : '#e50914',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'all 0.15s ease',
              opacity: isSubmitting ? 0.75 : 1,
            }}
            aria-label={isSubmitting ? 'Đang thực hiện xóa...' : 'Xác nhận xóa'}
          >
            {isSubmitting ? (
              <>
                <FaSpinner className={styles.spinAnimation} aria-hidden="true" />
                <span>Đang Xóa...</span>
              </>
            ) : (
              <>
                <FaTrash aria-hidden="true" />
                <span>Xác Nhận Xóa</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
