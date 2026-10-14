/**
 * @file pages/auth/login.tsx
 */
import { useState, useEffect, ChangeEvent, FormEvent, MouseEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import axios, { AxiosError } from 'axios';
import { useAuth } from '../../utils/auth';
import { signInWithFacebook } from '../../utils/firebase';
import { AUTH_CONFIG } from '../../config/authConfig';
import styles from '../../styles/Login.module.css';
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
  const { login } = useAuth();
  const t = AUTH_CONFIG.login;

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [artworkSrc, setArtworkSrc] = useState<string>(
    AUTH_CONFIG.artwork?.defaultLoginImage || AUTH_CONFIG.defaultLoginArtwork
  );

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
        password
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
      console.error('Google sign in error:', err);
      setError(t.social.googleConnectError);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleFacebookSignIn = async (): Promise<void> => {
    try {
      setSocialLoading('facebook');
      setError('');
      const result = await signInWithFacebook();

      if (result.success) {
        const fbUser = result.user;
        const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/facebook-login`, {
          email: fbUser?.email || `${fbUser?.uid}@facebook.com`,
          name: fbUser?.displayName,
          facebookId: fbUser?.uid,
          picture: fbUser?.photoURL
        });

        if (response.data && response.data.token) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          window.dispatchEvent(new Event('storage'));
          axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

          const redirectQuery = router.query.redirect;
          const redirectUrl =
            typeof redirectQuery === 'string' && redirectQuery ? redirectQuery : '/';
          router.push(redirectUrl);
        } else {
          setError(response.data?.error || t.social.facebookFailed);
        }
      } else {
        setError(result.error || t.social.facebookFailed);
      }
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      console.error('Facebook sign in error:', err);
      setError(axiosErr.message || t.social.facebookFailed);
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
            <button type="button" onClick={handleFacebookSignIn}>Facebook</button>
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
