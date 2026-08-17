'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useFormContext, useController } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { get } from 'lodash';
import styles from './datePicker.module.css';
import Image from 'next/image';
import Calendar from './Calendar';
import { formatTemplateDate } from '@halaa/shared/utils/formatTemplateDate';
import { ar } from 'date-fns/locale';

// Normalize a date to midnight so time-of-day never affects day comparisons
const toDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const DatePicker = ({
  name,
  label = '',
  placeholder = 'Select date',
  required = true,
  ServerErrors,
  disabled = false,
  minDate,
  maxDate,
}) => {
  const { t, i18n } = useTranslation('common');
  const { control, clearErrors } = useFormContext();
  const {
    field: { onChange, value },
    formState: { errors },
  } = useController({ name, control });

  const [isOpen, setIsOpen] = useState(false);
  const datePickerRef = useRef(null);

  // Controlled month state — resets to the right month every time the picker opens
  const getDefaultMonth = () => {
    if (value) return toDay(new Date(value));
    if (minDate) return new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    return new Date();
  };
  const [calendarMonth, setCalendarMonth] = useState(getDefaultMonth);

  // Sync month when picker opens
  useEffect(() => {
    if (isOpen) setCalendarMonth(getDefaultMonth());
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const error =
    get(errors, name)?.message ||
    ServerErrors?.response?.data?.errors?.[name]?.[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDateSelect = (date) => {
    onChange(date);
    clearErrors(name);
    setIsOpen(false);
  };

  // Compare dates at day-level only — strip time so e.g. "April 1 midnight"
  // is never wrongly disabled when minDate is "April 1 at 15:00"
  const isDateDisabled = (date) => {
    if (disabled) return true;
    const d = toDay(date);
    if (minDate && d < toDay(minDate)) return true;
    if (maxDate && d > toDay(maxDate)) return true;
    return false;
  };

  return (
    <div className={styles.date_picker_group}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>

      <div className={styles.date_picker_container} ref={datePickerRef}>
        <button
          type="button"
          className={`${styles.date_picker_button} ${
            error ? styles.date_picker_button_error : ''
          } ${disabled ? styles.date_picker_button_disabled : ''}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <Image
            src="/svg/events/calendar.svg"
            alt="calendar"
            width={16}
            height={16}
            className={styles.calendar_icon}
          />
          <span className={styles.date_picker_text}>
            {value ? formatTemplateDate(value, t) : placeholder}
          </span>
          {error && (
            <div className={styles.error_icon}>
              <Image
                src="/svg/auth/info-circle.svg"
                alt="error"
                width={16}
                height={16}
              />
            </div>
          )}
        </button>

        {/* Calendar Dropdown — pointer-events:none when closed so the invisible
            scaled element never intercepts clicks on content below it */}
        <div
          className={styles.calendar_dropdown}
          style={{
            transform: isOpen ? 'scaleY(1)' : 'scaleY(0)',
            transformOrigin: 'top',
            transition: 'transform 0.2s ease',
            pointerEvents: isOpen ? 'auto' : 'none',
          }}
        >
          <Calendar
            mode="single"
            selected={value ? new Date(value) : undefined}
            onSelect={handleDateSelect}
            disabled={isDateDisabled}
            showOutsideDays={true}
            className={styles.calendar}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            locale={i18n.language === 'ar' ? ar : undefined}
          />
        </div>
      </div>

      {error && (
        <div className={styles.error_container}>
          <p className={styles.error}>{error}</p>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
