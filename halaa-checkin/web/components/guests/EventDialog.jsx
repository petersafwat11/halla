'use client';

import React, { useState, useEffect, useId } from 'react';
import { Dialog } from '../ui/Dialog.jsx';
import { Field } from '../ui/Field.jsx';
import { Button } from '../ui/Button.jsx';
import { Notice } from '../ui/Notice.jsx';
import { Icon } from '../ui/Icon.jsx';
import { getDictionary, t, toRiyadhDateInput, toRiyadhIsoString } from '../../lib/locale.js';
import styles from './EventDialog.module.css';

/**
 * Event creation and settings update modal dialog.
 */
export function EventDialog({
  isOpen,
  onClose,
  event = null,
  mode = 'create', // 'create' | 'edit'
  onSubmit,
  isPending = false,
  apiError = null,
  lang = 'ar',
}) {
  const dict = getDictionary(lang);
  const formId = useId();

  const [name, setName] = useState('');
  const [venue, setVenue] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('18:00');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && event) {
        setName(event.name || '');
        setVenue(event.venue || '');
        const { dateStr: d, timeStr: tm } = toRiyadhDateInput(event.startsAt);
        setDateStr(d);
        setTimeStr(tm);
      } else {
        setName('');
        setVenue('');
        const { dateStr: d } = toRiyadhDateInput();
        setDateStr(d);
        setTimeStr('18:00');
      }
      setFieldErrors({});
    }
  }, [isOpen, mode, event]);

  // Sync API field errors
  useEffect(() => {
    if (apiError?.fieldErrors) {
      setFieldErrors(apiError.fieldErrors);
    }
  }, [apiError]);

  const validate = () => {
    const errors = {};
    if (!name.trim()) {
      errors.name = lang === 'ar' ? 'اسم الفعالية مطلوب' : 'Event name is required';
    } else if (name.trim().length > 120) {
      errors.name = lang === 'ar' ? 'اسم الفعالية يتجاوز 120 حرفاً' : 'Event name exceeds 120 characters';
    }

    if (!venue.trim()) {
      errors.venue = lang === 'ar' ? 'الموقع مطلوب' : 'Venue is required';
    } else if (venue.trim().length > 160) {
      errors.venue = lang === 'ar' ? 'الموقع يتجاوز 160 حرفاً' : 'Venue exceeds 160 characters';
    }

    if (!dateStr) {
      errors.startsAt = lang === 'ar' ? 'تاريخ الفعالية مطلوب' : 'Event date is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const startsAt = toRiyadhIsoString(dateStr, timeStr);

    if (mode === 'create') {
      await onSubmit({
        name: name.trim(),
        venue: venue.trim(),
        startsAt,
        timezone: 'Asia/Riyadh',
      }).catch(() => { /* Mutation error is displayed through apiError; preserve the form. */ });
    } else {
      await onSubmit({
        eventId: event.id,
        payload: {
          version: event.version,
          name: name.trim(),
          venue: venue.trim(),
          startsAt,
        },
      }).catch(() => { /* Mutation error is displayed through apiError; preserve the form. */ });
    }
  };

  const isCreate = mode === 'create';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isCreate ? t(dict, 'events.createFirstEvent') : t(dict, 'events.editSettings')}
      description={isCreate ? t(dict, 'events.createFirstEventPrompt') : null}
      icon={isCreate ? 'calendar-plus' : 'settings'}
      maxWidth="560px"
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
            data-testid="event-submit-btn"
          >
            {isCreate ? t(dict, 'events.createFirstEvent') : t(dict, 'events.saveSettings')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className={styles.form} noValidate>
        {apiError && !Object.keys(apiError.fieldErrors || {}).length && (
          <Notice variant="error" message={t(dict, `errors.${apiError.code}`) || apiError.message} />
        )}

        {!isCreate && (
          <Notice variant="warning" data-testid="stale-pdf-warning">
            {t(dict, 'events.editWarning')}
          </Notice>
        )}

        <Field
          label={t(dict, 'events.eventName')}
          required
          name="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
          }}
          placeholder={t(dict, 'events.namePlaceholder')}
          error={fieldErrors.name}
          disabled={isPending}
          autoComplete="off"
        />

        <Field
          label={t(dict, 'events.venue')}
          required
          name="venue"
          value={venue}
          onChange={(e) => {
            setVenue(e.target.value);
            if (fieldErrors.venue) setFieldErrors((prev) => ({ ...prev, venue: undefined }));
          }}
          placeholder={t(dict, 'events.venuePlaceholder')}
          error={fieldErrors.venue}
          disabled={isPending}
          autoComplete="off"
        />

        <div className={styles.row}>
          <Field
            label={t(dict, 'events.startDate')}
            required
            type="date"
            name="startsDate"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            disabled={isPending}
            error={fieldErrors.startsAt}
          />

          <Field
            label={t(dict, 'events.startTime')}
            required
            type="time"
            name="startsTime"
            value={timeStr}
            onChange={(e) => setTimeStr(e.target.value)}
            disabled={isPending}
          />
        </div>

        <div className={styles.tzNote}>
          <Icon name="globe" size="sm" aria-hidden="true" />
          <span>{t(dict, 'events.timezone')}: <bdi>Asia/Riyadh (UTC+03:00)</bdi></span>
        </div>
      </form>
    </Dialog>
  );
}
