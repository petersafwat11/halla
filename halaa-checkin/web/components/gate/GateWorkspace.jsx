'use client';

import React from 'react';
import { useEvent } from '../../hooks/useEvent.jsx';
import { useGate } from '../../hooks/useGate.js';
import { useStats } from '../../hooks/useStats.js';
import { CameraScanner } from './CameraScanner.jsx';
import { ScannerInput } from './ScannerInput.jsx';
import { GuestLookup } from './GuestLookup.jsx';
import { AdmissionCard } from './AdmissionCard.jsx';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { Notice } from '../ui/Notice.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { Icon } from '../ui/Icon.jsx';
import { getDictionary, t, formatRiyadhDate } from '../../lib/locale.js';
import styles from './GateWorkspace.module.css';

/**
 * Gate reception workspace.
 * Layout: event strip with live counters, a single scan panel (scanner, manual
 * search, camera), the admission panel, and the recent admissions log.
 */
export function GateWorkspace({ lang = 'ar' }) {
  const dict = getDictionary(lang);
  const { selectedEvent, hasEvents } = useEvent();
  const [cameraStopSignal, setCameraStopSignal] = React.useState(0);
  const numberFormat = new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ar-SA');

  const {
    gateState,
    errorDetails,
    currentGuest,
    gateEvent,
    actualCompanions,
    derivedPartySize,
    setActualCompanions,
    isOnline,
    browserOnline,
    apiReachable,
    recentError,
    asOf,
    recentAdmissions,
    isBusy,
    resolve,
    admit,
    retryAdmission,
    verifyStatus,
    resetToIdle,
    refetchRecent,
  } = useGate(selectedEvent?.id);

  const { stats } = useStats(selectedEvent?.id);
  const hasStats = !!stats?.asOf;

  // Stop camera on event switch (spec §6: stop tracks on event switch/logout/nav)
  React.useEffect(() => {
    setCameraStopSignal((n) => n + 1);
  }, [selectedEvent?.id]);

  // F10: session expiry stops the camera too.
  React.useEffect(() => {
    if (gateState === 'session_expired') {
      setCameraStopSignal((n) => n + 1);
    }
  }, [gateState]);

  if (!hasEvents || !selectedEvent) {
    return (
      <div className={styles.emptyCard}>
        <EmptyState icon="calendar" title={t(dict, 'events.noEventsReception')} />
      </div>
    );
  }

  const isClosed = selectedEvent.status === 'closed';
  const isDraft = selectedEvent.status === 'draft';
  // F11: use the fresher resolved gateEvent when available.
  const effectiveEvent = gateEvent?.id === selectedEvent.id &&
    (gateEvent.version ?? 0) >= (selectedEvent.version ?? 0) ? gateEvent : selectedEvent;
  const effectiveClosed = effectiveEvent?.status === 'closed';
  const effectiveDraft = effectiveEvent?.status === 'draft';
  // F09: lock all competing inputs during resolution/submission/uncertainty.
  const inputsLocked = isClosed || isDraft || effectiveClosed || effectiveDraft || isBusy;

  const handleScan = (tokenOrId, scanMethod) => {
    if (isBusy) return;
    resolve({ token: tokenOrId }, scanMethod);
  };

  const handleManualSelect = (guestIdPayload, scanMethod) => {
    if (isBusy) return;
    resolve(guestIdPayload, scanMethod);
  };

  const connectionLabel = !browserOnline
    ? t(dict, 'gate.connectionOffline')
    : !apiReachable
      ? t(dict, 'gate.connectionStale')
      : t(dict, 'gate.connectionOnline');

  return (
    <div className={styles.container} data-testid="gate-workspace">
      {/* Event strip */}
      <header className={styles.eventHeader} data-testid="gate-event-header">
        <div className={styles.eventInfo}>
          <div className={styles.eventTitleRow}>
            <h1 className={styles.eventName} dir="auto">{selectedEvent.name}</h1>
            <StatusBadge
              status={selectedEvent.status}
              label={t(dict, `status.${selectedEvent.status}`)}
              size="md"
            />
          </div>
          <div className={styles.eventMeta}>
            <span className={styles.metaItem}>
              <Icon name="map-pin" size="sm" />
              <span dir="auto">{selectedEvent.venue}</span>
            </span>
            <span className={styles.metaItem}>
              <Icon name="calendar-days" size="sm" />
              <bdi>{formatRiyadhDate(selectedEvent.startsAt, lang)}</bdi>
            </span>
          </div>
        </div>

        <div className={styles.headerSide}>
          {hasStats && (
            <div className={styles.liveCounters}>
              <div className={styles.counter}>
                <span className={styles.counterLabel}>{t(dict, 'gate.liveAdmitted')}</span>
                <span className={`${styles.counterValue} tabular`}>
                  {numberFormat.format(stats.totalAttendees)}
                  <span className={styles.counterTotal}> / {numberFormat.format(stats.totalExpected)}</span>
                </span>
              </div>
              <span className={styles.counterDivider} aria-hidden="true" />
              <div className={styles.counter}>
                <span className={styles.counterLabel}>{t(dict, 'gate.liveInvitations')}</span>
                <span className={`${styles.counterValue} tabular`}>
                  {numberFormat.format(stats.admittedInvitations)}
                  <span className={styles.counterTotal}> / {numberFormat.format(stats.totalInvitations)}</span>
                </span>
              </div>
            </div>
          )}

          <div className={styles.connectionBlock}>
            <span
              className={`${styles.connectionPill} ${isOnline ? styles.online : styles.offline}`}
              data-testid="connection-status-pill"
              role="status"
              aria-live="polite"
            >
              <span className={styles.statusDot} aria-hidden="true" />
              <span>{connectionLabel}</span>
            </span>
            <span className={`${styles.asOfText} tabular`}>
              {asOf ? (
                <>
                  {t(dict, 'common.asOf')}{' '}
                  {new Date(asOf).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: 'Asia/Riyadh',
                  })}
                </>
              ) : (
                t(dict, 'gate.connectionStale')
              )}
            </span>
            {recentError && (
              <button
                type="button"
                onClick={() => refetchRecent()}
                data-testid="recent-retry-btn"
                className={styles.retryBtn}
              >
                {t(dict, 'common.retry')}
              </button>
            )}
          </div>
        </div>
      </header>

      {(isClosed || effectiveClosed) && (
        <Notice variant="warning" data-testid="gate-closed-warning">
          {t(dict, 'gate.eventClosedMessage')}
        </Notice>
      )}
      {(isDraft || effectiveDraft) && (
        <Notice variant="info" data-testid="gate-draft-warning">
          {t(dict, 'gate.eventDraftMessage')}
        </Notice>
      )}
      {errorDetails && gateState === 'ready' && (
        <Notice variant="warning">
          {t(dict, `errors.${errorDetails.code}`) || t(dict, 'errors.UNKNOWN')}
        </Notice>
      )}

      <div className={styles.grid}>
        <section className={styles.scanCard} aria-label={t(dict, 'gate.workspaceTitle')}>
          <div className={styles.scanSection}>
            <ScannerInput onScan={handleScan} disabled={inputsLocked} dict={dict} />
          </div>
          <div className={styles.scanSection}>
            <GuestLookup
              eventId={selectedEvent.id}
              onSelect={handleManualSelect}
              disabled={inputsLocked}
              dict={dict}
            />
          </div>
          <div className={`${styles.scanSection} ${styles.scanSectionMuted}`}>
            <CameraScanner
              onScan={handleScan}
              disabled={inputsLocked}
              dict={dict}
              stopSignal={cameraStopSignal}
            />
          </div>
        </section>

        <div className={styles.previewColumn} aria-live="polite">
          <AdmissionCard
            gateState={gateState}
            currentGuest={currentGuest}
            actualCompanions={actualCompanions}
            derivedPartySize={derivedPartySize}
            setActualCompanions={setActualCompanions}
            onAdmit={admit}
            onRetryAdmission={retryAdmission}
            onVerifyStatus={verifyStatus}
            onReset={resetToIdle}
            lang={lang}
            dict={dict}
          />
        </div>

        <section className={styles.recentSection} data-testid="recent-admissions-section">
          <div className={styles.recentHeader}>
            <h2 className={styles.recentTitle}>
              <Icon name="history" size="sm" />
              <span>{t(dict, 'gate.recentAdmissionsTitle')}</span>
            </h2>
          </div>

          {recentError ? (
            <div className={styles.recentBody}>
              <Notice variant="warning">{t(dict, 'common.networkError')}</Notice>
            </div>
          ) : recentAdmissions.length === 0 ? (
            <div className={styles.emptyRecent} data-testid="empty-recent-admissions">
              {t(dict, 'gate.recentAdmissionsEmpty')}
            </div>
          ) : (
            <ul className={styles.recentList} data-testid="recent-admissions-list">
              {recentAdmissions.slice(0, 10).map((guest) => {
                const checkIn = guest.checkIn || {};
                const partySize = checkIn.actualPartySize || (1 + (checkIn.actualCompanions || 0));
                const time = checkIn.checkedInAt || checkIn.admittedAt;
                const formattedTime = time
                  ? formatRiyadhDate(time, lang, { year: undefined, month: undefined, day: undefined })
                  : '';
                const operator = checkIn.operatorName || checkIn.operatorUsername || '';

                return (
                  <li
                    key={guest.id}
                    className={styles.recentItem}
                    data-testid={`recent-admission-card-${guest.id}`}
                  >
                    <span className={styles.recentIcon} aria-hidden="true">
                      <Icon name="check" size="sm" />
                    </span>
                    <div className={styles.recentText}>
                      <span className={styles.recentGuestName} dir="auto">{guest.name}</span>
                      <span className={styles.recentMeta}>
                        <span className={styles.metaItem}>
                          <Icon name="users" size="xs" />
                          <span>{t(dict, 'gate.successPartyCount', { count: partySize })}</span>
                        </span>
                        {operator && (
                          <span className={styles.metaItem}>
                            <Icon name="user" size="xs" />
                            <bdi>{operator}</bdi>
                          </span>
                        )}
                      </span>
                    </div>
                    {formattedTime && <bdi className={`${styles.recentTime} tabular`}>{formattedTime}</bdi>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
