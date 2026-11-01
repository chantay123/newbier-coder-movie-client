// src/components/Admin/People/PeopleFormModal.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FaTimes,
  FaCheckCircle,
  FaUserTie,
  FaVideo,
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
  FaMapMarkerAlt,
} from 'react-icons/fa';
import styles from '@/styles/AdminPeople.module.css';
import { PersonItem } from './PeopleAwardsDrawer';
import { ADMIN_ACTOR_CONSTANTS, ActorGender } from '@/constants/adminActorConstants';
import { generateActorAvatar } from '@/features/admin/actors/utils/actorAvatarGenerator';
import { actorAdminService } from '@/features/admin/actors/services/actorAdminService';
import { toastNotification } from '@/utils/notification/toastNotification';
import { parseApiError } from '@/utils/errors/appError';

interface PeopleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (personData: Partial<PersonItem>) => void;
  initialData?: PersonItem | null;
  type: 'actors' | 'directors';
}

/**
 * Normalizes Vietnamese diacritics into URL-friendly slug
 */
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
  type,
}: PeopleFormModalProps) {
  // Form State
  const [name, setName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [gender, setGender] = useState<ActorGender>('male');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isCustomUploaded, setIsCustomUploaded] = useState(false);
  const [nationality, setNationality] = useState('Việt Nam');
  const [birthYear, setBirthYear] = useState<number | ''>('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [height, setHeight] = useState<number | ''>('');
  const [debutYear, setDebutYear] = useState<number | ''>('');
  const [knownFor, setKnownFor] = useState('');
  const [bio, setBio] = useState('');
  const [socialMedia, setSocialMedia] = useState({
    instagram: '',
    facebook: '',
    twitter: '',
    imdb: '',
    website: '',
  });
  const [isVerified, setIsVerified] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Validation & Submission State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset form state
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setOriginalName(initialData.originalName || initialData.birthName || '');
        setSlug(initialData.slug || '');
        setIsSlugManuallyEdited(true);
        setGender((initialData.gender as ActorGender) || 'male');
        setAvatarUrl(initialData.avatarUrl || initialData.profileImage || '');
        setIsCustomUploaded(Boolean(initialData.avatarUrl && !initialData.avatarUrl.startsWith('data:image/svg+xml')));
        setNationality(initialData.nationality || 'Việt Nam');
        setBirthYear(initialData.birthYear || '');
        setDateOfBirth(initialData.dateOfBirth || '');
        setPlaceOfBirth(initialData.placeOfBirth || '');
        setHeight(initialData.height || '');
        setDebutYear(initialData.debutYear || '');
        setKnownFor(initialData.knownFor || '');
        setBio(initialData.bio || initialData.biography || '');
        setSocialMedia({
          instagram: initialData.socialMedia?.instagram || '',
          facebook: initialData.socialMedia?.facebook || '',
          twitter: initialData.socialMedia?.twitter || '',
          imdb: initialData.socialMedia?.imdb || '',
          website: initialData.socialMedia?.website || '',
        });
        setIsVerified(initialData.isVerified ?? false);
        setIsActive(initialData.isActive ?? true);
      } else {
        const defaultAvatar = generateActorAvatar('new-person', 'male');
        setName('');
        setOriginalName('');
        setSlug('');
        setIsSlugManuallyEdited(false);
        setGender('male');
        setAvatarUrl(defaultAvatar);
        setIsCustomUploaded(false);
        setNationality('Việt Nam');
        setBirthYear('');
        setDateOfBirth('');
        setPlaceOfBirth('');
        setHeight('');
        setDebutYear('');
        setKnownFor('');
        setBio('');
        setSocialMedia({
          instagram: '',
          facebook: '',
          twitter: '',
          imdb: '',
          website: '',
        });
        setIsVerified(false);
        setIsActive(true);
      }
      setErrors({});
      setIsSubmitting(false);

      const focusTimer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(focusTimer);
    }
  }, [initialData, isOpen]);

  // Synchronize avatar automatically when name or gender changes (if not custom uploaded)
  useEffect(() => {
    if (!isOpen || isCustomUploaded) return;

    const seed = name && name.trim() ? name.trim() : 'actor-preview';
    const autoAvatar = generateActorAvatar(seed, gender);
    setAvatarUrl(autoAvatar);
  }, [isOpen, name, gender, isCustomUploaded]);

  // Handle ESC key press
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

  // Name change handler
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (errors.name) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.name;
        return next;
      });
    }

    if (!isSlugManuallyEdited) {
      setSlug(generateSlug(val));
      if (errors.slug) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.slug;
          return next;
        });
      }
    }
  };

  // Gender change handler
  const handleGenderChange = (newGender: ActorGender) => {
    setGender(newGender);
    if (!isCustomUploaded) {
      const seed = name && name.trim() ? name.trim() : 'actor-preview';
      const autoAvatar = generateActorAvatar(seed, newGender);
      setAvatarUrl(autoAvatar);
      toastNotification.info(ADMIN_ACTOR_CONSTANTS.MESSAGES.IMAGE_AUTO_GENERATED(newGender));
    }
  };

  // Image Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > ADMIN_ACTOR_CONSTANTS.VALIDATION.MAX_IMAGE_SIZE_BYTES) {
      toastNotification.error(ADMIN_ACTOR_CONSTANTS.MESSAGES.IMAGE_FILE_TOO_LARGE);
      e.target.value = '';
      return;
    }

    if (!ADMIN_ACTOR_CONSTANTS.VALIDATION.ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
      toastNotification.error(ADMIN_ACTOR_CONSTANTS.MESSAGES.IMAGE_FILE_INVALID_TYPE);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAvatarUrl(result);
        setIsCustomUploaded(true);
        toastNotification.success(ADMIN_ACTOR_CONSTANTS.MESSAGES.IMAGE_UPLOAD_SUCCESS);
      }
    };
    reader.readAsDataURL(file);
  };

  // Regenerate DiceBear Avatar with randomized seed
  const handleRegenerateAvatar = () => {
    const randomSeed = `${name || 'actor'}-${Math.random().toString(36).substring(2, 9)}`;
    const newAvatar = generateActorAvatar(randomSeed, gender);
    setAvatarUrl(newAvatar);
    setIsCustomUploaded(false);
    toastNotification.info(ADMIN_ACTOR_CONSTANTS.MESSAGES.IMAGE_AUTO_GENERATED(gender));
  };

  // Revert back to automatic avatar
  const handleResetToAutoAvatar = () => {
    const seed = name && name.trim() ? name.trim() : 'actor-preview';
    const autoAvatar = generateActorAvatar(seed, gender);
    setAvatarUrl(autoAvatar);
    setIsCustomUploaded(false);
    toastNotification.info('Đã hoàn tác về Avatar Vector tự động.');
  };

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < ADMIN_ACTOR_CONSTANTS.VALIDATION.MIN_NAME_LENGTH) {
      newErrors.name = ADMIN_ACTOR_CONSTANTS.MESSAGES.VALIDATION_NAME_REQUIRED;
    }

    const finalSlug = slug.trim() || generateSlug(name);
    if (!finalSlug) {
      newErrors.slug = ADMIN_ACTOR_CONSTANTS.MESSAGES.VALIDATION_SLUG_REQUIRED;
    } else if (!ADMIN_ACTOR_CONSTANTS.VALIDATION.SLUG_REGEX.test(finalSlug)) {
      newErrors.slug = ADMIN_ACTOR_CONSTANTS.MESSAGES.VALIDATION_SLUG_INVALID;
    }

    if (height !== '' && (Number(height) < 50 || Number(height) > 260)) {
      newErrors.height = 'Chiều cao hợp lệ từ 50cm đến 260cm';
    }

    if (debutYear !== '' && (Number(debutYear) < 1900 || Number(debutYear) > new Date().getFullYear() + 2)) {
      newErrors.debutYear = 'Năm ra mắt hợp lệ từ 1900 trở đi';
    }

    if (bio && bio.length > ADMIN_ACTOR_CONSTANTS.VALIDATION.MAX_BIO_LENGTH) {
      newErrors.bio = ADMIN_ACTOR_CONSTANTS.MESSAGES.VALIDATION_BIO_MAX;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toastNotification.error('Vui lòng kiểm tra lại các trường thông tin bắt buộc.');
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const finalSlug = slug.trim() || generateSlug(name);
      const effectiveAvatar = avatarUrl || generateActorAvatar(name, gender);

      // Base Person Payload
      const personPayload: Partial<PersonItem> = {
        id: initialData?.id,
        name: name.trim(),
        originalName: originalName.trim() || undefined,
        birthName: originalName.trim() || name.trim(),
        slug: finalSlug,
        avatarUrl: effectiveAvatar,
        profileImage: effectiveAvatar,
        coverImage: effectiveAvatar,
        gender,
        nationality: nationality.trim() || undefined,
        birthYear: typeof birthYear === 'number' ? birthYear : dateOfBirth ? new Date(dateOfBirth).getFullYear() : undefined,
        dateOfBirth: dateOfBirth || undefined,
        placeOfBirth: placeOfBirth.trim() || undefined,
        height: typeof height === 'number' ? height : undefined,
        debutYear: typeof debutYear === 'number' ? debutYear : undefined,
        knownFor: knownFor.trim() || undefined,
        bio: bio.trim() || undefined,
        biography: bio.trim() || undefined,
        socialMedia,
        isVerified,
        isActive,
      };

      // If creating a new actor, dispatch to backend API service
      if (type === 'actors' && !initialData) {
        try {
          const createdEntity = await actorAdminService.create({
            name: personPayload.name!,
            slug: personPayload.slug!,
            birthName: personPayload.birthName,
            dateOfBirth: personPayload.dateOfBirth,
            placeOfBirth: personPayload.placeOfBirth,
            nationality: personPayload.nationality,
            gender: personPayload.gender!,
            height: personPayload.height,
            profileImage: personPayload.profileImage!,
            coverImage: personPayload.coverImage,
            biography: personPayload.biography,
            knownFor: personPayload.knownFor,
            debutYear: personPayload.debutYear,
            socialMedia: personPayload.socialMedia,
            isActive: personPayload.isActive,
            isVerified: personPayload.isVerified,
          });

          personPayload.id = createdEntity.id;
          toastNotification.success(ADMIN_ACTOR_CONSTANTS.MESSAGES.CREATE_SUCCESS(personPayload.name!));
        } catch (apiError) {
          // If API fails, handle or throw
          const parsed = parseApiError(apiError, ADMIN_ACTOR_CONSTANTS.MESSAGES.CREATE_ERROR);
          toastNotification.warning(`${parsed.message} (Đã lưu tạm vào bộ nhớ)`);
        }
      } else {
        toastNotification.success(
          initialData
            ? ADMIN_ACTOR_CONSTANTS.MESSAGES.UPDATE_SUCCESS(personPayload.name!)
            : `Thêm mới ${type === 'actors' ? 'diễn viên' : 'đạo diễn'} "${personPayload.name}" thành công!`
        );
      }

      onSave(personPayload);
      onClose();
    } catch (err) {
      const parsed = parseApiError(err, 'Thao tác không thành công.');
      toastNotification.error(parsed.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeLabel = type === 'actors' ? 'Diễn Viên' : 'Đạo Diễn';

  return (
    <div
      className={styles.modalOverlay}
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="people-form-title"
    >
      <div
        className={styles.modalContent}
        style={{ maxWidth: '800px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ color: '#e50914', fontSize: '1.25rem' }}>
              {type === 'actors' ? <FaUserTie /> : <FaVideo />}
            </span>
            <h3 id="people-form-title" className={styles.modalTitle}>
              {initialData ? `Chỉnh Sửa ${typeLabel}` : `Thêm Mới ${typeLabel}`}
            </h3>
          </div>
          <button
            type="button"
            className={styles.closeModalBtn}
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng dialog"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} noValidate>
          <div
            className={styles.modalBody}
            style={{ maxHeight: '74vh', overflowY: 'auto', paddingRight: '0.6rem' }}
          >
            {/* AVATAR UPLOAD & AUTO-GEN PREVIEW ROW */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '14px 18px',
                marginBottom: '0.2rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                {/* Avatar Circle Container */}
                <div style={{ position: 'relative', width: '92px', height: '92px', flexShrink: 0 }}>
                  <div
                    style={{
                      width: '92px',
                      height: '92px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '2px solid #e50914',
                      background: '#1a1a1a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 15px rgba(229, 9, 20, 0.3)',
                    }}
                  >
                    {avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={avatarUrl}
                        alt="Avatar Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <FaUserTie size={38} color="#666" />
                    )}
                  </div>
                  {/* Status Badge */}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-4px',
                      right: '-4px',
                      background: isCustomUploaded ? '#10b981' : '#6366f1',
                      color: '#fff',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '8px',
                      border: '1px solid #111',
                    }}
                  >
                    {isCustomUploaded ? 'Ảnh tải lên' : 'Tự động'}
                  </span>
                </div>

                {/* Avatar Action Controls */}
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                    <label className={styles.formLabel} style={{ marginBottom: 0 }}>
                      Ảnh đại diện {typeLabel.toLowerCase()} <span style={{ color: '#e50914' }}>*</span>
                    </label>
                    <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                      {isCustomUploaded ? 'Đã tải ảnh lên' : 'Tự động sinh theo Giới tính & Tên'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ADMIN_ACTOR_CONSTANTS.VALIDATION.ALLOWED_IMAGE_EXTENSIONS.join(',')}
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      disabled={isSubmitting}
                    />

                    {/* Upload File Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmitting}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <FaUpload size={11} /> Tải ảnh lên (Max 5MB)
                    </button>

                    {/* Regenerate Vector Avatar */}
                    <button
                      type="button"
                      onClick={handleRegenerateAvatar}
                      disabled={isSubmitting}
                      style={{
                        background: 'rgba(99, 102, 241, 0.2)',
                        color: '#a5b4fc',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <FaMagic size={11} /> Đổi Avatar Ngẫu Nhiên
                    </button>

                    {/* Revert if custom uploaded */}
                    {isCustomUploaded && (
                      <button
                        type="button"
                        onClick={handleResetToAutoAvatar}
                        disabled={isSubmitting}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#fca5a5',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <FaUndo size={11} /> Dùng Avatar Tự Động
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* GENDER SELECTION PILLS */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Giới Tính <span style={{ color: '#e50914' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                {[
                  { id: 'male', label: 'Nam (Male)', icon: <FaMars size={14} color="#38bdf8" /> },
                  { id: 'female', label: 'Nữ (Female)', icon: <FaVenus size={14} color="#f472b6" /> },
                  { id: 'other', label: 'Khác (Other)', icon: <FaGenderless size={14} color="#a78bfa" /> },
                ].map((g) => {
                  const isChecked = gender === g.id;
                  return (
                    <div
                      key={g.id}
                      onClick={() => !isSubmitting && handleGenderChange(g.id as ActorGender)}
                      style={{
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        background: isChecked ? 'rgba(229, 9, 20, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                        border: isChecked ? '1px solid #e50914' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '9px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        color: isChecked ? '#fff' : '#9ca3af',
                        fontWeight: isChecked ? 600 : 400,
                        fontSize: '0.82rem',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {g.icon}
                      <span>{g.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BASIC INFO: NAME, ORIGINAL NAME */}
            <div className={styles.formRow}>
              {/* Name */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Tên tiếng Việt / Nghệ danh <span style={{ color: '#e50914' }}>*</span>
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  className={styles.formInput}
                  placeholder={`VD: ${type === 'actors' ? 'Song Joong Ki, Ninh Dương Lan Ngọc' : 'Christopher Nolan'}`}
                  value={name}
                  onChange={handleNameChange}
                  disabled={isSubmitting}
                  style={errors.name ? { borderColor: '#ef4444' } : undefined}
                />
                {errors.name && (
                  <span style={{ fontSize: '0.72rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FaExclamationCircle size={10} /> {errors.name}
                  </span>
                )}
              </div>

              {/* Original Name / English Name */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tên gốc / Tên tiếng Anh / Tên khai sinh</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="VD: 송중기 / Christopher Nolan"
                  value={originalName}
                  onChange={(e) => setOriginalName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* SLUG WITH TOGGLE LOCK */}
            <div className={styles.formGroup}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className={styles.formLabel}>
                  Mã định danh (Slug) <span style={{ color: '#e50914' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsSlugManuallyEdited(!isSlugManuallyEdited)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    color: isSlugManuallyEdited ? '#f59e0b' : '#9ca3af',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title={isSlugManuallyEdited ? 'Mở khóa tự động sinh' : 'Tùy chỉnh slug'}
                >
                  {isSlugManuallyEdited ? (
                    <>
                      <FaUnlock size={10} /> Đang sửa thủ công
                    </>
                  ) : (
                    <>
                      <FaLock size={10} /> Tự động sinh từ tên
                    </>
                  )}
                </button>
              </div>
              <input
                type="text"
                className={styles.formInput}
                placeholder="VD: song-joong-ki"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setIsSlugManuallyEdited(true);
                  if (errors.slug) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.slug;
                      return next;
                    });
                  }
                }}
                disabled={isSubmitting || !isSlugManuallyEdited}
                style={errors.slug ? { borderColor: '#ef4444' } : undefined}
              />
              {errors.slug ? (
                <span style={{ fontSize: '0.72rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FaExclamationCircle size={10} /> {errors.slug}
                </span>
              ) : (
                <span className={styles.formHint}>Đường dẫn hồ sơ nhân vật trên hệ thống</span>
              )}
            </div>

            {/* BIOGRAPHICAL DETAILS: DOB, HEIGHT, DEBUT YEAR */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {/* Date of Birth */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <FaCalendarAlt size={11} style={{ marginRight: '4px' }} /> Ngày Sinh
                </label>
                <input
                  type="date"
                  className={styles.formInput}
                  value={dateOfBirth}
                  onChange={(e) => {
                    setDateOfBirth(e.target.value);
                    if (e.target.value) {
                      setBirthYear(new Date(e.target.value).getFullYear());
                    }
                  }}
                  disabled={isSubmitting}
                />
              </div>

              {/* Height */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <FaRulerVertical size={11} style={{ marginRight: '4px' }} /> Chiều cao (cm)
                </label>
                <input
                  type="number"
                  className={styles.formInput}
                  placeholder="VD: 173"
                  value={height}
                  onChange={(e) => setHeight(e.target.value ? parseInt(e.target.value) : '')}
                  disabled={isSubmitting}
                  style={errors.height ? { borderColor: '#ef4444' } : undefined}
                />
                {errors.height && (
                  <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>{errors.height}</span>
                )}
              </div>

              {/* Debut Year */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <FaStar size={11} style={{ marginRight: '4px' }} /> Năm Ra Mắt
                </label>
                <input
                  type="number"
                  className={styles.formInput}
                  placeholder="VD: 2012"
                  value={debutYear}
                  onChange={(e) => setDebutYear(e.target.value ? parseInt(e.target.value) : '')}
                  disabled={isSubmitting}
                  style={errors.debutYear ? { borderColor: '#ef4444' } : undefined}
                />
                {errors.debutYear && (
                  <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>{errors.debutYear}</span>
                )}
              </div>
            </div>

            {/* NATIONALITY & KNOWN FOR */}
            <div className={styles.formRow}>
              {/* Nationality */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <FaGlobeAmericas size={11} style={{ marginRight: '4px' }} /> Quốc Tịch
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="VD: Hàn Quốc, Mỹ, Việt Nam..."
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {/* Known For */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tác Phẩm Nổi Bật (Known For)</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="VD: Hậu Duệ Mặt Trời, Spider-Man..."
                  value={knownFor}
                  onChange={(e) => setKnownFor(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* PLACE OF BIRTH */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <FaMapMarkerAlt size={11} style={{ marginRight: '4px' }} /> Nơi Sinh (Place of Birth)
              </label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="VD: Kingston upon Thames, England hoặc Daejeon, Hàn Quốc"
                value={placeOfBirth}
                onChange={(e) => setPlaceOfBirth(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* SHORT BIOGRAPHY */}
            <div className={styles.formGroup}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className={styles.formLabel}>Tiểu Sử Diễn Viên</label>
                <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                  {bio.length} / {ADMIN_ACTOR_CONSTANTS.VALIDATION.MAX_BIO_LENGTH} ký tự
                </span>
              </div>
              <textarea
                className={styles.formTextarea}
                placeholder={`Tóm tắt sự nghiệp của ${typeLabel.toLowerCase()}...`}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                disabled={isSubmitting}
                style={errors.bio ? { borderColor: '#ef4444' } : undefined}
              />
              {errors.bio && (
                <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>{errors.bio}</span>
              )}
            </div>

            {/* SOCIAL MEDIA SECTION */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Mạng Xã Hội & Liên Kết Hồ Sơ</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {/* Instagram */}
                <div style={{ display: 'flex', alignItems: 'center', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0 8px' }}>
                  <FaInstagram color="#e1306c" size={13} style={{ marginRight: '6px' }} />
                  <input
                    type="url"
                    value={socialMedia.instagram}
                    onChange={(e) => setSocialMedia({ ...socialMedia, instagram: e.target.value })}
                    placeholder="https://instagram.com/..."
                    disabled={isSubmitting}
                    style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.78rem', width: '100%', padding: '0.5rem 0', outline: 'none' }}
                  />
                </div>

                {/* Facebook */}
                <div style={{ display: 'flex', alignItems: 'center', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0 8px' }}>
                  <FaFacebook color="#1877f2" size={13} style={{ marginRight: '6px' }} />
                  <input
                    type="url"
                    value={socialMedia.facebook}
                    onChange={(e) => setSocialMedia({ ...socialMedia, facebook: e.target.value })}
                    placeholder="https://facebook.com/..."
                    disabled={isSubmitting}
                    style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.78rem', width: '100%', padding: '0.5rem 0', outline: 'none' }}
                  />
                </div>

                {/* Twitter / X */}
                <div style={{ display: 'flex', alignItems: 'center', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0 8px' }}>
                  <FaTwitter color="#38bdf8" size={13} style={{ marginRight: '6px' }} />
                  <input
                    type="url"
                    value={socialMedia.twitter}
                    onChange={(e) => setSocialMedia({ ...socialMedia, twitter: e.target.value })}
                    placeholder="https://x.com/..."
                    disabled={isSubmitting}
                    style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.78rem', width: '100%', padding: '0.5rem 0', outline: 'none' }}
                  />
                </div>

                {/* IMDB */}
                <div style={{ display: 'flex', alignItems: 'center', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0 8px' }}>
                  <FaImdb color="#f5c518" size={14} style={{ marginRight: '6px' }} />
                  <input
                    type="url"
                    value={socialMedia.imdb}
                    onChange={(e) => setSocialMedia({ ...socialMedia, imdb: e.target.value })}
                    placeholder="https://imdb.com/name/..."
                    disabled={isSubmitting}
                    style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.78rem', width: '100%', padding: '0.5rem 0', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            {/* VERIFICATION & STATUS CONTROLS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.2rem' }}>
              {/* Verified Badge Checkbox */}
              <div
                className={styles.formGroup}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#0a0a0c',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
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
                  disabled={isSubmitting}
                  style={{ width: '16px', height: '16px', accentColor: '#38bdf8', cursor: 'pointer' }}
                />
              </div>

              {/* Status Switch */}
              <div
                className={styles.formGroup}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#0a0a0c',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <label className={styles.formLabel} style={{ marginBottom: 0 }}>Hoạt động</label>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
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
              className={styles.saveBtn}
              disabled={isSubmitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '120px',
                justifyContent: 'center',
              }}
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="fa-spin" /> Đang lưu...
                </>
              ) : initialData ? (
                'Cập Nhật'
              ) : (
                'Tạo Mới'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
