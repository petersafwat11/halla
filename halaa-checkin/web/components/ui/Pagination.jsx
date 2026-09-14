'use client';

import React from 'react';
import { Icon } from './Icon.jsx';
import styles from './Pagination.module.css';

/**
 * Accessible Pagination component: range summary plus previous/next controls.
 */
export function Pagination({
  page = 1,
  pageSize = 25,
  total = 0,
  onPageChange,
  previousLabel = 'Previous',
  nextLabel = 'Next',
  pageLabel = 'Page',
  ofLabel = 'of',
  totalLabel = 'Total',
  className = '',
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav className={`${styles.pagination} ${className}`.trim()} aria-label={pageLabel}>
      <div className={styles.info} title={totalLabel}>
        <span className="tabular">
          <strong>{from}–{to}</strong> {ofLabel} <strong>{total}</strong>
        </span>
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.pageBtn}
          disabled={!hasPrevious}
          onClick={() => hasPrevious && onPageChange(page - 1)}
          aria-label={previousLabel}
        >
          <Icon name="chevron-left" size="sm" mirror />
          <span className={styles.btnLabel}>{previousLabel}</span>
        </button>

        <span className={`${styles.pageIndicator} tabular`} aria-live="polite">
          {pageLabel} {page} {ofLabel} {totalPages}
        </span>

        <button
          type="button"
          className={styles.pageBtn}
          disabled={!hasNext}
          onClick={() => hasNext && onPageChange(page + 1)}
          aria-label={nextLabel}
        >
          <span className={styles.btnLabel}>{nextLabel}</span>
          <Icon name="chevron-right" size="sm" mirror />
        </button>
      </div>
    </nav>
  );
}
