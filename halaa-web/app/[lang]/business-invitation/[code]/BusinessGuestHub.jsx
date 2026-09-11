'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@halaa/shared/utils/locale';
import { QRCodeSVG } from 'qrcode.react';
import { CalendarDays, MapPin, Check, Globe } from 'lucide-react';
import Button from '@/ui/commen/button/Button';
import useBusinessInvitation from './useBusinessInvitation';
import EventActions from './EventActions';
import RsvpForm from './RsvpForm';
import styles from './hub.module.css';

export default function BusinessGuestHub() {
  const { code, lang } = useParams();
  const language = lang === 'ar' ? 'ar' : 'en';
  const { t } = useTranslation('businessGuestHub');
  const invitation = useBusinessInvitation(code, language);
  const { query, payload, changing, failed, statusRef, changeResponse } =
    invitation;
  const { guest, event, pass, preview } = payload;
  const direction = language === 'ar' ? 'rtl' : 'ltr';

  if (query.isLoading) {
    return (
      <main className={styles.page} dir={direction} lang={language}>
        <div className={styles.loading} role="status">
          {t('loading')}
        </div>
      </main>
    );
  }
  const invalidated =
    query.isError && [403, 404].includes(query.error?.response?.status);
  if (!guest || !event || event.deliveryMode !== 'portal_link' || invalidated) {
    const status = query.error?.response?.status;
    const invalid =
      status === 404 ||
      status === 403 ||
      (event && event.deliveryMode !== 'portal_link');
    return (
      <main className={styles.page} dir={direction} lang={language}>
        <section className={styles.error}>
          <h1>{t('unavailable')}</h1>
          <p>{t(invalid ? 'invalid' : 'network')}</p>
          <Button
            variant="primary"
            title={t('retry')}
            onClick={() => query.refetch()}
          />
        </section>
      </main>
    );
  }

  const actions = event.actions || {};
  const response = guest.rsvp?.response;
  const showForm = event.canRespond && !preview && (changing || !response);
  const start = actions.startAt && new Date(actions.startAt);
  const date =
    start && !Number.isNaN(start.getTime())
      ? formatDateTime(start, language, { timeZone: 'Asia/Riyadh' })
      : `${event.date || ''} ${event.time || ''}`;
  const showPass =
    pass?.code &&
    !query.isError &&
    !changing &&
    !preview &&
    event.includesQr &&
    response === 'confirmed';

  return (
    <main className={styles.page} dir={direction} lang={language}>
      <div className={styles.shell}>
          <div className={styles.business}>
            {event.branding?.logoUrl && (
              <Image
                unoptimized
                width={48}
                height={48}
                src={event.branding.logoUrl}
                alt=""
                referrerPolicy="no-referrer"
              />
            )}
            <span>{event.branding?.businessName}</span>
          </div>
        {event.invitationImageUrl && (
          <div className={styles.invitationArtwork}>
            <Image unoptimized width={1200} height={1600}
              className={styles.invitationImage} src={event.invitationImageUrl}
              alt={t("invitationImageAlt", { title: event.title })}
              referrerPolicy="no-referrer" fetchPriority="high" />
          </div>
        )}
        <article className={styles.passCard}>
          <header className={styles.event}>
            <h1>{event.title}</h1>
            <div className={styles.eventDetails}>
              <div className={styles.detailItem}>
                <span className={styles.detailIcon}>
                  <CalendarDays aria-hidden="true" size={20} />
                </span>
                <div className={styles.detailContent}>
                  <time dateTime={actions.startAt}>{date}</time>
                  <small>{t('time')}</small>
                </div>
              </div>
              {event.location?.address && (
                <div className={styles.detailItem}>
                  <span className={styles.detailIcon}>
                    <MapPin aria-hidden="true" size={20} />
                  </span>
                  <div className={styles.detailContent}>
                    <p>{event.location.address}</p>
                  </div>
                </div>
              )}
            </div>
          </header>
          <EventActions actions={actions} />
          <div className={styles.ticketDivider} aria-hidden="true" />
          <section
            className={`${styles.greeting} ${
              !showForm && response === 'confirmed' ? styles.greetingSubdued : ''
            }`}
          >
            <h2>
              {t('greeting', {
                name: preview ? t('previewGuest') : guest.name,
              })}
            </h2>
            {event.description && <p>{event.description}</p>}
          </section>
          {preview && <p className={styles.notice}>{t('preview')}</p>}
          {!event.canRespond && event.allowsReply && !preview && (
            <p className={styles.notice}>{t('closed')}</p>
          )}
          {(failed || query.isError) && (
            <p role="alert" className={styles.failure}>
              {t(failed ? 'failed' : 'network')}
            </p>
          )}
          {showForm && <RsvpForm invitation={invitation} />}
          {!showForm && response && event.allowsReply && !preview && (
            <section
              className={`${styles.entryPass} ${
                response === 'confirmed'
                  ? styles.entryPassConfirmed
                  : styles.entryPassDeclined
              }`}
              ref={statusRef}
              tabIndex={-1}
              aria-live="polite"
            >
              <div className={styles.passHeader}>
                <div className={styles.passStatus}>
                  {response === 'confirmed' && (
                    <span className={styles.passIconWrap}>
                      <Check size={18} aria-hidden="true" />
                    </span>
                  )}
                  <h2>
                    {t(response === 'confirmed' ? 'confirmed' : 'declined')}
                  </h2>
                </div>
                {showPass && (
                  <span className={styles.party}>
                    {t('guestCount', { count: pass.guestsCount })}
                  </span>
                )}
              </div>

              {showPass && (
                <div className={styles.passQrSection}>
                  <div className={styles.passQrWrap}>
                    <QRCodeSVG
                      className={styles.passCode}
                      value={pass.code}
                      size={170}
                      level="M"
                      marginSize={2}
                      title={t('pass')}
                    />
                  </div>
                  <p className={styles.qrInstruction}>{t('show')}</p>
                </div>
              )}

              {payload.message && (
                <div className={styles.passMessageSection}>
                  <p className={styles.outcomeMessage}>
                    {payload.message}
                  </p>
                </div>
              )}

              {guest.rsvp?.message && (
                <div className={styles.passMessageSection}>
                  <p className={styles.outcomeMessage}>
                    <strong>{t('message')}: </strong>
                    <span dir="auto">{guest.rsvp.message}</span>
                  </p>
                </div>
              )}

              {event.canRespond && (
                <div className={styles.passActions}>
                  <Button
                    variant="secondary"
                    size="small"
                    title={t('change')}
                    disabled={invitation.saving}
                    onClick={changeResponse}
                    className={styles.changeBtn}
                  />
                </div>
              )}
            </section>
          )}
        </article>
        <footer className={styles.footer}>
          <a
            href={`/${language === 'ar' ? 'en' : 'ar'}/business-invitation/${encodeURIComponent(code)}`}
            hrefLang={language === 'ar' ? 'en' : 'ar'}
            lang={language === 'ar' ? 'en' : 'ar'}
          >
            <Globe aria-hidden="true" size={17} />
            {t('languageName')}
          </a>
          <span>{t('brand')}</span>
        </footer>
      </div>
    </main>
  );
}
