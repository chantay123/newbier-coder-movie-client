import React from 'react';
import Link from 'next/link';
import styles from './CastCrewSection.module.css';

/**
 * @file CastCrewSection.tsx
 * @description Compact, high-density Cast & Crew showcase.
 */

export interface CastCrewPerson {
  name?: string;
  role?: string;
  avatar_url?: string;
  image?: string;
  slug?: string;
}

export interface CastCrewSectionProps {
  actors?: CastCrewPerson[];
  directors?: CastCrewPerson[];
}

const CastCrewSection: React.FC<CastCrewSectionProps> = ({
  actors = [],
  directors = []
}) => {
  const combined: Array<CastCrewPerson & { role: string }> = [
    ...directors
      .filter((d) => d.name && !d.name.includes('Đang cập nhật'))
      .map((d) => ({ ...d, role: d.role || 'Đạo diễn' })),
    ...actors
      .filter((a) => a.name && !a.name.includes('Đang cập nhật'))
      .map((a) => ({ ...a, role: a.role || 'Diễn viên' }))
  ];

  if (combined.length === 0) {
    return (
      <section className={styles.castCrewContainer} aria-label="Diễn viên & đoàn làm phim">
        <div className={styles.headerRow}>
          <div className={styles.titleGroup}>
            <i className="fas fa-users text-danger me-2" />
            <h3 className={styles.sectionTitle}>Diễn Viên & Đoàn Làm Phim</h3>
          </div>
          <span className={styles.countBadge}>Dàn diễn viên</span>
        </div>
        <div className={styles.emptyNotice}>
          <i className="fas fa-clapperboard text-secondary me-2" />
          <span>Danh sách nghệ sĩ và diễn viên lồng tiếng đang được đồng bộ hóa từ hệ thống dữ liệu.</span>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.castCrewContainer} aria-label="Diễn viên & đoàn làm phim">
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <i className="fas fa-users text-danger me-2" />
          <h3 className={styles.sectionTitle}>Diễn Viên & Đoàn Làm Phim</h3>
        </div>
        <span className={styles.countBadge}>{combined.length} nghệ sĩ</span>
      </div>

      <div className={styles.castRail}>
        {combined.map((person, idx) => {
          const name = person.name || 'Nghệ Sĩ';
          const role = person.role || 'Diễn viên';
          const avatar = person.avatar_url || person.image || '';
          const initial = name.charAt(0).toUpperCase();
          const slug = person.slug || '';

          const cardContent = (
            <div className={styles.actorCard} title={`${name} (${role})`}>
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
                  style={{ display: avatar ? 'none' : 'flex' }}
                >
                  <span>{initial}</span>
                </div>
              </div>
              <span className={styles.actorName}>{name}</span>
              <span className={styles.actorRole}>{role}</span>
            </div>
          );

          if (slug) {
            return (
              <Link
                key={slug || String(idx)}
                href={`/performer/${encodeURIComponent(slug)}`}
                className={styles.castLink}
              >
                {cardContent}
              </Link>
            );
          }

          return (
            <div key={String(idx)} className={styles.castLink}>
              {cardContent}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default CastCrewSection;
