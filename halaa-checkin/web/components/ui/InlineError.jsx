'use client';

import React from 'react';
import { Icon } from './Icon.jsx';
import styles from './InlineError.module.css';

/**
 * InlineError primitive for form and field-level validation errors.
 */
export function InlineError({ message, children, className = '', id }) {
  const content = message || children;
  if (!content) return null;

  return (
    <div id={id} className={`${styles.inlineError} ${className}`.trim()} role="alert">
      <span className={styles.icon} aria-hidden="true">
        <Icon name="alert-circle" size="sm" />
      </span>
      <span>{content}</span>
    </div>
  );
}
