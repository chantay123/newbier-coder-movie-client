/**
 * @file pages/common/account-locked.tsx
 * @description Standalone locked-account page that intercepts XHR/fetch to keep
 * the user from triggering account-related network calls while locked.
 */
import { useState, useEffect, MouseEvent } from 'react';
import Head from 'next/head';
import type { NextPage, GetStaticProps } from 'next';
import type { ReactElement } from 'react';

const setCookie = (name: string, value: string, days?: number): void => {
  if (typeof document === 'undefined') return;
  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = `; expires=${date.toUTCString()}`;
  }
  document.cookie = `${name}=${value || ''}${expires}; path=/`;
};

const deleteCookie = (name: string): void => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

interface BlockedRequestShape {
  blocked: boolean;
  message: string;
  status: number;
}

const AccountLockedPage: NextPage = () => {
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);

  const handleLogout = (): void => {
    if (isRedirecting) return;
    setIsRedirecting(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('isAccountLocked');
        deleteCookie('isAccountLocked');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        if (window.sessionStorage) {
          window.sessionStorage.removeItem('backendToken');
          window.sessionStorage.removeItem('user');
        }

        document.cookie.split(';').forEach((cookie) => {
          const [name] = cookie.trim().split('=');
          deleteCookie(name);
        });

        setTimeout(() => {
          try {
            window.location.href = '/auth/login?locked=true';
          } catch (error) {
            console.error('Error redirecting with window.location:', error);
            const link = document.createElement('a');
            link.href = '/auth/login?locked=true';
            link.setAttribute('data-redirect', 'forced');
            document.body.appendChild(link);
            link.click();
          }
        }, 300);
      }
    } catch (error) {
      console.error('Error during logout:', error);
      alert('Có lỗi xảy ra khi đăng xuất. Vui lòng tải lại trang.');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    localStorage.setItem('isAccountLocked', 'true');
    setCookie('isAccountLocked', 'true', 7);

    let requestCount = 0;
    const MAX_REQUESTS = 50;
    const requestLog: Record<string, number> = {};

    const showRateLimitMessage = (): void => {
      if (!document.getElementById('rate-limit-message')) {
        const message = document.createElement('div');
        message.id = 'rate-limit-message';
        message.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #e50914;
          color: white;
          padding: 15px;
          border-radius: 5px;
          z-index: 9999;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        message.innerText = 'Quá nhiều yêu cầu được gửi. Hệ thống đang bị giới hạn.';
        document.body.appendChild(message);

        setTimeout(() => {
          if (message && message.parentNode) {
            message.parentNode.removeChild(message);
          }
        }, 5000);
      }
    };

    const originalXHR = window.XMLHttpRequest;
    const XHRConstructor = function (this: XMLHttpRequest): XMLHttpRequest {
      const xhr = new originalXHR();
      const originalOpen = xhr.open.bind(xhr);

      xhr.open = function (method: string, url: string | URL, ...rest: unknown[]): void {
        if (requestCount >= MAX_REQUESTS) {
          showRateLimitMessage();
          setTimeout(() => {
            if (xhr.onabort) xhr.onabort(new ProgressEvent('abort'));
          }, 0);
          return;
        }
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/') || urlStr.includes('/auth/')) {
          requestCount++;
          const domain = urlStr.split('/').slice(0, 3).join('/');
          requestLog[domain] = (requestLog[domain] || 0) + 1;

          if (requestLog[domain] > 10) {
            console.warn('Phát hiện spam từ domain:', domain);
            showRateLimitMessage();
          }

          setTimeout(() => {
            // Mutating read-only XHR properties here is the original (intentional)
            // anti-spam trick from the legacy page. The DOM lib types these as
            // readonly, so we cast through `unknown` to preserve behaviour.
            const xhrMut = xhr as unknown as {
              readyState: number;
              status: number;
              responseText: string;
              onreadystatechange: ((ev: ProgressEvent) => void) | null;
              onerror: ((ev: ProgressEvent) => void) | null;
            };
            if (xhrMut.onreadystatechange) {
              xhrMut.readyState = 4;
              xhrMut.status = 403;
              xhrMut.responseText = JSON.stringify({
                blocked: true,
                message: 'Tài khoản đã bị khóa',
                status: 403
              });
              xhrMut.onreadystatechange(new ProgressEvent('readystatechange'));
            }
            if (xhrMut.onerror) xhrMut.onerror(new ProgressEvent('error'));
          }, 500);
          return;
        }
        (originalOpen as (...a: unknown[]) => void)(method, url, ...rest);
      };
      return xhr;
    } as unknown as typeof XMLHttpRequest;
    window.XMLHttpRequest = XHRConstructor;

    const preventBackNavigation = (): void => {
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', preventBackNavigation);

    const originalFetch = window.fetch.bind(window);
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const authHeader =
        init?.headers &&
        ((init.headers as Record<string, string>)['Authorization'] ||
          (typeof (init.headers as Headers).get === 'function' &&
            (init.headers as Headers).get('Authorization')));

      if (
        urlStr.includes('/_next/data') ||
        urlStr.includes('/api/') ||
        urlStr.includes('/auth/') ||
        authHeader
      ) {
        const body: BlockedRequestShape = {
          blocked: true,
          message: 'Tài khoản đã bị khóa',
          status: 403
        };
        return new Promise<Response>((resolve) => {
          setTimeout(() => {
            resolve(
              new Response(JSON.stringify(body), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
              })
            );
          }, 500);
        });
      }
      return originalFetch(input, init);
    };

    return () => {
      window.removeEventListener('popstate', preventBackNavigation);
      window.fetch = originalFetch;
      window.XMLHttpRequest = originalXHR;
    };
  }, []);

  return (
    <>
      <Head>
        <title>Tài khoản đã bị khóa</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="account-locked-container">
        <div className="account-locked-card">
          <h1>Tài khoản đã bị khóa</h1>
          <p className="locked-message">
            Tài khoản của bạn hiện đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.
          </p>
          <button
            className="login-button"
            onClick={handleLogout as unknown as (e: MouseEvent<HTMLButtonElement>) => void}
            disabled={isRedirecting}
            type="button"
          >
            {isRedirecting ? 'Đang xử lý...' : 'Quay lại trang đăng nhập'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .account-locked-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #000000;
          padding: 20px;
        }
        .account-locked-card {
          background-color: #e50914;
          padding: 2rem;
          border-radius: 4px;
          max-width: 500px;
          width: 100%;
          color: white;
          text-align: center;
        }
        h1 { font-size: 1.8rem; margin-bottom: 1.5rem; font-weight: 700; }
        .locked-message { margin-bottom: 1.5rem; font-size: 1rem; }
        .login-button {
          background-color: white;
          color: black;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          font-weight: 500;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .login-button:hover:not(:disabled) {
          background-color: #f8f8f8;
          transform: translateY(-2px);
        }
        .login-button:disabled { opacity: 0.7; cursor: not-allowed; }
      `}</style>
    </>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  return { props: {} };
};

(AccountLockedPage as NextPage & { getLayout?: (page: ReactElement) => ReactElement }).getLayout = (
  page
) => page;

export default AccountLockedPage;
