'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useGuestByToken, useGuestMutation } from '@/hooks/guests';
import styles from './hub.module.css';

const copy = {
  en: { loading: 'Loading your invitation…', unavailable: 'Invitation unavailable', invalid: 'This link is invalid or no longer available.', network: 'We could not load your invitation. Check your connection and try again.', retry: 'Try again', greeting: 'Welcome,', calendar: 'Add to calendar', download: 'Download calendar file', google: 'Google Calendar', directions: 'Directions', ride: 'Book a ride', fallback: 'Open directions instead', message: 'Message to the business', dietary: 'Dietary restrictions', plus: 'Additional guests', confirm: 'Confirm', decline: 'Decline', saving: 'Saving your response…', confirmed: 'Attendance confirmed', declined: 'Response saved: unable to attend', change: 'Change my response', closed: 'This event is no longer accepting responses.', preview: 'Invitation preview — responses and entry passes are disabled.', failed: 'Your response could not be saved. Review your current response and try again.', pass: 'Your entry pass', show: 'Show this QR code at the entrance.', guests: 'Guests', time: 'Riyadh time', defaultEnd: 'You can adjust the duration in your calendar.', info: 'Event information', cancel: 'Cancel', party: 'Your party' },
  ar: { loading: 'جارٍ تحميل دعوتك…', unavailable: 'الدعوة غير متاحة', invalid: 'هذا الرابط غير صالح أو لم يعد متاحًا.', network: 'تعذر تحميل الدعوة. تحقق من الاتصال وحاول مجددًا.', retry: 'حاول مجددًا', greeting: 'مرحبًا،', calendar: 'إضافة إلى التقويم', download: 'تنزيل ملف التقويم', google: 'تقويم Google', directions: 'الاتجاهات', ride: 'احجز رحلة', fallback: 'فتح الاتجاهات بدلًا من ذلك', message: 'رسالة إلى المنشأة', dietary: 'القيود الغذائية', plus: 'المرافقون', confirm: 'تأكيد الحضور', decline: 'اعتذار', saving: 'جارٍ حفظ ردك…', confirmed: 'تم تأكيد حضورك', declined: 'تم حفظ اعتذارك عن الحضور', change: 'تغيير ردي', closed: 'لم تعد هذه المناسبة تقبل الردود.', preview: 'معاينة الدعوة — الردود ورمز الدخول غير متاحين.', failed: 'تعذر حفظ ردك. راجع ردك الحالي وحاول مجددًا.', pass: 'بطاقة دخولك', show: 'أبرز هذا الرمز عند الدخول.', guests: 'عدد الضيوف', time: 'بتوقيت الرياض', defaultEnd: 'يمكنك تعديل المدة في التقويم.', info: 'معلومات المناسبة', cancel: 'إلغاء', party: 'ضيوفك' },
};

export default function BusinessGuestHub() {
  const { code, lang } = useParams();
  const language = lang === 'ar' ? 'ar' : 'en';
  const c = copy[language];
  const query = useGuestByToken(code, { staleTime: 0, gcTime: 0, retry: 1, language });
  const mutation = useGuestMutation('rsvp');
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({ message: '', dietaryRestrictions: '', plusOnes: 0 });
  const statusRef = useRef(null);
  const formRef = useRef(null);
  const payload = query.data?.data || query.data || {};
  const { guest, event, pass, preview } = payload;
  useEffect(() => {
    if (guest) setFields({ message: guest.rsvp?.message || '', dietaryRestrictions: guest.rsvp?.dietaryRestrictions || '', plusOnes: guest.rsvp?.plusOnes || 0 });
  }, [guest?.id, guest?.revision]);

  async function respond(response) {
    if (!formRef.current?.reportValidity()) return;
    setError('');
    try {
      await mutation.mutateAsync({ id: guest.id, token: code, response, data: { ...fields, invitationCode: code, revision: guest.revision, lang: language } });
      await query.refetch();
      setChanging(false);
      requestAnimationFrame(() => statusRef.current?.focus());
    } catch (_) {
      // An uncertain network result or a duplicate click may already be saved.
      // Reconcile against current server state; never treat an error code alone as success.
      const refreshed = await query.refetch();
      const current = refreshed.data?.data || refreshed.data;
      const saved = current?.guest?.rsvp;
      if (!refreshed.isError && saved?.response === response &&
          (saved.message || '') === fields.message &&
          (saved.dietaryRestrictions || '') === fields.dietaryRestrictions &&
          (saved.plusOnes || 0) === fields.plusOnes) {
        setChanging(false);
        requestAnimationFrame(() => statusRef.current?.focus());
      } else setError(c.failed);
    }
  }
  function downloadCalendar() {
    const url = URL.createObjectURL(new Blob([event.actions.calendarIcs], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'event.ics'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const field = (name, value) => setFields(current => ({ ...current, [name]: value }));
  if (query.isLoading) return <main className={styles.page} dir={language === 'ar' ? 'rtl' : 'ltr'}><div className={styles.loading} role="status">{c.loading}</div></main>;
  if (!guest || !event || event.deliveryMode !== 'portal_link' || query.isError) {
    const status = query.error?.response?.status;
    return <main className={styles.page} dir={language === 'ar' ? 'rtl' : 'ltr'}><section className={styles.error}><h1>{c.unavailable}</h1><p>{status === 404 || status === 403 || (event && event.deliveryMode !== 'portal_link') ? c.invalid : c.network}</p><button onClick={() => query.refetch()}>{c.retry}</button></section></main>;
  }
  const actions = event.actions || {};
  const response = guest.rsvp?.response;
  const showForm = event.canRespond && !preview && (changing || !response);
  const date = actions.startAt ? new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-GB', { timeZone: 'Asia/Riyadh', dateStyle: 'full', timeStyle: 'short' }).format(new Date(actions.startAt)) : `${event.date || ''} ${event.time || ''}`;
  return <main className={styles.page} dir={language === 'ar' ? 'rtl' : 'ltr'} lang={language}>
    <div className={styles.shell}>
      <div className={styles.cover}>
        {event.branding?.coverUrl && <img className={styles.coverImage} src={event.branding.coverUrl} alt="" referrerPolicy="no-referrer" />}
        <div className={styles.business}>{event.branding?.logoUrl && <img src={event.branding.logoUrl} alt="" referrerPolicy="no-referrer" />}<span>{event.branding?.businessName}</span></div>
      </div>
      <article className={styles.passCard}>
        <header className={styles.event}><h1>{event.title}</h1><p><time dateTime={actions.startAt}>{date}</time><small>{c.time}</small></p><p>{event.location?.address}</p></header>
        <nav className={styles.utilities} aria-label={c.info}>
          {actions.calendarIcs && <details><summary>{c.calendar}</summary><div className={styles.menu}><button onClick={downloadCalendar}>{c.download}</button><a href={actions.googleCalendarUrl} target="_blank" rel="noopener noreferrer">{c.google}</a><small>{c.defaultEnd}</small></div></details>}
          {actions.directionsUrl && <a href={actions.directionsUrl} target="_blank" rel="noopener noreferrer">{c.directions}</a>}
          {actions.ride && <details><summary>{c.ride}</summary><div className={styles.menu}><a href={actions.ride.url} target="_blank" rel="noopener noreferrer">Uber</a><a href={actions.ride.fallbackUrl} target="_blank" rel="noopener noreferrer">{c.fallback}</a></div></details>}
        </nav>
        <section className={styles.greeting}><h2>{c.greeting} {guest.name}</h2>{event.description && <p>{event.description}</p>}</section>
        {preview && <p className={styles.notice}>{c.preview}</p>}
        {!event.canRespond && event.allowsReply && !preview && <p className={styles.notice}>{c.closed}</p>}
        {error && <p role="alert" className={styles.failure}>{error}</p>}
        {showForm && <form ref={formRef} onSubmit={e => { e.preventDefault(); respond('confirmed'); }} className={styles.form}>
          <fieldset disabled={mutation.isPending}><label htmlFor="business-message">{c.message}</label><textarea id="business-message" maxLength={500} value={fields.message} onChange={e => field('message', e.target.value)} />
          <label htmlFor="business-dietary">{c.dietary}</label><textarea id="business-dietary" maxLength={200} value={fields.dietaryRestrictions} onChange={e => field('dietaryRestrictions', e.target.value)} />
          <label htmlFor="business-plus">{c.plus}</label><input id="business-plus" type="number" min="0" max="10" step="1" required value={fields.plusOnes} onChange={e => field('plusOnes', e.target.value === '' ? '' : Number(e.target.value))} />
          <div className={styles.responses}><button type="submit" className={styles.confirm}>{c.confirm}</button><button type="button" onClick={() => respond('declined')}>{c.decline}</button>{changing && <button type="button" onClick={() => setChanging(false)}>{c.cancel}</button>}</div></fieldset>
          {mutation.isPending && <p role="status">{c.saving}</p>}
        </form>}
        {!showForm && response && event.allowsReply && <section className={styles.outcome} ref={statusRef} tabIndex={-1} aria-live="polite"><h2>{response === 'confirmed' ? c.confirmed : c.declined}</h2>{payload.message && <p>{payload.message}</p>}{event.canRespond && <button onClick={() => setChanging(true)}>{c.change}</button>}</section>}
        {pass?.code && !changing && <section className={styles.qr}><h2>{c.pass}</h2><QRCodeSVG value={pass.code} size={224} level="M" marginSize={4} title={c.pass} /><p>{c.show}</p><p>{c.guests}: {pass.guestsCount}</p></section>}
      </article>
      <footer className={styles.footer}><a href={`/${language === 'ar' ? 'en' : 'ar'}/business-invitation/${encodeURIComponent(code)}`} hrefLang={language === 'ar' ? 'en' : 'ar'}>{language === 'ar' ? 'English' : 'العربية'}</a><span>Halaa</span></footer>
    </div>
  </main>;
}
