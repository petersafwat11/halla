'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams, useParams } from 'next/navigation';
import { useSession } from '../../hooks/useSession.jsx';
import { EventSelector } from './EventSelector.jsx';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { getDictionary, t } from '../../lib/locale.js';
import styles from './AppHeader.module.css';

/**
 * AppHeader renders the Halaa branding, event selector, language switch, staff info, and logout.
 */
export function AppHeader() {
  const params = useParams();
  const lang = params?.lang === 'en' ? 'en' : 'ar';
  const targetLang = lang === 'ar' ? 'en' : 'ar';
  const dict = getDictionary(lang);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, role, logout } = useSession();

  // Create target URL for language toggle, preserving path & search params
  const targetPath = pathname ? pathname.replace(`/${lang}`, `/${targetLang}`) : `/${targetLang}`;
  const queryString = searchParams?.toString() ? `?${searchParams.toString()}` : '';
  const langToggleUrl = `${targetPath}${queryString}`;

  return (
    <header className={styles.header}>
      <div className={styles.startSection}>
        <Link href={`/${lang}/guests`} className={styles.logoLink} aria-label="Halaa Home">
          <Image
            src="/images/sidebar-logo.svg"
            alt="Halaa Logo"
            width={140}
            height={32}
            priority
            className={styles.logo}
          />
        </Link>
        <span className={styles.divider} aria-hidden="true" />
        <span className={styles.productTitle}>{t(dict, 'common.appName')}</span>
      </div>

      <div className={styles.centerSection}>
        <EventSelector />
      </div>

      <div className={styles.endSection}>
        <Link
          href={langToggleUrl}
          className={styles.langToggle}
          aria-label={t(dict, 'nav.languageToggleAria')}
        >
          {t(dict, 'nav.languageToggle')}
        </Link>

        {user && role && (role === 'admin' || role === 'reception') && (
          <div className={styles.staffChip}>
            <span className={styles.staffName}>{user.displayName || user.username}</span>
            <StatusBadge
              status={role}
              label={t(dict, `roles.${role}`)}
              size="sm"
            />
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          className={styles.logoutBtn}
          title={t(dict, 'nav.logout')}
          aria-label={t(dict, 'nav.logout')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
