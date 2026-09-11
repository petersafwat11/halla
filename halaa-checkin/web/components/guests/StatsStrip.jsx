'use client';

import React from 'react';
import { Notice } from '../ui/Notice.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { Icon } from '../ui/Icon.jsx';
import { getDictionary, t, formatRiyadhDate } from '../../lib/locale.js';
import styles from './StatsStrip.module.css';

/**
 * Event-wide statistics strip with real-time polling indicator.
 * Displays 4 summary cells: Invitations, Expected People, Admitted People, and Waiting/No-show.
 * Responsive: Desktop 4 columns with dividers, Mobile 2x2 grid with 72-88px cells.
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

  const formatNumber = (val) => {
    return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ar-SA').format(val || 0);
  };

  const formatRate = (rate) => {
    const num = typeof rate === 'number' ? rate : 0;
    return `${num.toFixed(1)}%`;
  };

  const attendancePercent = stats?.attendanceRate || 0;

  // Never render zeros as data when the request failed and we have no snapshot.
  if (statsError && !hasData) {
    return (
      <section
        className={styles.strip}
        aria-label={t(dict, 'stats.title') || 'Statistics'}
        role="alert"
        data-testid="stats-load-error"
      >
        <div className={styles.headerRow}>
          <span>
            {t(dict, `errors.${statsError.code}`) ||
              statsError.message ||
              'Failed to load statistics'}
          </span>
          {onRetry && (
            <button
              type="button"
              className={styles.rateBadge}
              onClick={() => onRetry?.()}
              data-testid="stats-retry-btn"
            >
              {t(dict, 'common.retry')}
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.strip} aria-label={t(dict, 'stats.title') || 'Statistics'}>
      {statsError && (
        <Notice variant="warning">
          {t(dict, 'gate.connectionStale')}{' '}
          <button onClick={onRetry}>{t(dict, 'common.retry')}</button>
        </Notice>
      )}

      {/* Shared header line: Live dot, updated time, attendance progress bar */}
      <div className={styles.headerRow}>
        <div className={styles.asOfText}>
          <span
            className={`${styles.liveDot} ${isFetching ? styles.fetchingDot : ''}`}
            aria-hidden="true"
          />
          <span>
            {isFetching ? (
              <span>{t(dict, 'stats.refreshing')}</span>
            ) : stats?.asOf ? (
              <span>
                {lang === 'ar' ? 'تحديث: ' : 'Updated: '}
                <bdi>
                  {formatRiyadhDate(stats.asOf, lang, {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </bdi>
              </span>
            ) : (
              <span>{t(dict, 'stats.title')}</span>
            )}
          </span>
        </div>

        <div className={styles.progressWrapper}>
          <span className={styles.rateBadge}>
            {t(dict, 'stats.attendanceRate')}: {formatRate(attendancePercent)}
          </span>
          <div
            className={styles.progressBar}
            role="progressbar"
            aria-valuenow={Math.min(100, Math.max(0, attendancePercent))}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t(dict, 'stats.attendanceRate')}
          >
            <div
              className={styles.progressFill}
              style={{ width: `${Math.min(100, Math.max(0, attendancePercent))}%` }}
            />
          </div>
        </div>
      </div>

      <div className={styles.cardsGrid}>
        {/* Cell 1: Total Invitations */}
        <div className={styles.card} data-testid="stat-total-invitations">
          <div className={styles.cardHeader}>
            <span>{t(dict, 'stats.totalInvitations')}</span>
            <span className={styles.cardIcon}>
              <Icon name="file-text" size="xs" />
            </span>
          </div>
          <div className={styles.cardValue}>
            {hasData ? formatNumber(stats?.totalInvitations) : <Skeleton width="48px" height="24px" />}
          </div>
          <div className={styles.cardSubtext}>
            <span>{t(dict, 'stats.attendanceRate')}:</span>
            <strong>{formatRate(stats?.attendanceRate)}</strong>
          </div>
        </div>

        {/* Cell 2: Expected People */}
        <div className={styles.card} data-testid="stat-total-expected">
          <div className={styles.cardHeader}>
            <span>{t(dict, 'stats.totalExpected')}</span>
            <span className={styles.cardIcon}>
              <Icon name="users" size="xs" />
            </span>
          </div>
          <div className={styles.cardValue}>
            {hasData ? formatNumber(stats?.totalExpected) : <Skeleton width="48px" height="24px" />}
          </div>
          <div className={styles.cardSubtext}>
            <span>{t(dict, 'stats.headCountRate')}:</span>
            <strong>{formatRate(stats?.headCountRate)}</strong>
          </div>
        </div>

        {/* Cell 3: Admitted People */}
        <div className={styles.card} data-testid="stat-total-attendees">
          <div className={styles.cardHeader}>
            <span>{t(dict, 'stats.admittedPeople')}</span>
            <span className={styles.cardIcon}>
              <Icon name="check" size="xs" />
            </span>
          </div>
          <div className={styles.cardValue}>
            {hasData ? formatNumber(stats?.totalAttendees) : <Skeleton width="48px" height="24px" />}
          </div>
          <div className={styles.cardSubtext}>
            <span>
              {formatNumber(stats?.admittedInvitations)} {t(dict, 'stats.admittedInvitations')}
            </span>
          </div>
        </div>

        {/* Cell 4: Waiting / Pending Invitations */}
        <div className={styles.card} data-testid="stat-pending-invitations">
          <div className={styles.cardHeader}>
            <span>
              {isClosed ? t(dict, 'stats.didNotAttend') : t(dict, 'stats.pendingInvitations')}
            </span>
            <span className={styles.cardIcon}>
              <Icon name="clock" size="xs" />
            </span>
          </div>
          <div className={styles.cardValue}>
            {hasData ? (
              formatNumber(isClosed ? stats?.didNotAttendInvitations : stats?.pendingInvitations)
            ) : (
              <Skeleton width="48px" height="24px" />
            )}
          </div>
          <div className={styles.cardSubtext}>
            {isClosed ? (
              <span>{t(dict, 'events.statusClosed')}</span>
            ) : (
              <span>
                {formatNumber(stats?.totalInvitations - (stats?.admittedInvitations || 0))}{' '}
                {t(dict, 'status.pending')}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
