'use client';

import React from 'react';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { Button } from '../ui/Button.jsx';
import { getDictionary, t, formatRiyadhDate } from '../../lib/locale.js';
import styles from './EventHeaderBar.module.css';

/**
 * Event header bar displaying event name, venue, Riyadh start time, status badge,
 * lifecycle action buttons (Open, Close, Reopen), and settings trigger.
 */
export function EventHeaderBar({
  event,
  lang = 'ar',
  onOpenSettings,
  onOpenLifecycle,
  onCreateEvent,
  isAdmin = false,
}) {
  const dict = getDictionary(lang);
  if (!event) return null;

  const isDraft = event.status === 'draft';
  const isLive = event.status === 'live';
  const isClosed = event.status === 'closed';

  return (
    <div className={styles.container}>
      <div className={styles.bar}>
        <div className={styles.eventMeta}>
          <div className={styles.titleRow}>
            <h1 className={styles.eventName} dir="auto">
              {event.name}
            </h1>
            <StatusBadge
              status={event.status}
              label={t(dict, `status.${event.status}`)}
              size="md"
            />
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailItem}>
              <span aria-hidden="true">📍</span>
              <span dir="auto">{event.venue}</span>
            </span>
            <span className={styles.detailItem}>
              <span aria-hidden="true">🕒</span>
              <span>{formatRiyadhDate(event.startsAt, lang)}</span>
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          {/* Compact admin new-event action (reachable when events already exist) */}
          {isAdmin && typeof onCreateEvent === 'function' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onCreateEvent}
              data-testid="new-event-btn"
            >
              ➕ {t(dict, 'events.createFirstEvent')}
            </Button>
          )}
          {/* Settings Trigger */}
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenSettings}
            data-testid="event-settings-btn"
          >
            ⚙️ {t(dict, 'events.editSettings')}
          </Button>

          {/* Lifecycle Action Triggers (draft may go live OR closed per contract) */}
          {isDraft && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenLifecycle('live')}
                data-testid="open-event-btn"
              >
                🟢 {t(dict, 'events.openEvent')}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onOpenLifecycle('closed')}
                data-testid="close-event-btn"
              >
                🛑 {t(dict, 'events.closeEvent')}
              </Button>
            </>
          )}

          {isLive && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onOpenLifecycle('closed')}
              data-testid="close-event-btn"
            >
              🛑 {t(dict, 'events.closeEvent')}
            </Button>
          )}

          {isClosed && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onOpenLifecycle('live')}
              data-testid="reopen-event-btn"
            >
              🔄 {t(dict, 'events.reopenEvent')}
            </Button>
          )}
        </div>
      </div>

      {/* Prominent warning banner when event is closed */}
      {isClosed && (
        <div className={styles.closedBanner} role="alert" data-testid="event-closed-banner">
          <span aria-hidden="true">🔒</span>
          <span>{t(dict, 'events.eventClosedBanner')}</span>
        </div>
      )}
    </div>
  );
}
