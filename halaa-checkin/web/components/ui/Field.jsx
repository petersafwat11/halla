'use client';

import React, { useId } from 'react';
import styles from './Field.module.css';

/**
 * Accessible form field wrapper with label, error, hint, and aria attributes.
 */
export function Field({
  id: customId,
  label,
  error,
  hint,
  required = false,
  children,
  className = '',
  // Pass-through input props when used as an all-in-one input
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  disabled,
  autoComplete,
  ...props
}) {
  const generatedId = useId();
  const id = customId || (name ? `field-${name}` : generatedId);
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;

  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`${styles.field} ${className}`.trim()}>
      {label && (
        <div className={styles.labelRow}>
          <label htmlFor={id} className={styles.label}>
            {label}
            {required && <span className={styles.required} aria-hidden="true">*</span>}
          </label>
        </div>
      )}

      <div className={styles.inputWrapper}>
        {children ? (
          React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) return child;
            return React.cloneElement(child, {
              id: child.props.id || id,
              'aria-invalid': error ? 'true' : undefined,
              'aria-describedby': describedBy,
              className: `${styles.input} ${error ? styles.hasError : ''} ${child.props.className || ''}`.trim(),
            });
          })
        ) : (
          <input
            id={id}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete={autoComplete}
            required={required}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
            className={`${styles.input} ${error ? styles.hasError : ''}`}
            {...props}
          />
        )}
      </div>

      {error && (
        <p id={errorId} className={styles.errorText} role="alert">
          {error}
        </p>
      )}

      {!error && hint && (
        <p id={hintId} className={styles.hintText}>
          {hint}
        </p>
      )}
    </div>
  );
}
