'use client';

import React from 'react';
import styles from './Notice.module.css';

/**
 * Notice banner component for feedback, warnings, and error messages.
 * Standard interface (F12): `variant` (alias `type` tolerated), `message`
 * and/or `children`, plus forwarded DOM/test props (data-testid, etc.).
 */
export function Notice({
  variant = 'info',
  type,
  title,
  message,
  children,
  onDismiss,
  dismissLabel,
  className = '',
  ...rest
}) {
  const resolvedVariant = variant || type || 'info';
  const role = resolvedVariant === 'error' || resolvedVariant === 'warning' ? 'alert' : 'status';

  const renderIcon = () => {
    switch (resolvedVariant) {
      case 'success':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
      case 'warning':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'error':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  const body = message ?? children;

  return (
    <div
      className={`${styles.notice} ${styles[resolvedVariant] || styles.info} ${className}`.trim()}
      role={role}
      {...rest}
    >
      <span className={styles.icon}>{renderIcon()}</span>
      <div className={styles.content}>
        {title && <div className={styles.title}>{title}</div>}
        {body != null && body !== '' && <div>{body}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={styles.dismissBtn}
          aria-label={dismissLabel || 'Dismiss notice'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}
