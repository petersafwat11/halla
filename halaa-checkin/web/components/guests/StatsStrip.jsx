'use client';

import React from 'react';
import { getDictionary, t, formatRiyadhDate } from '../../lib/locale.js';
import styles from './StatsStrip.module.css';

/**
 * Event-wide statistics strip with real-time polling indicator.
 * Displays 4 summary cards: Invitations, Expected People, Admitted People, and Pending/No-show.
 */
export function StatsStrip({ stats, isFetching = false, eventStatus = 'live', lang = 'ar' }) {
  const dict = getDictionary(lang);
  const isClosed = eventStatus === 'closed';

  const formatNumber = (val) => {
    return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ar-SA').format(val || 0);
  };

  const formatRate = (rate) => {
    const num = typeof rate === 'number' ? rate : 0;
    return `${num.toFixed(1)}%`;
  };

  return (
    <section className={styles.strip} aria-label={t(dict, 'stats.title') || 'Statistics'}>
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
                {formatRiyadhDate(stats.asOf, lang, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            ) : null}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <span className={styles.rateBadge}>
            {t(dict, 'stats.attendanceRate')}: {formatRate(stats?.attendanceRate)}
          </span>
          <span className={`${styles.rateBadge} ${styles.rateBadgeSuccess}`}>
            {t(dict, 'stats.headCountRate')}: {formatRate(stats?.headCountRate)}
          </span>
        </div>
      </div>

      <div className={styles.cardsGrid}>
        {/* Card 1: Total Invitations */}
        <div className={styles.card} data-testid="stat-total-invitations">
          <div className={styles.cardHeader}>
            <span>{t(dict, 'stats.totalInvitations')}</span>
            <span>✉️</span>
          </div>
          <div className={styles.cardValue}>{formatNumber(stats?.totalInvitations)}</div>
          <div className={styles.cardSubtext}>
            <span>{t(dict, 'stats.attendanceRate')}:</span>
            <strong>{formatRate(stats?.attendanceRate)}</strong>
          </div>
        </div>

        {/* Card 2: Expected People */}
        <div className={styles.card} data-testid="stat-total-expected">
          <div className={styles.cardHeader}>
            <span>{t(dict, 'stats.totalExpected')}</span>
            <span>👥</span>
          </div>
          <div className={styles.cardValue}>{formatNumber(stats?.totalExpected)}</div>
          <div className={styles.cardSubtext}>
            <span>{t(dict, 'stats.headCountRate')}:</span>
            <strong>{formatRate(stats?.headCountRate)}</strong>
          </div>
        </div>

        {/* Card 3: Admitted People / Attendees */}
        <div className={styles.card} data-testid="stat-total-attendees">
          <div className={styles.cardHeader}>
            <span>{t(dict, 'stats.admittedPeople')}</span>
            <span>✅</span>
          </div>
          <div className={styles.cardValue}>{formatNumber(stats?.totalAttendees)}</div>
          <div className={styles.cardSubtext}>
            <span>{formatNumber(stats?.admittedInvitations)}</span>
            <span>{t(dict, 'stats.admittedInvitations')}</span>
          </div>
        </div>

        {/* Card 4: Pending Invitations or Did Not Attend (if closed) */}
        <div className={styles.card} data-testid="stat-pending-invitations">
          <div className={styles.cardHeader}>
            <span>{isClosed ? t(dict, 'stats.didNotAttend') : t(dict, 'stats.pendingInvitations')}</span>
            <span>⏳</span>
          </div>
          <div className={styles.cardValue}>
            {formatNumber(isClosed ? stats?.didNotAttendInvitations : stats?.pendingInvitations)}
          </div>
          <div className={styles.cardSubtext}>
            {isClosed ? (
              <span>{t(dict, 'events.statusClosed')}</span>
            ) : (
              <span>
                {formatNumber(stats?.totalInvitations - (stats?.admittedInvitations || 0))} {t(dict, 'status.pending')}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
