"use client";
import React from 'react';
import { Mail, MessagesSquare, QrCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { INVITATION_TYPE_OPTIONS, getInvitationTypeCopy } from '@halaa/shared/constants/invitationTypes';
import styles from './invitationTypesSection.module.css';

const ICONS = { reply_and_qr: QrCode, reply_only: MessagesSquare, none: Mail };

export default function InvitationTypesSection({ lang = 'ar' }) {
  const { t } = useTranslation('landing');
  return <section id="invitation-types" className={styles.root} aria-labelledby="invitation-types-title">
    <div className={styles.inner}>
      <div className={styles.header}>
        <div><span className={styles.eyebrow}>{t('invitationTypes.eyebrow')}</span>
          <h2 id="invitation-types-title">{t('invitationTypes.title')}</h2>
          <p>{t('invitationTypes.sub')}</p>
        </div>
        <a href={`/${lang}/signup`} className={styles.cta}>{t('invitationTypes.cta')}</a>
      </div>
      <div className={styles.options}>
        {INVITATION_TYPE_OPTIONS.map(option => {
          const copy = getInvitationTypeCopy(option.value, lang);
          const Icon = ICONS[option.value];
          return <article key={option.value} className={styles.option}>
            <div className={styles.iconBackground} aria-hidden="true">
              <Icon size={23} strokeWidth={1.6} />
            </div>
            <div><h3>{copy.title}</h3><p>{copy.description}</p></div>
          </article>;
        })}
      </div>
    </div>
  </section>;
}
