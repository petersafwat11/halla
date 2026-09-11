'use client';

import React from 'react';
import styles from './Skeleton.module.css';

/**
 * Skeleton primitive for loading states (QR preview, stats, table rows).
 */
export function Skeleton({
  width = '100%',
  height = '20px',
  borderRadius,
  circle = false,
  className = '',
  style,
  ...props
}) {
  return (
    <span
      className={`${styles.skeleton} ${circle ? styles.circle : ''} ${className}`.trim()}
      style={{
        width,
        height,
        borderRadius: circle ? '50%' : borderRadius,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}
