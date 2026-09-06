'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import styles from './landingAnalytics.module.css';
import { landingPageProperties } from './analyticsProperties';

const ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || '';
const ENABLED = process.env.NODE_ENV === 'production' && /^G-[A-Z0-9]+$/.test(ID);
const KEY = 'halaa-analytics-consent';
const copy = {
  en: { message: 'Allow Google Analytics usage statistics to help us improve Halaa?', accept: 'Allow analytics', decline: 'No thanks', settings: 'Analytics preferences', privacy: 'Privacy policy' },
  ar: { message: 'هل تسمح بإحصاءات الاستخدام عبر Google Analytics لمساعدتنا على تحسين هلا؟', accept: 'السماح بالإحصاءات', decline: 'لا، شكراً', settings: 'تفضيلات الإحصاءات', privacy: 'سياسة الخصوصية' },
};

export default function LandingAnalytics({ lang }) {
  const [consent, setConsent] = useState(null);
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(false);
  const sent = useRef(null);
  const text = copy[lang] || copy.ar;

  useEffect(() => {
    if (!ENABLED) return;
    try { setConsent(localStorage.getItem(KEY)); } catch { /* Storage may be disabled. */ }
  }, []);

  const choose = (value) => {
    try { localStorage.setItem(KEY, value); } catch { /* Session-only choice still applies. */ }
    window[`ga-disable-${ID}`] = value !== 'granted';
    setConsent(value);
    setSettings(false);
  };

  useEffect(() => {
    if (!ready || consent !== 'granted') return;
    window[`ga-disable-${ID}`] = false;
    const emit = (name, properties = {}) => {
      if (window[`ga-disable-${ID}`]) return;
      window.gtag?.('event', name, { locale: lang, ...properties });
    };
    if (sent.current !== lang) {
      sent.current = lang;
      emit('page_view', { ...landingPageProperties({ origin: location.origin, lang, referrer: document.referrer, search: location.search }), page_title: document.title });
    }
    const click = (event) => {
      const anchor = event.target.closest?.('a[href]');
      if (!anchor) return;
      const url = new URL(anchor.href, location.origin);
      const placement = anchor.closest('section')?.id || (anchor.closest('header') ? 'header' : 'footer');
      if (url.origin === location.origin && url.pathname === `/${lang}/signup`) emit('signup_cta_click', { placement });
      else if (url.hostname === 'wa.me') emit(placement === 'pricing' ? 'business_whatsapp_click' : 'whatsapp_click', { placement });
      else if (url.origin === location.origin && url.pathname.startsWith(`/${lang}/market-place/vendors/`)) emit('vendor_open', { placement });
      else if (url.origin === location.origin && url.pathname === `/${lang}/market-place`) emit('marketplace_click', { placement });
    };
    const observed = new Set();
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !observed.has(entry.target.id)) {
          observed.add(entry.target.id);
          emit(entry.target.id === 'pricing' ? 'pricing_view' : 'marketplace_view');
        }
      }
    }, { threshold: 0.25 });
    for (const id of ['pricing', 'store']) {
      const section = document.getElementById(id);
      if (section) observer?.observe(section);
    }
    // Counts only: do not send exception messages, stacks, URLs or user content.
    const error = () => emit('landing_error', { error_type: 'javascript' });
    const rejection = () => emit('landing_error', { error_type: 'unhandled_rejection' });
    document.addEventListener('click', click);
    window.addEventListener('error', error);
    window.addEventListener('unhandledrejection', rejection);
    return () => {
      observer?.disconnect();
      document.removeEventListener('click', click);
      window.removeEventListener('error', error);
      window.removeEventListener('unhandledrejection', rejection);
      window[`ga-disable-${ID}`] = true;
    };
  }, [ready, consent, lang]);

  if (!ENABLED) return null;
  return <>
    {consent === 'granted' && <Script
      id="halaa-ga4" src={`https://www.googletagmanager.com/gtag/js?id=${ID}`} strategy="afterInteractive"
      onReady={() => {
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
        window[`ga-disable-${ID}`] = false;
        window.gtag('js', new Date());
        window.gtag('config', ID, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, ...landingPageProperties({ origin: location.origin, lang, referrer: document.referrer, search: location.search }) });
        setReady(true);
      }}
    />}
    {consent === null || settings ? <aside className={styles.banner} aria-label={text.settings}>
      <p>{text.message} <a href={`/${lang}/privacy`}>{text.privacy}</a></p>
      <button type="button" onClick={() => choose('granted')}>{text.accept}</button>
      <button type="button" onClick={() => choose('denied')}>{text.decline}</button>
    </aside> : <button type="button" className={styles.preferences} onClick={() => setSettings(true)}>{text.settings}</button>}
  </>;
}
