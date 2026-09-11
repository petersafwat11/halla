'use client';

import React from 'react';
import { Icon } from './Icon.jsx';
import styles from './EmptyState.module.css';

/**
 * EmptyState primitive for table empty search, no guests, no events, scanner waiting.
 */
export function EmptyState({
  icon = 'info',
  customIcon,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div className={`${styles.container} ${className}`.trim()}>
      <div className={styles.iconWrapper}>
        {customIcon || <Icon name={icon} size="xl" />}
      </div>
      {title && <h3 className={styles.title}>{title}</h3>}
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.actions}>{action}</div>}
    </div>
  );
}
