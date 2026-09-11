'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog.jsx';
import { Field } from '../ui/Field.jsx';
import { Button } from '../ui/Button.jsx';
import { Notice } from '../ui/Notice.jsx';
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

  const title = isEdit ? t(dict, 'guests.editGuest') : t(dict, 'guests.addGuest');

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="500px"
      closeAriaLabel={t(dict, 'dialog.close')}
    >
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {isClosed && (
          <Notice
            variant="warning"
            message={t(dict, 'guests.eventClosedWarning')}
          />
        )}

        {isAdmitted && (
          <Notice
            variant="warning"
            message={t(dict, 'guests.admittedCannotEdit')}
          />
        )}

        {apiError && !isAdmitted && (
          <div>
            <Notice
              variant="error"
              message={t(dict, `errors.${apiError.code}`) || apiError.message}
            />
            {isConflict && onReload && (
              <div style={{ marginTop: '8px' }}>
                <Button variant="secondary" size="sm" onClick={onReload}>
                  🔄 {lang === 'ar' ? 'إعادة تحميل البيانات' : 'Reload data'}
                </Button>
              </div>
            )}
          </div>
        )}

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
          disabled={isPending || isAdmitted || isClosed}
          data-testid="guest-name-input"
        />

        <div className={styles.row}>
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
            disabled={isPending || isAdmitted || isClosed}
            data-testid="guest-reference-input"
          />

          <Field
            label={t(dict, 'guests.allowedCompanions')}
            type="number"
            min="0"
            max="20"
            name="allowedCompanions"
            value={allowedCompanions}
            onChange={(e) => {
              setAllowedCompanions(e.target.value);
              if (fieldErrors.allowedCompanions) {
                setFieldErrors((p) => ({ ...p, allowedCompanions: undefined }));
              }
            }}
            error={fieldErrors.allowedCompanions}
            disabled={isPending || isAdmitted || isClosed}
            data-testid="guest-companions-input"
          />
        </div>

        <div className={styles.helperBox}>
          <span aria-hidden="true">💡</span>
          <span>
            {t(dict, 'guests.companionsHelper', {
              count: 1 + (parseInt(allowedCompanions, 10) || 0),
            })}
          </span>
        </div>

        <Field
          label={t(dict, 'guests.companionNamesLabel')}
          error={fieldErrors.companionNames}
          hint={lang === 'ar' ? 'اختياري، اسم في كل سطر' : 'Optional, one per line'}
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
            disabled={isPending || isAdmitted || isClosed}
            className={`${styles.textarea} ${fieldErrors.companionNames ? styles.hasError : ''}`}
            data-testid="guest-companion-names-input"
          />
        </Field>

        <div className={styles.footerActions}>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            {t(dict, 'common.cancel')}
          </Button>

          <Button
            type="submit"
            variant="primary"
            loading={isPending}
            disabled={isAdmitted || isClosed}
            data-testid="guest-submit-btn"
          >
            {isEdit ? t(dict, 'common.save') : t(dict, 'guests.addGuest')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
