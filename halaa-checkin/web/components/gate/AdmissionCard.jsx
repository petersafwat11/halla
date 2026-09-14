'use client';

import React from 'react';
import { Button } from '../ui/Button.jsx';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { Icon } from '../ui/Icon.jsx';
import { t, formatRiyadhDate } from '../../lib/locale.js';
import styles from './AdmissionCard.module.css';

function GuestIdentity({ guest, isVip, size = 'md' }) {
  return (
    <div className={`${styles.identity} ${size === 'lg' ? styles.identityLg : ''}`}>
      <span className={styles.guestName} data-testid="guest-preview-name" dir="auto">
        {guest.name}
      </span>
      <div className={styles.metaRow}>
        <bdi className={styles.shortCode} data-testid="guest-preview-shortcode">
          {guest.shortCode}
        </bdi>
        {isVip && (
          <span className={styles.vipBadge}>
            <Icon name="vip" size="xs" /> VIP
          </span>
        )}
        {guest.reference && <bdi className={styles.reference}>{guest.reference}</bdi>}
      </div>
    </div>
  );
}

function ResultPanel({ tone, icon, title, message, testId, role = 'status', children, actions }) {
  return (
    <div
      className={`${styles.panel} ${styles.result} ${styles[`tone_${tone}`]} ${children ? '' : styles.resultCompact}`}
      data-testid={testId}
      role={role}
      aria-live={role === 'status' ? 'polite' : undefined}
    >
      <div className={styles.resultHeader}>
        <span className={styles.resultIcon} aria-hidden="true">
          <Icon name={icon} size="lg" />
        </span>
        <div className={styles.resultHeading}>
          <h3 className={styles.resultTitle}>{title}</h3>
          {message && <p className={styles.resultMessage}>{message}</p>}
        </div>
      </div>
      {children && <div className={styles.resultBody}>{children}</div>}
      {actions && <div className={styles.actionsRow}>{actions}</div>}
    </div>
  );
}

function DetailList({ items }) {
  return (
    <dl className={styles.detailList}>
      {items.filter(Boolean).map((item) => (
        <div key={item.label} className={styles.detailRow}>
          <dt>
            <Icon name={item.icon} size="sm" />
            <span>{item.label}</span>
          </dt>
          <dd className="tabular">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Gate admission panel. One component renders every state of the admission
 * state machine so the operator always sees exactly one decisive message:
 * idle → resolving → ready/submitting → admitted | already admitted | invalid |
 * closed/draft | lost response | network failure | session expired.
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

  // 1. Idle
  if (gateState === 'idle') {
    return (
      <div className={`${styles.panel} ${styles.idle}`} data-testid="admission-empty-card" role="status" aria-live="polite">
        <span className={styles.idleIcon} aria-hidden="true">
          <Icon name="scan-qr" size={40} strokeWidth={1.75} />
        </span>
        <h3 className={styles.idleTitle}>{t(dict, 'gate.readyTitle')}</h3>
        <p className={styles.idleText}>{t(dict, 'gate.readyHint')}</p>
      </div>
    );
  }

  // 2. Resolving
  if (gateState === 'resolving') {
    return (
      <div className={`${styles.panel} ${styles.idle}`} data-testid="admission-resolving-card" role="status" aria-live="polite">
        <span className={styles.bigSpinner} aria-hidden="true" />
        <h3 className={styles.idleTitle}>{t(dict, 'gate.checkingInvitation')}</h3>
      </div>
    );
  }

  const scanNext = (variant = 'outline') => (
    <Button type="button" variant={variant} size="lg" fullWidth onClick={onReset} data-testid="scan-next-btn" leadingIcon="scan">
      {t(dict, 'gate.scanNext')}
    </Button>
  );

  // 3. Invalid invitation (zero guest details leaked)
  if (gateState === 'invalid_invitation') {
    return (
      <ResultPanel
        tone="danger"
        icon="x-circle"
        title={t(dict, 'gate.invalidInvitationTitle')}
        message={t(dict, 'gate.invalidInvitationMessage')}
        testId="invalid-invitation-card"
        role="alert"
        actions={scanNext('primary')}
      />
    );
  }

  // 4. Closed / Draft event
  if (gateState === 'closed_event' || gateState === 'draft_event') {
    const isDraft = gateState === 'draft_event';
    return (
      <ResultPanel
        tone="warning"
        icon={isDraft ? 'clock' : 'lock'}
        title={isDraft ? t(dict, 'gate.eventDraftTitle') : t(dict, 'gate.eventClosedTitle')}
        message={isDraft ? t(dict, 'gate.eventDraftMessage') : t(dict, 'gate.eventClosedMessage')}
        testId="closed-event-card"
        actions={scanNext()}
      />
    );
  }

  // 5. Lost response (connection lost during submit)
  if (gateState === 'lost_response') {
    return (
      <ResultPanel
        tone="warning"
        icon="wifi-off"
        title={t(dict, 'gate.lostResponseTitle')}
        message={t(dict, 'gate.lostResponseMessage')}
        testId="lost-response-card"
        role="alert"
        actions={
          <>
            <Button type="button" variant="primary" size="lg" onClick={onRetryAdmission} data-testid="retry-admission-btn" leadingIcon="refresh">
              {t(dict, 'gate.retryAdmission')}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={onVerifyStatus} data-testid="verify-status-btn" leadingIcon="shield-check">
              {t(dict, 'gate.verifyStatus')}
            </Button>
          </>
        }
      >
        {currentGuest && <GuestIdentity guest={currentGuest} isVip={isVip} />}
      </ResultPanel>
    );
  }

  // 6. Network failure before submit
  if (gateState === 'network_failure') {
    return (
      <ResultPanel
        tone="danger"
        icon="wifi-off"
        title={t(dict, 'gate.networkErrorTitle')}
        message={t(dict, 'gate.networkErrorMessage')}
        testId="network-error-card"
        role="alert"
        actions={
          <Button type="button" variant="outline" size="lg" fullWidth onClick={onReset} data-testid="scan-next-btn" leadingIcon="refresh">
            {t(dict, 'common.retry')}
          </Button>
        }
      />
    );
  }

  // 7. Session expired
  if (gateState === 'session_expired') {
    return (
      <ResultPanel
        tone="danger"
        icon="lock"
        title={t(dict, 'gate.sessionExpiredTitle')}
        message={t(dict, 'gate.sessionExpiredMessage')}
        testId="session-expired-card"
        role="alert"
        actions={
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => { window.location.href = `/${lang}/login`; }}
            data-testid="session-login-btn"
          >
            {t(dict, 'auth.loginButton')}
          </Button>
        }
      />
    );
  }

  // 8. Already admitted (no second admission allowed)
  if (gateState === 'already_admitted' && currentGuest?.checkIn) {
    const checkIn = currentGuest.checkIn || {};
    const time = checkIn.checkedInAt || checkIn.admittedAt;
    const formattedTime = time ? formatRiyadhDate(time, lang) : '';
    const operator = checkIn.operatorName || checkIn.operatorUsername || '—';
    const partySize = checkIn.actualPartySize || (1 + (checkIn.actualCompanions || 0));

    return (
      <ResultPanel
        tone="warning"
        icon="alert-triangle"
        title={t(dict, 'gate.alreadyAdmittedTitle')}
        message={t(dict, 'gate.alreadyAdmittedDetails', { time: formattedTime, operator, count: partySize })}
        testId="already-admitted-card"
        actions={scanNext('primary')}
      >
        <GuestIdentity guest={currentGuest} isVip={isVip} />
        <DetailList
          items={[
            { icon: 'users', label: t(dict, 'guests.actualParty'), value: partySize },
            formattedTime && { icon: 'clock', label: t(dict, 'guests.arrival'), value: <bdi>{formattedTime}</bdi> },
            { icon: 'user', label: t(dict, 'nav.currentStaff'), value: <bdi>{operator}</bdi> },
          ]}
        />
      </ResultPanel>
    );
  }

  // 9. Confirmed admitted (server success)
  if (gateState === 'admitted' && currentGuest?.checkIn) {
    const checkIn = currentGuest.checkIn || {};
    const time = checkIn.checkedInAt || checkIn.admittedAt;
    const formattedTime = time ? formatRiyadhDate(time, lang) : '';
    const operator = checkIn.operatorName || checkIn.operatorUsername || '';
    const partySize = checkIn.actualPartySize || derivedPartySize;

    return (
      <ResultPanel
        tone="success"
        icon="check-circle"
        title={t(dict, 'gate.successAdmittedTitle')}
        message={t(dict, 'gate.successPartyCount', { count: partySize })}
        testId="admitted-success-card"
        actions={scanNext('primary')}
      >
        <GuestIdentity guest={currentGuest} isVip={isVip} size="lg" />
        <DetailList
          items={[
            { icon: 'users', label: t(dict, 'gate.enteringNow'), value: partySize },
            formattedTime && { icon: 'clock', label: t(dict, 'guests.arrival'), value: <bdi>{formattedTime}</bdi> },
            operator && { icon: 'user', label: t(dict, 'nav.currentStaff'), value: <bdi>{operator}</bdi> },
          ]}
        />
      </ResultPanel>
    );
  }

  // 10. Ready or submitting
  if (!currentGuest) return null;

  const isSubmitting = gateState === 'submitting';
  const maxCompanions = currentGuest.allowedCompanions || 0;

  return (
    <div className={`${styles.panel} ${styles.ready}`} data-testid="admission-card" role="status" aria-live="polite">
      <div className={styles.readyHeader}>
        <StatusBadge status="pending" label={t(dict, 'gate.pendingBadge')} size="md" />
      </div>

      <GuestIdentity guest={currentGuest} isVip={isVip} size="lg" />

      <div className={styles.allowanceGrid}>
        <div className={styles.allowanceItem}>
          <span className={styles.allowanceLabel}>{t(dict, 'gate.allowedCompanions')}</span>
          <span className={styles.allowanceValue}>{currentGuest.allowedCompanions}</span>
        </div>
        <div className={styles.allowanceItem}>
          <span className={styles.allowanceLabel}>{t(dict, 'gate.totalAllowed')}</span>
          <span className={styles.allowanceValue} data-testid="guest-preview-total-allowed">
            {currentGuest.totalAllowed}
          </span>
        </div>
      </div>

      {currentGuest.companionNames && currentGuest.companionNames.length > 0 && (
        <div className={styles.companionNamesSection}>
          <span className={styles.sectionLabel}>{t(dict, 'gate.companionNames')}</span>
          <div className={styles.companionNamesList}>
            {currentGuest.companionNames.map((cName, idx) => (
              <span key={idx} className={styles.companionNameTag} dir="auto">
                {cName}
              </span>
            ))}
          </div>
          <span className={styles.companionNamesNotice}>{t(dict, 'gate.companionNamesNotice')}</span>
        </div>
      )}

      <div className={styles.stepperSection}>
        <div className={styles.stepperText}>
          <span className={styles.sectionLabel}>{t(dict, 'gate.companionCountLabel')}</span>
          <span className={styles.helperText}>
            {derivedPartySize === 1
              ? t(dict, 'gate.includingGuestSingle')
              : t(dict, 'gate.includingGuestHelper', { count: derivedPartySize })}
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
            <Icon name="minus" size="md" />
          </button>
          <span className={`${styles.stepperValue} tabular`} data-testid="companions-stepper-value" aria-live="polite">
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
            <Icon name="plus" size="md" />
          </button>
        </div>
      </div>

      <div className={styles.readyActions}>
        <Button
          type="button"
          variant="success"
          size="lg"
          onClick={onAdmit}
          disabled={isSubmitting}
          loading={isSubmitting}
          data-testid="admit-guest-btn"
          leadingIcon="user-check"
          className={styles.admitButton}
        >
          {derivedPartySize === 1
            ? t(dict, 'gate.admitSingleButton')
            : t(dict, 'gate.admitButton', { count: derivedPartySize })}
        </Button>
        <Button
          type="button"
          variant="ghost"
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
