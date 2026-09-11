'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon.jsx';
import styles from './Dialog.module.css';

/**
 * Accessible modal dialog with focus trap, escape listener, scroll lock, and focus restoration.
 * Supports size variants ('sm', 'md', 'lg'), sticky header/footer,
 * destructive mode, and responsive mobile sheet variant.
 */
export function Dialog({
  isOpen,
  onClose,
  title,
  children,
  footer = null,
  closeAriaLabel = 'Close dialog',
  maxWidth,
  size = 'md',
  destructive = false,
  sheetOnMobile = true,
  closeOnBackdropClick = true,
}) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const titleIdRef = useRef(`dialog-title-${Math.random().toString(36).slice(2, 8)}`);
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const appRoot = document.getElementById('app-lang-root');
    const hadInert = appRoot?.hasAttribute('inert');
    try {
      appRoot?.setAttribute('inert', '');
    } catch {
      appRoot?.setAttribute('aria-hidden', 'true');
    }

    const focusableSelectors =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const isVisible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') return false;
      if (el.offsetParent === null && el.tagName !== 'BODY') {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;
      }
      return true;
    };
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const candidates = Array.from(modalRef.current.querySelectorAll(focusableSelectors)).filter(
          isVisible
        );
        const firstFocusable = candidates[0];
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          modalRef.current.focus();
        }
      }
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll(focusableSelectors)
        ).filter(isVisible);
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      try {
        if (!hadInert) appRoot?.removeAttribute('inert');
        appRoot?.removeAttribute('aria-hidden');
      } catch {
        /* ignore */
      }

      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        try {
          previousFocusRef.current.focus();
        } catch {
          /* ignore */
        }
        previousFocusRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen || !portalTarget) return null;

  const sizeClass =
    size === 'sm' ? styles.sizeSm : size === 'lg' ? styles.sizeLg : styles.sizeMd;

  return createPortal(
    <div
      className={[
        styles.backdrop,
        sheetOnMobile ? styles.sheetOnMobile : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={closeOnBackdropClick ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={[
          styles.modal,
          sizeClass,
          destructive ? styles.destructive : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={maxWidth ? { maxWidth } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleIdRef.current}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id={titleIdRef.current} className={styles.title}>
            {title}
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label={closeAriaLabel}
          >
            <Icon name="x" size="md" />
          </button>
        </div>

        <div className={styles.body}>{children}</div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    portalTarget
  );
}
