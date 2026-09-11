'use client';

import React from 'react';
import { Button } from '../ui/Button.jsx';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { Icon } from '../ui/Icon.jsx';
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
  const isVip = Boolean(
    currentGuest?.reference?.toUpperCase()?.includes('VIP') ||
    currentGuest?.name?.toUpperCase()?.includes('VIP')
  );

  // 1. Idle state
  if (gateState === 'idle') {
    return (
      <div className={styles.emptyCard} data-testid="admission-empty-card" role="status" aria-live="polite">
        <div className={styles.emptyIcon}>
          <Icon name="ticket" size="xl" />
        </div>
        <h3 className={styles.emptyTitle}>{t(dict, 'gate.previewTitle')}</h3>
        <p className={styles.emptyText}>{t(dict, 'gate.cameraHint')}</p>
      </div>
    );
  }

  // 2. Resolving state
  if (gateState === 'resolving') {
    return (
      <div className={styles.emptyCard} data-testid="admission-resolving-card" role="status" aria-live="polite">
        <div className={styles.emptyIcon}>
          <Icon name="refresh" size="xl" />
        </div>
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
        role="alert"
      >
        <h3 className={styles.resultTitle}>
          <Icon name="warning" size="md" />
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

  // 4. Closed / Draft Event (distinct wording per product §6)
  if (gateState === 'closed_event' || gateState === 'draft_event') {
    const isDraft = gateState === 'draft_event';
    return (
      <div
        className={`${styles.resultCard} ${styles.resultWarning}`}
        data-testid="closed-event-card"
        role="status"
        aria-live="polite"
      >
        <h3 className={styles.resultTitle}>
          <Icon name="warning" size="md" />
          <span>{isDraft ? t(dict, 'gate.eventDraftTitle') : t(dict, 'gate.eventClosedTitle')}</span>
        </h3>
        <p className={styles.resultDetails}>
          {isDraft ? t(dict, 'gate.eventDraftMessage') : t(dict, 'gate.eventClosedMessage')}
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
        role="alert"
      >
        <h3 className={styles.resultTitle}>
          <Icon name="warning" size="md" />
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
        role="alert"
      >
        <h3 className={styles.resultTitle}>
          <Icon name="wifi-off" size="md" />
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

  // 7. Session expired state (no reload — preserves retry intent, stops camera via parent)
  if (gateState === 'session_expired') {
    return (
      <div
        className={`${styles.resultCard} ${styles.resultError}`}
        data-testid="session-expired-card"
        role="alert"
      >
        <h3 className={styles.resultTitle}>
          <Icon name="lock" size="md" />
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
            onClick={() => { window.location.href = `/${lang}/login`; }}
            data-testid="session-login-btn"
          >
            {t(dict, 'auth.loginButton')}
          </Button>
        </div>
      </div>
    );
  }

  // 8. Already admitted state (no second confirm allowed)
  if (gateState === 'already_admitted' && currentGuest?.checkIn) {
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
        role="status"
        aria-live="polite"
      >
        <h3 className={styles.resultTitle}>
          <Icon name="warning" size="md" />
          <span>{t(dict, 'gate.alreadyAdmittedTitle')}</span>
        </h3>
        <div className={styles.guestHeading}>
          <span className={styles.guestName} data-testid="guest-preview-name" dir="auto">
            {currentGuest.name}
          </span>
          <div className={styles.metaRow}>
            <bdi className={styles.shortCode} data-testid="guest-preview-shortcode">
              {currentGuest.shortCode}
            </bdi>
            {isVip && (
              <span className={styles.vipBadge}>
                <Icon name="vip" size="xs" /> VIP
              </span>
            )}
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
  if (gateState === 'admitted' && currentGuest?.checkIn) {
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
        role="status"
        aria-live="polite"
      >
        <h3 className={styles.resultTitle}>
          <Icon name="check-circle" size="md" />
          <span>{t(dict, 'gate.successAdmittedTitle')}</span>
        </h3>
        <div className={styles.guestHeading}>
          <span className={styles.guestName} data-testid="guest-preview-name" dir="auto">
            {currentGuest.name}
          </span>
          <div className={styles.metaRow}>
            <bdi className={styles.shortCode} data-testid="guest-preview-shortcode">
              {currentGuest.shortCode}
            </bdi>
            {isVip && (
              <span className={styles.vipBadge}>
                <Icon name="vip" size="xs" /> VIP
              </span>
            )}
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
    <div className={styles.card} data-testid="admission-card" role="status" aria-live="polite">
      <div className={styles.cardHeader}>
        <div className={styles.guestHeading}>
          <h3 className={styles.guestName} data-testid="guest-preview-name" dir="auto">
            {currentGuest.name}
          </h3>
          <div className={styles.metaRow}>
            <bdi className={styles.shortCode} data-testid="guest-preview-shortcode">
              {currentGuest.shortCode}
            </bdi>
            {isVip && (
              <span className={styles.vipBadge}>
                <Icon name="vip" size="xs" /> VIP
              </span>
            )}
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
        <div className={styles.stepperHeader}>
          <span className={styles.stepperLabel}>
            {t(dict, 'gate.companionCountLabel')}
          </span>
          <span className={styles.stepperLimit}>
            (0 .. {maxCompanions})
          </span>
        </div>
        <div
          className={styles.stepperControls}
          role="group"
          aria-label={t(dict, 'gate.companionCountLabel')}
          onKeyDown={(e) => {
            if (e.key === '+' || e.key === 'ArrowUp') {
              e.preventDefault();
              if (!isSubmitting && actualCompanions < maxCompanions) {
                setActualCompanions(actualCompanions + 1);
              }
            } else if (e.key === '-' || e.key === 'ArrowDown') {
              e.preventDefault();
              if (!isSubmitting && actualCompanions > 0) {
                setActualCompanions(actualCompanions - 1);
              }
            }
          }}
        >
          <button
            type="button"
            className={styles.stepperButton}
            onClick={() => setActualCompanions(actualCompanions - 1)}
            disabled={isSubmitting || actualCompanions <= 0}
            data-testid="companions-stepper-decrement"
            aria-label={t(dict, 'gate.decreaseCompanions')}
          >
            -
          </button>
          <span
            className={styles.stepperValue}
            data-testid="companions-stepper-value"
            aria-live="polite"
          >
            {actualCompanions}
          </span>
          <button
            type="button"
            className={styles.stepperButton}
            onClick={() => setActualCompanions(actualCompanions + 1)}
            disabled={isSubmitting || actualCompanions >= maxCompanions}
            data-testid="companions-stepper-increment"
            aria-label={t(dict, 'gate.increaseCompanions')}
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
          style={{ flex: 1, minHeight: '48px' }}
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
          style={{ minHeight: '48px' }}
        >
          {t(dict, 'common.cancel')}
        </Button>
      </div>
    </div>
  );
}
