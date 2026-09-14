'use client';

import React, { forwardRef } from 'react';
import { Icon } from './Icon.jsx';
import styles from './Button.module.css';

/**
 * Button primitive matching Halaa Operations tokens and interaction guidelines.
 * Variants: primary, secondary, outline, ghost, danger, dangerOutline, success.
 * Sizes: sm (36px), md (42px), lg (50px); coarse pointers get 44px minimum.
 * Leading/trailing icon slots and a width-preserving loading state.
 */
export const Button = forwardRef(function Button(
  {
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
  },
  ref
) {
  const isDisabled = disabled || loading;
  const effectiveLeadingIcon = leadingIcon || icon;
  const iconSize = size === 'lg' ? 'md' : 'sm';

  const renderIcon = (iconItem) => {
    if (!iconItem) return null;
    if (React.isValidElement(iconItem)) return iconItem;
    if (typeof iconItem === 'string') {
      return <Icon name={iconItem} size={iconSize} />;
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
      ref={ref}
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
        {effectiveLeadingIcon && <span className={styles.iconSlot} aria-hidden="true">{renderIcon(effectiveLeadingIcon)}</span>}
        {children && <span>{children}</span>}
        {trailingIcon && <span className={styles.iconSlot} aria-hidden="true">{renderIcon(trailingIcon)}</span>}
      </span>
    </button>
  );
});
