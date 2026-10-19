/**
 * @file AdminLoadingBar.tsx
 * @description High-performance, top neon progress bar listening to Next.js route transitions.
 * Gives immediate visual responsiveness when an admin clicks any menu or navigation link.
 */
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/AdminLoading.module.css';

export default function AdminLoadingBar() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleStart = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setVisible(true);
      setProgress(25);

      // Trickle progress to simulate network request
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 88) {
            if (timerRef.current) clearInterval(timerRef.current);
            return prev;
          }
          const jump = Math.floor(Math.random() * 12) + 5;
          return Math.min(prev + jump, 88);
        });
      }, 150);
    };

    const handleStop = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setProgress(100);

      const hideTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);

      return () => clearTimeout(hideTimer);
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleStop);
    router.events.on('routeChangeError', handleStop);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleStop);
      router.events.off('routeChangeError', handleStop);
    };
  }, [router]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className={styles.progressBarContainer}
      aria-hidden="true"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={styles.progressBar}
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0
        }}
      >
        <div className={styles.progressBarGlow} />
      </div>
    </div>
  );
}
