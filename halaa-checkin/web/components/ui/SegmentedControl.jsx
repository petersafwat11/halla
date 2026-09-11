'use client';

import React from 'react';
import styles from './SegmentedControl.module.css';

/**
 * Accessible SegmentedControl primitive.
 * Used for guests/gate navigation and compact status filters.
 * Keyboard-navigable with Arrow keys and 44px touch targets.
 */
export function SegmentedControl({
  options = [],
  value,
  onChange,
  'aria-label': ariaLabel,
  fullWidth = false,
  className = '',
  name,
}) {
  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % options.length;
      onChange?.(options[nextIndex].value);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + options.length) % options.length;
      onChange?.(options[prevIndex].value);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`${styles.container} ${fullWidth ? styles.fullWidth : ''} ${className}`.trim()}
    >
      {options.map((option, index) => {
        const isSelected = option.value === value;
        const isDisabled = option.disabled;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            name={name}
            aria-checked={isSelected}
            disabled={isDisabled}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => !isDisabled && onChange?.(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={[
              styles.option,
              isSelected ? styles.selected : '',
              isDisabled ? styles.disabled : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {option.icon && <span aria-hidden="true">{option.icon}</span>}
            <span>{option.label}</span>
            {option.count != null && (
              <span className={styles.countBadge} aria-label={`${option.count}`}>
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
