'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams, useParams, useRouter } from 'next/navigation';
import { useSession } from '../../hooks/useSession.jsx';
import { EventSelector } from './EventSelector.jsx';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { Icon } from '../ui/Icon.jsx';
import { Menu } from '../ui/Menu.jsx';
import { IconButton } from '../ui/IconButton.jsx';
import { getDictionary, t } from '../../lib/locale.js';
import styles from './AppHeader.module.css';

/**
 * AppHeader renders official Halaa branding, event selector, language switch, staff info, and logout.
 * Desktop: 64px sticky header with brand/product, event selector, session utilities.
 * Mobile: compact logo, event selector trigger, session menu.
 */
export function AppHeader() {
  const params = useParams();
  const lang = params?.lang === 'en' ? 'en' : 'ar';
  const targetLang = lang === 'ar' ? 'en' : 'ar';
  const dict = getDictionary(lang);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, role, logout } = useSession();

  // Create target URL for language toggle, preserving path & search params
  const targetPath = pathname ? pathname.replace(`/${lang}`, `/${targetLang}`) : `/${targetLang}`;
  const queryString = searchParams?.toString() ? `?${searchParams.toString()}` : '';
  const langToggleUrl = `${targetPath}${queryString}`;

  const mobileMenuItems = [
    ...(user
      ? [
          {
            key: 'user-info',
            label: `${user.displayName || user.username} (${t(dict, `roles.${role}`)})`,
            icon: <Icon name="user" size="sm" />,
            disabled: true,
          },
          { type: 'divider' },
        ]
      : []),
    {
      key: 'lang-toggle',
      label: t(dict, 'nav.languageToggle'),
      icon: <Icon name="globe" size="sm" />,
      onClick: () => router.push(langToggleUrl),
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: t(dict, 'nav.logout'),
      icon: <Icon name="logout" size="sm" />,
      danger: true,
      onClick: logout,
    },
  ];

  return (
    <header className={styles.header}>
      {/* Zone 1: Brand & Product title */}
      <div className={styles.startSection}>
        <Link href={`/${lang}/guests`} className={styles.logoLink} aria-label="Halaa Home">
          <Image
            src="/images/logo.png"
            alt="Halaa Logo"
            width={34}
            height={34}
            priority
            className={styles.logo}
          />
        </Link>
        <span className={styles.divider} aria-hidden="true" />
        <span className={styles.productTitle}>{t(dict, 'common.appName')}</span>
      </div>

      {/* Zone 2: Event Selector */}
      <div className={styles.centerSection}>
        <EventSelector />
      </div>

      {/* Zone 3: Session Utilities (Desktop) */}
      <div className={`${styles.endSection} ${styles.desktopOnly}`}>
        <Link
          href={langToggleUrl}
          className={styles.langToggle}
          aria-label={t(dict, 'nav.languageToggleAria')}
        >
          {t(dict, 'nav.languageToggle')}
        </Link>

        {user && role && (role === 'admin' || role === 'reception') && (
          <div className={styles.staffChip}>
            <span className={styles.staffName} dir="auto">
              {user.displayName || user.username}
            </span>
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
          <Icon name="logout" size="sm" />
        </button>
      </div>

      {/* Mobile Session Menu */}
      <div className={`${styles.endSection} ${styles.mobileOnly}`}>
        <Menu
          align="end"
          aria-label={t(dict, 'nav.currentStaff')}
          trigger={
            <IconButton
              icon={<Icon name="user" size="md" />}
              label={t(dict, 'nav.currentStaff')}
              variant="outline"
            />
          }
          items={mobileMenuItems}
        />
      </div>
    </header>
  );
}
