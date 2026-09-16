'use client';

import React from 'react';
import { Skeleton } from '../ui/Skeleton.jsx';
import { Button } from '../ui/Button.jsx';
import { Icon } from '../ui/Icon.jsx';
import { getDictionary, t, formatRiyadhDate } from '../../lib/locale.js';
import styles from './StatsStrip.module.css';

/**
 * Event-wide attendance overview: four KPI cards with a live refresh indicator.
 * Values come from the authoritative stats endpoint and never render as zeros
 * when the request failed without a snapshot.
 */
export function StatsStrip({
  stats,
  isFetching = false,
  statsError = null,
  onRetry = null,
  eventStatus = 'live',
  lang = 'ar',
}) {
  const dict = getDictionary(lang);
  const isClosed = eventStatus === 'closed';
  const hasData = !!stats && (stats.totalInvitations > 0 || !!stats.asOf);

  const formatNumber = (val) =>
    new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ar-SA').format(val || 0);
  const formatRate = (rate) =>
    new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ar-SA', {
      style: 'percent',
      maximumFractionDigits: 1,
    }).format((typeof rate === 'number' ? rate : 0) / 100);

  const clamp = (n) => Math.min(100, Math.max(0, n || 0));
  const attendancePercent = clamp(stats?.attendanceRate);

  if (statsError && !hasData) {
    return (
      <section
        className={styles.errorStrip}
        aria-label={t(dict, 'stats.title')}
        role="alert"
        data-testid="stats-load-error"
      >
        <Icon name="alert-triangle" size="md" />
        <span className={styles.errorText}>
          {t(dict, `errors.${statsError.code}`) || statsError.message || t(dict, 'common.networkError')}
        </span>
        {onRetry && (
          <Button variant="outline" size="sm" leadingIcon="refresh" onClick={() => onRetry?.()} data-testid="stats-retry-btn">
            {t(dict, 'common.retry')}
          </Button>
        )}
      </section>
    );
  }

  const value = (n) => (hasData ? formatNumber(n) : <Skeleton width="56px" height="30px" />);

  const pendingValue = isClosed ? stats?.didNotAttendInvitations : stats?.pendingInvitations;

  return (
    <section className={styles.strip} aria-label={t(dict, 'stats.title')}>
      <div className={styles.headerRow}>
        <h2 className={styles.sectionTitle}>{t(dict, 'stats.title')}</h2>
        <div className={styles.liveStatus} aria-live="polite">
          {statsError ? (
            <span className={styles.staleStatus}>
              <Icon name="wifi-off" size="sm" />
              <span>{t(dict, 'gate.connectionStale')}</span>
              <button type="button" className={styles.inlineRetry} onClick={onRetry}>
                {t(dict, 'common.retry')}
              </button>
            </span>
          ) : (
            <>
              <span className={`${styles.liveDot} ${isFetching ? styles.fetchingDot : ''}`} aria-hidden="true" />
              {isFetching ? (
                <span>{t(dict, 'stats.refreshing')}</span>
              ) : stats?.asOf ? (
                <span>
                  {t(dict, 'common.asOf')}{' '}
                  <bdi className="tabular">
                    {formatRiyadhDate(stats.asOf, lang, {
                      year: undefined,
                      month: undefined,
                      day: undefined,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </bdi>
                </span>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className={styles.cardsGrid}>
        <div className={styles.card} data-testid="stat-total-invitations">
          <div className={styles.cardTop}>
            <span className={styles.cardLabel}>{t(dict, 'stats.totalInvitations')}</span>
            <span className={`${styles.cardIcon} ${styles.toneBrand}`}>
              <Icon name="ticket" size="sm" />
            </span>
          </div>
          <div className={styles.cardValue}>{value(stats?.totalInvitations)}</div>
          <div className={styles.cardFoot}>
            <strong>{formatNumber(stats?.admittedInvitations)}</strong> {t(dict, 'stats.admittedInvitations')}
          </div>
        </div>

        <div className={styles.card} data-testid="stat-total-expected">
          <div className={styles.cardTop}>
            <span className={styles.cardLabel}>{t(dict, 'stats.totalExpected')}</span>
            <span className={`${styles.cardIcon} ${styles.toneInfo}`}>
              <Icon name="users" size="sm" />
            </span>
          </div>
          <div className={styles.cardValue}>{value(stats?.totalExpected)}</div>
          <div className={styles.cardFoot}>
            {t(dict, 'stats.headCountRate')} <strong>{formatRate(stats?.headCountRate)}</strong>
          </div>
        </div>

        <div className={`${styles.card} ${styles.cardHighlight}`} data-testid="stat-total-attendees">
          <div className={styles.cardTop}>
            <span className={styles.cardLabel}>{t(dict, 'stats.admittedPeople')}</span>
            <span className={`${styles.cardIcon} ${styles.toneSuccess}`}>
              <Icon name="user-check" size="sm" />
            </span>
          </div>
          <div className={styles.cardValue}>{value(stats?.totalAttendees)}</div>
          <div className={styles.progressRow}>
            <div
              className={styles.progressBar}
              role="progressbar"
              aria-valuenow={attendancePercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t(dict, 'stats.attendanceRate')}
            >
              <div className={styles.progressFill} style={{ width: `${attendancePercent}%` }} />
            </div>
            <span className={styles.progressLabel}>
              {t(dict, 'stats.attendanceRate')} <strong>{formatRate(stats?.attendanceRate)}</strong>
            </span>
          </div>
        </div>

        <div className={styles.card} data-testid="stat-pending-invitations">
          <div className={styles.cardTop}>
            <span className={styles.cardLabel}>
              {isClosed ? t(dict, 'stats.didNotAttend') : t(dict, 'stats.pendingInvitations')}
            </span>
            <span className={`${styles.cardIcon} ${isClosed ? styles.toneNeutral : styles.toneWarning}`}>
              <Icon name={isClosed ? 'user-x' : 'clock'} size="sm" />
            </span>
          </div>
          <div className={styles.cardValue}>{value(pendingValue)}</div>
          <div className={styles.cardFoot}>
            {isClosed ? t(dict, 'events.statusClosed') : t(dict, 'stats.pendingHint')}
          </div>
        </div>
      </div>
    </section>
  );
}
