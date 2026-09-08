'use client';

import React from 'react';
import styles from './Pagination.module.css';

/**
 * Accessible Pagination component.
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

  return (
    <nav
      className={`${styles.pagination} ${className}`.trim()}
      aria-label="Pagination Navigation"
    >
      <div className={styles.info}>
        <span>
          {totalLabel}: <strong>{total}</strong>
        </span>
        <span>•</span>
        <span>
          {pageLabel} <strong>{page}</strong> {ofLabel} <strong>{totalPages}</strong>
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
          {previousLabel}
        </button>

        <button
          type="button"
          className={styles.pageBtn}
          disabled={!hasNext}
          onClick={() => hasNext && onPageChange(page + 1)}
          aria-label={nextLabel}
        >
          {nextLabel}
        </button>
      </div>
    </nav>
  );
}
