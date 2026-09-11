'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { pendingEventFor } from '../../../lib/pendingAdmissions.js';
import { useSession } from '../../../hooks/useSession.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { TextField } from '../../../components/ui/TextField.jsx';
import { IconButton } from '../../../components/ui/IconButton.jsx';
import { Icon } from '../../../components/ui/Icon.jsx';
import { Notice } from '../../../components/ui/Notice.jsx';
import { InlineError } from '../../../components/ui/InlineError.jsx';
import { getDictionary, t } from '../../../lib/locale.js';
import styles from './login.module.css';

export default function LoginPage() {
  const params = useParams();
  const lang = params?.lang === 'en' ? 'en' : 'ar';
  const targetLang = lang === 'ar' ? 'en' : 'ar';
  const dict = getDictionary(lang);

  const router = useRouter();
  const { user, role, isAuthenticated, isLoading, login, logoutError, logout } = useSession();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to appropriate workspace
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const pendingEvent = pendingEventFor(user.id);
      if (pendingEvent) {
        router.replace(`/${lang}/gate?eventId=${pendingEvent}`);
      } else if (role === 'admin') {
        router.replace(`/${lang}/guests`);
      } else {
        router.replace(`/${lang}/gate`);
      }
    }
  }, [isLoading, isAuthenticated, user, role, lang, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      let sessionData;
      try {
        sessionData = await login({ username: username.trim(), password });
      } catch (firstErr) {
        if (firstErr?.code === 'UNAUTHENTICATED' && password !== password.trim()) {
          sessionData = await login({ username: username.trim(), password: password.trim() });
        } else {
          throw firstErr;
        }
      }
      const userRole = sessionData?.user?.role || sessionData?.role;
      const pendingEvent = pendingEventFor(sessionData?.user?.id);
      if (pendingEvent) {
        router.push(`/${lang}/gate?eventId=${pendingEvent}`);
      } else if (userRole === 'admin') {
        router.push(`/${lang}/guests`);
      } else {
        router.push(`/${lang}/gate`);
      }
    } catch (err) {
      if (err.code === 'UNAUTHENTICATED') {
        setErrorMsg(t(dict, 'auth.invalidCredentials'));
      } else if (err.code === 'FORBIDDEN') {
        setErrorMsg(t(dict, 'auth.disabledAccount'));
      } else {
        setErrorMsg(err.message || t(dict, 'errors.UNKNOWN'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <Link
          href={`/${targetLang}/login`}
          className={styles.langToggleLink}
          aria-label={t(dict, 'nav.languageToggleAria')}
        >
          {t(dict, 'nav.languageToggle')}
        </Link>
      </div>

      <div className={styles.card}>
        <div className={styles.logoWrapper}>
          <Image
            src="/images/logo.png"
            alt="Halaa Logo"
            width={64}
            height={64}
            priority
            className={styles.logo}
          />
        </div>

        {logoutError && (
          <Notice variant="warning">
            {t(dict, 'auth.logoutUncertain')}{' '}
            <Button onClick={logout} size="sm" variant="outline">
              {t(dict, 'common.retry')}
            </Button>
          </Notice>
        )}

        <h1 className={styles.title}>{t(dict, 'auth.title')}</h1>
        <p className={styles.subtitle}>{t(dict, 'auth.subtitle')}</p>

        {errorMsg && (
          <div style={{ width: '100%', marginBottom: '16px' }}>
            <InlineError message={errorMsg} />
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '16px' }}>
            <TextField
              label={t(dict, 'auth.username')}
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t(dict, 'auth.usernamePlaceholder')}
              autoComplete="username"
              required
              disabled={isSubmitting}
              leadingSlot={<Icon name="user" size="sm" />}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <TextField
              label={t(dict, 'auth.password')}
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(dict, 'auth.passwordPlaceholder')}
              autoComplete="current-password"
              required
              disabled={isSubmitting}
              leadingSlot={<Icon name="lock" size="sm" />}
              trailingSlot={
                <IconButton
                  type="button"
                  icon={<Icon name={showPassword ? 'eye-off' : 'eye'} size="sm" />}
                  label={showPassword ? t(dict, 'auth.hidePassword') : t(dict, 'auth.showPassword')}
                  title={showPassword ? t(dict, 'auth.hidePassword') : t(dict, 'auth.showPassword')}
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={0}
                />
              }
            />
          </div>

          <div className={styles.actions}>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              disabled={isSubmitting || !username.trim() || !password}
            >
              {isSubmitting ? t(dict, 'auth.loggingIn') : t(dict, 'auth.loginButton')}
            </Button>
          </div>
        </form>
      </div>

      <div className={styles.footer}>
        <span>© هلا لحلول الفعاليات — Halaa Event Solutions</span>
      </div>
    </div>
  );
}
