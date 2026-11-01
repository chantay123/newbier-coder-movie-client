/**
 * @file CreateActorModal.tsx
 * @description Accessible, Cinema Dark styled modal dialog for adding a new actor.
 * Includes interactive gender selection, image upload with live preview,
 * automated DiceBear vector avatar generation, and comprehensive biographical fields.
 */

import React, { useRef, useEffect } from 'react';
import {
  FaTimes,
  FaUserTie,
  FaUpload,
  FaMagic,
  FaUndo,
  FaSpinner,
  FaExclamationCircle,
  FaMars,
  FaVenus,
  FaGenderless,
  FaCalendarAlt,
  FaGlobeAmericas,
  FaRulerVertical,
  FaStar,
  FaLock,
  FaUnlock,
  FaInstagram,
  FaFacebook,
  FaTwitter,
  FaImdb,
  FaGlobe,
} from 'react-icons/fa';
import styles from '@/styles/AdminTaxonomies.module.css';
import { useCreateActorForm } from '@/features/admin/actors/hooks/useCreateActorForm';
import { ActorEntity } from '@/features/admin/actors/types/actor.types';
import { ADMIN_ACTOR_CONSTANTS } from '@/constants/adminActorConstants';

export interface CreateActorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (created: ActorEntity) => void;
}

export default function CreateActorModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateActorModalProps) {
  const {
    register,
    handleSubmit,
    errors,
    isSubmitting,
    avatarPreview,
    isCustomUploaded,
    watchedGender,
    watchedName,
    isSlugManuallyEdited,
    setIsSlugManuallyEdited,
    handleNameChange,
    handleFileUpload,
    handleRegenerateAvatar,
    handleResetToAutoAvatar,
    setValue,
    watch,
  } = useCreateActorForm({ isOpen, onClose, onSuccess });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus on name input on mount
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle ESC key press to close safely
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const watchedBio = watch('biography') || '';

  return (
    <div
      className={styles.modalOverlay}
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
      role="presentation"
      style={{ zIndex: 1100 }}
    >
      <div
        className={styles.modalContent}
        style={{ maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-actor-modal-title"
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                background: 'rgba(229, 9, 20, 0.15)',
                border: '1px solid rgba(229, 9, 20, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e50914',
                fontSize: '1rem',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <FaUserTie />
            </div>
            <div>
              <h2
                id="create-actor-modal-title"
                className={styles.modalTitle}
                style={{ fontSize: '1.1rem', color: '#f8fafc', margin: 0 }}
              >
                Thêm Mới Diễn Viên
              </h2>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: '#9ca3af' }}>
                Nhập thông tin hồ sơ diễn viên, tải lên hoặc tự động sinh avatar vector
              </p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.modalBody} style={{ padding: '1.25rem' }}>
            {/* ================= SECTION: AVATAR & IMAGE UPLOAD ================= */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                marginBottom: '1.25rem',
              }}
            >
              {/* Avatar Preview Box */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: '#111723',
                    border: '2px solid rgba(229, 9, 20, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  {avatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarPreview}
                      alt={watchedName || 'Ảnh đại diện diễn viên'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <FaUserTie style={{ fontSize: '2rem', color: '#4b5563' }} />
                  )}
                </div>

                {/* Badge indicator */}
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    background: isCustomUploaded ? '#16a34a' : '#e50914',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.4rem',
                    borderRadius: '9999px',
                    border: '2px solid #0a0a0c',
                  }}
                  title={isCustomUploaded ? 'Ảnh do quản trị viên tải lên' : 'Ảnh sinh tự động theo giới tính'}
                >
                  {isCustomUploaded ? 'Ảnh tải lên' : 'Tự động'}
                </span>
              </div>

              {/* Avatar Controls */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f3f4f6', marginBottom: '0.25rem' }}>
                  Ảnh Đại Diện Diễn Viên
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.65rem', lineHeight: 1.4 }}>
                  {isCustomUploaded
                    ? 'Bạn đã tải lên ảnh đại diện tùy chỉnh. Có thể tải ảnh khác hoặc chuyển về sinh tự động.'
                    : 'Hệ thống tự động sinh avatar vector chất lượng cao theo giới tính nếu bạn không tải ảnh lên.'}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                      e.target.value = '';
                    }}
                  />

                  {/* Upload Button */}
                  <button
                    type="button"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.4rem 0.8rem',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FaUpload size={11} />
                    <span>{isCustomUploaded ? 'Đổi Ảnh Khác' : 'Tải Ảnh Lên'}</span>
                  </button>

                  {/* Re-generate Vector Avatar */}
                  <button
                    type="button"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.4rem 0.8rem',
                      background: 'rgba(229, 9, 20, 0.12)',
                      border: '1px solid rgba(229, 9, 20, 0.35)',
                      borderRadius: '6px',
                      color: '#f87171',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={handleRegenerateAvatar}
                    title="Sinh ngẫu nhiên avatar vector mới phong cách Adventurer"
                  >
                    <FaMagic size={11} />
                    <span>Đổi Avatar Ngẫu Nhiên</span>
                  </button>

                  {/* Revert if uploaded */}
                  {isCustomUploaded && (
                    <button
                      type="button"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.4rem 0.75rem',
                        background: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '6px',
                        color: '#9ca3af',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                      }}
                      onClick={handleResetToAutoAvatar}
                    >
                      <FaUndo size={10} />
                      <span>Dùng Avatar Tự Động</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ================= SECTION: CORE INFO ================= */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              {/* Tên diễn viên */}
              <div>
                <label className={styles.formLabel}>
                  <span className={styles.labelTitle}>
                    Tên Diễn Viên <span className={styles.requiredAsterisk}>*</span>
                  </span>
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  className={`${styles.formInput} ${errors.name ? styles.inputError : ''}`}
                  placeholder="VD: Dương Quốc Nam, Tom Holland..."
                  value={watch('name')}
                  onChange={handleNameChange}
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && (
                  <div className={styles.errorMessage} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.35rem' }}>
                    <FaExclamationCircle size={11} />
                    <span>{errors.name.message}</span>
                  </div>
                )}
              </div>

              {/* Slug */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className={styles.formLabel}>
                    <span className={styles.labelTitle}>
                      Mã Định Danh (Slug) <span className={styles.requiredAsterisk}>*</span>
                    </span>
                  </label>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '0.72rem', cursor: 'pointer', padding: 0 }}
                    onClick={() => setIsSlugManuallyEdited((prev) => !prev)}
                    title={isSlugManuallyEdited ? 'Đang chỉnh sửa thủ công' : 'Đang tự động sinh từ tên'}
                  >
                    {isSlugManuallyEdited ? <FaUnlock size={10} /> : <FaLock size={10} />}{' '}
                    {isSlugManuallyEdited ? 'Tự Do' : 'Tự Động'}
                  </button>
                </div>
                <input
                  type="text"
                  className={`${styles.formInput} ${errors.slug ? styles.inputError : ''}`}
                  placeholder="VD: duong-quoc-nam"
                  {...register('slug', {
                    onChange: () => setIsSlugManuallyEdited(true),
                  })}
                  aria-invalid={Boolean(errors.slug)}
                />
                {errors.slug && (
                  <div className={styles.errorMessage} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.35rem' }}>
                    <FaExclamationCircle size={11} />
                    <span>{errors.slug.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Giới tính Selection (Nam / Nữ / Khác) */}
            <div style={{ marginBottom: '1rem' }}>
              <label className={styles.formLabel}>
                <span className={styles.labelTitle}>
                  Giới Tính <span className={styles.requiredAsterisk}>*</span>
                </span>
                <span style={{ fontSize: '0.74rem', color: '#9ca3af', marginLeft: '0.5rem' }}>
                  (Tự động điều chỉnh kiểu tóc và nét mặt vector)
                </span>
              </label>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {[
                  { value: 'male', label: 'Nam (Male)', icon: <FaMars style={{ color: '#38bdf8' }} /> },
                  { value: 'female', label: 'Nữ (Female)', icon: <FaVenus style={{ color: '#ec4899' }} /> },
                  { value: 'other', label: 'Khác (Other)', icon: <FaGenderless style={{ color: '#a855f7' }} /> },
                ].map((item) => {
                  const isChecked = watchedGender === item.value;
                  return (
                    <label
                      key={item.value}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        background: isChecked ? 'rgba(229, 9, 20, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${isChecked ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`,
                        color: isChecked ? '#ffffff' : '#9ca3af',
                        fontSize: '0.82rem',
                        fontWeight: isChecked ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="radio"
                        value={item.value}
                        {...register('gender')}
                        style={{ display: 'none' }}
                      />
                      {item.icon}
                      <span>{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Row: Ngày sinh & Chiều cao */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className={styles.formLabel}>
                  <span className={styles.labelTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FaCalendarAlt size={11} /> Ngày Sinh
                  </span>
                </label>
                <input
                  type="date"
                  className={styles.formInput}
                  {...register('dateOfBirth')}
                />
              </div>

              <div>
                <label className={styles.formLabel}>
                  <span className={styles.labelTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FaRulerVertical size={11} /> Chiều Cao (cm)
                  </span>
                </label>
                <input
                  type="number"
                  min="50"
                  max="260"
                  className={`${styles.formInput} ${errors.height ? styles.inputError : ''}`}
                  placeholder="VD: 173"
                  {...register('height')}
                />
                {errors.height && (
                  <div className={styles.errorMessage} style={{ fontSize: '0.72rem', marginTop: '0.25rem' }}>
                    {errors.height.message}
                  </div>
                )}
              </div>

              <div>
                <label className={styles.formLabel}>
                  <span className={styles.labelTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FaStar size={11} /> Năm Ra Mắt
                  </span>
                </label>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 2}
                  className={`${styles.formInput} ${errors.debutYear ? styles.inputError : ''}`}
                  placeholder="VD: 2012"
                  {...register('debutYear')}
                />
              </div>
            </div>

            {/* Row: Quốc tịch & Tác phẩm tiêu biểu */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className={styles.formLabel}>
                  <span className={styles.labelTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FaGlobeAmericas size={11} /> Quốc Tịch
                  </span>
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="VD: Việt Nam, British, American..."
                  {...register('nationality')}
                />
              </div>

              <div>
                <label className={styles.formLabel}>
                  <span className={styles.labelTitle}>Nổi Tiếng Với (Known For)</span>
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="VD: Spider-Man, Mắt Biếc, Mai..."
                  {...register('knownFor')}
                />
              </div>
            </div>

            {/* Biography */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className={styles.formLabel}>
                  <span className={styles.labelTitle}>Tiểu Sử Diễn Viên</span>
                </label>
                <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                  {watchedBio.length} / {ADMIN_ACTOR_CONSTANTS.VALIDATION.MAX_BIO_LENGTH}
                </span>
              </div>
              <textarea
                className={`${styles.formTextarea} ${errors.biography ? styles.inputError : ''}`}
                rows={3}
                placeholder="Tóm tắt quá trình hoạt động nghệ thuật, giải thưởng tiêu biểu..."
                {...register('biography')}
              />
              {errors.biography && (
                <div className={styles.errorMessage} style={{ fontSize: '0.72rem', marginTop: '0.25rem' }}>
                  {errors.biography.message}
                </div>
              )}
            </div>

            {/* Social Media Details */}
            <div
              style={{
                padding: '0.85rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                marginBottom: '0.5rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.65rem' }}>
                Liên Kết Mạng Xã Hội (Tùy chọn)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <FaInstagram style={{ color: '#e1306c', flexShrink: 0 }} />
                  <input
                    type="url"
                    className={styles.formInput}
                    style={{ height: 32, fontSize: '0.78rem' }}
                    placeholder="Instagram URL"
                    {...register('socialMedia.instagram')}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <FaFacebook style={{ color: '#1877f2', flexShrink: 0 }} />
                  <input
                    type="url"
                    className={styles.formInput}
                    style={{ height: 32, fontSize: '0.78rem' }}
                    placeholder="Facebook URL"
                    {...register('socialMedia.facebook')}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <FaTwitter style={{ color: '#1da1f2', flexShrink: 0 }} />
                  <input
                    type="url"
                    className={styles.formInput}
                    style={{ height: 32, fontSize: '0.78rem' }}
                    placeholder="X / Twitter URL"
                    {...register('socialMedia.twitter')}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <FaImdb style={{ color: '#f5c518', flexShrink: 0 }} />
                  <input
                    type="url"
                    className={styles.formInput}
                    style={{ height: 32, fontSize: '0.78rem' }}
                    placeholder="IMDb Profile URL"
                    {...register('socialMedia.imdb')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
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
              disabled={isSubmitting}
              className={styles.saveBtn}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                minWidth: '130px',
                justifyContent: 'center',
              }}
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className={styles.spinAnimation} />
                  <span>Đang Lưu...</span>
                </>
              ) : (
                <span>Lưu Diễn Viên</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
