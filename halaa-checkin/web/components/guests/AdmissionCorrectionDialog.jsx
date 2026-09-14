'use client';

import React, { useState, useEffect, useId } from 'react';
import { Dialog } from '../ui/Dialog.jsx';
import { Field } from '../ui/Field.jsx';
import { Button } from '../ui/Button.jsx';
import { Notice } from '../ui/Notice.jsx';
import { Icon } from '../ui/Icon.jsx';
import { getDictionary, t, formatRiyadhDate } from '../../lib/locale.js';
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
  const formId = useId();
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
      setCompanions(isCorrect ? currentCompanions : 0);
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
    // F16: preserve entered text (including "1.5"/blank) for validation.
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

  const currentParty = guest?.checkIn
    ? guest.checkIn.actualPartySize || (1 + (guest.checkIn.actualCompanions || 0))
    : 0;
  const proposedParty = 1 + (parseInt(companions, 10) || 0);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isCorrect ? t(dict, 'guests.correctAdmission') : t(dict, 'guests.resetAdmission')}
      description={
        isCorrect
          ? t(dict, 'guests.correctionWarning', { name: guest?.name })
          : t(dict, 'guests.resetWarning', { name: guest?.name })
      }
      icon={isCorrect ? 'sliders' : 'rotate-ccw'}
      tone={isCorrect ? 'default' : 'danger'}
      maxWidth="540px"
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
            variant={isCorrect ? 'primary' : 'danger'}
            loading={isPending}
            disabled={!guest?.checkIn}
            data-testid={isCorrect ? 'correction-submit-btn' : 'reset-submit-btn'}
          >
            {isCorrect ? t(dict, 'guests.applyCorrection') : t(dict, 'guests.confirmReset')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className={styles.form} noValidate>
        {!guest?.checkIn && (
          <Notice variant="warning">{t(dict, 'errors.NOT_CHECKED_IN')}</Notice>
        )}
        {apiError && !Object.keys(apiError.fieldErrors || {}).length && (
          <Notice variant="error">
            <span>{t(dict, `errors.${apiError.code}`) || apiError.message}</span>
            {apiError.code === 'VERSION_CONFLICT' && onReload && (
              <span className={styles.noticeAction}>
                <Button variant="outline" size="sm" leadingIcon="refresh" onClick={() => onReload?.()} data-testid="correction-reload-btn">
                  {t(dict, 'guests.reloadData')}
                </Button>
              </span>
            )}
          </Notice>
        )}

        {guest && (
          <div className={styles.guestCard}>
            <span className={styles.guestName} dir="auto">{guest.name}</span>
            <bdi className={styles.code}>{guest.shortCode}</bdi>
          </div>
        )}

        {isCorrect && guest?.checkIn && (
          <div className={styles.comparisonGrid}>
            <div className={styles.comparisonCard}>
              <span className={styles.comparisonLabel}>{t(dict, 'guests.currentAdmission')}</span>
              <span className={styles.comparisonValue}>{t(dict, 'guests.peopleCount', { count: currentParty })}</span>
              {guest.checkIn.checkedInAt && (
                <bdi className={styles.comparisonMeta}>{formatRiyadhDate(guest.checkIn.checkedInAt, lang)}</bdi>
              )}
            </div>
            <span className={styles.comparisonArrow} aria-hidden="true">
              <Icon name="arrow-right" size="md" mirror />
            </span>
            <div className={`${styles.comparisonCard} ${styles.comparisonCardNew}`}>
              <span className={styles.comparisonLabel}>{t(dict, 'guests.proposedAdmission')}</span>
              <span className={styles.comparisonValue}>{t(dict, 'guests.peopleCount', { count: proposedParty })}</span>
              <span className={styles.comparisonMeta}>{t(dict, 'guests.companionsCount', { count: companions })}</span>
            </div>
          </div>
        )}

        {isCorrect && (
          <Field
            label={t(dict, 'guests.actualCompanionsLabel')}
            required
            name="actualCompanions"
            type="number"
            inputMode="numeric"
            value={companions}
            onChange={(e) => handleCompanionsChange(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, companions: true }))}
            min={0}
            max={allowedCompanions}
            step={1}
            placeholder="0"
            error={touched.companions ? fieldErrors.actualCompanions : undefined}
            disabled={isPending}
            hint={t(dict, 'guests.companionsHelper', { count: allowedCompanions + 1 })}
          />
        )}

        <Field
          label={t(dict, 'guests.correctionReasonLabel')}
          required
          error={touched.reason ? fieldErrors.reason : undefined}
          hint={t(dict, 'events.reasonLength')}
        >
          <textarea
            name="reason"
            rows={3}
            value={reason}
            onChange={(e) => handleReasonChange(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, reason: true }))}
            placeholder={t(dict, 'guests.correctionReasonPlaceholder')}
            disabled={isPending}
          />
        </Field>
      </form>
    </Dialog>
  );
}
