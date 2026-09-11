'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useParams } from 'next/navigation';
import { useSession } from '../../hooks/useSession.jsx';
import { Icon } from '../ui/Icon.jsx';
import { getDictionary, t } from '../../lib/locale.js';
import styles from './WorkspaceNav.module.css';

/**
 * Workspace navigation tabs for Guests and Gate workspaces.
 * Reception role sees Gate only.
 * Uses compact selected surface instead of decorative underline.
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
      <div className={styles.segmentedWrapper}>
        {isAdmin && (
          <Link
            href={`/${lang}/guests${queryString}`}
            className={`${styles.navLink} ${isGuests ? styles.active : ''}`}
            aria-current={isGuests ? 'page' : undefined}
          >
            <span className={styles.icon} aria-hidden="true">
              <Icon name="users" size="sm" />
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
            <Icon name="qr" size="sm" />
          </span>
          <span>{t(dict, 'nav.gate')}</span>
        </Link>
      </div>
    </nav>
  );
}
