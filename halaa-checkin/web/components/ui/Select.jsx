'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { Icon } from './Icon.jsx';
import styles from './Select.module.css';

/**
 * Accessible Select/Combobox primitive.
 * Supports custom listbox, keyboard navigation, empty/loading states,
 * and bidi-safe content.
 */
export function Select({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option...',
  disabled = false,
  emptyMessage = 'No options',
  className = '',
  'aria-label': ariaLabel,
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const listboxId = useId();

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val) => {
    onChange?.(val);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`${styles.container} ${className}`.trim()}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={styles.trigger}
      >
        <span className={styles.triggerValue} dir="auto">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={styles.triggerIcon}>
          <Icon name="chevron-down" size="sm" />
        </span>
      </button>

      {isOpen && (
        <div id={listboxId} role="listbox" className={styles.dropdown} tabIndex={-1}>
          {options.length === 0 ? (
            <div className={styles.emptyState}>{emptyMessage}</div>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={0}
                  onClick={() => handleSelect(option.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect(option.value);
                    }
                  }}
                  className={`${styles.option} ${isSelected ? styles.selected : ''}`}
                >
                  <span dir="auto">{option.label}</span>
                  {isSelected && <Icon name="check" size="xs" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
