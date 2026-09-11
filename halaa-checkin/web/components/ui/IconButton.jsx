'use client';

import React from 'react';
import { Icon } from './Icon.jsx';
import styles from './IconButton.module.css';

/**
 * Accessible IconButton primitive.
 * Enforces 44px minimum touch target, danger variant, title/tooltip, and accessible name.
 */
export function IconButton({
  icon,
  name,
  label,
  title,
  variant = 'ghost',
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  size = 'md',
  ...props
}) {
  const accessibleLabel = label || title;
  const tooltip = title || label;

  const classNames = [
    styles.iconButton,
    styles[variant] || styles.ghost,
    disabled ? styles.disabled : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classNames}
      disabled={disabled}
      aria-disabled={disabled}
      aria-label={accessibleLabel}
      title={tooltip}
      onClick={disabled ? undefined : onClick}
      {...props}
    >
      {React.isValidElement(icon) ? (
        icon
      ) : (
        <Icon name={name} icon={icon} size={size} />
      )}
    </button>
  );
}
