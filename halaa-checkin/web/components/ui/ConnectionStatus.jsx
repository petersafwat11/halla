'use client';

import React from 'react';
import { Icon } from './Icon.jsx';
import styles from './ConnectionStatus.module.css';

/**
 * ConnectionStatus primitive for online/offline/syncing gate status.
 * Replaces raw emoji (🟢/🔴) with accessible text, icon, and semantic color.
 */
export function ConnectionStatus({
  isOnline = true,
  isSyncing = false,
  onlineLabel = 'Online',
  offlineLabel = 'Offline',
  syncingLabel = 'Syncing...',
  className = '',
}) {
  const statusState = !isOnline ? 'offline' : isSyncing ? 'pending' : 'online';
  const label = !isOnline ? offlineLabel : isSyncing ? syncingLabel : onlineLabel;

  return (
    <div
      className={`${styles.statusBadge} ${styles[statusState]} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <span className={styles.dot} aria-hidden="true" />
      <Icon
        name={!isOnline ? 'wifi-off' : isSyncing ? 'refresh' : 'wifi'}
        size="xs"
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}
