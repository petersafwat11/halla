'use client';

import React from 'react';
import styles from './Button.module.css';

/**
 * Button primitive matching Halaa design tokens and interaction states.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  icon = null,
  className = '',
  onClick,
  ...props
}) {
  const isDisabled = disabled || loading;

  const classes = [
    styles.button,
    styles[variant] || styles.primary,
    styles[size] || styles.md,
    fullWidth ? styles.fullWidth : '',
    isDisabled ? styles.disabled : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      onClick={isDisabled ? undefined : onClick}
      {...props}
    >
      {loading ? (
        <>
          <span className={styles.spinner} aria-hidden="true" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {icon && <span aria-hidden="true">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}
