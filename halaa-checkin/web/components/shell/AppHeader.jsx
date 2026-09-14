'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams, useParams, useRouter } from 'next/navigation';
import { useSession } from '../../hooks/useSession.jsx';
import { EventSelector } from './EventSelector.jsx';
import { WorkspaceNav } from './WorkspaceNav.jsx';
import { Icon } from '../ui/Icon.jsx';
import { Menu } from '../ui/Menu.jsx';
import { IconButton } from '../ui/IconButton.jsx';
import { getDictionary, t } from '../../lib/locale.js';
import styles from './AppHeader.module.css';

function initialOf(name) {
  const clean = String(name || '').replace(/[()[\]{}]/g, '').trim();
  return clean ? Array.from(clean)[0].toUpperCase() : '?';
}

/**
 * Application top bar: brand, workspace navigation, event switcher and session.
 * Desktop: one 64px row. Below 960px: brand + event + account on the first row,
 * workspace tabs on a second full-width row.
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

  const targetPath = pathname ? pathname.replace(`/${lang}`, `/${targetLang}`) : `/${targetLang}`;
  const queryString = searchParams?.toString() ? `?${searchParams.toString()}` : '';
  const langToggleUrl = `${targetPath}${queryString}`;

  const displayName = user?.displayName || user?.username || '';
  const roleLabel = role ? t(dict, `roles.${role}`) : '';
  const eventId = searchParams?.get('eventId');
  const homeHref = `/${lang}/${role === 'reception' ? 'gate' : 'guests'}${eventId ? `?eventId=${encodeURIComponent(eventId)}` : ''}`;

  const accountHeader = user ? (
    <div className={styles.menuIdentity}>
      <span className={styles.avatar} aria-hidden="true">{initialOf(displayName)}</span>
      <span className={styles.staffText}>
        <span className={styles.staffName} dir="auto">{displayName}</span>
        <span className={styles.staffRole}>{roleLabel}</span>
      </span>
    </div>
  ) : null;

  const mobileMenuItems = [
    {
      key: 'lang-toggle',
      label: t(dict, 'nav.languageToggle'),
      icon: <Icon name="languages" size="sm" />,
      onClick: () => router.push(langToggleUrl),
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: t(dict, 'nav.logout'),
      icon: <Icon name="logout" size="sm" mirror />,
      danger: true,
      onClick: logout,
    },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href={homeHref} className={styles.brand} aria-label="Halaa">
          <span className={styles.logoTile}>
            <Image
              src="/images/logo.png"
              alt=""
              width={40}
              height={40}
              priority
              className={styles.logo}
            />
          </span>
          <span className={styles.brandText}>
            <span className={styles.productName}>{t(dict, 'common.appName')}</span>
            <span className={styles.brandSub}>Halaa · هلا</span>
          </span>
        </Link>

        <div className={styles.nav}>
          <WorkspaceNav />
        </div>

        <div className={styles.event}>
          <EventSelector />
        </div>

        <div className={`${styles.session} ${styles.desktopOnly}`}>
          <Link
            href={langToggleUrl}
            className={styles.langToggle}
            aria-label={t(dict, 'nav.languageToggleAria')}
          >
            <Icon name="languages" size="sm" />
            <span>{t(dict, 'nav.languageToggle')}</span>
          </Link>

          <span className={styles.vDivider} aria-hidden="true" />

          {user && (
            <div className={styles.staff} title={`${displayName} · ${roleLabel}`}>
              <span className={styles.avatar} aria-hidden="true">{initialOf(displayName)}</span>
              <span className={styles.staffText}>
                <span className={styles.staffName} dir="auto">{displayName}</span>
                <span className={styles.staffRole}>{roleLabel}</span>
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={logout}
            className={styles.logoutBtn}
            title={t(dict, 'nav.logout')}
            aria-label={t(dict, 'nav.logout')}
          >
            <Icon name="logout" size="sm" mirror />
          </button>
        </div>

        <div className={`${styles.session} ${styles.mobileOnly}`}>
          <Menu
            align="end"
            aria-label={t(dict, 'nav.currentStaff')}
            header={accountHeader}
            minWidth={220}
            trigger={
              <IconButton
                icon={<span className={styles.avatar} aria-hidden="true">{initialOf(displayName)}</span>}
                label={t(dict, 'nav.currentStaff')}
                variant="ghost"
              />
            }
            items={mobileMenuItems}
          />
        </div>
      </div>
    </header>
  );
}
