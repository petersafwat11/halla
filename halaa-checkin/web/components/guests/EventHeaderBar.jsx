'use client';

import React from 'react';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { Button } from '../ui/Button.jsx';
import { Icon } from '../ui/Icon.jsx';
import { getDictionary, t, formatRiyadhDate } from '../../lib/locale.js';
import styles from './EventHeaderBar.module.css';

/**
 * Compact event summary bar displaying event name, venue, Riyadh start time, status badge,
 * and event lifecycle actions for administrators.
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
              size="sm"
            />
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailItem}>
              <span className={styles.detailIcon} aria-hidden="true">
                <Icon name="map-pin" size="xs" />
              </span>
              <span dir="auto">{event.venue}</span>
            </span>
            <span className={styles.detailItem}>
              <span className={styles.detailIcon} aria-hidden="true">
                <Icon name="clock" size="xs" />
              </span>
              <bdi>{formatRiyadhDate(event.startsAt, lang)}</bdi>
            </span>
          </div>
        </div>

        {isAdmin && (
          <div className={styles.actions}>
            {typeof onCreateEvent === 'function' && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateEvent}
                data-testid="new-event-btn"
                leadingIcon={<Icon name="plus" size="xs" />}
              >
                {t(dict, 'events.createFirstEvent')}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onOpenSettings}
              data-testid="event-settings-btn"
              leadingIcon={<Icon name="settings" size="xs" />}
            >
              {t(dict, 'events.editSettings')}
            </Button>

            {isDraft && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onOpenLifecycle('live')}
                  data-testid="open-event-btn"
                  leadingIcon={<Icon name="play" size="xs" />}
                >
                  {t(dict, 'events.openEvent')}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => onOpenLifecycle('closed')}
                  data-testid="close-event-btn"
                  leadingIcon={<Icon name="lock" size="xs" />}
                >
                  {t(dict, 'events.closeEvent')}
                </Button>
              </>
            )}

            {isLive && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => onOpenLifecycle('closed')}
                data-testid="close-event-btn"
                leadingIcon={<Icon name="lock" size="xs" />}
              >
                {t(dict, 'events.closeEvent')}
              </Button>
            )}

            {isClosed && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenLifecycle('live')}
                data-testid="reopen-event-btn"
                leadingIcon={<Icon name="refresh" size="xs" />}
              >
                {t(dict, 'events.reopenEvent')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Prominent warning banner when event is closed */}
      {isClosed && (
        <div className={styles.closedBanner} role="alert" data-testid="event-closed-banner">
          <Icon name="lock" size="sm" aria-hidden="true" />
          <span>{t(dict, 'events.eventClosedBanner')}</span>
        </div>
      )}
    </div>
  );
}
