'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useSession } from '../../../hooks/useSession.jsx';
import { useEvent } from '../../../hooks/useEvent.jsx';
import { AppHeader } from '../../../components/shell/AppHeader.jsx';
import { Dialog } from '../../../components/ui/Dialog.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { getDictionary, t } from '../../../lib/locale.js';
import styles from './workspace.module.css';

export default function WorkspaceLayout({ children }) {
  const params = useParams();
  const lang = params?.lang === 'en' ? 'en' : 'ar';
  const dict = getDictionary(lang);
  const router = useRouter();
  const pathname = usePathname();

  const { user, role, isAuthenticated, isLoading, isExpired, logout } = useSession();
  const { isLoadingEvents, hasEvents, eventsError, refetchEvents } = useEvent();

  // Guard unauthenticated access
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/${lang}/login`);
    }
  }, [isLoading, isAuthenticated, lang, router]);

  if (isLoading) {
    return (
      <div className={styles.loadingScreen} role="status">
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

      <main className={styles.mainContent}>
        {!isLoadingEvents && eventsError && !hasEvents ? (
          <div className={styles.stateCard} role="alert">
            <EmptyState
              icon="wifi-off"
              title={t(dict, 'common.networkError')}
              description={eventsError?.message && eventsError.message !== t(dict, 'common.networkError') ? eventsError.message : null}
              action={
                <Button variant="primary" leadingIcon="refresh" onClick={() => refetchEvents?.()}>
                  {t(dict, 'common.retry')}
                </Button>
              }
            />
          </div>
        ) : showUnassignedState ? (
          <div className={styles.stateCard}>
            <EmptyState
              icon="calendar"
              title={role === 'admin' ? t(dict, 'events.noEventsAdmin') : t(dict, 'events.noEventsReception')}
              description={role === 'admin' ? t(dict, 'events.createFirstEventPrompt') : null}
              action={
                role === 'admin' ? (
                  <Button variant="primary" leadingIcon="plus" onClick={() => router.push(`/${lang}/guests`)}>
                    {t(dict, 'events.createFirstEvent')}
                  </Button>
                ) : null
              }
            />
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
        icon="lock"
        tone="warning"
        size="sm"
        closeAriaLabel={t(dict, 'dialog.close')}
        footer={
          <Button variant="primary" onClick={logout}>
            {t(dict, 'auth.loginButton')}
          </Button>
        }
      >
        <p className={styles.dialogText}>{t(dict, 'auth.loginPrompt')}</p>
      </Dialog>
    </div>
  );
}
