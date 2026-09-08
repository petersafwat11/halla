'use client';

import {
  CalendarPlus,
  MapPin,
  Car,
  ChevronDown,
  Download,
  ExternalLink,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './hub.module.css';

function downloadCalendar(contents) {
  const url = URL.createObjectURL(
    new Blob([contents], { type: 'text/calendar;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'event.ics';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function EventActions({ actions }) {
  const { t } = useTranslation('businessGuestHub');
  function closeOnEscape(event) {
    if (event.key !== 'Escape') return;
    const details = event.target.closest('details');
    if (details) {
      details.open = false;
      details.querySelector('summary')?.focus();
    }
  }
  return (
    <nav
      className={styles.utilities}
      aria-label={t('info')}
      onKeyDown={closeOnEscape}
    >
      {actions.calendarIcs && (
        <details name="invitation-actions">
          <summary>
            <CalendarPlus aria-hidden="true" size={19} />
            {t('calendar')}
            <ChevronDown aria-hidden="true" size={15} className={styles.chevron} />
          </summary>
          <div className={styles.menu}>
            <button
              type="button"
              onClick={() => downloadCalendar(actions.calendarIcs)}
            >
              <Download aria-hidden="true" size={18} />
              {t('download')}
            </button>
            {actions.googleCalendarUrl && (
              <a
                href={actions.googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('google')}
                <ExternalLink aria-hidden="true" size={16} />
              </a>
            )}
            <small>{t('defaultEnd')}</small>
          </div>
        </details>
      )}
      {actions.directionsUrl && (
        <a
          href={actions.directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MapPin aria-hidden="true" size={19} />
          {t('directions')}
        </a>
      )}
      {actions.ride && (
        <details name="invitation-actions">
          <summary>
            <Car aria-hidden="true" size={19} />
            {t('ride')}
            <ChevronDown aria-hidden="true" size={15} className={styles.chevron} />
          </summary>
          <div className={styles.menu}>
            <a
              href={actions.ride.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('uber')}
              <ExternalLink aria-hidden="true" size={16} />
            </a>
            <a
              href={actions.ride.fallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('fallback')}
            </a>
          </div>
        </details>
      )}
    </nav>
  );
}
