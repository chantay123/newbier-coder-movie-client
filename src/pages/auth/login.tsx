/**
 * @file pages/auth/login.tsx
 */
import { useState, useEffect, ChangeEvent, FormEvent, MouseEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import axios, { AxiosError } from 'axios';
import { useAuth } from '@/utils/auth';
import { AUTH_CONFIG } from '@/config/authConfig';
import styles from '@/styles/Login.module.css';
import type { NextPage } from 'next';
import type { ReactElement } from 'react';

import {
  FaRegEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaExclamationCircle,
  FaCheckCircle,
  FaArrowLeft
} from 'react-icons/fa';

const Login: NextPage & { getLayout?: (page: ReactElement) => ReactElement } = () => {
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading, user } = useAuth();
  const t = AUTH_CONFIG.login;

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [artworkSrc, setArtworkSrc] = useState<string>(
    AUTH_CONFIG.artwork?.defaultLoginImage || AUTH_CONFIG.defaultLoginArtwork
  );

  // Re-hydrate the remember-me checkbox from localStorage so the choice
  // persists across visits when the user previously opted in.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setRememberMe(localStorage.getItem('remember_me') === '1');
    } catch {
      /* localStorage may be disabled */
    }
  }, []);

  // If the visitor is already authenticated, send them straight to the
  // post-login destination so the Login form is never shown to a logged-in
  // user. We wait for `authLoading` to settle so we never redirect based on
  // a stale null user before the auth context finishes restoring the
  // session.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    if (typeof window === 'undefined') return;
    const redirectQuery = router.query.redirect;
    const redirectUrl =
      typeof redirectQuery === 'string' && redirectQuery ? redirectQuery : '/';
    router.replace(redirectUrl);
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (router.query.registered) {
      setMessage(t.notifications.registeredSuccess);
    }
  }, [router.query, t.notifications.registeredSuccess]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim() || !password) {
      setError(t.validation.requiredFields);
      return;
    }

    try {
      if (isLoading) return;
      setIsLoading(true);
      const result = await login({
        username: email.trim(),
        email: email.trim(),
        password,
        rememberMe
      });

      if (result.success) {
        setMessage(t.notifications.loginSuccess);
        setTimeout(() => {
          const redirectQuery = router.query.redirect;
          const redirectUrl =
            typeof redirectQuery === 'string' && redirectQuery ? redirectQuery : '/';
          router.push(redirectUrl);
        }, 800);
      } else {
        setError(result.error || t.validation.invalidCredentials || t.validation.wrongPassword);
      }
    } catch (apiError) {
      const err = apiError as Error;
      if (err.message?.includes('Failed to fetch')) {
        setError(t.validation.serverError);
      } else {
        setError(err.message || t.validation.invalidCredentials || t.validation.wrongPassword);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async (): Promise<void> => {
    try {
      setSocialLoading('google');
      setError('');
      const redirectQuery = router.query.redirect;
      const redirectUrl =
        typeof redirectQuery === 'string' && redirectQuery ? redirectQuery : '/';

      const result = await signIn('google', {
        callbackUrl: redirectUrl,
        redirect: false
      });

      if (result?.error) {
        setError(`${t.social.googleFailed}: ${result.error}`);
      } else if (result?.url) {
        router.push(result.url);
      }
    } catch (err) {

      setError(t.social.googleConnectError);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleGithubSignIn = async (): Promise<void> => {
    try {
      setSocialLoading('github');
      setError('');
      const redirectQuery = router.query.redirect;
      const redirectUrl =
        typeof redirectQuery === 'string' && redirectQuery ? redirectQuery : '/';

      const result = await signIn('github', {
        callbackUrl: redirectUrl,
        redirect: false
      });

      if (result?.error) {
        setError(t.social.githubDisabled);
      } else if (result?.url) {
        router.push(result.url);
      }
    } catch (err) {
      const _ = err;
      setError(t.social.githubUpdating);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleLinkedinSignIn = (): void => {
    setError(t.social.linkedinUpdating);
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setEmail(e.target.value);
    if (error) setError('');
  };
  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setPassword(e.target.value);
    if (error) setError('');
  };
  const toggleShowPassword = (e: MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    setShowPassword((p) => !p);
  };
  const handleArtworkError = (): void => {
    if (artworkSrc !== '/img/chantay.jpg') setArtworkSrc('/img/chantay.jpg');
  };

  // Show a short loading state while the auth context finishes restoring
  // an existing session, or when we are about to redirect a logged-in user
  // away from this page. This prevents the Login form from flashing on
  // top of an already-authenticated session.
  if (authLoading || (isAuthenticated && !!user)) {
    return (
      <div className={styles.loginPage}>
        <Head>
          <title>{t.meta.title}</title>
          <meta name="description" content={t.meta.description} />
        </Head>
        <div className={styles.formSide}>
          <div className={styles.formContainer}>
            <div className={styles.header}>
              <h1 className={styles.title}>{t.header.title}</h1>
              <p className={styles.subtitle}>Đang khôi phục phiên đăng nhập…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.loginPage}>
      <Head>
        <title>{t.meta.title}</title>
        <meta name="description" content={t.meta.description} />
      </Head>

      <div className={styles.formSide}>
        <Link href="/" className={styles.backHome}>
          <FaArrowLeft size={13} />
          <span>{t.navigation.backHome}</span>
        </Link>

        <div className={styles.formContainer}>
          <div className={styles.header}>
            <h1 className={styles.title}>{t.header.title}</h1>
            <p className={styles.subtitle}>{t.header.subtitle}</p>
          </div>

          <form className={styles.form} onSubmit={handleLogin} noValidate>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>
                <FaRegEnvelope />
              </span>
              <input
                type="email"
                name="email"
                id="login-email"
                className={styles.inputField}
                placeholder={t.placeholders.email}
                value={email}
                onChange={handleEmailChange}
                disabled={isLoading}
                autoComplete="email"
                required
              />
            </div>

            <div className={`${styles.inputWrapper} ${error ? styles.inputError : ''}`}>
              <span className={styles.inputIcon}>
                <FaLock />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                id="login-password"
                className={styles.inputField}
                placeholder={t.placeholders.password}
                value={password}
                onChange={handlePasswordChange}
                disabled={isLoading}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={toggleShowPassword}
                aria-label={showPassword ? t.accessibility.hidePassword : t.accessibility.showPassword}
                tabIndex={-1}
              >
                {showPassword ? <FaEye /> : <FaEyeSlash />}
              </button>
            </div>

            {error && (
              <div className={styles.errorBox}>
                <FaExclamationCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className={styles.successBox}>
                <FaCheckCircle size={14} />
                <span>{message}</span>
              </div>
            )}

            <label className={styles.rememberRow} htmlFor="login-remember">
              <input
                type="checkbox"
                id="login-remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
                aria-label={t.remember.ariaLabel}
              />
              <span className={styles.rememberLabel}>{t.remember.label}</span>
            </label>

            <button
              type="submit"
              id="login-submit"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : t.buttons.submit}
            </button>
          </form>

          {/* Social buttons preserved for future re-enable */}
          <div style={{ display: 'none' }} aria-hidden>
            <button type="button" onClick={handleGoogleSignIn}>Google</button>
            <button type="button" onClick={handleGithubSignIn}>GitHub</button>
            <button type="button" onClick={handleLinkedinSignIn}>LinkedIn</button>
          </div>
        </div>
      </div>

      <div className={styles.imageSide}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artworkSrc}
          alt={AUTH_CONFIG.artwork?.altText || AUTH_CONFIG.artworkAlt}
          className={styles.artworkImage}
          onError={handleArtworkError}
        />
      </div>
    </div>
  );
};

// Bypasses root Layout navbar/footer to keep the split-screen view clean and full-bleed
(Login as NextPage & { getLayout?: (page: ReactElement) => ReactElement }).getLayout = (page) => page;

export default Login;
