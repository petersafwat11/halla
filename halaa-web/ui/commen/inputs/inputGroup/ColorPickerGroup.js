'use client';
import React from 'react';
import styles from './colorPicker.module.css';
import { get, useFormContext, useWatch } from 'react-hook-form';

const ColorPickerGroup = ({
  label,
  name,
  value,
  onChange,
  customColorPlaceholder,
}) => {
  const {
    control,
    setValue,
    clearErrors,
    formState: { errors },
  } = useFormContext();
  // Field-scoped subscription: picking a colour re-renders this control only.
  const watchedValue = useWatch({ control, name });
  const fieldValue = value !== undefined ? value : watchedValue;
  const fieldError = get(errors, name)?.message;

  const update = (next) => {
    setValue(name, next, { shouldDirty: true });
    clearErrors(name);
    if (onChange) onChange(next);
  };

  return (
    <div className={styles.color_section}>
      <h4 className={styles.color_label}>{label}</h4>
      <div className={styles.custom_color}>
        <input
          type="color"
          value={fieldValue || ''}
          aria-label={label}
          onChange={(e) => update(e.target.value)}
          className={styles.color_picker}
        />
        <input
          placeholder={customColorPlaceholder}
          value={fieldValue || ''}
          aria-label={label}
          dir="ltr"
          onChange={(e) => update(e.target.value)}
          className={styles.color_picker_input}
        />
      </div>
      {fieldError && <p className={styles.error}>{fieldError}</p>}
    </div>
  );
};

export default ColorPickerGroup;
