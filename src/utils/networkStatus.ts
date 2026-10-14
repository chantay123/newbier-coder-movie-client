/**
 * @file networkStatus.ts
 * @description Custom hook phát hiện trạng thái mạng (online/offline).
 * Kiểm tra cả navigator.onLine lẫn kết nối thực sự qua API ping.
 */

'use client';

import { useState, useEffect } from 'react';

/**
 * Hook theo dõi trạng thái mạng.
 * @returns True nếu online, False nếu offline
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== 'undefined' ? window.navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Custom event từ service worker
    const handleAppOnline = () => setIsOnline(true);
    const handleAppOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('appOnline', handleAppOnline);
    window.addEventListener('appOffline', handleAppOffline);

    // Kiểm tra kết nối thực qua API ping
    const checkRealConnectivity = async () => {
      try {
        const response = await fetch(`/api/ping?_=${Date.now()}`, {
          method: 'GET',
          cache: 'no-cache',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          setIsOnline(true);
        } else {
          setIsOnline(false);
        }
      } catch {
        setIsOnline(false);
      }
    };

    // Kiểm tra lần đầu
    checkRealConnectivity();

    // Kiểm tra định kỳ mỗi 30 giây
    const intervalId = setInterval(checkRealConnectivity, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('appOnline', handleAppOnline);
      window.removeEventListener('appOffline', handleAppOffline);
      clearInterval(intervalId);
    };
  }, []);

  return isOnline;
};

export default useNetworkStatus;
