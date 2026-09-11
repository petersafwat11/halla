'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog.jsx';
import { Field } from '../ui/Field.jsx';
import { Button } from '../ui/Button.jsx';
import { Notice } from '../ui/Notice.jsx';
import { getDictionary, t } from '../../lib/locale.js';
import styles from './AdmissionCorrectionDialog.module.css';

/**
 * Admission Correction/Reset Dialog.
 * Admin-only dialog to correct companion count or reset admission entirely.
 */
export function AdmissionCorrectionDialog({
  isOpen,
  onClose,
  guest,
  mode, // 'correct' | 'reset'
  onSubmit,
  isPending = false,
  apiError = null,
  onReload = null,
  lang = 'ar',
}) {
  const dict = getDictionary(lang);
  const isCorrect = mode === 'correct';

  const [companions, setCompanions] = useState(0);
  const [reason, setReason] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});

  const allowedCompanions = guest?.allowedCompanions || 0;
  const currentCompanions = guest?.checkIn?.actualCompanions || 0;
  const guestVersion = guest?.version;

  useEffect(() => {
    if (isOpen) {
      if (isCorrect) {
        setCompanions(currentCompanions);
      } else {
        setCompanions(0);
      }
      setReason('');
      setFieldErrors({});
      setTouched({});
    }
  }, [isOpen, isCorrect, currentCompanions]);

  // Sync API field errors
  useEffect(() => {
    if (apiError?.fieldErrors) {
      setFieldErrors(apiError.fieldErrors);
    }
  }, [apiError]);

  const validate = () => {
    const errors = {};

    if (isCorrect) {
      // F16: validate the original value; never silently truncate fractions.
      const raw = String(companions ?? '').trim();
      if (raw === '' || !/^\d+$/.test(raw)) {
        errors.actualCompanions = t(dict, 'guests.companionsRangeError', { max: allowedCompanions });
      } else {
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 0 || n > allowedCompanions) {
          errors.actualCompanions = t(dict, 'guests.companionsRangeError', { max: allowedCompanions });
        }
      }
    }

    const minReasonLength = 5;
    const maxReasonLength = 500;
    if (!reason.trim() || reason.trim().length < minReasonLength) {
      errors.reason = t(dict, isCorrect ? 'guests.correctionReasonRequired' : 'guests.resetReasonRequired');
    } else if (reason.trim().length > maxReasonLength) {
      errors.reason = t(dict, isCorrect ? 'guests.correctionReasonTooLong' : 'guests.resetReasonTooLong');
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!guest?.checkIn || isPending) return;
    // Mark all fields as touched for validation display
    setTouched({ companions: true, reason: true });
    if (!validate()) return;

    const companionsNum = isCorrect ? Number(String(companions).trim()) : undefined;
    await onSubmit({
      guestId: guest.id,
      payload: {
        version: guestVersion,
        ...(isCorrect ? { actualCompanions: companionsNum } : {}),
        reason: reason.trim(),
      },
    }).catch(() => { /* Mutation error is displayed through apiError; preserve the form. */ });
  };

  const handleCompanionsChange = (value) => {
    // F16: preserve entered text (including "1.5"/blank) for validation;
    // do not silently truncate via parseInt.
    setCompanions(value);
    if (touched.companions && fieldErrors.actualCompanions) {
      setFieldErrors((prev) => ({ ...prev, actualCompanions: undefined }));
    }
  };

  const handleReasonChange = (value) => {
    setReason(value);
    if (touched.reason && fieldErrors.reason) {
      setFieldErrors((prev) => ({ ...prev, reason: undefined }));
    }
  };

  const handleReasonBlur = () => {
    setTouched((prev) => ({ ...prev, reason: true }));
  };

  const handleCompanionsBlur = () => {
    setTouched((prev) => ({ ...prev, companions: true }));
  };

  const title = isCorrect
    ? t(dict, 'guests.correctAdmission')
    : t(dict, 'guests.resetAdmission');

  const submitLabel = isCorrect
    ? t(dict, 'guests.applyCorrection')
    : t(dict, 'guests.confirmReset');

  const warningMessage = isCorrect
    ? t(dict, 'guests.correctionWarning', { name: guest?.name })
    : t(dict, 'guests.resetWarning', { name: guest?.name });

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="520px"
      closeAriaLabel={t(dict, 'dialog.close')}
    >
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {!guest?.checkIn && <Notice variant="warning">{t(dict, 'errors.NOT_CHECKED_IN') || t(dict, 'errors.VERSION_CONFLICT')}</Notice>}
        {apiError && !Object.keys(apiError.fieldErrors || {}).length && (
          <>
            <Notice
              variant="error"
              message={t(dict, `errors.${apiError.code}`) || apiError.message}
            />
            {apiError.code === 'VERSION_CONFLICT' && onReload && (
              <Button variant="secondary" size="sm" onClick={() => onReload?.()} data-testid="correction-reload-btn">
                {t(dict, 'guests.versionConflictReload') || t(dict, 'common.retry')}
              </Button>
            )}
          </>
        )}

        <div className={styles.warningBox}>
          <span className={styles.warningIcon} aria-hidden="true">⚠️</span>
          <p className={styles.warningText}>{warningMessage}</p>
        </div>

        {isCorrect && (
          <Field
            label={t(dict, 'guests.actualCompanionsLabel')}
            required
            name="actualCompanions"
            type="number"
            value={companions}
            onChange={(e) => handleCompanionsChange(e.target.value)}
            onBlur={handleCompanionsBlur}
            min={0}
            max={allowedCompanions}
            step={1}
            placeholder="0"
            error={touched.companions ? fieldErrors.actualCompanions : undefined}
            disabled={isPending}
            helperText={t(dict, 'guests.companionsHelper', { count: allowedCompanions + 1 })}
          />
        )}

        <Field
          label={t(dict, 'guests.correctionReasonLabel')}
          required
          name="reason"
          value={reason}
          onChange={(e) => handleReasonChange(e.target.value)}
          onBlur={handleReasonBlur}
          placeholder={t(dict, 'guests.correctionReasonPlaceholder')}
          error={touched.reason ? fieldErrors.reason : undefined}
          disabled={isPending}
          multiline
          rows={4}
        />

        <div className={styles.footerActions}>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
          >
            {t(dict, 'common.cancel')}
          </Button>

          <Button
            type="submit"
            variant={isCorrect ? 'primary' : 'danger'}
            loading={isPending}
            disabled={!guest?.checkIn}
            data-testid={isCorrect ? 'correction-submit-btn' : 'reset-submit-btn'}
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}