/**
 * @file NetworkStatusBar.tsx
 * @description Slim bottom bar shown on connection state change.
 */
import React, { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/utils/networkStatus';
import styles from './NetworkStatusBar.module.css';

const NetworkStatusBar: React.FC = () => {
  const isOnline = useNetworkStatus();
  const [visible, setVisible] = useState<boolean>(false);
  const [reconnected, setReconnected] = useState<boolean>(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    if (isOnline) {
      if (visible && !reconnected) {
        setReconnected(true);
        setVisible(true);
        timeout = setTimeout(() => {
          setVisible(false);
          setReconnected(false);
        }, 3000);
      }
    } else {
      setVisible(true);
      setReconnected(false);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isOnline, visible, reconnected]);

  if (!visible) return null;

  const statusText: string = reconnected ? 'Đã kết nối lại' : 'Mất kết nối internet';
  const statusClass: string = reconnected ? styles.online : styles.offline;

  return (
    <div className={`${styles.statusBar} ${statusClass}`}>
      <div className={styles.statusIcon}>
        {reconnected ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
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
        )}
      </div>
      <span>{statusText}</span>
    </div>
  );
};

export default NetworkStatusBar;
