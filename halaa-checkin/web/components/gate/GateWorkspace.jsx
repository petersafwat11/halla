'use client';

import React from 'react';
import { useEvent } from '../../hooks/useEvent.jsx';
import { useGate } from '../../hooks/useGate.js';
import { CameraScanner } from './CameraScanner.jsx';
import { ScannerInput } from './ScannerInput.jsx';
import { GuestLookup } from './GuestLookup.jsx';
import { AdmissionCard } from './AdmissionCard.jsx';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { Notice } from '../ui/Notice.jsx';
import { getDictionary, t, formatRiyadhDate } from '../../lib/locale.js';
import styles from './GateWorkspace.module.css';

/**
 * Main Gate Workspace Component.
 * Adheres to Technical Contract Section 5 and Product Section 6.
 */
export function GateWorkspace({ lang = 'ar' }) {
  const dict = getDictionary(lang);
  const { selectedEvent, hasEvents } = useEvent();
  const [cameraStopSignal, setCameraStopSignal] = React.useState(0);

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

  // Stop camera on event switch (spec §6: stop tracks on event switch/logout/nav)
  React.useEffect(() => {
    setCameraStopSignal((n) => n + 1);
  }, [selectedEvent?.id]);

  // F10: session expiry stops camera and clears no private data stays visible
  // is handled via central 401 (query cache cleared); stop camera here too.
  React.useEffect(() => {
    if (gateState === 'session_expired') {
      setCameraStopSignal((n) => n + 1);
    }
  }, [gateState]);

  if (!hasEvents || !selectedEvent) {
    return (
      <div className={styles.container}>
        <Notice variant="info">
          {t(dict, 'events.noEventsReception')}
        </Notice>
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
    // If it looks like Crockford or ID, resolve by token
    resolve({ token: tokenOrId }, scanMethod);
  };

  const handleManualSelect = (guestIdPayload, scanMethod) => {
    if (isBusy) return;
    resolve(guestIdPayload, scanMethod);
  };

  return (
    <div className={styles.container} data-testid="gate-workspace">
      {/* Event Header Bar (identity always visible) */}
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
            <span>📍 <span dir="auto">{selectedEvent.venue}</span></span>
            <span>🕒 {formatRiyadhDate(selectedEvent.startsAt, lang)}</span>
          </div>
        </div>

        <div className={styles.statusPillRow}>
          <span
            className={`${styles.connectionPill} ${isOnline ? styles.online : styles.offline}`}
            data-testid="connection-status-pill"
            role="status"
            aria-live="polite"
            title={browserOnline ? (apiReachable ? '' : t(dict, 'common.networkError')) : t(dict, 'gate.connectionOffline')}
          >
            <span>{isOnline ? '🟢' : '🔴'}</span>
            <span>
              {!browserOnline
                ? t(dict, 'gate.connectionOffline')
                : !apiReachable
                  ? t(dict, 'gate.connectionStale')
                  : t(dict, 'gate.connectionOnline')}
            </span>
          </span>
          {asOf ? (
            <span className={styles.asOfText}>
              {t(dict, 'common.asOf')}{' '}
              {new Date(asOf).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZone: 'Asia/Riyadh',
              })}
            </span>
          ) : (
            <span className={styles.asOfText}>{t(dict, 'gate.connectionStale')}</span>
          )}
          {recentError && (
            <button type="button" onClick={() => refetchRecent()} data-testid="recent-retry-btn">
              {t(dict, 'common.retry')}
            </button>
          )}
        </div>
      </header>

      {/* Closed / Draft Warnings */}
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

      {errorDetails && gateState === 'ready' && <Notice variant="warning">{t(dict, `errors.${errorDetails.code}`) || t(dict, 'errors.UNKNOWN')}</Notice>}

      {/* Main Grid: Input / Scanner on left, Admission Card on right */}
      <div className={styles.grid} aria-live="polite">
        <div className={styles.scannerColumn}>
          <CameraScanner
            onScan={handleScan}
            disabled={inputsLocked}
            dict={dict}
            stopSignal={cameraStopSignal}
          />
          <ScannerInput
            onScan={handleScan}
            disabled={inputsLocked}
            dict={dict}
          />
          <GuestLookup
            eventId={selectedEvent.id}
            onSelect={handleManualSelect}
            disabled={inputsLocked}
            dict={dict}
          />
        </div>

        <div className={styles.previewColumn}>
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
      </div>

      {/* Recent Admissions Section */}
      <section className={styles.recentSection} data-testid="recent-admissions-section">
        <h2 className={styles.recentTitle}>
          <span>📋</span>
          <span>{t(dict, 'gate.recentAdmissionsTitle')}</span>
        </h2>

        {recentError ? <Notice variant="warning">{t(dict, 'common.networkError')}</Notice> : recentAdmissions.length === 0 ? (
          <div className={styles.emptyRecent} data-testid="empty-recent-admissions">
            {t(dict, 'gate.recentAdmissionsEmpty')}
          </div>
        ) : (
          <div className={styles.recentList} data-testid="recent-admissions-list">
            {recentAdmissions.slice(0, 10).map((guest) => {
              const checkIn = guest.checkIn || {};
              const partySize = checkIn.actualPartySize || (1 + (checkIn.actualCompanions || 0));
              const time = checkIn.checkedInAt || checkIn.admittedAt;
              const formattedTime = time ? formatRiyadhDate(time, lang) : '';
              const operator = checkIn.operatorName || checkIn.operatorUsername || '';

              return (
                <div
                  key={guest.id}
                  className={styles.recentCard}
                  data-testid={`recent-admission-card-${guest.id}`}
                >
                  <div className={styles.recentGuestName} dir="auto">{guest.name}</div>
                  <div className={styles.recentMeta}>
                    <span>
                      👥 {t(dict, 'gate.successPartyCount', { count: partySize })}
                    </span>
                    {operator && <span>👤 {operator}</span>}
                  </div>
                  {formattedTime && (
                    <div className={styles.recentMeta}>
                      <span>🕒 {formattedTime}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
