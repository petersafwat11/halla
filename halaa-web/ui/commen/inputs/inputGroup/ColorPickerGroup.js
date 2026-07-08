'use client';
import React from 'react';
import styles from './colorPicker.module.css';
import { get, useFormContext } from 'react-hook-form';

const ColorPickerGroup = ({
  label,
  name,
  value,
  onChange,
  customColorPlaceholder,
  options,
}) => {
  const colorOptions = [
    '#c28e5c',
    '#d6b392',
    '#8b6f47',
    '#a0845c',
    '#e74c3c',
    '#3498db',
    '#2ecc71',
    '#f39c12',
    '#9b59b6',
    '#1abc9c',
    '#34495e',
    '#95a5a6',
  ];
  const {
    register,
    setValue,
    watch,
    clearErrors,
    formState: { errors },
  } = useFormContext();
  const fieldValue = value !== undefined ? value : watch(name);
  const fieldError = get(errors, name)?.message;

  return (
    <div className={styles.color_section}>
      <h4 className={styles.color_label}>{label}</h4>
      {options && (
        <div className={styles.color_options}>
          {colorOptions.map((color) => (
            <button
              key={color}
              type="button"
              className={`${styles.color_option} ${
                fieldValue === color ? styles.selected : ''
              }`}
              style={{ backgroundColor: color }}
              onClick={() => {
                setValue(name, color);
                clearErrors(name);
                if (onChange) onChange(color);
              }}
            />
          ))}
        </div>
      )}
      <div className={styles.custom_color}>
        <input
          type="color"
          value={fieldValue || ''}
          onChange={(e) => {
            setValue(name, e.target.value);
            clearErrors(name);
            if (onChange) onChange(e.target.value);
          }}
          className={styles.color_picker}
        />
        <input
          placeholder={customColorPlaceholder}
          value={fieldValue || ''}
          onChange={(e) => {
            setValue(name, e.target.value);
            clearErrors(name);
            if (onChange) onChange(e.target.value);
          }}
          className={styles.color_picker_input}
        />
      </div>
      {fieldError && <p className={styles.error}>{fieldError}</p>}
    </div>
  );
};

export default ColorPickerGroup;
