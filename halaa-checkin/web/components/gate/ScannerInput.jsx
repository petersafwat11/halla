'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button.jsx';
import { Icon } from '../ui/Icon.jsx';
import { t } from '../../lib/locale.js';
import styles from './ScannerInput.module.css';

/**
 * Dedicated barcode/QR keyboard scanner input.
 * Compatible with USB and Bluetooth HID barcode scanners that send Enter on termination.
 */
export function ScannerInput({ onScan, disabled = false, dict }) {
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    onScan(trimmed, 'scanner');
    setValue('');
  };

  return (
    <div className={styles.container} data-testid="scanner-input-container">
      <h2 className={styles.title}>
        <Icon name="qr" size="sm" />
        <span>{t(dict, 'gate.scannerTitle')}</span>
      </h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputWrapper}>
          <input
            type="text"
            className={styles.input}
            placeholder={t(dict, 'gate.scannerPlaceholder')}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            data-testid="scanner-barcode-input"
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={disabled || !value.trim()}
          data-testid="scanner-submit-btn"
        >
          {t(dict, 'gate.scannerSubmit')}
        </Button>
      </form>
    </div>
  );
}
