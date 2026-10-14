/**
 * @file pages/_app.tsx
 * @description Custom Next.js App component: global CSS, providers, layout, and
 * smart drag-vs-click detection across the application.
 */
import 'bootstrap/dist/css/bootstrap.min.css';
import Head from 'next/head';
import type { AppProps } from 'next/app';
import type { ComponentType, ReactNode } from 'react';
import '../styles/animation.css';
import '../styles/subscription-details.css';
import '../styles/feedbackAdmin.css';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider, withAccountStatus } from '../utils/auth';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import OfflineNotice from '../components/OfflineNotice';
import NetworkStatusBar from '../components/NetworkStatusBar';
import CinemaAlert from '../components/UI/CinemaAlert';
import AdContextProvider from '../context/AdContext';
import { registerServiceWorker } from '../utils/serviceWorker';
import { ROUTES } from '../config/routesConfig';

type AppPageProps = AppProps & { session?: unknown };

interface PageWithLayout {
  (props: Record<string, unknown>): ReactNode;
  getLayout?: (page: ReactNode) => ReactNode;
}

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppPageProps): ReactNode {
  const router = useRouter();
  const [user, setUser] = useState<unknown>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('bootstrap/dist/js/bootstrap.bundle.min.js');
      registerServiceWorker();
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let startX = 0;
    let startY = 0;
    let isDragging = false;
    const DRAG_THRESHOLD = 8;

    const handlePointerDown = (e: PointerEvent): void => {
      startX = e.clientX;
      startY = e.clientY;
      isDragging = false;
    };

    const handlePointerMove = (e: PointerEvent): void => {
      if (e.pointerType === 'mouse' && e.buttons === 0) return;
      const diffX = Math.abs(e.clientX - startX);
      const diffY = Math.abs(e.clientY - startY);
      if (diffX > DRAG_THRESHOLD || diffY > DRAG_THRESHOLD) isDragging = true;
    };

    const handleClickCapture = (e: MouseEvent): void => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        isDragging = false;
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true });
    window.addEventListener('pointermove', handlePointerMove, { capture: true, passive: true });
    window.addEventListener('click', handleClickCapture, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      window.removeEventListener('pointermove', handlePointerMove, { capture: true });
      window.removeEventListener('click', handleClickCapture, { capture: true });
    };
  }, []);

  const initializeUser = useCallback((): void => {
    if (typeof window !== 'undefined' && !isInitialized) {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          setUser(JSON.parse(userData));
        } catch (err) {
          console.error('Error parsing user data:', err);
        }
      }
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  const isAdminPage = router.pathname.startsWith(ROUTES.ADMIN_PREFIX) || router.pathname.startsWith('/admin');
  const isAuthPage = router.pathname.startsWith(ROUTES.AUTH_PREFIX);
  const isSearchPage = router.pathname === ROUTES.SEARCH;

  const PageWithLayout = Component as unknown as PageWithLayout;

  const getLayout = useCallback((page: ReactNode): ReactNode => {
    if (PageWithLayout.getLayout) return PageWithLayout.getLayout(page);
    if (isAdminPage) return page;
    return <Layout Component={Component}>{page}</Layout>;
  }, [Component, isAdminPage]);

  const getWrappedComponent = useCallback((): ReactNode => {
    const component = getLayout(<Component {...pageProps} />);
    if (isAuthPage || isAdminPage || isSearchPage) return component;
    const AccountStatusWrapper = withAccountStatus((): ReactNode => component);
    return <AccountStatusWrapper />;
  }, [Component, pageProps, getLayout, isAuthPage, isAdminPage, isSearchPage]);

  return (
    <SessionProvider session={session as never}>
      <AuthProvider>
        <AdContextProvider>
          <Head>
            <title>MovieStreaming</title>
            <meta name="description" content="Xem phim trực tuyến miễn phí HD" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="icon" href="/img/icons.png" />
          </Head>
          <NetworkStatusBar />
          <OfflineNotice />
          <CinemaAlert />
          {getWrappedComponent()}
        </AdContextProvider>

        <style jsx global>{`
          body {
            background-color: #000;
            color: #fff;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          html, body {
            scrollbar-width: none;
            -ms-overflow-style: none;
            overflow-x: hidden;
          }
          ::-webkit-scrollbar { display: none; width: 0px; background: transparent; }
          .text-muted, .form-text { color: #94a3b8 !important; }
          ::placeholder, .form-control::placeholder, input::placeholder, textarea::placeholder {
            color: #94a3b8 !important;
            opacity: 1 !important;
          }
          .form-control:focus::placeholder, input:focus::placeholder {
            color: #cbd5e1 !important;
            opacity: 1 !important;
          }
        `}</style>
      </AuthProvider>
    </SessionProvider>
  );
}

export default MyApp;
