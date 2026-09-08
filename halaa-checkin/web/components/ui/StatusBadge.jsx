'use client';

import React from 'react';
import styles from './StatusBadge.module.css';

/**
 * StatusBadge displays event lifecycle state, guest admission state, or user role.
 */
export function StatusBadge({
  status = 'draft',
  label,
  size = 'sm',
  className = '',
}) {
  const normalizedStatus = String(status).toLowerCase();
  const variantClass = styles[normalizedStatus] || styles.draft;
  const sizeClass = styles[size] || styles.sm;

  const renderIcon = () => {
    switch (normalizedStatus) {
      case 'live':
      case 'admitted':
        return (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case 'draft':
      case 'pending':
        return (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
      case 'closed':
        return (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        );
      case 'admin':
        return (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        );
      case 'reception':
        return (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <span className={`${styles.badge} ${variantClass} ${sizeClass} ${className}`.trim()}>
      <span className={styles.icon}>{renderIcon()}</span>
      <span>{label || status}</span>
    </span>
  );
}
