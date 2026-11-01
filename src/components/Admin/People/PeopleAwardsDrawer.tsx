// src/components/Admin/People/PeopleAwardsDrawer.tsx
'use client';

import React, { useState } from 'react';
import { FaTimes, FaTrophy, FaPlus, FaTrash } from 'react-icons/fa';
import styles from '@/styles/AdminPeople.module.css';
import { showCinemaAlert } from '@/features/shared/components/UI/CinemaAlert';

export interface AwardItem {
  id: string;
  name: string;
  year: number;
  category: string;
  movieName?: string;
}

export interface PersonItem {
  id: string;
  name: string;
  originalName?: string;
  birthName?: string;
  slug: string;
  avatarUrl?: string;
  profileImage?: string;
  coverImage?: string;
  gender?: 'male' | 'female' | 'other';
  nationality?: string;
  birthYear?: number;
  dateOfBirth?: string;
  placeOfBirth?: string;
  height?: number;
  debutYear?: number;
  knownFor?: string;
  bio?: string;
  biography?: string;
  socialMedia?: Record<string, string>;
  isVerified: boolean;
  isActive: boolean;
  awards: AwardItem[];
  movieCount?: number;
  popularity?: number;
  viewCount?: number;
  source?: string;
  externalId?: string;
}

interface PeopleAwardsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  person: PersonItem | null;
  onUpdateAwards: (personId: string, updatedAwards: AwardItem[]) => void;
}

export default function PeopleAwardsDrawer({
  isOpen,
  onClose,
  person,
  onUpdateAwards
}: PeopleAwardsDrawerProps) {
  const [awardName, setAwardName] = useState('');
  const [awardYear, setAwardYear] = useState<number | ''>(new Date().getFullYear());
  const [awardCategory, setAwardCategory] = useState('');
  const [movieName, setMovieName] = useState('');

  if (!isOpen || !person) return null;

  const handleAddAward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardName.trim()) return;

    const newAward: AwardItem = {
      id: `awd-${Date.now()}`,
      name: awardName.trim(),
      year: typeof awardYear === 'number' ? awardYear : new Date().getFullYear(),
      category: awardCategory.trim() || 'Thành tựu xuất sắc',
      movieName: movieName.trim()
    };

    const newAwards = [newAward, ...person.awards];
    onUpdateAwards(person.id, newAwards);

    showCinemaAlert(`Đã thêm giải thưởng "${newAward.name}" cho ${person.name}!`, 'cinema');

    // Reset input
    setAwardName('');
    setAwardCategory('');
    setMovieName('');
  };

  const handleDeleteAward = (awardId: string, awardTitle: string) => {
    const updated = person.awards.filter(a => a.id !== awardId);
    onUpdateAwards(person.id, updated);
    showCinemaAlert(`Đã xóa giải thưởng "${awardTitle}"`, 'warning');
  };

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div className={styles.drawerContent} onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className={styles.drawerHeader}>
          <h3 className={styles.drawerTitle}>
            <FaTrophy style={{ color: '#f59e0b' }} />
            <span>Giải Thưởng ({person.name})</span>
          </h3>
          <button className={styles.drawerCloseBtn} onClick={onClose} aria-label="Đóng">
            <FaTimes />
          </button>
        </div>

        {/* Drawer Body */}
        <div className={styles.drawerBody}>
          {/* Add New Award Form */}
          <form className={styles.addAwardBox} onSubmit={handleAddAward}>
            <h4 className={styles.addAwardTitle}>
              <FaPlus style={{ fontSize: '0.75rem', color: '#e50914' }} /> Thêm Giải Thưởng Mới
            </h4>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tên giải thưởng *</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="VD: Oscar, Quả Cầu Vàng, Baeksang..."
                value={awardName}
                onChange={(e) => setAwardName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Năm trao giải *</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={awardYear}
                  onChange={(e) => setAwardYear(e.target.value ? parseInt(e.target.value) : '')}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Phim đoạt giải</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="VD: Oppenheimer"
                  value={movieName}
                  onChange={(e) => setMovieName(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Hạng mục vinh danh</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="VD: Nam diễn viên chính xuất sắc nhất"
                value={awardCategory}
                onChange={(e) => setAwardCategory(e.target.value)}
              />
            </div>

            <button type="submit" className={styles.saveBtn} style={{ marginTop: '0.2rem' }}>
              + Lưu Giải Thưởng
            </button>
          </form>

          {/* Awards List */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
              Danh Sách Giải Thưởng Đã Đạt ({person.awards.length})
            </div>

            {person.awards.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280', background: '#18181c', borderRadius: '8px', fontSize: '0.82rem' }}>
                Chưa có hồ sơ giải thưởng nào được ghi nhận
              </div>
            ) : (
              <div className={styles.awardsList}>
                {person.awards.map((award) => (
                  <div key={award.id} className={styles.awardItem}>
                    <div className={styles.awardInfo}>
                      <div className={styles.awardName}>
                        🏆 {award.name} ({award.year})
                      </div>
                      <div className={styles.awardMeta}>
                        {award.category} {award.movieName && `• Phim: ${award.movieName}`}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={styles.deleteAwardBtn}
                      title="Xóa giải thưởng này"
                      onClick={() => handleDeleteAward(award.id, award.name)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
