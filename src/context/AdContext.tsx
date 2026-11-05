/**
 * Provides the ad settings of the whole application.
 *
 * The settings come from the subscription benefits of the current user.
 */

import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
import { useRouter } from 'next/router';
import subscriptionService from '@/API/services/subscriptionService';
import { getStoredAccessToken } from '@/API/services/authService';
import { ensureSessionReady } from '@/utils/accessTokenStore';

/** The default ad settings. */
export interface AdSettings {
  hideHomepageAds: boolean;
  hideVideoAds: boolean;
  isLoading: boolean;
  packageType: string | null;
  hasActiveSubscription: boolean;
  lastUpdated?: string;
}

/** The default values of the context. */
const defaultAdSettings: AdSettings = {
  hideHomepageAds: false,
  hideVideoAds: false,
  isLoading: true,
  packageType: null,
  hasActiveSubscription: false
};

const AdContext = createContext<AdSettings>(defaultAdSettings);

/**
 * Reads the ad settings.
 *
 * @returns The ad settings of the current user.
 */
export const useAdContext = (): AdSettings => useContext(AdContext);

interface AdContextProviderProps {
  children: ReactNode;
}

/** The provider that wraps the application. */
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
  const [authResolved, setAuthResolved] = useState<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);
  const benefitsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endpointDisabledLogRef = useRef<boolean>(false);

  const isNoAccessPage = router.pathname === '/noaccess';

  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      // The token is read through the shared helper, which reads it from
      // the MEMORY of the tab. The session is restored first, so the state
      // is correct even right after a reload.
      await ensureSessionReady();
      const token = typeof window === 'undefined' ? null : getStoredAccessToken();
      const isNowAuthenticated = !!token;

      setIsAuthenticated((prevState) => {
        if (prevState !== isNowAuthenticated) {
          return isNowAuthenticated;
        }
        return prevState;
      });
      setAuthResolved(true);
    };

    void checkAuth();

    const handleStorageChange = (e: StorageEvent): void => {
      // The auth state is checked again when the user payload changes, or
      // when the remember-me flag is toggled in another tab.
      if (e.key === 'remember_me' || e.key === 'user') {
        void checkAuth();
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
      // Wait until the auth check on mount has finished — otherwise
      // we'll spam the backend with one unauthenticated call before
      // realising there's no token in storage.
      if (!authResolved) {
        return;
      }
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

        const rawBenefits = await subscriptionService.getUserAdBenefits();
        const benefits = (rawBenefits && typeof rawBenefits === 'object') ? rawBenefits : {
          hideHomepageAds: false,
          hideVideoAds: false,
          packageType: null as string | null,
          hasActiveSubscription: false,
          authError: true
        };

        // The nested structures are unwrapped defensively, because the
        // backend sometimes nests the payload one level deeper.
        const benefitsAny = benefits as {
          responseData?: Partial<typeof benefits>;
          data?: Partial<typeof benefits>;
        };
        const normalized = benefitsAny.responseData || benefitsAny.data || benefits;

        if (!isComponentMounted) {
          isFetchingRef.current = false;
          return;
        }
        // The service reports a 401 or a 403 through `authError`. A few
        // retries are still allowed, because the token may be refreshing.
        if (normalized.authError) {
          // The console is not flooded when the user is not signed in,
          // because that is the expected steady state.
          if (isAuthenticated && retryCount === 0) {

          }
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            benefitsTimeoutRef.current = setTimeout(fetchSubscriptionBenefits, 2000);
            return;
          } else if (isAuthenticated) {
            // The message is only logged when the user was expected to be
            // signed in.

          }
        }

        // The premium package `15k` always hides the advertisements, even
        // when the backend does not send the explicit flags.
        const isPremium15k = normalized.isPremium15k === true
          || normalized.packageType === '682f7d849c310399aa715c9d';

        const hideHomepageAds = normalized.hideHomepageAds === true || isPremium15k;
        const hideVideoAds = normalized.hideVideoAds === true || isPremium15k;
        const hasActiveSubscription = normalized.hasActiveSubscription === true;

        if (isComponentMounted) {
          setAdSettings({
            hideHomepageAds,
            hideVideoAds,
            packageType: normalized.packageType ?? null,
            hasActiveSubscription,
            isLoading: false,
            lastUpdated: new Date().toISOString()
          });
        }

        retryCount = 0;
      } catch (error) {
        // The permanent failures are told apart from the temporary ones.
        // Axios only sets `error.response` when the server answered, so a
        // missing value means a network error, a CORS problem or a
        // timeout.
        const err = error as { response?: { status?: number }; message?: string };
        const status = err?.response?.status;
        const isPermanent = status === 404 || status === 400;

        if (isPermanent) {
          isEndpointDisabled = true;
          // Log the "endpoint disabled" notice exactly once per mount so
          // we don't keep repeating ourselves on every interval tick.
          if (!endpointDisabledLogRef.current) {
            endpointDisabledLogRef.current = true;

          }
          if (isComponentMounted) {
            setAdSettings((prev) => ({ ...prev, isLoading: false }));
          }
        } else if (retryCount < MAX_RETRIES) {
          // The delay grows with each retry, so the backend is not hit
          // too fast.
          retryCount++;
          const delay = 1000 * Math.pow(2, retryCount);
          if (isComponentMounted) {
            benefitsTimeoutRef.current = setTimeout(fetchSubscriptionBenefits, delay);
          }
        } else {
          // Every retry has been used on temporary errors. No new attempt
          // is scheduled until the next interval tick (15 minutes), so
          // there is no infinite retry loop.
          if (isComponentMounted) {
            setAdSettings((prev) => ({ ...prev, isLoading: false }));
          }
        }
      } finally {
        isFetchingRef.current = false;
      }
    };

    fetchSubscriptionBenefits();

    // A periodic refresh is only scheduled when the endpoint seems to be
    // reachable.
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
  }, [isAuthenticated, authResolved]);

  // The "no access" page never shows the advertisements, whatever the
  // subscription of the user is.
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
