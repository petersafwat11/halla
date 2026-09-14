'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog } from '../ui/Dialog.jsx';
import { Button } from '../ui/Button.jsx';
import { Notice } from '../ui/Notice.jsx';
import { Icon } from '../ui/Icon.jsx';
import { getDictionary, t, formatRiyadhDate } from '../../lib/locale.js';
import { useExports } from '../../hooks/useExports.js';
import { useStats } from '../../hooks/useStats.js';
import { useSession } from '../../hooks/useSession.jsx';
import styles from './ExportPanel.module.css';

/**
 * Export Panel Component.
 * Handles single/selected/all QR pass exports and attendance report exports
 * with polling, download, print, and retry states.
 */
export function ExportPanel({
  isOpen,
  onClose,
  eventId,
  event,
  selectedGuestIds,
  guests,
  eventTotal = 0,
  singleGuest: singleGuestProp = null,
  lang = 'ar',
}) {
  const dict = getDictionary(lang);
  const { user } = useSession();
  // "All" means all active invitations in the event, regardless of table filter/page.
  const totalGuests = Number.isFinite(eventTotal) && eventTotal > 0 ? eventTotal : 0;
  const selectedCount = selectedGuestIds?.size || 0;

  const {
    activeJobId,
    job,
    jobState,
    isPolling,
    createExport,
    isCreating,
    createError,
    resetCreateError,
    jobQueryError,
    downloadExport,
    printExport,
    clearRetainedJob,
    refetchJob,
  } = useExports(eventId, { pollingEnabled: isOpen });
  // F24: report summary metrics (defined contract metrics, not only option card).
  const { stats: exportStats } = useStats(isOpen ? eventId : null);

  const [exportType, setExportType] = useState('single'); // 'single' | 'selected' | 'all' | 'report'
  const [exportLocale, setExportLocale] = useState(lang);
  const [showConfirm, setShowConfirm] = useState(false);
  const [singleGuest, setSingleGuest] = useState(singleGuestProp || null);
  const [pendingConfirmType, setPendingConfirmType] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Sync single-guest entry point (e.g. opened from QR preview)
  useEffect(() => {
    if (isOpen && singleGuestProp?.id) {
      setSingleGuest(singleGuestProp);
      setExportType('single');
    }
  }, [isOpen, singleGuestProp]);

  useEffect(() => {
    setExportLocale(lang);
  }, [lang]);

  const getScopeText = useCallback(() => {
    if (exportType === 'report') return t(dict, 'exports.reportType');
    if (exportType === 'single') return t(dict, 'exports.scopeSingle');
    if (exportType === 'selected') return t(dict, 'exports.scopeSelected', { count: selectedCount });
    if (exportType === 'all') return t(dict, 'exports.scopeAll', { count: totalGuests });
    return '';
  }, [exportType, selectedCount, totalGuests, dict]);

  const getExportTypeLabel = useCallback(() => {
    if (exportType === 'report') return t(dict, 'exports.reportType');
    if (exportType === 'single') return t(dict, 'exports.singlePassType');
    if (exportType === 'selected') return t(dict, 'exports.selectedPassesType');
    if (exportType === 'all') return t(dict, 'exports.allPassesType');
    return '';
  }, [exportType, dict]);

  const isTypeAvailable = useCallback((type) => {
    if (type === 'single') return !!singleGuest;
    if (type === 'selected') return selectedCount > 0;
    if (type === 'all') return totalGuests > 0;
    if (type === 'report') return true;
    return false;
  }, [singleGuest, selectedCount, totalGuests]);

  const handleCreateExport = async () => {
    if (!isTypeAvailable(exportType)) return;

    let payload;
    if (exportType === 'report') {
      payload = { kind: 'report', locale: exportLocale };
    } else {
      let scope = 'all';
      let guestIds = undefined;

      if (exportType === 'single') {
        scope = 'selected';
        guestIds = [singleGuest.id];
      } else if (exportType === 'selected') {
        scope = 'selected';
        guestIds = Array.from(selectedGuestIds);
      }

      payload = { kind: 'qr', locale: exportLocale, scope, guestIds };
    }

    try {
      await createExport(payload);
      setShowConfirm(false);
      setPendingConfirmType(null);
    } catch {
      // Error handled by createError state
    }
  };

  const handleOpenConfirm = (type, guest = null) => {
    if (!isTypeAvailable(type)) return;
    setExportType(type);
    if (type === 'single' && guest) {
      setSingleGuest(guest);
    }
    setPendingConfirmType(type);
    setShowConfirm(true);
  };

  const handleDownload = async () => {
    if (!job?.id) return;
    setActionError(null);
    try {
      await downloadExport(job.id);
    } catch (err) {
      setActionError(err);
    }
  };

  const handlePrint = async () => {
    if (!job?.id) return;
    setActionError(null);
    try {
      await printExport(job.id);
    } catch (err) {
      setActionError(err);
    }
  };

  const handleRetry = () => {
    setActionError(null);
    const retryType = pendingConfirmType || exportType;
    setExportType(retryType);
    setPendingConfirmType(retryType);
    setShowConfirm(true);
  };

  const startNewExport = () => {
    clearRetainedJob();
    setShowConfirm(false);
    setActionError(null);
  };

  // Cleanup on close (F24: retain job ID across closure; pause polling via isOpen).
  const userId = user?.id || user?.username || null;
  useEffect(() => {
    if (!isOpen) {
      setShowConfirm(false);
      setPendingConfirmType(null);
      setActionError(null);
      resetCreateError?.();
    }
  }, [isOpen, resetCreateError]);

  useEffect(() => {
    // Forget retained jobs when the authenticated user changes.
    if (!userId && eventId && typeof window !== 'undefined') {
      try { window.localStorage.removeItem(`halaa-checkin:exportJob:${eventId}`); } catch { /* ignore */ }
    }
  }, [userId, eventId]);

  const reportLabel = event?.status === 'closed'
    ? t(dict, 'exports.reportFinal')
    : t(dict, 'exports.reportInterim');

  const getJobStateLabel = () => {
    if (!jobState) return '';
    return t(dict, `exports.state${jobState.charAt(0).toUpperCase() + jobState.slice(1)}`) || jobState;
  };

  const isTerminalFailure = jobState === 'failed' || jobState === 'expired';
  const view = showConfirm ? 'confirm' : activeJobId ? 'job' : 'select';

  const options = [
    {
      type: 'single',
      icon: 'qr',
      label: t(dict, 'exports.singlePass'),
      scope: singleGuest ? (
        <>
          <bdi>{singleGuest.name}</bdi> (<bdi>{singleGuest.shortCode}</bdi>)
        </>
      ) : t(dict, 'exports.scopeSingle'),
      testId: 'export-single-pass',
    },
    {
      type: 'selected',
      icon: 'check-circle',
      label: t(dict, 'exports.selectedPasses'),
      scope: t(dict, 'exports.scopeSelected', { count: selectedCount }),
      testId: 'export-selected-passes',
    },
    {
      type: 'all',
      icon: 'users',
      label: t(dict, 'exports.allPasses'),
      scope: t(dict, 'exports.scopeAll', { count: totalGuests }),
      testId: 'export-all-passes',
    },
    {
      type: 'report',
      icon: 'chart',
      label: t(dict, 'exports.attendanceReport'),
      scope: reportLabel,
      extra: (
        <span className={styles.optionMetrics} data-testid="export-report-metrics">
          {t(dict, 'exports.pendingInvitations')}: {exportStats?.pendingInvitations ?? 0} •{' '}
          {t(dict, 'exports.admittedInvitations')}: {exportStats?.admittedInvitations ?? 0} •{' '}
          {t(dict, 'exports.attendanceRate')}: {exportStats?.invitationAttendanceRate ?? exportStats?.attendanceRate ?? 0}% •{' '}
          {t(dict, 'exports.capacityRate')}: {exportStats?.capacityAttendanceRate ?? exportStats?.headCountRate ?? 0}%
        </span>
      ),
      testId: 'export-report',
    },
  ];

  let footer;
  if (view === 'confirm') {
    footer = (
      <>
        <Button variant="ghost" onClick={() => setShowConfirm(false)} disabled={isCreating}>
          {t(dict, 'common.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleCreateExport}
          loading={isCreating}
          leadingIcon="file-down"
          data-testid="export-confirm-btn"
        >
          {t(dict, 'exports.createExport')}
        </Button>
      </>
    );
  } else if (view === 'job' && (jobState === 'ready' || isTerminalFailure)) {
    footer = (
      <>
        <Button variant="outline" onClick={startNewExport} leadingIcon="plus" data-testid="export-new-btn">
          {t(dict, 'exports.createExport')}
        </Button>
        {isTerminalFailure ? (
          <Button variant="primary" onClick={handleRetry} disabled={isCreating} leadingIcon="refresh">
            {t(dict, 'exports.retry')}
          </Button>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            {t(dict, 'exports.close')}
          </Button>
        )}
      </>
    );
  } else {
    footer = (
      <Button variant="ghost" onClick={onClose}>
        {t(dict, 'exports.close')}
      </Button>
    );
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t(dict, 'exports.title')}
      description={t(dict, 'exports.subtitle')}
      icon="download"
      maxWidth="680px"
      closeAriaLabel={t(dict, 'dialog.close')}
      footer={footer}
    >
      <div className={styles.container}>
        {view === 'select' && (
          <>
            <span className={styles.sectionLabel}>{t(dict, 'exports.chooseType')}</span>
            <div className={styles.optionsGrid}>
              {options.map((option) => {
                const available = isTypeAvailable(option.type);
                return (
                  <button
                    key={option.type}
                    type="button"
                    className={[
                      styles.optionCard,
                      exportType === option.type && available ? styles.optionCardSelected : '',
                      !available ? styles.optionCardDisabled : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => handleOpenConfirm(option.type)}
                    disabled={!available || isCreating}
                    data-testid={option.testId}
                  >
                    <span className={styles.optionIcon} aria-hidden="true">
                      <Icon name={option.icon} size="md" />
                    </span>
                    <span className={styles.optionText}>
                      <span className={styles.optionLabel}>{option.label}</span>
                      <span className={styles.optionScope}>{option.scope}</span>
                      {option.extra}
                    </span>
                    <span className={styles.optionChevron} aria-hidden="true">
                      <Icon name="chevron-right" size="sm" mirror />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={styles.languageSelector}>
              <label htmlFor="export-locale" className={styles.fieldLabel}>
                <Icon name="languages" size="sm" />
                {t(dict, 'exports.languageLabel')}
              </label>
              <select
                id="export-locale"
                className={styles.localeSelect}
                value={exportLocale}
                onChange={(e) => setExportLocale(e.target.value)}
                disabled={isCreating}
              >
                <option value="ar">{t(dict, 'exports.languageAr')}</option>
                <option value="en">{t(dict, 'exports.languageEn')}</option>
              </select>
            </div>

            {createError && (
              <Notice variant="error" data-testid="export-create-error">
                {t(dict, `errors.${createError.code}`) || createError.message}
                {createError.code === 'RATE_LIMITED' ? ` — ${t(dict, 'exports.rateLimited')}` : ''}
              </Notice>
            )}
          </>
        )}

        {view === 'confirm' && (
          <div className={styles.confirmSection}>
            <div className={styles.confirmCard}>
              <span className={styles.confirmIcon} aria-hidden="true">
                <Icon name={options.find((o) => o.type === exportType)?.icon || 'file'} size="lg" />
              </span>
              <div className={styles.confirmText}>
                <h3 className={styles.confirmTitle}>{t(dict, 'exports.confirmTitle')}</h3>
                <p className={styles.confirmMessage}>
                  {t(dict, 'exports.confirmMessage', {
                    type: getExportTypeLabel(),
                    count: exportType === 'report' ? totalGuests : (exportType === 'selected' ? selectedCount : (exportType === 'all' ? totalGuests : 1)),
                  })}
                </p>
                <div className={styles.confirmMeta}>
                  <span>{getScopeText()}</span>
                  <span className={styles.metaDot} aria-hidden="true" />
                  <span>{exportLocale === 'ar' ? t(dict, 'exports.languageAr') : t(dict, 'exports.languageEn')}</span>
                  <span className={styles.metaDot} aria-hidden="true" />
                  <span>PDF</span>
                </div>
              </div>
            </div>
            {createError && (
              <Notice variant="error" data-testid="export-create-error">
                {t(dict, `errors.${createError.code}`) || createError.message}
                {createError.code === 'RATE_LIMITED' ? ` — ${t(dict, 'exports.rateLimited')}` : ''}
              </Notice>
            )}
          </div>
        )}

        {view === 'job' && (
          <div className={styles.jobSection}>
            {['queued', 'running'].includes(jobState) || (isPolling && !jobState) ? (
              <div className={styles.jobCard}>
                <span className={styles.bigSpinner} aria-hidden="true" />
                <h3 className={styles.jobTitle}>{t(dict, 'exports.processingTitle')}</h3>
                <p className={styles.jobHint}>{t(dict, 'exports.processingHint')}</p>
                <span className={styles.jobState}>{getJobStateLabel() || t(dict, 'exports.polling')}</span>
              </div>
            ) : jobState === 'ready' ? (
              <div className={`${styles.jobCard} ${styles.jobReady}`}>
                <span className={styles.readyIcon} aria-hidden="true">
                  <Icon name="check-circle" size="xl" />
                </span>
                <h3 className={styles.jobTitle}>{t(dict, 'exports.ready')}</h3>
                {job?.snapshotAt && (
                  <p className={styles.jobHint}>
                    {t(dict, 'common.asOf')} <bdi>{formatRiyadhDate(job.snapshotAt, lang)}</bdi>
                  </p>
                )}
                <div className={styles.readyActions}>
                  <Button variant="primary" size="lg" onClick={handleDownload} leadingIcon="download" data-testid="export-download-btn">
                    {t(dict, 'exports.download')}
                  </Button>
                  <Button variant="outline" size="lg" onClick={handlePrint} leadingIcon="printer" data-testid="export-print-btn">
                    {t(dict, 'exports.print')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className={styles.jobCard}>
                <span className={styles.jobState}>{getJobStateLabel()}</span>
              </div>
            )}

            {(createError || actionError || jobQueryError || isTerminalFailure) && (
              <Notice variant="error" data-testid="export-job-error">
                {createError
                  ? `${t(dict, `errors.${createError.code}`) || createError.message}${createError.code === 'RATE_LIMITED' ? ` — ${t(dict, 'exports.rateLimited')}` : ''}`
                  : jobQueryError
                    ? `${t(dict, 'common.networkError')} (${jobQueryError.message})`
                    : actionError
                      ? (t(dict, `errors.${actionError.code}`) || t(dict, 'errors.UNKNOWN'))
                      : jobState === 'expired'
                        ? t(dict, 'exports.errorExpired')
                        : t(dict, 'exports.errorFailed', { message: job?.errorCode || job?.errorMessage || t(dict, 'errors.UNKNOWN') })}
              </Notice>
            )}
            {jobQueryError && (
              <div>
                <Button variant="outline" size="sm" leadingIcon="refresh" onClick={() => refetchJob()} data-testid="export-poll-retry-btn">
                  {t(dict, 'common.retry')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
