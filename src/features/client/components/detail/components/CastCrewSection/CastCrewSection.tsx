import React, { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import styles from './CastCrewSection.module.css';

/**
 * @file CastCrewSection.tsx
 * @description Cinema Cast & Crew showcase rail with circular avatars,
 * glowing accent rings, role filtering, and smooth horizontal navigation.
 */

export interface CastCrewPerson {
  name?: string;
  role?: string;
  avatar_url?: string;
  image?: string;
  slug?: string;
  id?: string;
  _id?: string;
}

export interface CastCrewSectionProps {
  actors?: CastCrewPerson[];
  directors?: CastCrewPerson[];
}

/** Generates a consistent pleasant cinema gradient for missing avatars */
const getAvatarGradient = (name: string): string => {
  const gradients = [
    'linear-gradient(135deg, #e50914 0%, #8a2387 100%)',
    'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
    'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)',
    'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)',
    'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

export const CastCrewSection: React.FC<CastCrewSectionProps> = ({
  actors = [],
  directors = []
}) => {
  const [filterType, setFilterType] = useState<'all' | 'actor' | 'director'>('all');
  const railRef = useRef<HTMLDivElement>(null);

  const cleanDirectors = useMemo(
    () =>
      directors
        .filter((d) => d.name && !d.name.includes('Đang cập nhật'))
        .map((d) => ({ ...d, role: d.role || 'Đạo diễn', kind: 'director' as const })),
    [directors]
  );

  const cleanActors = useMemo(
    () =>
      actors
        .filter((a) => a.name && !a.name.includes('Đang cập nhật'))
        .map((a) => ({ ...a, role: a.role || 'Diễn viên', kind: 'actor' as const })),
    [actors]
  );

  const combined = useMemo(
    () => [...cleanDirectors, ...cleanActors],
    [cleanDirectors, cleanActors]
  );

  const displayedList = useMemo(() => {
    if (filterType === 'director') return cleanDirectors;
    if (filterType === 'actor') return cleanActors;
    return combined;
  }, [filterType, cleanDirectors, cleanActors, combined]);

  const handleScroll = (direction: 'left' | 'right'): void => {
    if (railRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      railRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (combined.length === 0) {
    return (
      <section className={styles.castCrewContainer} aria-label="Diễn viên và đoàn làm phim">
        <div className={styles.headerRow}>
          <div className={styles.titleGroup}>
            <h3 className={styles.sectionTitle}>Diễn Viên & Đoàn Làm Phim</h3>
          </div>
        </div>
        <div className={styles.emptyNotice}>
          <span>Danh sách nghệ sĩ và đoàn làm phim đang được cập nhật từ cơ sở dữ liệu.</span>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.castCrewContainer} aria-label="Diễn viên và đoàn làm phim">
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <h3 className={styles.sectionTitle}>Diễn Viên & Đoàn Làm Phim</h3>
          <span className={styles.countBadge}>{combined.length}</span>
        </div>

        <div className={styles.headerActions}>
          {/* Filter Tabs */}
          <div className={styles.filterTabs}>
            <button
              type="button"
              className={`${styles.filterBtn} ${filterType === 'all' ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterType('all')}
            >
              Tất cả ({combined.length})
            </button>
            {cleanActors.length > 0 && (
              <button
                type="button"
                className={`${styles.filterBtn} ${filterType === 'actor' ? styles.filterBtnActive : ''}`}
                onClick={() => setFilterType('actor')}
              >
                Diễn viên ({cleanActors.length})
              </button>
            )}
            {cleanDirectors.length > 0 && (
              <button
                type="button"
                className={`${styles.filterBtn} ${filterType === 'director' ? styles.filterBtnActive : ''}`}
                onClick={() => setFilterType('director')}
              >
                Đạo diễn ({cleanDirectors.length})
              </button>
            )}
          </div>

          {/* Scroll Nav Controls */}
          <div className={styles.navControls}>
            <button
              type="button"
              className={styles.scrollBtn}
              onClick={() => handleScroll('left')}
              title="Cuộn sang trái"
              aria-label="Cuộn sang trái"
            >
              ‹
            </button>
            <button
              type="button"
              className={styles.scrollBtn}
              onClick={() => handleScroll('right')}
              title="Cuộn sang phải"
              aria-label="Cuộn sang phải"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Cast & Crew Rail with Circular Avatars */}
      <div ref={railRef} className={styles.castRail}>
        {displayedList.map((person, idx) => {
          const name = person.name || 'Nghệ Sĩ';
          const role = person.role || (person.kind === 'director' ? 'Đạo diễn' : 'Diễn viên');
          const avatar = person.avatar_url || person.image || '';
          const initial = name.charAt(0).toUpperCase();
          const targetId = person.id || person._id || person.slug;
          const href = targetId ? `/performer/${targetId}` : `/search?keyword=${encodeURIComponent(name)}`;
          const gradientStyle = getAvatarGradient(name);

          return (
            <Link
              key={`${person.kind}-${name}-${idx}`}
              href={href}
              className={styles.actorCard}
              title={`${name} (${role})`}
            >
              <div className={styles.avatarWrapper}>
                {avatar ? (
                  <img
                    src={avatar}
                    alt={name}
                    className={styles.avatarImg}
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      img.style.display = 'none';
                      const next = img.nextElementSibling as HTMLElement | null;
                      if (next) next.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={styles.avatarPlaceholder}
                  style={{
                    display: avatar ? 'none' : 'flex',
                    background: gradientStyle
                  }}
                >
                  <span>{initial}</span>
                </div>
              </div>

              <div className={styles.actorInfo}>
                <span className={styles.actorName}>{name}</span>
                <span className={styles.actorRole}>{role}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default CastCrewSection;
