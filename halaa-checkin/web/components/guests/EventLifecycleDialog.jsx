'use client';

import React, { useState, useEffect, useId } from 'react';
import { Dialog } from '../ui/Dialog.jsx';
import { Field } from '../ui/Field.jsx';
import { Button } from '../ui/Button.jsx';
import { Notice } from '../ui/Notice.jsx';
import { getDictionary, t } from '../../lib/locale.js';
import styles from './EventLifecycleDialog.module.css';

/**
 * Dialog for confirming event status transitions (Open, Close or Reopen).
 * Reopening strictly enforces a 5..500 character reason recorded for audit.
 */
export function EventLifecycleDialog({
  isOpen,
  onClose,
  event,
  stats = null,
  targetStatus, // 'live' | 'closed'
  onSubmit,
  isPending = false,
  apiError = null,
  lang = 'ar',
}) {
  const dict = getDictionary(lang);
  const formId = useId();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const isReopen = targetStatus === 'live' && event?.status === 'closed';
  const isClose = targetStatus === 'closed';
  const isOpenFromDraft = targetStatus === 'live' && !isReopen;
  const numberFormat = new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ar-SA');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isReopen) {
      const trimmed = reason.trim();
      if (trimmed.length < 5) {
        setError(t(dict, 'events.reopenReasonRequired'));
        return;
      }
      if (trimmed.length > 500) {
        setError(lang === 'ar' ? 'السبب يتجاوز 500 حرف' : 'Reason exceeds 500 characters');
        return;
      }
    }

    await onSubmit({
      eventId: event.id,
      payload: {
        version: event.version,
        status: targetStatus,
        reason: isReopen ? reason.trim() : undefined,
      },
    }).catch(() => { /* Mutation error is displayed through apiError; preserve the form. */ });
  };

  const title = isClose
    ? t(dict, 'events.closeEventConfirmTitle')
    : isReopen
      ? t(dict, 'events.reopenEventConfirmTitle')
      : t(dict, 'events.openEventConfirmTitle');

  const description = isClose
    ? t(dict, 'events.closeEventWarning')
    : isReopen
      ? t(dict, 'events.reopenEventWarning')
      : t(dict, 'events.openEventWarning');

  const submitLabel = isClose
    ? t(dict, 'events.closeEvent')
    : isReopen
      ? t(dict, 'events.reopenEvent')
      : t(dict, 'events.openEvent');

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      icon={isClose ? 'lock' : isReopen ? 'rotate-ccw' : 'play'}
      tone={isClose ? 'danger' : isReopen ? 'warning' : 'success'}
      size="sm"
      maxWidth="500px"
      closeOnBackdropClick={!isPending}
      closeAriaLabel={t(dict, 'dialog.close')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            {t(dict, 'common.cancel')}
          </Button>
          <Button
            type="submit"
            form={formId}
            variant={isClose ? 'danger' : isOpenFromDraft ? 'success' : 'primary'}
            loading={isPending}
            data-testid="lifecycle-confirm-btn"
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className={styles.form}>
        {apiError && (
          <Notice variant="error" message={t(dict, `errors.${apiError.code}`) || apiError.message} />
        )}

        {event && (
          <div className={styles.eventCard}>
            <span className={styles.eventName} dir="auto">{event.name}</span>
            {event.venue && <span className={styles.eventVenue} dir="auto">{event.venue}</span>}
          </div>
        )}

        {isClose && stats && (
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>{t(dict, 'stats.totalInvitations')}</span>
              <span className={styles.statValue}>{numberFormat.format(stats.totalInvitations ?? 0)}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>{t(dict, 'stats.admittedPeople')}</span>
              <span className={`${styles.statValue} ${styles.statSuccess}`}>
                {numberFormat.format(stats.totalAttendees ?? stats.admittedInvitations ?? 0)}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>{t(dict, 'stats.pendingInvitations')}</span>
              <span className={styles.statValue}>{numberFormat.format(stats.pendingInvitations ?? 0)}</span>
            </div>
          </div>
        )}

        {isReopen && (
          <Field
            label={t(dict, 'events.reopenReason')}
            required
            error={error}
            hint={t(dict, 'events.reasonLength')}
          >
            <textarea
              name="reopenReason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              rows={3}
              placeholder={t(dict, 'events.reopenReasonPlaceholder')}
              disabled={isPending}
              data-testid="reopen-reason-input"
            />
          </Field>
        )}
      </form>
    </Dialog>
  );
}
