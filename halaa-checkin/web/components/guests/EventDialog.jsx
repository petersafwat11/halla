'use client';

import React, { useState, useEffect, useId } from 'react';
import { Dialog } from '../ui/Dialog.jsx';
import { Field } from '../ui/Field.jsx';
import { Button } from '../ui/Button.jsx';
import { Notice } from '../ui/Notice.jsx';
import { Icon } from '../ui/Icon.jsx';
import { getDictionary, t, toRiyadhDateInput, toRiyadhIsoString } from '../../lib/locale.js';
import styles from './EventDialog.module.css';
import { eventCreateSchema, eventUpdateSchema, eventScheduleSchema } from '@halaa-checkin/contracts';

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
        const { dateStr: d, timeStr: tm } = toRiyadhDateInput(new Date(Date.now() + 60 * 60 * 1000));
        setDateStr(d);
        setTimeStr(tm);
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

  const selectedStart = () => {
    if (mode === 'edit' && event?.startsAt) {
      const original = toRiyadhDateInput(event.startsAt);
      if (original.dateStr === dateStr && original.timeStr === timeStr) return event.startsAt;
    }
    return toRiyadhIsoString(dateStr, timeStr);
  };

  const validate = () => {
    const startsAt = selectedStart();
    const payload = { name: name.trim(), venue: venue.trim(), startsAt };
    const result = mode === 'create'
      ? eventCreateSchema.safeParse({ ...payload, timezone: 'Asia/Riyadh' })
      : eventUpdateSchema.safeParse({ ...payload, version: event?.version });
    const errors = {};
    if (!result.success) for (const issue of result.error.issues) {
      const field = issue.path[0];
      errors[field] = lang === 'ar'
        ? ({ name: 'أدخل اسم المناسبة من حرف إلى 120 حرفاً', venue: 'أدخل الموقع من حرف إلى 160 حرفاً', startsAt: 'أدخل تاريخاً ووقتاً صحيحين' }[field] || 'تحقق من القيمة المدخلة')
        : issue.message;
    }
    if (!dateStr || !timeStr) errors.startsAt = lang === 'ar' ? 'التاريخ والوقت مطلوبان' : 'Date and time are required';
    if (!errors.startsAt) {
      const schedule = eventScheduleSchema({ previousStartsAt: mode === 'edit' ? event?.startsAt : null }).safeParse(startsAt);
      if (!schedule.success) errors.startsAt = lang === 'ar' ? 'يجب أن يكون الموعد الجديد للمناسبة في المستقبل' : 'Choose a future date and time';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const startsAt = selectedStart();

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
            min={mode === 'create' ? toRiyadhDateInput().dateStr : undefined}
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
            error={fieldErrors.startsAt}
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
