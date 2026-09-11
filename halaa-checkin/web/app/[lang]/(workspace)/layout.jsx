'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useSession } from '../../../hooks/useSession.jsx';
import { useEvent } from '../../../hooks/useEvent.jsx';
import { AppHeader } from '../../../components/shell/AppHeader.jsx';
import { WorkspaceNav } from '../../../components/shell/WorkspaceNav.jsx';
import { Dialog } from '../../../components/ui/Dialog.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { getDictionary, t } from '../../../lib/locale.js';
import styles from './workspace.module.css';

export default function WorkspaceLayout({ children }) {
  const params = useParams();
  const lang = params?.lang === 'en' ? 'en' : 'ar';
  const dict = getDictionary(lang);
  const router = useRouter();
  const pathname = usePathname();

  const { user, role, isAuthenticated, isLoading, isExpired, logout } = useSession();
  const { events, isLoadingEvents, hasEvents, eventsError, refetchEvents } = useEvent();

  // Guard unauthenticated access
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/${lang}/login`);
    }
  }, [isLoading, isAuthenticated, lang, router]);

  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} aria-hidden="true" />
        <p>{t(dict, 'common.loading')}</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Will redirect in useEffect
  }

  const isGuestsRoute = pathname?.includes('/guests');
  // Admin Guests workspace owns its empty state (working creation dialog).
  // Layout only intercepts: fetch errors, reception unassigned, and admin on
  // non-guests routes with no events.
  const showUnassignedState =
    !isLoadingEvents &&
    !hasEvents &&
    !(role === 'admin' && isGuestsRoute);

  return (
    <div className={styles.shell}>
      <AppHeader />
      <WorkspaceNav />

      <main className={styles.mainContent}>
        {!isLoadingEvents && eventsError && !hasEvents ? (
          <div className={styles.unassignedCard} role="alert">
            <h2 className={styles.unassignedTitle}>
              {t(dict, 'common.networkError')}
            </h2>
            <p className={styles.unassignedDesc}>
              {eventsError?.message || t(dict, 'common.networkError')}
            </p>
            <Button variant="primary" onClick={() => refetchEvents?.()}>
              {t(dict, 'common.retry')}
            </Button>
          </div>
        ) : showUnassignedState ? (
          <div className={styles.unassignedCard}>
            <div className={styles.unassignedIcon} aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h2 className={styles.unassignedTitle}>
              {role === 'admin'
                ? t(dict, 'events.noEventsAdmin')
                : t(dict, 'events.noEventsReception')}
            </h2>
            <p className={styles.unassignedDesc}>
              {role === 'admin'
                ? t(dict, 'events.createFirstEventPrompt')
                : t(dict, 'events.noEventsReception')}
            </p>
            {role === 'admin' && (
              <Button variant="primary" onClick={() => router.push(`/${lang}/guests`)}>
                {t(dict, 'events.createFirstEvent')}
              </Button>
            )}
          </div>
        ) : (
          children
        )}
      </main>

      {/* Session Expired Modal */}
      <Dialog
        isOpen={isExpired}
        onClose={logout}
        title={t(dict, 'auth.sessionExpired')}
        footer={
          <Button variant="primary" onClick={logout}>
            {t(dict, 'auth.loginButton')}
          </Button>
        }
      >
        <p style={{ margin: '8px 0', color: 'var(--color-natural-700, #454545)' }}>
          {t(dict, 'auth.sessionExpired')}
        </p>
      </Dialog>
    </div>
  );
}
