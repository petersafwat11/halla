'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog } from '../ui/Dialog.jsx';
import { Button } from '../ui/Button.jsx';
import { Notice } from '../ui/Notice.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { Icon } from '../ui/Icon.jsx';
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
  event = null,
  guest,
  onExportPdf = null,
  lang = 'ar',
}) {
  const dict = getDictionary(lang);

  const {
    data: qrResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['qr', eventId, guest?.id],
    queryFn: () => api.get(`/events/${eventId}/guests/${guest.id}/qr`),
    enabled: isOpen && !!eventId && !!guest?.id,
    staleTime: 60000,
  });

  const qrData = qrResponse?.data;
  const [printError, setPrintError] = React.useState(null);
  React.useEffect(() => { if (isOpen) setPrintError(null); }, [isOpen]);

  // F25: route single-pass Print through the authenticated A6 PDF pipeline
  // (same as export-panel), never window.print() of the dashboard.
  const handlePrint = () => {
    setPrintError(null);
    if (guest && typeof onExportPdf === 'function') {
      onExportPdf(guest);
    } else {
      setPrintError(t(dict, 'qr.scanInstruction'));
    }
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
        {printError && (
          <Notice variant="info" message={printError} />
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
            {/* F25: preview shows event identity/date/allowance for correct pass context. */}
            {event && (
              <div style={{ fontSize: '12px', color: 'var(--color-natural-700, #454545)', marginTop: 6 }}>
                <div dir="auto">{event.name}</div>
                {event.venue && <div dir="auto">{event.venue}</div>}
                {guest.allowedCompanions != null && (
                  <div>{t(dict, 'gate.allowedCompanions')}: {guest.allowedCompanions}</div>
                )}
              </div>
            )}
          </div>
        )}

        <div className={styles.qrWrapper} data-testid="qr-container">
          {isLoading ? (
            <div className={styles.skeletonWrapper}>
              <Skeleton width="180px" height="180px" />
            </div>
          ) : qrData?.imageDataUrl ? (
            <img
              src={qrData.imageDataUrl}
              alt={`${t(dict, 'qr.previewTitle')}: ${guest?.name || ''}`}
              className={styles.qrImage}
              data-testid="qr-image"
            />
          ) : (
            <div className={styles.emptyErrorState}>
              <Icon name="warning" size="lg" />
              <p style={{ margin: 0, fontSize: '13px' }}>{t(dict, 'common.networkError')}</p>
              <Button variant="secondary" size="sm" leadingIcon={<Icon name="refresh" size="xs" />} onClick={() => refetch()}>
                {t(dict, 'common.retry')}
              </Button>
            </div>
          )}
        </div>

        <p className={styles.instruction}>{t(dict, 'qr.scanInstruction')}</p>

        <div className={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadImage}
            disabled={!qrData?.imageDataUrl}
            leadingIcon={<Icon name="download" size="xs" />}
            data-testid="download-qr-img-btn"
          >
            {lang === 'ar' ? 'تحميل صورة الرمز' : 'Save QR Image'}
          </Button>

          {onExportPdf && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => guest && onExportPdf(guest)}
              disabled={!guest}
              leadingIcon={<Icon name="file-text" size="xs" />}
              data-testid="export-single-pdf-btn"
            >
              {lang === 'ar' ? 'تحميل PDF (A6)' : 'Download PDF (A6)'}
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            disabled={!qrData?.imageDataUrl}
            leadingIcon={<Icon name="printer" size="xs" />}
            data-testid="print-qr-btn"
          >
            {t(dict, 'qr.print')}
          </Button>

          <Button variant="primary" size="sm" onClick={onClose}>
            {t(dict, 'qr.close')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
