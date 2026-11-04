import React from 'react';
import styles from './BroadcastScheduleCard.module.css';

/**
 * @file BroadcastScheduleCard.tsx
 * @description Sleek cinema card displaying broadcast scheduling information,
 * update frequency, and streaming quality guarantee for ongoing television/web series.
 */

export interface BroadcastScheduleCardProps {
  status?: string;
  totalEpisodes?: number;
  currentEpisode?: string;
  time?: string;
  year?: number | string;
}

export const BroadcastScheduleCard: React.FC<BroadcastScheduleCardProps> = ({
  status = 'ongoing',
  totalEpisodes,
  currentEpisode,
  time,
  year
}) => {
  const isOngoing = status === 'ongoing';

  return (
    <div className={styles.scheduleCard} aria-label="Lịch phát sóng và cập nhật">
      <div className={styles.headerRow}>
        <div className={styles.badgeWrap}>
          <span className={`${styles.pulseDot} ${isOngoing ? styles.pulseGreen : styles.pulseAmber}`} />
          <span className={styles.statusLabel}>
            {isOngoing ? 'Đang phát sóng' : status === 'upcoming' ? 'Sắp công chiếu' : 'Trọn bộ phát hành'}
          </span>
        </div>
        <span className={styles.scheduleTag}>
          <i className="fas fa-bell me-1" />
          Lịch chiếu
        </span>
      </div>

      <div className={styles.contentBody}>
        <h4 className={styles.scheduleTitle}>
          {isOngoing
            ? 'Cập nhật tập mới hàng tuần'
            : status === 'upcoming'
            ? 'Đang chuẩn bị lên sóng'
            : 'Đã hoàn tất toàn bộ'}
        </h4>

        <p className={styles.scheduleDescription}>
          {isOngoing ? (
            <>
              Tập mới được phát hành vào lúc <strong className={styles.highlightText}>20:00 tối Thứ 6 & Thứ 7</strong> hàng tuần với bản dịch Vietsub & Lồng tiếng độc quyền sớm nhất.
            </>
          ) : status === 'upcoming' ? (
            <>
              Dự kiến khởi chiếu trong năm <strong className={styles.highlightText}>{year || '2025'}</strong>. Hãy bấm <strong>Theo Dõi</strong> để nhận thông báo ngay khi tập 1 lên sóng.
            </>
          ) : (
            <>
              Toàn bộ <strong className={styles.highlightText}>{totalEpisodes ? `${totalEpisodes} tập` : 'các tập'}</strong> đã được cập nhật đầy đủ với chất lượng Full HD 1080p và âm thanh chất lượng cao.
            </>
          )}
        </p>

        <div className={styles.metaFeatures}>
          <div className={styles.featureItem}>
            <i className="fas fa-check-circle text-danger me-1" />
            <span>Full HD 1080p</span>
          </div>
          <div className={styles.featureItem}>
            <i className="fas fa-closed-captioning text-warning me-1" />
            <span>Vietsub & Thuyết minh</span>
          </div>
          <div className={styles.featureItem}>
            <i className="fas fa-shield-alt text-info me-1" />
            <span>Server VIP siêu tốc</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BroadcastScheduleCard;
