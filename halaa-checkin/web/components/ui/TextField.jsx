'use client';

import React, { useId, forwardRef } from 'react';
import { Icon } from './Icon.jsx';
import styles from './TextField.module.css';

/**
 * Accessible TextField primitive.
 * Supports label, required state, leading/trailing slots, clear button,
 * inline error with alert semantics, hint, and disabled/read-only states.
 */
export const TextField = forwardRef(function TextField(
  {
    id: customId,
    name,
    label,
    value,
    defaultValue,
    onChange,
    onClear,
    clearable = false,
    error,
    hint,
    required = false,
    disabled = false,
    readOnly = false,
    leadingSlot,
    trailingSlot,
    type = 'text',
    placeholder,
    className = '',
    inputClassName = '',
    dir,
    clearAriaLabel = 'Clear input',
    ...props
  },
  ref
) {
  const generatedId = useId();
  const id = customId || (name ? `textfield-${name}` : generatedId);
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const showClear = Boolean(clearable && onClear && !disabled && !readOnly && value);

  return (
    <div className={`${styles.fieldContainer} ${className}`.trim()}>
      {label && (
        <div className={styles.labelRow}>
          <label htmlFor={id} className={styles.label}>
            {label}
            {required && (
              <span className={styles.requiredMark} aria-hidden="true">
                *
              </span>
            )}
          </label>
        </div>
      )}

      <div
        className={[
          styles.inputGroup,
          error ? styles.hasError : '',
          disabled ? styles.disabled : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {leadingSlot && <div className={styles.slotLeading}>{leadingSlot}</div>}

        <input
          ref={ref}
          id={id}
          name={name}
          type={type}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          dir={dir}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`${styles.input} ${inputClassName}`.trim()}
          {...props}
        />

        {showClear && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={onClear}
            aria-label={clearAriaLabel}
            tabIndex={0}
          >
            <Icon name="x" size="xs" />
          </button>
        )}

        {trailingSlot && <div className={styles.slotTrailing}>{trailingSlot}</div>}
      </div>

      {error && (
        <p id={errorId} className={styles.errorText} role="alert">
          <Icon name="alert-circle" size="xs" />
          <span>{error}</span>
        </p>
      )}

      {!error && hint && (
        <p id={hintId} className={styles.hintText}>
          {hint}
        </p>
      )}
    </div>
  );
});
