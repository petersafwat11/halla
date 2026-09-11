'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Dialog.module.css';

/**
 * Accessible modal dialog with focus trap, escape listener, scroll lock, and focus restoration.
 * Rendered via portal into document.body so the `inert` background exclusion
 * applied to #app-lang-root never makes the modal itself inert (inert
 * subtrees are skipped by hit-testing, which would block every modal button).
 */
export function Dialog({
  isOpen,
  onClose,
  title,
  children,
  footer = null,
  closeAriaLabel = 'Close dialog',
  maxWidth = '520px',
  closeOnBackdropClick = true,
}) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  // F30: keep latest onClose in a ref so parent rerenders (e.g. stats polling
  // with inline callbacks) do not tear down focus handling.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const titleIdRef = useRef(`dialog-title-${Math.random().toString(36).slice(2, 8)}`);
  // Portal target resolves after mount so the server prerender (no document)
  // and the first client render both output null — no hydration mismatch.
  // Modals only open from user interaction, always post-mount.
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element for focus restoration (once per open).
    previousFocusRef.current = document.activeElement;

    // Body scroll lock + background exclusion for screen readers
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const appRoot = document.getElementById('app-lang-root');
    const hadInert = appRoot?.hasAttribute('inert');
    // `inert` is supported in modern browsers; fall back to aria-hidden
    try {
      appRoot?.setAttribute('inert', '');
    } catch {
      appRoot?.setAttribute('aria-hidden', 'true');
    }

    // Focus only usable controls (F30: exclude disabled/hidden).
    const focusableSelectors = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const isVisible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') return false;
      if (el.offsetParent === null && el.tagName !== 'BODY') {
        // Fixed-position modal children may have null offsetParent; check rect.
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;
      }
      return true;
    };
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const candidates = Array.from(modalRef.current.querySelectorAll(focusableSelectors)).filter(isVisible);
        const firstFocusable = candidates[0];
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          modalRef.current.focus();
        }
      }
    }, 50);

    // Escape listener (stable; uses latest onClose via ref)
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }

      // Focus trap (Tab and Shift+Tab, usable controls only)
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = Array.from(modalRef.current.querySelectorAll(focusableSelectors)).filter(isVisible);
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
      } catch { /* ignore */ }

      // Restore focus to opener once.
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        try { previousFocusRef.current.focus(); } catch { /* ignore */ }
        previousFocusRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen || !portalTarget) return null;

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={closeOnBackdropClick ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={styles.modal}
        style={{ maxWidth }}
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
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>{children}</div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    portalTarget
  );
}
