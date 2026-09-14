'use client';

import React, { useState, useEffect, useId } from 'react';
import { Dialog } from '../ui/Dialog.jsx';
import { Field } from '../ui/Field.jsx';
import { Button } from '../ui/Button.jsx';
import { Notice } from '../ui/Notice.jsx';
import { Icon } from '../ui/Icon.jsx';
import { getDictionary, t } from '../../lib/locale.js';
import styles from './GuestForm.module.css';

/**
 * Add or Edit Guest modal form.
 * Enforces 0..20 companion allowance, companion names count check,
 * and preserves inputs on validation or network failure.
 */
export function GuestForm({
  isOpen,
  onClose,
  guest = null, // null for add mode, Guest object for edit mode
  onSubmit,
  isPending = false,
  apiError = null,
  onReload,
  isClosed = false,
  lang = 'ar',
}) {
  const dict = getDictionary(lang);
  const formId = useId();
  const isEdit = !!guest;
  const isAdmitted = !!guest?.checkIn;

  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [allowedCompanions, setAllowedCompanions] = useState(0);
  const [companionNamesText, setCompanionNamesText] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (guest) {
        setName(guest.name || '');
        setReference(guest.reference || '');
        setAllowedCompanions(guest.allowedCompanions ?? 0);
        setCompanionNamesText(
          Array.isArray(guest.companionNames) ? guest.companionNames.join('\n') : ''
        );
      } else {
        setName('');
        setReference('');
        setAllowedCompanions(0);
        setCompanionNamesText('');
      }
      setFieldErrors({});
    }
  }, [isOpen, guest]);

  // Sync API field errors
  useEffect(() => {
    if (apiError?.fieldErrors) {
      setFieldErrors(apiError.fieldErrors);
    }
  }, [apiError]);

  const parseCompanionNames = () => {
    return companionNamesText
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean);
  };

  const validate = () => {
    const errors = {};
    const trimmedName = name.trim();
    if (!trimmedName) {
      errors.name = lang === 'ar' ? 'اسم الضيف مطلوب' : 'Guest name is required';
    } else if (trimmedName.length > 120) {
      errors.name = lang === 'ar' ? 'اسم الضيف يتجاوز 120 حرفاً' : 'Guest name exceeds 120 characters';
    }

    const trimmedRef = reference.trim();
    if (trimmedRef && trimmedRef.length > 60) {
      errors.reference = lang === 'ar' ? 'الرمز المرجعي يتجاوز 60 حرفاً' : 'Reference exceeds 60 characters';
    }

    // F16: validate the original value; never silently truncate fractions.
    const rawAllowed = String(allowedCompanions ?? '').trim();
    let companionsNum = null;
    if (rawAllowed === '' || !/^\d+$/.test(rawAllowed)) {
      errors.allowedCompanions =
        lang === 'ar' ? 'عدد المرافقين يجب أن يكون عدداً صحيحاً بين 0 و 20' : 'Allowed companions must be an integer between 0 and 20';
    } else {
      companionsNum = Number(rawAllowed);
      if (!Number.isInteger(companionsNum) || companionsNum < 0 || companionsNum > 20) {
        errors.allowedCompanions =
          lang === 'ar' ? 'عدد المرافقين يجب أن يكون بين 0 و 20' : 'Allowed companions must be between 0 and 20';
        companionsNum = null;
      } else {
        const namesList = parseCompanionNames();
        if (namesList.length > companionsNum) {
          errors.companionNames = t(dict, 'guests.companionNamesLimitError', { max: companionsNum });
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isAdmitted || isClosed) return;
    if (!validate()) return;

    const rawAllowed = String(allowedCompanions ?? '').trim();
    const companionsNum = Number(rawAllowed);
    const companionNames = parseCompanionNames();
    const trimmedRef = reference.trim();

    const payload = {
      name: name.trim(),
      // F16: explicit clearing value on edit (null clears server-side);
      // undefined on create means "no reference".
      reference: trimmedRef ? trimmedRef : (isEdit ? null : undefined),
      allowedCompanions: companionsNum,
      companionNames,
    };

    if (isEdit) {
      await onSubmit({
        guestId: guest.id,
        payload: {
          version: guest.version,
          ...payload,
        },
      }).catch(() => { /* Mutation error is displayed through apiError; preserve the form. */ });
    } else {
      await onSubmit(payload);
    }
  };

  const isConflict = apiError?.code === 'VERSION_CONFLICT';
  const locked = isPending || isAdmitted || isClosed;
  const companionsValue = parseInt(allowedCompanions, 10) || 0;
  const isVip = reference.trim().toUpperCase().startsWith('VIP');

  const title = isEdit ? t(dict, 'guests.editGuest') : t(dict, 'guests.addGuest');

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={isEdit ? null : t(dict, 'guests.formSubtitleAdd')}
      icon={isEdit ? 'edit' : 'user-plus'}
      maxWidth="580px"
      closeAriaLabel={t(dict, 'dialog.close')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            {t(dict, 'common.cancel')}
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            loading={isPending}
            disabled={isAdmitted || isClosed}
            data-testid="guest-submit-btn"
          >
            {isEdit ? t(dict, 'common.save') : t(dict, 'guests.addGuest')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className={styles.form} noValidate>
        {isClosed && <Notice variant="warning" message={t(dict, 'guests.eventClosedWarning')} />}

        {isAdmitted && <Notice variant="warning" message={t(dict, 'guests.admittedCannotEdit')} />}

        {apiError && !isAdmitted && (
          <Notice variant="error">
            <span>{t(dict, `errors.${apiError.code}`) || apiError.message}</span>
            {isConflict && onReload && (
              <span className={styles.noticeAction}>
                <Button variant="outline" size="sm" leadingIcon="refresh" onClick={onReload}>
                  {t(dict, 'guests.reloadData')}
                </Button>
              </span>
            )}
          </Notice>
        )}

        <div className={styles.formGrid}>
          <Field
            label={t(dict, 'guests.guestName')}
            required
            name="guestName"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
            }}
            placeholder={t(dict, 'guests.guestNamePlaceholder')}
            error={fieldErrors.name}
            disabled={locked}
            autoComplete="off"
            data-testid="guest-name-input"
          />

          <Field
            label={t(dict, 'guests.reference')}
            name="reference"
            value={reference}
            onChange={(e) => {
              setReference(e.target.value);
              if (fieldErrors.reference) setFieldErrors((p) => ({ ...p, reference: undefined }));
            }}
            placeholder={t(dict, 'guests.referencePlaceholder')}
            error={fieldErrors.reference}
            disabled={locked}
            autoComplete="off"
            data-testid="guest-reference-input"
          />
        </div>

        <label className={`${styles.vipToggle} ${isVip ? styles.vipToggleOn : ''}`}>
          <input
            type="checkbox"
            checked={isVip}
            onChange={(e) => {
              if (e.target.checked) {
                if (!isVip) {
                  setReference(reference.trim() ? `VIP-${reference.trim()}` : 'VIP-');
                }
              } else {
                setReference(reference.replace(/^VIP-?/i, ''));
              }
            }}
            disabled={locked}
            className={styles.vipCheckbox}
          />
          <span className={styles.vipIcon} aria-hidden="true">
            <Icon name="vip" size="sm" />
          </span>
          <span className={styles.vipText}>
            <span className={styles.vipLabel}>{t(dict, 'guests.vipGuest')}</span>
            <span className={styles.vipHint}>{t(dict, 'guests.vipHint')}</span>
          </span>
        </label>

        <div className={styles.companionsSection}>
          <div className={styles.companionsText}>
            <span className={styles.label}>{t(dict, 'guests.allowedCompanions')}</span>
            <span className={styles.helper}>
              <Icon name="users" size="sm" />
              {t(dict, 'guests.companionsHelper', { count: 1 + companionsValue })}
            </span>
          </div>
          <div className={styles.stepper}>
            <button
              type="button"
              className={styles.stepperBtn}
              onClick={() => setAllowedCompanions(Math.max(0, companionsValue - 1))}
              disabled={locked || companionsValue <= 0}
              aria-label={t(dict, 'gate.decreaseCompanions')}
            >
              <Icon name="minus" size="sm" />
            </button>
            <input
              type="number"
              min="0"
              max="20"
              inputMode="numeric"
              className={styles.stepperInput}
              name="allowedCompanions"
              aria-label={t(dict, 'guests.allowedCompanions')}
              value={allowedCompanions}
              onChange={(e) => {
                setAllowedCompanions(e.target.value);
                if (fieldErrors.allowedCompanions) {
                  setFieldErrors((p) => ({ ...p, allowedCompanions: undefined }));
                }
              }}
              disabled={locked}
              data-testid="guest-companions-input"
            />
            <button
              type="button"
              className={styles.stepperBtn}
              onClick={() => setAllowedCompanions(Math.min(20, companionsValue + 1))}
              disabled={locked || companionsValue >= 20}
              aria-label={t(dict, 'gate.increaseCompanions')}
            >
              <Icon name="plus" size="sm" />
            </button>
          </div>
        </div>
        {fieldErrors.allowedCompanions && (
          <p className={styles.errorText} role="alert">{fieldErrors.allowedCompanions}</p>
        )}

        <Field
          label={t(dict, 'guests.companionNamesLabel')}
          error={fieldErrors.companionNames}
          hint={t(dict, 'guests.companionNamesHint')}
        >
          <textarea
            name="companionNames"
            rows={3}
            value={companionNamesText}
            onChange={(e) => {
              setCompanionNamesText(e.target.value);
              if (fieldErrors.companionNames) {
                setFieldErrors((p) => ({ ...p, companionNames: undefined }));
              }
            }}
            placeholder={t(dict, 'guests.companionNamesPlaceholder')}
            disabled={locked}
            data-testid="guest-companion-names-input"
          />
        </Field>
      </form>
    </Dialog>
  );
}
