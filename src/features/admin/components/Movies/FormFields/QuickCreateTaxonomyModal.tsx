// src/components/Admin/Movies/QuickCreateTaxonomyModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { FaTimes, FaPlus, FaTags, FaGlobeAmericas, FaUserTie } from 'react-icons/fa';
import styles from '@/styles/AdminTaxonomies.module.css';
import { showCinemaAlert } from '@/features/shared/components/UI/CinemaAlert';
import CreateActorModal from '@/features/admin/actors/components/CreateActorModal';

export type QuickCreateType = 'category' | 'country' | 'actor' | 'director';

interface QuickCreateTaxonomyModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: QuickCreateType;
  onCreated: (newItem: { id: string; name: string; slug: string; [key: string]: any }) => void;
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export default function QuickCreateTaxonomyModal({
  isOpen,
  onClose,
  type,
  onCreated,
}: QuickCreateTaxonomyModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [extraInfo, setExtraInfo] = useState('');
  const [isSlugTouched, setIsSlugTouched] = useState(false);

  useEffect(() => {
    setName('');
    setSlug('');
    setExtraInfo('');
    setIsSlugTouched(false);
  }, [isOpen, type]);

  if (!isOpen) return null;

  // Use the full-featured, accessible CreateActorModal when type is 'actor'
  if (type === 'actor') {
    return (
      <CreateActorModal
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={(created) => {
          onCreated(created);
        }}
      />
    );
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isSlugTouched) {
      setSlug(generateSlug(val));
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'category':
        return { label: 'Thể Loại Mới', icon: <FaTags style={{ color: '#e50914' }} /> };
      case 'country':
        return { label: 'Quốc Gia Mới', icon: <FaGlobeAmericas style={{ color: '#38bdf8' }} /> };
      case 'director':
        return { label: 'Đạo Diễn Mới', icon: <FaUserTie style={{ color: '#a855f7' }} /> };
      default:
        return { label: 'Mục Mới', icon: <FaPlus style={{ color: '#e50914' }} /> };
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalSlug = slug.trim() || generateSlug(name);
    const id = `${type.slice(0, 3)}-${Date.now()}`;

    const createdItem: any = {
      id,
      name: name.trim(),
      slug: finalSlug,
    };

    if (type === 'country') {
      createdItem.code = extraInfo.trim().toUpperCase() || 'VN';
    } else if (type === 'category') {
      createdItem.description = extraInfo.trim();
    } else {
      createdItem.nationality = extraInfo.trim();
    }

    onCreated(createdItem);
    showCinemaAlert(`Đã tạo nhanh ${getTitle().label.toLowerCase()}: "${name.trim()}"!`, 'cinema');
    onClose();
  };

  const { label, icon } = getTitle();

  return (
    <div className={styles.modalOverlay} onClick={onClose} style={{ zIndex: 1100 }}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {icon}
            <span>+ Tạo Nhanh {label}</span>
          </h3>
          <button type="button" className={styles.closeModalBtn} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tên {label.toLowerCase()}:</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder={`Nhập tên ${label.toLowerCase()}...`}
                value={name}
                onChange={handleNameChange}
                autoFocus
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Đường dẫn (Slug):</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="slug-tu-dong"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setIsSlugTouched(true);
                }}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                {type === 'country' ? 'Mã quốc gia (VD: US, VN):' : 'Thông tin thêm (Mô tả):'}
              </label>
              <input
                type="text"
                className={styles.formInput}
                placeholder={type === 'country' ? 'VN, US, KR...' : 'Mô tả ngắn gọn...'}
                value={extraInfo}
                onChange={(e) => setExtraInfo(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className={styles.saveBtn} disabled={!name.trim()}>
              Tạo Ngay
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
