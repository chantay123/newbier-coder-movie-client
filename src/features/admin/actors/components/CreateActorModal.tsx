/**
 * @file CreateActorModal.tsx
 * @description Accessible, Cinema Dark styled modal dialog for adding a new actor.
 * Includes interactive gender selection, image upload with live preview,
 * automated DiceBear vector avatar generation, calendar picker for DOB,
 * year dropdown selection, searchable nationality combobox, and verified badge toggle.
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
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
  FaChevronDown,
  FaCheck,
  FaCheckCircle,
} from 'react-icons/fa';
import styles from '@/styles/AdminTaxonomies.module.css';
import peopleStyles from '@/styles/AdminPeople.module.css';
import { useCreateActorForm } from '@/features/admin/actors/hooks/useCreateActorForm';
import { ActorEntity } from '@/features/admin/actors/types/actor.types';
import {
  ADMIN_ACTOR_CONSTANTS,
  POPULAR_COUNTRIES,
  ACTOR_YEAR_OPTIONS,
} from '@/constants/adminActorConstants';
import { getCountryList, CountryItem } from '@/services/countryService';
import CinemaDatePicker from '@/features/admin/components/Common/CinemaDatePicker';
import CinemaDropdown, {
  CinemaDropdownOption,
} from '@/features/admin/components/Common/CinemaDropdown';

export interface CreateActorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (actor: ActorEntity) => void;
  initialData?: ActorEntity | null;
  mode?: 'create' | 'update';
}

export default function CreateActorModal({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
  mode = initialData ? 'update' : 'create',
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
    isEditMode,
  } = useCreateActorForm({ isOpen, onClose, onSuccess, initialData, mode });

  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countryList, setCountryList] = useState<CountryItem[]>(
    POPULAR_COUNTRIES.map((c) => ({
      code: c.code,
      nameVi: c.nameVi,
      nameEn: c.nameEn,
      flag: c.flag,
    }))
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const countryComboboxRef = useRef<HTMLDivElement>(null);

  // Load complete country list from RestCountries API (via countryService)
  useEffect(() => {
    let isMounted = true;
    getCountryList().then((list) => {
      if (isMounted && list && list.length > 0) {
        setCountryList(list);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const watchedBio = watch('biography') || '';
  const watchedDateOfBirth = watch('dateOfBirth') || '';
  const watchedNationality = watch('nationality') || '';
  const watchedIsVerified = watch('isVerified');

  // Filter countries for searchable combobox
  const filteredCountries = useMemo(() => {
    if (!watchedNationality.trim()) return countryList;
    const query = watchedNationality.toLowerCase().trim();
    const matches = countryList.filter(
      (c) =>
        c.nameVi.toLowerCase().includes(query) ||
        c.nameEn.toLowerCase().includes(query) ||
        c.code.toLowerCase().includes(query)
    );
    return matches.length > 0 ? matches : countryList;
  }, [watchedNationality, countryList]);

  // Debut year options for CinemaDropdown
  const currentYear = new Date().getFullYear();
  const debutYearOptions: CinemaDropdownOption[] = useMemo(() => {
    return [
      { value: '', label: '-- Chọn năm ra mắt --' },
      ...ACTOR_YEAR_OPTIONS.map((y) => ({
        value: y,
        label: `Năm ${y}`,
        desc: y >= currentYear ? 'Phim mới / Sắp chiếu' : undefined,
      })),
    ];
  }, [currentYear]);

  // Click outside to close country dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryComboboxRef.current && !countryComboboxRef.current.contains(e.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
                {isEditMode ? 'Cập Nhật Thông Tin Diễn Viên' : 'Thêm Mới Diễn Viên'}
              </h2>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: '#9ca3af' }}>
                {isEditMode
                  ? 'Chỉnh sửa và cập nhật hồ sơ chi tiết của diễn viên'
                  : 'Nhập thông tin hồ sơ diễn viên, tải lên hoặc tự động sinh avatar vector'}
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

                {/* Badge indicator on avatar */}
                {watchedIsVerified ? (
                  <span
                    className={peopleStyles.verifiedAvatarCircle}
                    title="Hồ sơ đã được cấp Tích Xanh Xác Minh (Verified)"
                    aria-label="Tích xanh xác minh"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className={peopleStyles.verifiedCheckIcon}
                      aria-hidden="true"
                    >
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </span>
                ) : (
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
                )}
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
                    title="Đổi avatar vector ngẫu nhiên khác"
                  >
                    <FaMagic size={11} />
                    <span>Đổi Avatar Ngẫu Nhiên</span>
                  </button>

                  {/* Revert to auto if custom uploaded */}
                  {isCustomUploaded && (
                    <button
                      type="button"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.4rem 0.8rem',
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
                  placeholder="VD: Song Joong Ki, Tom Holland..."
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
                  placeholder="VD: song-joong-ki"
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

            {/* Row: Ngày sinh (Cinema Calendar) & Chiều cao & Năm Ra Mắt (Dropdown) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              {/* Ngày sinh */}
              <div>
                <label className={styles.formLabel}>
                  <span className={styles.labelTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FaCalendarAlt size={11} /> Ngày Sinh
                  </span>
                </label>
                <CinemaDatePicker
                  value={watchedDateOfBirth}
                  onChange={(newDate) => setValue('dateOfBirth', newDate, { shouldValidate: true })}
                  placeholder="Chọn hoặc gõ (YYYY-MM-DD)..."
                  disabled={isSubmitting}
                />
                <span style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.25rem', display: 'block' }}>
                  Lịch cinema chọn nhanh năm/tháng hoặc gõ tay
                </span>
              </div>

              {/* Chiều cao */}
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
                  className={`${styles.formInput} ${peopleStyles.heightNumberInput} ${errors.height ? styles.inputError : ''}`}
                  placeholder="VD: 173"
                  {...register('height')}
                  onWheel={(e) => e.currentTarget.blur()}
                  disabled={isSubmitting}
                />
                {errors.height && (
                  <div className={styles.errorMessage} style={{ fontSize: '0.72rem', marginTop: '0.25rem' }}>
                    {errors.height.message}
                  </div>
                )}
              </div>

              {/* Năm Ra Mắt (Cinema Dropdown) */}
              <div>
                <label className={styles.formLabel}>
                  <span className={styles.labelTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FaStar size={11} /> Năm Ra Mắt
                  </span>
                </label>
                <CinemaDropdown
                  options={debutYearOptions}
                  value={watch('debutYear') ?? ''}
                  onChange={(val) =>
                    setValue('debutYear', val === '' ? undefined : Number(val), {
                      shouldValidate: true,
                    })
                  }
                  placeholder="-- Chọn năm ra mắt --"
                  prefixIcon={<FaStar size={11} color="#f59e0b" />}
                  size="form"
                  fullWidth
                  searchable
                  searchPlaceholder="Tìm kiếm năm (VD: 2020)..."
                  hasError={Boolean(errors.debutYear)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Row: Quốc tịch (Searchable Dropdown) & Tác phẩm tiêu biểu */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className={styles.formLabel}>
                  <span className={styles.labelTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FaGlobeAmericas size={11} /> Quốc Tịch
                  </span>
                </label>
                <div className={peopleStyles.countryComboboxWrapper} ref={countryComboboxRef}>
                  <input
                    type="text"
                    className={`${styles.formInput} ${peopleStyles.countryInput}`}
                    placeholder="Gõ tìm hoặc chọn quốc gia..."
                    value={watchedNationality}
                    onChange={(e) => {
                      setValue('nationality', e.target.value, { shouldValidate: true });
                      setIsCountryDropdownOpen(true);
                    }}
                    onFocus={() => setIsCountryDropdownOpen(true)}
                    disabled={isSubmitting}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className={peopleStyles.countryToggleBtn}
                    onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                    disabled={isSubmitting}
                    tabIndex={-1}
                    title="Danh sách quốc gia"
                  >
                    <FaChevronDown
                      size={10}
                      style={{
                        transform: isCountryDropdownOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isCountryDropdownOpen && (
                    <ul className={peopleStyles.countryDropdownMenu} role="listbox">
                      {filteredCountries.map((c) => (
                        <li
                          key={c.code}
                          className={`${peopleStyles.countryOption} ${watchedNationality === c.nameVi ? peopleStyles.countryOptionActive : ''}`}
                          onClick={() => {
                            setValue('nationality', c.nameVi, { shouldValidate: true });
                            setIsCountryDropdownOpen(false);
                          }}
                          role="option"
                          aria-selected={watchedNationality === c.nameVi}
                        >
                          <span>{c.flag} {c.nameVi} ({c.nameEn})</span>
                          {watchedNationality === c.nameVi && <FaCheck size={11} color="#e50914" />}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
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

            {/* Status & Verification Checkboxes */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '1rem',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', color: '#e2e8f0' }}>
                <input
                  type="checkbox"
                  {...register('isVerified')}
                  style={{ accentColor: '#0284c7', width: 16, height: 16, cursor: 'pointer' }}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <FaCheckCircle color="#0284c7" size={13} /> Tích xanh xác minh (Verified)
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', color: '#e2e8f0' }}>
                <input
                  type="checkbox"
                  {...register('isActive')}
                  style={{ accentColor: '#e50914', width: 16, height: 16, cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 600 }}>Trạng thái hoạt động</span>
              </label>
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
                <span>{isEditMode ? 'Cập Nhật Diễn Viên' : 'Lưu Diễn Viên'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
