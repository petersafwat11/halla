'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon.jsx';
import styles from './Dialog.module.css';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isVisible(el) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none') return false;
  if (el.offsetParent === null && el.tagName !== 'BODY') {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
  }
  return true;
}

/**
 * Accessible modal dialog with focus trap, escape listener, scroll lock, and focus restoration.
 * Supports size variants ('sm', 'md', 'lg'), an optional header icon + description,
 * tone ('default' | 'danger' | 'warning' | 'success'), sticky footer, and a mobile sheet.
 * Initial focus goes to `initialFocusRef`, else the first control in the body.
 */
export function Dialog({
  isOpen,
  onClose,
  title,
  description = null,
  icon = null,
  tone = 'default',
  children,
  footer = null,
  closeAriaLabel = 'Close dialog',
  maxWidth,
  size = 'md',
  destructive = false,
  sheetOnMobile = true,
  closeOnBackdropClick = true,
  initialFocusRef = null,
}) {
  const modalRef = useRef(null);
  const bodyRef = useRef(null);
  const previousFocusRef = useRef(null);
  const pointerDownOnBackdrop = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const titleIdRef = useRef(`dialog-title-${Math.random().toString(36).slice(2, 8)}`);
  const descIdRef = useRef(`dialog-desc-${Math.random().toString(36).slice(2, 8)}`);
  const initialFocusTargetRef = useRef(initialFocusRef);
  initialFocusTargetRef.current = initialFocusRef;
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

    const timer = setTimeout(() => {
      const modal = modalRef.current;
      if (!modal) return;
      const preferred = initialFocusTargetRef.current?.current;
      if (preferred && isVisible(preferred) && !preferred.disabled) {
        preferred.focus();
        return;
      }
      const inBody = Array.from(bodyRef.current?.querySelectorAll(FOCUSABLE) || []).filter(isVisible);
      const anywhere = Array.from(modal.querySelectorAll(FOCUSABLE)).filter(isVisible);
      const target = inBody[0] || anywhere[anywhere.length - 1];
      if (target) target.focus();
      else modal.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = Array.from(modalRef.current.querySelectorAll(FOCUSABLE)).filter(isVisible);
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
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
  const resolvedTone = destructive ? 'danger' : tone;
  const toneClass = styles[`tone_${resolvedTone}`] || '';

  return createPortal(
    <div
      className={[styles.backdrop, sheetOnMobile ? styles.sheetOnMobile : ''].filter(Boolean).join(' ')}
      onMouseDown={(e) => {
        pointerDownOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (closeOnBackdropClick && pointerDownOnBackdrop.current && e.target === e.currentTarget) {
          onClose?.();
        }
        pointerDownOnBackdrop.current = false;
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={[styles.modal, sizeClass, toneClass].filter(Boolean).join(' ')}
        style={maxWidth ? { maxWidth } : undefined}
        role={resolvedTone === 'danger' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleIdRef.current}
        aria-describedby={description ? descIdRef.current : undefined}
        tabIndex={-1}
      >
        <div className={styles.header}>
          {icon && (
            <span className={styles.headerIcon} aria-hidden="true">
              {typeof icon === 'string' ? <Icon name={icon} size="md" /> : icon}
            </span>
          )}
          <div className={styles.headerText}>
            <h2 id={titleIdRef.current} className={styles.title}>
              {title}
            </h2>
            {description && (
              <p id={descIdRef.current} className={styles.description}>
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label={closeAriaLabel}
          >
            <Icon name="x" size="md" />
          </button>
        </div>

        <div ref={bodyRef} className={styles.body}>{children}</div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    portalTarget
  );
}
