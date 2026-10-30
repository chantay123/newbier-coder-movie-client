'use client';

import { useState, useEffect } from 'react';

let sharedIsOnline: boolean =
  typeof window !== 'undefined' ? window.navigator.onLine : true;
const subscribers = new Set<(value: boolean) => void>();
let pollIntervalId: ReturnType<typeof setInterval> | null = null;
let isInitialized = false;

const setSharedOnline = (value: boolean): void => {
  if (sharedIsOnline === value) return;
  sharedIsOnline = value;
  subscribers.forEach((cb) => {
    try {
      cb(value);
    } catch {
    }
  });
};

const checkRealConnectivity = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  try {
    const response = await fetch(`/api/ping?_=${Date.now()}`, {
      method: 'GET',
      cache: 'no-cache',
      headers: { 'Content-Type': 'application/json' }
    });
    setSharedOnline(response.ok);
  } catch {
    setSharedOnline(false);
  }
};

const initPolling = (): void => {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  sharedIsOnline = window.navigator.onLine;

  window.addEventListener('online', () => setSharedOnline(true));
  window.addEventListener('offline', () => setSharedOnline(false));
  window.addEventListener('appOnline', () => setSharedOnline(true));
  window.addEventListener('appOffline', () => setSharedOnline(false));

  // The first check plus a 30 second interval. It runs only once for the
  // whole app, not once per component.
  void checkRealConnectivity();
  pollIntervalId = setInterval(() => {
    void checkRealConnectivity();
  }, 30000);
};

export const useNetworkStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState<boolean>(sharedIsOnline);

  useEffect(() => {
    initPolling();
    subscribers.add(setIsOnline);
    return () => {
      subscribers.delete(setIsOnline);
    };
  }, []);

  return isOnline;
};

export default useNetworkStatus;
