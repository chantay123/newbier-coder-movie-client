/**
 * @file OfflineNotice.tsx
 * @description Modal-style notice shown when the user goes offline (with optional
 * auto-redirect to /offline after 5s).
 */
import React, { useEffect, useState, MouseEvent } from 'react';
import { useNetworkStatus } from '@/utils/networkStatus';
import styles from './OfflineNotice.module.css';
import { useRouter } from 'next/router';

const OfflineNotice: React.FC = () => {
  const isOnline = useNetworkStatus();
  const router = useRouter();
  const [offlineDuration, setOfflineDuration] = useState<number>(0);
  const [showNotice, setShowNotice] = useState<boolean>(false);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    if (!isOnline) {
      setShowNotice(true);

      intervalId = setInterval(() => {
        setOfflineDuration((prev) => prev + 1);
      }, 1000);

      if (router.pathname !== '/offline') {
        const timeoutId = setTimeout(() => {
          router.push('/offline');
        }, 5000);

        return () => {
          clearTimeout(timeoutId);
          if (intervalId) clearInterval(intervalId);
        };
      }
    } else {
      if (showNotice) {
        const timeoutId = setTimeout(() => {
          setShowNotice(false);
          setOfflineDuration(0);
        }, 2000);

        return () => clearTimeout(timeoutId);
      }
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOnline, router, showNotice]);

  if (router.pathname === '/offline') return null;
  if (!showNotice) return null;

  const handleRetry = (e: MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    window.location.reload();
  };

  return (
    <div className={styles.offlineContainer}>
      <div className={styles.offlineContent}>
        <div className={styles.iconContainer}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>
        <h2>Không có kết nối internet</h2>
        <p>Vui lòng kiểm tra kết nối internet của bạn và thử lại</p>
        <button className={styles.retryButton} type="button" onClick={handleRetry}>
          Thử lại
        </button>
      </div>
    </div>
  );
};

export default OfflineNotice;
