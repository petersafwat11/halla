'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useParams } from 'next/navigation';
import { useSession } from '../../hooks/useSession.jsx';
import { getDictionary, t } from '../../lib/locale.js';
import styles from './WorkspaceNav.module.css';

/**
 * Workspace navigation tabs for Guests and Gate workspaces.
 * Reception role sees Gate only.
 */
export function WorkspaceNav() {
  const params = useParams();
  const lang = params?.lang === 'en' ? 'en' : 'ar';
  const dict = getDictionary(lang);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { role } = useSession();

  const eventId = searchParams?.get('eventId');
  const queryString = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';

  const isGuests = pathname.includes('/guests');
  const isGate = pathname.includes('/gate');

  const isAdmin = role === 'admin';

  return (
    <nav className={styles.navBar} aria-label="Workspaces">
      {isAdmin && (
        <Link
          href={`/${lang}/guests${queryString}`}
          className={`${styles.navLink} ${isGuests ? styles.active : ''}`}
          aria-current={isGuests ? 'page' : undefined}
        >
          <span className={styles.icon} aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <span>{t(dict, 'nav.guests')}</span>
        </Link>
      )}

      <Link
        href={`/${lang}/gate${queryString}`}
        className={`${styles.navLink} ${isGate ? styles.active : ''}`}
        aria-current={isGate ? 'page' : undefined}
      >
        <span className={styles.icon} aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        </span>
        <span>{t(dict, 'nav.gate')}</span>
      </Link>
    </nav>
  );
}
