'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog.jsx';
import { Field } from '../ui/Field.jsx';
import { Button } from '../ui/Button.jsx';
import { Notice } from '../ui/Notice.jsx';
import { getDictionary, t } from '../../lib/locale.js';

/**
 * Dialog for confirming event status transitions (Close or Reopen).
 * Reopening strictly enforces a 5..500 character reason recorded for audit.
 */
export function EventLifecycleDialog({
  isOpen,
  onClose,
  event,
  targetStatus, // 'live' | 'closed'
  onSubmit,
  isPending = false,
  apiError = null,
  lang = 'ar',
}) {
  const dict = getDictionary(lang);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const isReopen = targetStatus === 'live' && event?.status === 'closed';
  const isClose = targetStatus === 'closed';

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
    });
  };

  const title = isClose
    ? t(dict, 'events.closeEventConfirmTitle')
    : isReopen
    ? t(dict, 'events.reopenEventConfirmTitle')
    : t(dict, 'dialog.confirmTitle');

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="480px"
      closeAriaLabel={t(dict, 'dialog.close')}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {apiError && (
          <Notice
            variant="error"
            message={t(dict, `errors.${apiError.code}`) || apiError.message}
          />
        )}

        <Notice
          variant={isClose ? 'warning' : 'info'}
          message={isClose ? t(dict, 'events.closeEventWarning') : t(dict, 'events.reopenEventWarning')}
        />

        {isReopen && (
          <Field
            label={t(dict, 'events.reopenReason')}
            required
            error={error}
            hint={lang === 'ar' ? 'من 5 إلى 500 حرف' : '5 to 500 characters'}
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
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-gray-250, #dfdfdf)',
                fontFamily: 'inherit',
                fontSize: '14px',
                resize: 'vertical',
              }}
              data-testid="reopen-reason-input"
            />
          </Field>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            {t(dict, 'common.cancel')}
          </Button>

          <Button
            type="submit"
            variant={isClose ? 'danger' : 'primary'}
            loading={isPending}
            data-testid="lifecycle-confirm-btn"
          >
            {isClose ? t(dict, 'events.closeEvent') : t(dict, 'events.reopenEvent')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
