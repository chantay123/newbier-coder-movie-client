/**
 * @file AdminRouteLoader.tsx
 * @description Premium Cinema Dark loading screen for admin menu transitions and API calls.
 * Displays a rotating film reel, glowing laser pulse, and branded status indicators.
 */
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { FaFilm } from 'react-icons/fa';
import styles from '@/styles/AdminLoading.module.css';

export interface AdminRouteLoaderProps {
  customMessage?: string;
  customSubtitle?: string;
}

export default function AdminRouteLoader({
  customMessage = 'Đang tải dữ liệu...',
  customSubtitle = 'Hệ thống đang đồng bộ danh mục & nạp API'
}: AdminRouteLoaderProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [targetLabel, setTargetLabel] = useState<string>('');
  const minDisplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Helper to map route pathname to friendly menu name
  const resolveTargetName = (url: string): string => {
    if (url.includes('/admin/genres') || url.includes('/admin/categories')) return 'Thể Loại';
    if (url.includes('/admin/countries')) return 'Quốc Gia';
    if (url.includes('/admin/formats')) return 'Định Dạng Phim';
    if (url.includes('/admin/years')) return 'Năm Phát Hành';
    if (url.includes('/admin/movies')) return 'Quản Lý Phim';
    if (url.includes('/admin/people')) return 'Diễn viên & Đạo diễn';
    if (url.includes('/admin/users')) return 'Người Dùng';
    if (url === '/admin') return 'Bảng Điều Khiển';
    return 'Dữ Liệu';
  };

  useEffect(() => {
    const MINIMUM_DURATION_MS = 280;

    const handleStart = (url: string) => {
      if (minDisplayTimerRef.current) clearTimeout(minDisplayTimerRef.current);
      startTimeRef.current = Date.now();
      setTargetLabel(resolveTargetName(url));
      setIsLoading(true);
    };

    const handleStop = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, MINIMUM_DURATION_MS - elapsed);

      minDisplayTimerRef.current = setTimeout(() => {
        setIsLoading(false);
      }, remaining);
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleStop);
    router.events.on('routeChangeError', handleStop);

    return () => {
      if (minDisplayTimerRef.current) clearTimeout(minDisplayTimerRef.current);
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleStop);
      router.events.off('routeChangeError', handleStop);
    };
  }, [router]);

  if (!isLoading) return null;

  return (
    <div
      className={`${styles.routeLoaderOverlay} ${isLoading ? styles.routeLoaderVisible : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Đang chuyển trang quản trị"
    >
      <div className={styles.routeLoaderCard}>
        {/* Animated Cinema Reel */}
        <div className={styles.reelContainer} aria-hidden="true">
          <div className={styles.reelOuterRing} />
          <div className={styles.reelInnerRing} />
          <div className={styles.reelCore}>
            <FaFilm />
          </div>
        </div>

        {/* Studio Badge */}
        <span className={styles.badgeStudio}>MOVIE ADMIN STUDIO</span>

        {/* Dynamic Headings */}
        <h2 className={styles.loaderTitle}>
          {targetLabel ? `Đang mở ${targetLabel}...` : customMessage}
        </h2>
        <p className={styles.loaderSubtitle}>
          {customSubtitle}
        </p>

        {/* Bottom Laser Scan Line */}
        <div className={styles.laserScanLine} aria-hidden="true">
          <div className={styles.laserBeam} />
        </div>
      </div>
    </div>
  );
}
