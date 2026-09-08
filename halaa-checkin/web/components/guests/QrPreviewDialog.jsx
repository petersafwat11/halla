'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog } from '../ui/Dialog.jsx';
import { Button } from '../ui/Button.jsx';
import { Notice } from '../ui/Notice.jsx';
import { api } from '../../lib/api.js';
import { getDictionary, t } from '../../lib/locale.js';
import styles from './QrPreviewDialog.module.css';

/**
 * QR pass preview modal dialog.
 * Fetches generated internal QR PNG and displays short code and print options.
 */
export function QrPreviewDialog({
  isOpen,
  onClose,
  eventId,
  guest,
  lang = 'ar',
}) {
  const dict = getDictionary(lang);

  const {
    data: qrResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['qr', eventId, guest?.id],
    queryFn: () => api.get(`/events/${eventId}/guests/${guest.id}/qr`),
    enabled: isOpen && !!eventId && !!guest?.id,
    staleTime: 60000,
  });

  const qrData = qrResponse?.data;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = () => {
    if (!qrData?.imageDataUrl) return;
    const link = document.createElement('a');
    link.href = qrData.imageDataUrl;
    link.download = `pass-${guest?.shortCode || 'qr'}.png`;
    link.click();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t(dict, 'qr.previewTitle')}
      maxWidth="420px"
      closeAriaLabel={t(dict, 'dialog.close')}
    >
      <div className={styles.container}>
        {error && (
          <Notice
            variant="error"
            message={t(dict, `errors.${error.code}`) || error.message}
          />
        )}

        {guest && (
          <div className={styles.guestInfo}>
            <h3 className={styles.guestName} dir="auto">
              {guest.name}
            </h3>
            <div>
              <bdi className={styles.shortCodeBadge}>
                {qrData?.shortCode || guest.shortCode}
              </bdi>
            </div>
          </div>
        )}

        <div className={styles.qrWrapper} data-testid="qr-container">
          {isLoading ? (
            <div style={{ color: 'var(--color-natural-450, #656565)', fontSize: '13px' }}>
              {t(dict, 'common.loading')}
            </div>
          ) : qrData?.imageDataUrl ? (
            <img
              src={qrData.imageDataUrl}
              alt={`QR Code for ${guest?.name}`}
              className={styles.qrImage}
              data-testid="qr-image"
            />
          ) : null}
        </div>

        <p className={styles.instruction}>{t(dict, 'qr.scanInstruction')}</p>

        <div className={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadImage}
            disabled={!qrData?.imageDataUrl}
            data-testid="download-qr-img-btn"
          >
            💾 {lang === 'ar' ? 'تحميل صورة الرمز' : 'Save QR Image'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            disabled={!qrData?.imageDataUrl}
            data-testid="print-qr-btn"
          >
            🖨️ {t(dict, 'qr.print')}
          </Button>

          <Button variant="primary" size="sm" onClick={onClose}>
            {t(dict, 'qr.close')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
