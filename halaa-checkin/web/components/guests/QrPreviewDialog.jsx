'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog } from '../ui/Dialog.jsx';
import { Button } from '../ui/Button.jsx';
import { Notice } from '../ui/Notice.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { Icon } from '../ui/Icon.jsx';
import { api } from '../../lib/api.js';
import { getDictionary, t, formatRiyadhDate } from '../../lib/locale.js';
import styles from './QrPreviewDialog.module.css';

/**
 * QR pass preview modal dialog.
 * Fetches the server-generated QR PNG and renders it as a pass preview with
 * save-image, A6 PDF and print actions.
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
      icon="qr"
      size="sm"
      maxWidth="460px"
      closeAriaLabel={t(dict, 'dialog.close')}
      footer={
        <Button variant="primary" onClick={onClose}>
          {t(dict, 'qr.close')}
        </Button>
      }
    >
      <div className={styles.container}>
        {error && (
          <Notice variant="error" message={t(dict, `errors.${error.code}`) || error.message} />
        )}
        {printError && <Notice variant="info" message={printError} />}

        <div className={styles.pass}>
          {event && (
            <div className={styles.passHeader}>
              <span className={styles.eventName} dir="auto">{event.name}</span>
              <span className={styles.eventMeta}>
                {event.venue && <span dir="auto">{event.venue}</span>}
                {event.startsAt && <bdi>{formatRiyadhDate(event.startsAt, lang)}</bdi>}
              </span>
            </div>
          )}

          <div className={styles.passBody}>
            <div className={styles.qrWrapper} data-testid="qr-container">
              {isLoading ? (
                <Skeleton width="208px" height="208px" borderRadius="12px" />
              ) : qrData?.imageDataUrl ? (
                <img
                  src={qrData.imageDataUrl}
                  alt={`${t(dict, 'qr.previewTitle')}: ${guest?.name || ''}`}
                  className={styles.qrImage}
                  data-testid="qr-image"
                />
              ) : (
                <div className={styles.emptyErrorState}>
                  <Icon name="alert-triangle" size="lg" />
                  <p>{t(dict, 'common.networkError')}</p>
                  <Button variant="outline" size="sm" leadingIcon="refresh" onClick={() => refetch()}>
                    {t(dict, 'common.retry')}
                  </Button>
                </div>
              )}
            </div>

            {guest && (
              <div className={styles.guestInfo}>
                <h3 className={styles.guestName} dir="auto">{guest.name}</h3>
                <bdi className={styles.shortCodeBadge}>{qrData?.shortCode || guest.shortCode}</bdi>
                {guest.allowedCompanions != null && (
                  <span className={styles.allowance}>
                    <Icon name="users" size="sm" />
                    {t(dict, 'gate.allowedCompanions')}: {guest.allowedCompanions}
                  </span>
                )}
              </div>
            )}
          </div>

          <p className={styles.instruction}>{t(dict, 'qr.scanInstruction')}</p>
        </div>

        <div className={styles.actions}>
          <Button
            variant="outline"
            onClick={handleDownloadImage}
            disabled={!qrData?.imageDataUrl}
            leadingIcon="image-down"
            data-testid="download-qr-img-btn"
          >
            {t(dict, 'qr.saveImage')}
          </Button>

          {onExportPdf && (
            <Button
              variant="outline"
              onClick={() => guest && onExportPdf(guest)}
              disabled={!guest}
              leadingIcon="file-down"
              data-testid="export-single-pdf-btn"
            >
              {t(dict, 'qr.downloadPdfA6')}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={!qrData?.imageDataUrl}
            leadingIcon="printer"
            data-testid="print-qr-btn"
          >
            {t(dict, 'qr.print')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
