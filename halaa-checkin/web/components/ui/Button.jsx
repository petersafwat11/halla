'use client';

import React from 'react';
import { Icon } from './Icon.jsx';
import styles from './Button.module.css';

/**
 * Button primitive matching Halaa Operations tokens and interaction guidelines.
 * Supports primary, secondary, outline, ghost, danger variants.
 * sm (44px min), md (44px), lg (48px) sizes.
 * Leading/trailing icon slots.
 * Width-preserving loading state.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  icon = null,
  leadingIcon = null,
  trailingIcon = null,
  className = '',
  onClick,
  ...props
}) {
  const isDisabled = disabled || loading;
  const effectiveLeadingIcon = leadingIcon || icon;

  const renderIcon = (iconItem, defaultSize = 'xs') => {
    if (!iconItem) return null;
    if (React.isValidElement(iconItem)) return iconItem;
    if (typeof iconItem === 'string') {
      return <Icon name={iconItem} size={size === 'lg' ? 'sm' : defaultSize} />;
    }
    return iconItem;
  };

  const classes = [
    styles.button,
    styles[variant] || styles.primary,
    styles[size] || styles.md,
    fullWidth ? styles.fullWidth : '',
    isDisabled ? styles.disabled : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      onClick={isDisabled ? undefined : onClick}
      {...props}
    >
      {loading && (
        <span className={styles.spinnerOverlay} aria-hidden="true">
          <span className={styles.spinner} />
        </span>
      )}
      <span className={`${styles.contentWrapper} ${loading ? styles.loadingContent : ''}`.trim()}>
        {effectiveLeadingIcon && <span aria-hidden="true">{renderIcon(effectiveLeadingIcon)}</span>}
        {children && <span>{children}</span>}
        {trailingIcon && <span aria-hidden="true">{renderIcon(trailingIcon)}</span>}
      </span>
    </button>
  );
}
