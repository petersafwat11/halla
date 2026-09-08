'use client';

import React from 'react';
import { Button } from '../ui/Button.jsx';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { t, formatRiyadhDate } from '../../lib/locale.js';
import styles from './AdmissionCard.module.css';

/**
 * Gate Admission Confirmation and Preview Card.
 * Adheres to Technical Contract Section 5 and Product Section 6.
 */
export function AdmissionCard({
  gateState,
  currentGuest,
  actualCompanions,
  derivedPartySize,
  setActualCompanions,
  onAdmit,
  onRetryAdmission,
  onVerifyStatus,
  onReset,
  lang,
  dict,
}) {
  // 1. Idle state
  if (gateState === 'idle') {
    return (
      <div className={styles.emptyCard} data-testid="admission-empty-card">
        <span className={styles.emptyIcon}>🎫</span>
        <h3 className={styles.emptyTitle}>{t(dict, 'gate.previewTitle')}</h3>
        <p className={styles.emptyText}>{t(dict, 'gate.cameraHint')}</p>
      </div>
    );
  }

  // 2. Resolving state
  if (gateState === 'resolving') {
    return (
      <div className={styles.emptyCard} data-testid="admission-resolving-card">
        <span className={styles.emptyIcon}>⏳</span>
        <h3 className={styles.emptyTitle}>{t(dict, 'common.loading')}</h3>
        <p className={styles.emptyText}>{t(dict, 'gate.cameraStarting')}</p>
      </div>
    );
  }

  // 3. Invalid invitation (zero guest details leaked)
  if (gateState === 'invalid_invitation') {
    return (
      <div
        className={`${styles.resultCard} ${styles.resultError}`}
        data-testid="invalid-invitation-card"
      >
        <h3 className={styles.resultTitle}>
          <span>⚠️</span>
          <span>{t(dict, 'gate.invalidInvitationTitle')}</span>
        </h3>
        <p className={styles.resultDetails}>
          {t(dict, 'gate.invalidInvitationMessage')}
        </p>
        <div className={styles.actionsRow}>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onReset}
            data-testid="scan-next-btn"
          >
            {t(dict, 'gate.scanNext')}
          </Button>
        </div>
      </div>
    );
  }

  // 4. Closed / Draft Event
  if (gateState === 'closed_event') {
    return (
      <div
        className={`${styles.resultCard} ${styles.resultWarning}`}
        data-testid="closed-event-card"
      >
        <h3 className={styles.resultTitle}>
          <span>🛑</span>
          <span>{t(dict, 'gate.eventClosedTitle')}</span>
        </h3>
        <p className={styles.resultDetails}>
          {t(dict, 'gate.eventClosedMessage')}
        </p>
        <div className={styles.actionsRow}>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onReset}
            data-testid="scan-next-btn"
          >
            {t(dict, 'gate.scanNext')}
          </Button>
        </div>
      </div>
    );
  }

  // 5. Lost response state (connection lost during submit)
  if (gateState === 'lost_response') {
    return (
      <div
        className={`${styles.resultCard} ${styles.resultWarning}`}
        data-testid="lost-response-card"
      >
        <h3 className={styles.resultTitle}>
          <span>⚠️</span>
          <span>{t(dict, 'gate.lostResponseTitle')}</span>
        </h3>
        <p className={styles.resultDetails}>
          {t(dict, 'gate.lostResponseMessage')}
        </p>
        <div className={styles.actionsRow}>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onRetryAdmission}
            data-testid="retry-admission-btn"
          >
            {t(dict, 'gate.retryAdmission')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onVerifyStatus}
            data-testid="verify-status-btn"
          >
            {t(dict, 'gate.verifyStatus')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onReset}
            data-testid="cancel-admission-btn"
          >
            {t(dict, 'common.cancel')}
          </Button>
        </div>
      </div>
    );
  }

  // 6. Network failure before submit
  if (gateState === 'network_failure') {
    return (
      <div
        className={`${styles.resultCard} ${styles.resultError}`}
        data-testid="network-error-card"
      >
        <h3 className={styles.resultTitle}>
          <span>📡</span>
          <span>{t(dict, 'gate.networkErrorTitle')}</span>
        </h3>
        <p className={styles.resultDetails}>
          {t(dict, 'gate.networkErrorMessage')}
        </p>
        <div className={styles.actionsRow}>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onReset}
            data-testid="scan-next-btn"
          >
            {t(dict, 'common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  // 7. Session expired state
  if (gateState === 'session_expired') {
    return (
      <div
        className={`${styles.resultCard} ${styles.resultError}`}
        data-testid="session-expired-card"
      >
        <h3 className={styles.resultTitle}>
          <span>🔒</span>
          <span>{t(dict, 'gate.sessionExpiredTitle')}</span>
        </h3>
        <p className={styles.resultDetails}>
          {t(dict, 'gate.sessionExpiredMessage')}
        </p>
        <div className={styles.actionsRow}>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => window.location.reload()}
          >
            {t(dict, 'auth.loginButton')}
          </Button>
        </div>
      </div>
    );
  }

  // 8. Already admitted state (no second confirm allowed)
  if (gateState === 'already_admitted' && currentGuest) {
    const checkIn = currentGuest.checkIn || {};
    const formattedTime = checkIn.checkedInAt
      ? formatRiyadhDate(checkIn.checkedInAt, lang)
      : checkIn.admittedAt
      ? formatRiyadhDate(checkIn.admittedAt, lang)
      : '';
    const operator = checkIn.operatorName || checkIn.operatorUsername || '—';
    const partySize = checkIn.actualPartySize || (1 + (checkIn.actualCompanions || 0));

    return (
      <div
        className={`${styles.resultCard} ${styles.resultWarning}`}
        data-testid="already-admitted-card"
      >
        <h3 className={styles.resultTitle}>
          <span>⚠️</span>
          <span>{t(dict, 'gate.alreadyAdmittedTitle')}</span>
        </h3>
        <div className={styles.guestHeading}>
          <span className={styles.guestName} data-testid="guest-preview-name">
            {currentGuest.name}
          </span>
          <div className={styles.metaRow}>
            <bdi className={styles.shortCode} data-testid="guest-preview-shortcode">
              {currentGuest.shortCode}
            </bdi>
            {currentGuest.reference && <span>{currentGuest.reference}</span>}
          </div>
        </div>
        <p className={styles.resultDetails}>
          {t(dict, 'gate.alreadyAdmittedDetails', {
            time: formattedTime,
            operator,
            count: partySize,
          })}
        </p>
        <div className={styles.actionsRow}>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onReset}
            data-testid="scan-next-btn"
          >
            {t(dict, 'gate.scanNext')}
          </Button>
        </div>
      </div>
    );
  }

  // 9. Confirmed admitted state (server success)
  if (gateState === 'admitted' && currentGuest) {
    const checkIn = currentGuest.checkIn || {};
    const formattedTime = checkIn.checkedInAt
      ? formatRiyadhDate(checkIn.checkedInAt, lang)
      : checkIn.admittedAt
      ? formatRiyadhDate(checkIn.admittedAt, lang)
      : '';
    const operator = checkIn.operatorName || checkIn.operatorUsername || '';
    const partySize = checkIn.actualPartySize || derivedPartySize;

    return (
      <div
        className={`${styles.resultCard} ${styles.resultSuccess}`}
        data-testid="admitted-success-card"
      >
        <h3 className={styles.resultTitle}>
          <span>✅</span>
          <span>{t(dict, 'gate.successAdmittedTitle')}</span>
        </h3>
        <div className={styles.guestHeading}>
          <span className={styles.guestName} data-testid="guest-preview-name">
            {currentGuest.name}
          </span>
          <div className={styles.metaRow}>
            <bdi className={styles.shortCode} data-testid="guest-preview-shortcode">
              {currentGuest.shortCode}
            </bdi>
            {currentGuest.reference && <span>{currentGuest.reference}</span>}
          </div>
        </div>
        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>
              {t(dict, 'gate.successPartyCount', { count: partySize })}
            </span>
            <span className={styles.detailValue}>{partySize}</span>
          </div>
          {formattedTime && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t(dict, 'guests.arrival')}</span>
              <span className={styles.detailValue} style={{ fontSize: '14px' }}>
                {formattedTime}
              </span>
            </div>
          )}
          {operator && (
            <div className={styles.detailItem} style={{ gridColumn: 'span 2' }}>
              <span className={styles.detailLabel}>
                {t(dict, 'gate.successOperator', { operator })}
              </span>
            </div>
          )}
        </div>
        <div className={styles.actionsRow}>
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={onReset}
            data-testid="scan-next-btn"
          >
            {t(dict, 'gate.scanNext')}
          </Button>
        </div>
      </div>
    );
  }

  // 10. Ready or Submitting state
  if (!currentGuest) return null;

  const isSubmitting = gateState === 'submitting';
  const maxCompanions = currentGuest.allowedCompanions || 0;

  return (
    <div className={styles.card} data-testid="admission-card">
      <div className={styles.cardHeader}>
        <div className={styles.guestHeading}>
          <h3 className={styles.guestName} data-testid="guest-preview-name">
            {currentGuest.name}
          </h3>
          <div className={styles.metaRow}>
            <bdi className={styles.shortCode} data-testid="guest-preview-shortcode">
              {currentGuest.shortCode}
            </bdi>
            {currentGuest.reference && <span>{currentGuest.reference}</span>}
          </div>
        </div>
        <StatusBadge
          status="pending"
          label={t(dict, 'gate.pendingBadge')}
          size="md"
        />
      </div>

      {/* Allowance details */}
      <div className={styles.detailsGrid}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>
            {t(dict, 'gate.allowedCompanions')}
          </span>
          <span className={styles.detailValue}>
            {currentGuest.allowedCompanions}
          </span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>
            {t(dict, 'gate.totalAllowed')}
          </span>
          <span className={styles.detailValue} data-testid="guest-preview-total-allowed">
            {currentGuest.totalAllowed}
          </span>
        </div>
      </div>

      {/* Reference companion names if present */}
      {currentGuest.companionNames && currentGuest.companionNames.length > 0 && (
        <div className={styles.companionNamesSection}>
          <span className={styles.companionNamesLabel}>
            {t(dict, 'gate.companionNames')}:
          </span>
          <div className={styles.companionNamesList}>
            {currentGuest.companionNames.map((cName, idx) => (
              <span key={idx} className={styles.companionNameTag}>
                {cName}
              </span>
            ))}
          </div>
          <span className={styles.companionNamesNotice}>
            {t(dict, 'gate.companionNamesNotice')}
          </span>
        </div>
      )}

      {/* Stepper for actual companions present */}
      <div className={styles.stepperSection}>
        <span className={styles.stepperLabel}>
          {t(dict, 'gate.companionCountLabel')} (0 .. {maxCompanions})
        </span>
        <div className={styles.stepperControls}>
          <button
            type="button"
            className={styles.stepperButton}
            onClick={() => setActualCompanions(actualCompanions - 1)}
            disabled={isSubmitting || actualCompanions <= 0}
            data-testid="companions-stepper-decrement"
            aria-label="Decrease companions"
          >
            -
          </button>
          <span
            className={styles.stepperValue}
            data-testid="companions-stepper-value"
          >
            {actualCompanions}
          </span>
          <button
            type="button"
            className={styles.stepperButton}
            onClick={() => setActualCompanions(actualCompanions + 1)}
            disabled={isSubmitting || actualCompanions >= maxCompanions}
            data-testid="companions-stepper-increment"
            aria-label="Increase companions"
          >
            +
          </button>
        </div>
        <p className={styles.helperText}>
          {derivedPartySize === 1
            ? t(dict, 'gate.includingGuestSingle')
            : t(dict, 'gate.includingGuestHelper', { count: derivedPartySize })}
        </p>
      </div>

      {/* Actions */}
      <div className={styles.actionsRow}>
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={onAdmit}
          disabled={isSubmitting}
          loading={isSubmitting}
          data-testid="admit-guest-btn"
          style={{ flex: 1 }}
        >
          {derivedPartySize === 1
            ? t(dict, 'gate.admitSingleButton')
            : t(dict, 'gate.admitButton', { count: derivedPartySize })}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onReset}
          disabled={isSubmitting}
          data-testid="cancel-admission-btn"
        >
          {t(dict, 'common.cancel')}
        </Button>
      </div>
    </div>
  );
}
