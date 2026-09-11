'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import styles from './Menu.module.css';

/**
 * Accessible overflow/action Menu primitive.
 * Supports trigger slot, menu items with icons and danger variants,
 * keyboard navigation (arrows, escape, enter), click outside, and focus restoration.
 */
export function Menu({
  trigger,
  items = [],
  align = 'end',
  className = '',
  'aria-label': ariaLabel = 'Actions menu',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const itemRefs = useRef([]);
  const menuId = useId();

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const activeIdx = itemRefs.current.indexOf(document.activeElement);
        const nextIdx = (activeIdx + 1) % itemRefs.current.length;
        itemRefs.current[nextIdx]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const activeIdx = itemRefs.current.indexOf(document.activeElement);
        const prevIdx = (activeIdx - 1 + itemRefs.current.length) % itemRefs.current.length;
        itemRefs.current[prevIdx]?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        itemRefs.current[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        itemRefs.current[itemRefs.current.length - 1]?.focus();
      }
    };

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    // Auto-focus first item on open
    setTimeout(() => {
      itemRefs.current[0]?.focus();
    }, 20);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const handleItemClick = (onClick, disabled) => {
    if (disabled) return;
    setIsOpen(false);
    triggerRef.current?.focus();
    onClick?.();
  };

  return (
    <div ref={menuRef} className={`${styles.menuWrapper} ${className}`.trim()}>
      <div
        ref={triggerRef}
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        className={styles.trigger}
      >
        {trigger}
      </div>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label={ariaLabel}
          className={`${styles.menuDropdown} ${align === 'start' ? styles.alignStart : styles.alignEnd}`}
        >
          {items.map((item, index) => {
            if (item.type === 'divider') {
              return <div key={`div-${index}`} className={styles.divider} role="separator" />;
            }

            return (
              <button
                key={item.id || item.key || index}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => handleItemClick(item.onClick, item.disabled)}
                className={[
                  styles.menuItem,
                  item.danger ? styles.danger : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {item.icon && <span className={styles.menuItemIcon}>{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
