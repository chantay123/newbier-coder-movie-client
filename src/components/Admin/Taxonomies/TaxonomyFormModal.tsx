// src/components/Admin/Taxonomies/TaxonomyFormModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import styles from '@/styles/AdminTaxonomies.module.css';

export interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  code?: string;
  flag?: string;
  movieCount: number;
  isActive: boolean;
  order?: number;
}

interface TaxonomyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<TaxonomyItem>) => void;
  initialData?: TaxonomyItem | null;
  type: 'categories' | 'countries' | 'formats' | 'years';
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

export default function TaxonomyFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  type
}: TaxonomyFormModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [flag, setFlag] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSlugTouched, setIsSlugTouched] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setSlug(initialData.slug || '');
      setDescription(initialData.description || '');
      setCode(initialData.code || '');
      setFlag(initialData.flag || '');
      setIsActive(initialData.isActive ?? true);
      setIsSlugTouched(true);
    } else {
      setName('');
      setSlug('');
      setDescription('');
      setCode('');
      setFlag('');
      setIsActive(true);
      setIsSlugTouched(false);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isSlugTouched) {
      setSlug(generateSlug(val));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: initialData ? initialData.id : undefined,
      name: name.trim(),
      slug: slug.trim() || generateSlug(name),
      description: description.trim(),
      code: code.trim(),
      flag: flag.trim(),
      isActive
    });
    onClose();
  };

  const getTypeName = () => {
    switch (type) {
      case 'categories': return 'Thể Loại';
      case 'countries': return 'Quốc Gia';
      case 'formats': return 'Định Dạng Phim';
      case 'years': return 'Năm Phát Hành';
      default: return 'Mục';
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {initialData ? `Chỉnh Sửa ${getTypeName()}` : `Thêm Mới ${getTypeName()}`}
          </h3>
          <button className={styles.closeModalBtn} onClick={onClose} aria-label="Đóng">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Tên hiển thị {type === 'years' ? '(Năm)' : ''} *
              </label>
              <input
                type={type === 'years' ? 'number' : 'text'}
                className={styles.formInput}
                placeholder={type === 'years' ? 'VD: 2026' : `Nhập tên ${getTypeName().toLowerCase()}...`}
                value={name}
                onChange={handleNameChange}
                required
                autoFocus
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Mã định danh (Slug) *</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="VD: hanh-dong"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setIsSlugTouched(true);
                }}
                required
              />
              <span className={styles.formHint}>Dùng làm URL trên website (tự sinh không dấu)</span>
            </div>

            {type === 'countries' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Mã Code (Alpha-2)</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="VD: US, KR, VN"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    maxLength={4}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Biểu tượng Cờ (Emoji)</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="VD: 🇺🇸, 🇰🇷, 🇻🇳"
                    value={flag}
                    onChange={(e) => setFlag(e.target.value)}
                  />
                </div>
              </div>
            )}

            {type === 'formats' && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Mã chuẩn (Format Code)</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="VD: SINGLE, SERIES, THEATER"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
              </div>
            )}

            {type !== 'years' && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Mô tả ngắn</label>
                <textarea
                  className={styles.formTextarea}
                  placeholder={`Mô tả tóm tắt về ${getTypeName().toLowerCase()} này...`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
              <div>
                <label className={styles.formLabel} style={{ marginBottom: 0 }}>Trạng thái hoạt động</label>
                <div className={styles.formHint}>Cho phép hiển thị trên thanh tìm kiếm và bộ lọc web</div>
              </div>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Hủy bỏ
            </button>
            <button type="submit" className={styles.saveBtn}>
              {initialData ? 'Cập Nhật' : 'Tạo Mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
