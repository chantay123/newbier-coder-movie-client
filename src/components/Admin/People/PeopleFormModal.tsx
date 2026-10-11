// src/components/Admin/People/PeopleFormModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { FaTimes, FaCheckCircle } from 'react-icons/fa';
import styles from '@/styles/AdminPeople.module.css';
import { PersonItem } from './PeopleAwardsDrawer';

interface PeopleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (personData: Partial<PersonItem>) => void;
  initialData?: PersonItem | null;
  type: 'actors' | 'directors';
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

export default function PeopleFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  type
}: PeopleFormModalProps) {
  const [name, setName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [slug, setSlug] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [nationality, setNationality] = useState('');
  const [birthYear, setBirthYear] = useState<number | ''>('');
  const [bio, setBio] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isSlugTouched, setIsSlugTouched] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setOriginalName(initialData.originalName || '');
      setSlug(initialData.slug || '');
      setAvatarUrl(initialData.avatarUrl || '');
      setNationality(initialData.nationality || '');
      setBirthYear(initialData.birthYear || '');
      setBio(initialData.bio || '');
      setIsVerified(initialData.isVerified ?? false);
      setIsActive(initialData.isActive ?? true);
      setIsSlugTouched(true);
    } else {
      setName('');
      setOriginalName('');
      setSlug('');
      setAvatarUrl('');
      setNationality('');
      setBirthYear('');
      setBio('');
      setIsVerified(false);
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
      originalName: originalName.trim(),
      slug: slug.trim() || generateSlug(name),
      avatarUrl: avatarUrl.trim(),
      nationality: nationality.trim(),
      birthYear: typeof birthYear === 'number' ? birthYear : undefined,
      bio: bio.trim(),
      isVerified,
      isActive
    });
    onClose();
  };

  const typeLabel = type === 'actors' ? 'Diễn Viên' : 'Đạo Diễn';

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {initialData ? `Chỉnh Sửa ${typeLabel}` : `Thêm Mới ${typeLabel}`}
          </h3>
          <button className={styles.closeModalBtn} onClick={onClose} aria-label="Đóng">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tên tiếng Việt / Nghệ danh *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder={`VD: ${type === 'actors' ? 'Song Joong Ki' : 'Christopher Nolan'}`}
                  value={name}
                  onChange={handleNameChange}
                  required
                  autoFocus
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tên gốc / Tên tiếng Anh</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="VD: 송중기 / Christopher Nolan"
                  value={originalName}
                  onChange={(e) => setOriginalName(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Mã định danh (Slug) *</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="VD: song-joong-ki"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setIsSlugTouched(true);
                }}
                required
              />
              <span className={styles.formHint}>Đường dẫn hồ sơ nhân vật trên hệ thống</span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Đường dẫn Avatar (Ảnh đại diện)</label>
              <input
                type="url"
                className={styles.formInput}
                placeholder="https://image.tmdb.org/t/p/w500/..."
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Quốc tịch</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="VD: Hàn Quốc, Mỹ, Việt Nam..."
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Năm sinh</label>
                <input
                  type="number"
                  className={styles.formInput}
                  placeholder="VD: 1985"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value ? parseInt(e.target.value) : '')}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tiểu sử ngắn</label>
              <textarea
                className={styles.formTextarea}
                placeholder={`Tóm tắt sự nghiệp của ${typeLabel.toLowerCase()}...`}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.2rem' }}>
              {/* Verified Badge Checkbox */}
              <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', background: '#0a0a0c', padding: '0.65rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FaCheckCircle style={{ color: isVerified ? '#38bdf8' : '#6b7280' }} />
                  <label className={styles.formLabel} style={{ marginBottom: 0, cursor: 'pointer' }} htmlFor="verifiedCheck">
                    Tích xanh xác minh
                  </label>
                </div>
                <input
                  id="verifiedCheck"
                  type="checkbox"
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#38bdf8', cursor: 'pointer' }}
                />
              </div>

              {/* Status Switch */}
              <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', background: '#0a0a0c', padding: '0.65rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <label className={styles.formLabel} style={{ marginBottom: 0 }}>Hoạt động</label>
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
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Hủy Bỏ
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
