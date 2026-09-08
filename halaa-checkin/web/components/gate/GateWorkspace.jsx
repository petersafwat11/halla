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

  const {
    gateState,
    currentGuest,
    actualCompanions,
    derivedPartySize,
    setActualCompanions,
    isOnline,
    asOf,
    recentAdmissions,
    resolve,
    admit,
    retryAdmission,
    verifyStatus,
    resetToIdle,
  } = useGate(selectedEvent?.id);

  if (!hasEvents || !selectedEvent) {
    return (
      <div className={styles.container}>
        <Notice type="info">
          {t(dict, 'events.noEventsReception')}
        </Notice>
      </div>
    );
  }

  const isClosed = selectedEvent.status === 'closed';
  const isDraft = selectedEvent.status === 'draft';
  const isResolvingOrSubmitting = gateState === 'resolving' || gateState === 'submitting';

  const handleScan = (tokenOrId, scanMethod) => {
    // If it looks like Crockford or ID, resolve by token
    resolve({ token: tokenOrId }, scanMethod);
  };

  const handleManualSelect = (guestIdPayload, scanMethod) => {
    resolve(guestIdPayload, scanMethod);
  };

  return (
    <div className={styles.container} data-testid="gate-workspace">
      {/* Event Header Bar */}
      <header className={styles.eventHeader} data-testid="gate-event-header">
        <div className={styles.eventInfo}>
          <div className={styles.eventTitleRow}>
            <h1 className={styles.eventName}>{selectedEvent.name}</h1>
            <StatusBadge
              status={selectedEvent.status}
              label={t(dict, `status.${selectedEvent.status}`)}
              size="md"
            />
          </div>
          <div className={styles.eventMeta}>
            <span>📍 {selectedEvent.venue}</span>
            <span>🕒 {formatRiyadhDate(selectedEvent.startsAt, lang)}</span>
          </div>
        </div>

        <div className={styles.statusPillRow}>
          <span
            className={`${styles.connectionPill} ${isOnline ? styles.online : styles.offline}`}
            data-testid="connection-status-pill"
          >
            <span>{isOnline ? '🟢' : '🔴'}</span>
            <span>{isOnline ? t(dict, 'gate.connectionOnline') : t(dict, 'gate.connectionOffline')}</span>
          </span>
          {asOf && (
            <span className={styles.asOfText}>
              {t(dict, 'common.asOf')}{' '}
              {new Date(asOf).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZone: 'Asia/Riyadh',
              })}
            </span>
          )}
        </div>
      </header>

      {/* Closed / Draft Warnings */}
      {isClosed && (
        <Notice type="warning" data-testid="gate-closed-warning">
          {t(dict, 'gate.eventClosedMessage')}
        </Notice>
      )}
      {isDraft && (
        <Notice type="info" data-testid="gate-draft-warning">
          {t(dict, 'gate.eventDraftMessage')}
        </Notice>
      )}

      {/* Main Grid: Input / Scanner on left, Admission Card on right */}
      <div className={styles.grid}>
        <div className={styles.scannerColumn}>
          <CameraScanner
            onScan={handleScan}
            disabled={isClosed || isDraft || isResolvingOrSubmitting}
            dict={dict}
          />
          <ScannerInput
            onScan={handleScan}
            disabled={isClosed || isDraft || isResolvingOrSubmitting}
            dict={dict}
          />
          <GuestLookup
            eventId={selectedEvent.id}
            onSelect={handleManualSelect}
            disabled={isClosed || isDraft || isResolvingOrSubmitting}
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

        {recentAdmissions.length === 0 ? (
          <div className={styles.emptyRecent} data-testid="empty-recent-admissions">
            {t(dict, 'gate.recentAdmissionsEmpty')}
          </div>
        ) : (
          <div className={styles.recentList} data-testid="recent-admissions-list">
            {recentAdmissions.map((guest) => {
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
                  <div className={styles.recentGuestName}>{guest.name}</div>
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
