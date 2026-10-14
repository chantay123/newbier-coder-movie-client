/**
 * @file AdContext.tsx
 * @description Cung cấp ad-block settings cho toàn bộ app, dựa trên
 * subscription benefits của user hiện tại.
 */

import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
import { useRouter } from 'next/router';
import subscriptionService from '../API/services/subscriptionService';

/** Default ad settings */
export interface AdSettings {
  hideHomepageAds: boolean;
  hideVideoAds: boolean;
  isLoading: boolean;
  packageType: string | null;
  hasActiveSubscription: boolean;
  lastUpdated?: string;
}

/** Default values for context */
const defaultAdSettings: AdSettings = {
  hideHomepageAds: false,
  hideVideoAds: false,
  isLoading: true,
  packageType: null,
  hasActiveSubscription: false
};

const AdContext = createContext<AdSettings>(defaultAdSettings);

/** Hook consumer-side */
export const useAdContext = (): AdSettings => useContext(AdContext);

interface AdContextProviderProps {
  children: ReactNode;
}

/** Provider bao bọc app */
export const AdContextProvider: React.FC<AdContextProviderProps> = ({ children }) => {
  const router = useRouter();

  const [adSettings, setAdSettings] = useState<AdSettings>({
    hideHomepageAds: false,
    hideVideoAds: false,
    isLoading: true,
    packageType: null,
    hasActiveSubscription: false
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);
  const benefitsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isNoAccessPage = router.pathname === '/noaccess';

  useEffect(() => {
    const checkAuth = (): void => {
      const token = localStorage.getItem('auth_token')
        || localStorage.getItem('token')
        || localStorage.getItem('authToken');
      const isNowAuthenticated = !!token;

      setIsAuthenticated((prevState) => {
        if (prevState !== isNowAuthenticated) {
          return isNowAuthenticated;
        }
        return prevState;
      });
    };

    checkAuth();

    const handleStorageChange = (e: StorageEvent): void => {
      if (e.key === 'auth_token' || e.key === 'token' || e.key === 'authToken') {
        checkAuth();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (benefitsTimeoutRef.current) {
        clearTimeout(benefitsTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Track whether the current ad-benefits endpoint is reachable. Once
    // we see a permanent failure (404, CORS, network unreachable to a
    // wrong host), we stop retrying for the rest of the session.
    let isEndpointDisabled = false;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    let isComponentMounted = true;

    const fetchSubscriptionBenefits = async (): Promise<void> => {
      // If a previous attempt proved the endpoint is unavailable, do not
      // keep hammering the backend.
      if (isEndpointDisabled) {
        if (isComponentMounted) {
          setAdSettings((prev) => ({ ...prev, isLoading: false }));
        }
        return;
      }
      if (isFetchingRef.current) {
        return;
      }

      isFetchingRef.current = true;

      if (isComponentMounted) {
        setAdSettings((prev) => ({ ...prev, isLoading: true }));
      }

      try {
        if (!isAuthenticated) {
          if (isComponentMounted) {
            setAdSettings((prev) => ({
              ...prev,
              hideHomepageAds: false,
              hideVideoAds: false,
              isLoading: false,
              packageType: null,
              hasActiveSubscription: false
            }));
          }
          isFetchingRef.current = false;
          return;
        }

        const benefits = (await subscriptionService.getUserAdBenefits()) as {
          authError?: boolean;
          isPremium15k?: boolean;
          packageType?: string | null;
          hideHomepageAds?: boolean;
          hideVideoAds?: boolean;
          hasActiveSubscription?: boolean;
        };

        if (!isComponentMounted) {
          isFetchingRef.current = false;
          return;
        }
        // The service reports a 401/403 via `authError`. We still allow
        // a few retries in case the token is being refreshed.
        if (benefits.authError) {
          console.warn('[AdContext] Authentication error detected');
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            benefitsTimeoutRef.current = setTimeout(fetchSubscriptionBenefits, 2000);
            return;
          } else {
            console.error('[AdContext] Max auth-error retries reached, giving up');
          }
        }

        const isPremium15k = benefits.isPremium15k === true
          || benefits.packageType === '682f7d849c310399aa715c9d';

        const hideHomepageAds = benefits.hideHomepageAds === true || isPremium15k;
        const hideVideoAds = benefits.hideVideoAds === true || isPremium15k;
        const hasActiveSubscription = benefits.hasActiveSubscription === true;

        if (isComponentMounted) {
          setAdSettings({
            hideHomepageAds,
            hideVideoAds,
            packageType: benefits.packageType ?? null,
            hasActiveSubscription,
            isLoading: false,
            lastUpdated: new Date().toISOString()
          });
        }

        retryCount = 0;
      } catch (error) {
        // Distinguish permanent failures (no point retrying) from
        // transient ones. Axios sets error.response only when the server
        // replied; absence means Network Error / CORS / timeout.
        const err = error as { response?: { status?: number }; message?: string };
        const status = err?.response?.status;
        const isPermanent = status === 404 || status === 400;
        console.error('[AdContext] Failed to fetch ad benefits:', err?.message || error);

        if (isPermanent) {
          isEndpointDisabled = true;
          console.warn(
            `[AdContext] Endpoint reported ${status} — stopping further attempts ` +
            'until the page is reloaded. Ads remain visible by default.'
          );
          if (isComponentMounted) {
            setAdSettings((prev) => ({ ...prev, isLoading: false }));
          }
        } else if (retryCount < MAX_RETRIES) {
          retryCount++;
          const delay = 1000 * Math.pow(2, retryCount);
          if (isComponentMounted) {
            benefitsTimeoutRef.current = setTimeout(fetchSubscriptionBenefits, delay);
          }
        } else {
          // We've burned through retries on transient errors. Stop
          // scheduling more until the next interval tick (15 min) to
          // avoid an infinite retry loop.
          if (isComponentMounted) {
            setAdSettings((prev) => ({ ...prev, isLoading: false }));
          }
        }
      } finally {
        isFetchingRef.current = false;
      }
    };

    fetchSubscriptionBenefits();

    // Only schedule a periodic refresh if the endpoint appears reachable.
    const refreshInterval = setInterval(() => {
      if (!isEndpointDisabled) fetchSubscriptionBenefits();
    }, 15 * 60 * 1000);

    return () => {
      isComponentMounted = false;
      clearInterval(refreshInterval);
      if (benefitsTimeoutRef.current) {
        clearTimeout(benefitsTimeoutRef.current);
      }
    };
  }, [isAuthenticated]);

  const finalAdSettings: AdSettings = {
    ...adSettings,
    hideHomepageAds: isNoAccessPage ? true : adSettings.hideHomepageAds,
    hideVideoAds: isNoAccessPage ? true : adSettings.hideVideoAds
  };

  return (
    <AdContext.Provider value={finalAdSettings}>
      {children}
    </AdContext.Provider>
  );
};

export default AdContextProvider;
