'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog } from '../ui/Dialog.jsx';
import { Button } from '../ui/Button.jsx';
import { Notice } from '../ui/Notice.jsx';
import { Field } from '../ui/Field.jsx';
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
    startPolling,
    cleanup,
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

  // Determine scope text for confirm dialog
  const getScopeText = useCallback(() => {
    if (exportType === 'report') {
      return t(dict, 'exports.reportType');
    }
    if (exportType === 'single') {
      return t(dict, 'exports.scopeSingle');
    }
    if (exportType === 'selected') {
      return t(dict, 'exports.scopeSelected', { count: selectedCount });
    }
    if (exportType === 'all') {
      return t(dict, 'exports.scopeAll', { count: totalGuests });
    }
    return '';
  }, [exportType, selectedCount, totalGuests, dict]);

  // Determine export type display name
  const getExportTypeLabel = useCallback(() => {
    if (exportType === 'report') {
      return t(dict, 'exports.reportType');
    }
    if (exportType === 'single') {
      return t(dict, 'exports.singlePassType');
    }
    if (exportType === 'selected') {
      return t(dict, 'exports.selectedPassesType');
    }
    if (exportType === 'all') {
      return t(dict, 'exports.allPassesType');
    }
    return '';
  }, [exportType, dict]);

  // Check if export type is available
  const isTypeAvailable = useCallback((type) => {
    if (type === 'single') return !!singleGuest;
    if (type === 'selected') return selectedCount > 0;
    if (type === 'all') return totalGuests > 0;
    if (type === 'report') return true; // Report is always available
    return false;
  }, [singleGuest, selectedCount, totalGuests]);

  // Handle export creation
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
    } catch (err) {
      // Error handled by createError state
      console.error('Export creation failed:', err);
    }
  };

  // Handle confirm dialog open
  const handleOpenConfirm = (type, guest = null) => {
    if (!isTypeAvailable(type)) return;
    setExportType(type);
    if (type === 'single' && guest) {
      setSingleGuest(guest);
    }
    setPendingConfirmType(type);
    setShowConfirm(true);
  };

  // Handle download (surface failures in the panel, not only console)
  const handleDownload = async () => {
    if (!job?.id) return;
    setActionError(null);
    try {
      await downloadExport(job.id);
    } catch (err) {
      setActionError(err);
    }
  };

  // Handle print (blob-based, with popup-blocked fallback inside the hook)
  const handlePrint = async () => {
    if (!job?.id) return;
    setActionError(null);
    try {
      await printExport(job.id);
    } catch (err) {
      setActionError(err);
    }
  };

  // Handle retry: re-open confirmation for the same export type
  const handleRetry = () => {
    setActionError(null);
    const retryType = pendingConfirmType || exportType;
    setExportType(retryType);
    setPendingConfirmType(retryType);
    setShowConfirm(true);
  };

  // Cleanup on close (F24: retain job ID across closure; pause polling via isOpen).
  // Clear retained IDs on logout/user change (F24).
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

  // Check if job is in terminal state
  const isTerminalState = jobState === 'ready' || jobState === 'failed' || jobState === 'expired';

  // Report type label based on event status
  const reportLabel = event?.status === 'closed'
    ? t(dict, 'exports.reportFinal')
    : t(dict, 'exports.reportInterim');

  // Job state label
  const getJobStateLabel = () => {
    if (!jobState) return '';
    return t(dict, `exports.state${jobState.charAt(0).toUpperCase() + jobState.slice(1)}`) || jobState;
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t(dict, 'exports.title')}
      maxWidth="640px"
      closeAriaLabel={t(dict, 'dialog.close')}
    >
      <div className={styles.container}>
        {/* Export Type Selection */}
        {!activeJobId && !showConfirm && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{t(dict, 'exports.title')}</h3>

            <div className={styles.optionsGrid}>
              {/* Single Pass */}
              <button
                type="button"
                className={`${styles.optionCard} ${exportType === 'single' ? styles.optionCardSelected : ''} ${
                  !isTypeAvailable('single') ? styles.optionCardDisabled : ''
                }`}
                onClick={() => handleOpenConfirm('single')}
                disabled={!isTypeAvailable('single') || isCreating}
                data-testid="export-single-pass"
              >
                <div className={styles.optionIcon}>📱</div>
                <div className={styles.optionLabel}>{t(dict, 'exports.singlePass')}</div>
                <div className={styles.optionScope}>
                  {singleGuest ? (
                    <>
                      <bdi>{singleGuest.name}</bdi> {'('}
                      <bdi>{singleGuest.shortCode}</bdi>
                      {')'}
                    </>
                  ) : (
                    t(dict, 'exports.scopeSingle')
                  )}
                </div>
              </button>

              {/* Selected Passes */}
              <button
                type="button"
                className={`${styles.optionCard} ${exportType === 'selected' ? styles.optionCardSelected : ''} ${
                  !isTypeAvailable('selected') ? styles.optionCardDisabled : ''
                }`}
                onClick={() => handleOpenConfirm('selected')}
                disabled={!isTypeAvailable('selected') || isCreating}
                data-testid="export-selected-passes"
              >
                <div className={styles.optionIcon}>📄</div>
                <div className={styles.optionLabel}>{t(dict, 'exports.selectedPasses')}</div>
                <div className={styles.optionScope}>
                  {t(dict, 'exports.scopeSelected', { count: selectedCount })}
                </div>
              </button>

              {/* All Passes */}
              <button
                type="button"
                className={`${styles.optionCard} ${exportType === 'all' ? styles.optionCardSelected : ''} ${
                  !isTypeAvailable('all') ? styles.optionCardDisabled : ''
                }`}
                onClick={() => handleOpenConfirm('all')}
                disabled={!isTypeAvailable('all') || isCreating}
                data-testid="export-all-passes"
              >
                <div className={styles.optionIcon}>📚</div>
                <div className={styles.optionLabel}>{t(dict, 'exports.allPasses')}</div>
                <div className={styles.optionScope}>
                  {t(dict, 'exports.scopeAll', { count: totalGuests })}
                </div>
              </button>

              {/* Attendance Report */}
              <button
                type="button"
                className={`${styles.optionCard} ${exportType === 'report' ? styles.optionCardSelected : ''} ${
                  !isTypeAvailable('report') ? styles.optionCardDisabled : ''
                }`}
                onClick={() => handleOpenConfirm('report')}
                disabled={!isTypeAvailable('report') || isCreating}
                data-testid="export-report"
              >
                <div className={styles.optionIcon}>📊</div>
                <div className={styles.optionLabel}>{t(dict, 'exports.attendanceReport')}</div>
                <div className={styles.optionScope}>{reportLabel}</div>
                {/* F24: defined summary metrics, not only the option card. */}
                <div className={styles.optionScope} data-testid="export-report-metrics">
                  {t(dict, 'exports.pendingInvitations')}: {exportStats?.pendingInvitations ?? 0} •{' '}
                  {t(dict, 'exports.admittedInvitations')}: {exportStats?.admittedInvitations ?? 0} •{' '}
                  {t(dict, 'exports.attendanceRate')}: {exportStats?.invitationAttendanceRate ?? exportStats?.attendanceRate ?? 0}% •{' '}
                  {t(dict, 'exports.capacityRate')}: {exportStats?.capacityAttendanceRate ?? exportStats?.headCountRate ?? 0}%
                </div>
              </button>
            </div>

            {/* Language Selector */}
            <div className={styles.languageSelector}>
              <label htmlFor="export-locale" className={styles.fieldLabel}>
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
          </div>
        )}

        {/* Creation errors surface independently (F24: not hidden when no job ID). */}
        {!activeJobId && !showConfirm && createError && (
          <Notice variant="error" data-testid="export-create-error">
            {t(dict, `errors.${createError.code}`) || createError.message}
            {createError.code === 'RATE_LIMITED' ? ` — ${t(dict, 'exports.rateLimited')}` : ''}
          </Notice>
        )}

        {/* Confirmation Dialog */}
        {showConfirm && (
          <div className={styles.confirmSection}>
            <h3 className={styles.sectionTitle}>{t(dict, 'exports.confirmTitle')}</h3>
            <p className={styles.confirmMessage}>
              {t(dict, 'exports.confirmMessage', {
                type: getExportTypeLabel(),
                count: exportType === 'report' ? totalGuests : (exportType === 'selected' ? selectedCount : (exportType === 'all' ? totalGuests : 1)),
              })}
            </p>
            <div className={styles.confirmActions}>
              <Button variant="ghost" onClick={() => setShowConfirm(false)} disabled={isCreating}>
                {t(dict, 'common.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateExport}
                loading={isCreating}
                data-testid="export-confirm-btn"
              >
                {t(dict, 'exports.createExport')}
              </Button>
            </div>
          </div>
        )}

        {/* Processing / Result State */}
        {activeJobId && !showConfirm && (
          <div className={styles.jobSection}>
            <div className={`${styles.jobStatus} ${styles[jobState] || ''}`}>
              <div className={styles.jobStateInfo}>
                <span className={styles.jobStateLabel}>
                  {isPolling ? (
                    <>
                      <span className={styles.spinner} aria-hidden="true"></span>
                      {t(dict, 'exports.polling')}
                    </>
                  ) : (
                    getJobStateLabel()
                  )}
                </span>
                {job?.snapshotAt && (
                  <span className={styles.jobSnapshotTime}>
                    {t(dict, 'common.asOf')} {formatRiyadhDate(job.snapshotAt, lang)}
                  </span>
                )}
              </div>
            </div>

            {/* Error State (creation, polling, download/print, or terminal failure) */}
            {(createError || actionError || jobQueryError || (jobState === 'failed' || jobState === 'expired')) && (
              <Notice variant="error" className={styles.errorNotice} data-testid="export-job-error">
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
              <div style={{ marginTop: 8 }}>
                <Button variant="secondary" size="sm" onClick={() => refetchJob()} data-testid="export-poll-retry-btn">
                  {t(dict, 'common.retry')}
                </Button>
              </div>
            )}

            {/* Success State - Ready Actions */}
            {jobState === 'ready' && (
              <div className={styles.successActions}>
                <p className={styles.successMessage}>
                  {t(dict, 'exports.ready')}
                </p>
                <div className={styles.actionButtons}>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleDownload}
                    data-testid="export-download-btn"
                  >
                    💾 {t(dict, 'exports.download')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={handlePrint}
                    data-testid="export-print-btn"
                  >
                    🖨️ {t(dict, 'exports.print')}
                  </Button>
                </div>
              </div>
            )}

            {/* Processing State */}
            {['queued', 'running'].includes(jobState) && (
              <div className={styles.processingMessage}>
                <span className={styles.spinner} aria-hidden="true"></span>
                {t(dict, 'exports.polling')}
              </div>
            )}

            {/* Retry/Close Actions for terminal states */}
            {(jobState === 'failed' || jobState === 'expired') && (
              <div className={styles.retryActions}>
                <Button variant="primary" onClick={handleRetry} disabled={isCreating}>
                  {t(dict, 'exports.retry')}
                </Button>
                <Button variant="ghost" onClick={() => { clearRetainedJob(); setShowConfirm(false); }}>
                  {t(dict, 'exports.close')}
                </Button>
              </div>
            )}

            {/* New export without duplicating (F24: explicit, never automatic). */}
            {(jobState === 'ready' || jobState === 'failed' || jobState === 'expired') && (
              <div style={{ marginTop: 8 }}>
                <Button variant="secondary" size="sm" onClick={() => { clearRetainedJob(); setShowConfirm(false); setActionError(null); }} data-testid="export-new-btn">
                  {t(dict, 'exports.createExport')}
                </Button>
              </div>
            )}

            {/* Close button for ready state */}
            {jobState === 'ready' && (
              <div className={styles.closeActions}>
                <Button variant="ghost" onClick={onClose} size="sm">
                  {t(dict, 'exports.close')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
