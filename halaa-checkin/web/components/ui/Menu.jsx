'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './Menu.module.css';

const GAP = 6;
const EDGE = 8;

/**
 * Accessible overflow/action Menu primitive.
 * The dropdown renders in a portal with fixed positioning so scroll containers
 * (tables, cards) never clip it; it flips above the trigger near the viewport
 * bottom and aligns to the logical start/end edge in both RTL and LTR.
 *
 * Item shape: { key, label, icon, onClick, disabled, danger, testId, hint } or { type: 'divider' }.
 * `header` renders a non-interactive block above the items (e.g. account identity).
 */
export function Menu({
  trigger,
  items = [],
  header = null,
  align = 'end',
  className = '',
  minWidth = 200,
  'aria-label': ariaLabel = 'Actions menu',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const itemRefs = useRef([]);
  const menuId = useId();

  const close = useCallback((restoreFocus = true) => {
    setIsOpen(false);
    setPosition(null);
    if (restoreFocus) {
      triggerRef.current?.querySelector('button, [href], [tabindex]')?.focus();
    }
  }, []);

  const focusableItems = () => itemRefs.current.filter((el) => el && !el.disabled);

  // Position after the dropdown has rendered so its real size is known.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const place = () => {
      const triggerEl = triggerRef.current;
      const dropdownEl = dropdownRef.current;
      if (!triggerEl || !dropdownEl) return;
      const rect = triggerEl.getBoundingClientRect();
      const width = dropdownEl.offsetWidth;
      const height = dropdownEl.offsetHeight;
      const isRtl = getComputedStyle(triggerEl).direction === 'rtl';

      const alignRightEdge = (align === 'end') !== isRtl;
      let left = alignRightEdge ? rect.right - width : rect.left;
      left = Math.min(Math.max(EDGE, left), window.innerWidth - width - EDGE);

      const spaceBelow = window.innerHeight - rect.bottom - GAP - EDGE;
      const openUp = height > spaceBelow && rect.top - GAP - EDGE > spaceBelow;
      const top = openUp ? Math.max(EDGE, rect.top - height - GAP) : rect.bottom + GAP;

      setPosition({ top, left, dir: isRtl ? 'rtl' : 'ltr', origin: openUp ? 'bottom' : 'top' });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [isOpen, align]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      const list = focusableItems();
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }
      if (e.key === 'Tab') {
        close(false);
        return;
      }
      if (!list.length) return;
      const activeIdx = list.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        list[(activeIdx + 1) % list.length]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        list[(activeIdx - 1 + list.length) % list.length]?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        list[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        list[list.length - 1]?.focus();
      }
    };

    const handlePointerDown = (e) => {
      if (wrapperRef.current?.contains(e.target)) return;
      if (dropdownRef.current?.contains(e.target)) return;
      close(false);
    };

    const handleScroll = (e) => {
      if (dropdownRef.current?.contains(e.target)) return;
      close(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, close]);

  // Move focus into the menu once it is placed. When every item is disabled
  // (e.g. closed event) focus the menu itself so Escape/Tab still work.
  useEffect(() => {
    if (isOpen && position) {
      const first = focusableItems()[0];
      if (first) first.focus({ preventScroll: true });
      else dropdownRef.current?.focus({ preventScroll: true });
    }
  }, [isOpen, position]);

  const handleItemClick = (item) => {
    if (item.disabled) return;
    close();
    item.onClick?.();
  };

  let itemIndex = -1;

  return (
    <div ref={wrapperRef} className={`${styles.menuWrapper} ${className}`.trim()}>
      <div
        ref={triggerRef}
        onClick={() => (isOpen ? close(false) : setIsOpen(true))}
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

      {isOpen && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            id={menuId}
            role="menu"
            aria-label={ariaLabel}
            tabIndex={-1}
            dir={position?.dir}
            className={`${styles.menuDropdown} ${position?.origin === 'bottom' ? styles.fromBottom : ''}`.trim()}
            style={{
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              minWidth,
              visibility: position ? 'visible' : 'hidden',
            }}
          >
            {header && <div className={styles.menuHeader}>{header}</div>}
            {items.map((item, index) => {
              if (item.type === 'divider') {
                return <div key={`div-${index}`} className={styles.divider} role="separator" />;
              }
              itemIndex += 1;
              const refIndex = itemIndex;
              return (
                <button
                  key={item.id || item.key || index}
                  ref={(el) => {
                    itemRefs.current[refIndex] = el;
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  disabled={item.disabled}
                  title={item.disabled && item.hint ? item.hint : undefined}
                  onClick={() => handleItemClick(item)}
                  className={[styles.menuItem, item.danger ? styles.danger : ''].filter(Boolean).join(' ')}
                  data-testid={item.testId}
                >
                  {item.icon && <span className={styles.menuItemIcon}>{item.icon}</span>}
                  <span className={styles.menuItemLabel}>{item.label}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
