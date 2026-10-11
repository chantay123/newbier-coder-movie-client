// src/components/Admin/People/PeopleDeleteModal.tsx
'use client';

import React from 'react';
import { FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import styles from '@/styles/AdminPeople.module.css';

interface PeopleDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  personName: string;
  type: 'actors' | 'directors';
}

export default function PeopleDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  personName,
  type
}: PeopleDeleteModalProps) {
  if (!isOpen) return null;

  const typeLabel = type === 'actors' ? 'diễn viên' : 'đạo diễn';

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle} style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaExclamationTriangle /> Xác Nhận Xóa
          </h3>
          <button className={styles.closeModalBtn} onClick={onClose} aria-label="Đóng">
            <FaTimes />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div style={{ textAlign: 'center', color: '#e2e8f0', fontSize: '0.86rem', lineHeight: '1.5' }}>
            Bạn có chắc chắn muốn xóa {typeLabel}: <strong style={{ color: '#ffffff' }}>"{personName}"</strong> không?
            <div style={{ marginTop: '0.5rem', color: '#9ca3af', fontSize: '0.78rem' }}>
              * Toàn bộ danh sách giải thưởng và liên kết vai diễn của người này sẽ bị gỡ bỏ khỏi hệ thống.
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Hủy Bỏ
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
          >
            Đồng Ý Xóa
          </button>
        </div>
      </div>
    </div>
  );
}
