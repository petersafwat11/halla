'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button.jsx';
import { Icon } from '../ui/Icon.jsx';
import { t } from '../../lib/locale.js';
import styles from './ScannerInput.module.css';

/**
 * Dedicated barcode/QR keyboard scanner input.
 * Compatible with USB and Bluetooth HID barcode scanners that send Enter on termination.
 * Staff can also type the short code printed on the pass.
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
      <div className={styles.heading}>
        <span className={styles.iconTile} aria-hidden="true">
          <Icon name="scan" size="md" />
        </span>
        <div className={styles.headingText}>
          <h2 className={styles.title}>{t(dict, 'gate.scannerTitle')}</h2>
          <p className={styles.hint}>{t(dict, 'gate.scannerHint')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputWrapper}>
          <span className={styles.inputIcon} aria-hidden="true">
            <Icon name="qr" size="sm" />
          </span>
          <input
            type="text"
            className={styles.input}
            placeholder={t(dict, 'gate.scannerPlaceholder')}
            aria-label={t(dict, 'gate.scannerTitle')}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck="false"
            data-testid="scanner-barcode-input"
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          disabled={disabled || !value.trim()}
          className={styles.submit}
          data-testid="scanner-submit-btn"
        >
          {t(dict, 'gate.scannerSubmit')}
        </Button>
      </form>
    </div>
  );
}
