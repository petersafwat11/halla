"use client";
import React from 'react';
import { QrCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './replyDeliveryPreview.module.css';

export default function ReplyDeliveryPreview({ preview }) {
  const { t } = useTranslation('createEvent');
  if (preview.channel === 'none') return null;
  return <div className={styles.preview}>
    <p className={styles.heading}>{t(preview.channel === 'portal' ? 'reply_preview_portal' : 'reply_preview_whatsapp')}</p>
    {preview.includesQr && <div className={styles.qr}>
      <QrCode size={44} aria-hidden="true" />
      <span>{t('reply_preview_qr_placeholder')}</span>
    </div>}
    <p dir="auto" className={styles.message}>{preview.text}</p>
    <p className={styles.note}>{t(preview.richCaption ? 'reply_preview_details_note' : preview.channel === 'portal' ? 'reply_preview_portal_note' : 'reply_preview_text_note')}</p>
  </div>;
}
