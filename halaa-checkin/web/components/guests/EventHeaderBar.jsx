'use client';

import React from 'react';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { Button } from '../ui/Button.jsx';
import { IconButton } from '../ui/IconButton.jsx';
import { Menu } from '../ui/Menu.jsx';
import { Icon } from '../ui/Icon.jsx';
import { getDictionary, t, formatRiyadhDate } from '../../lib/locale.js';
import styles from './EventHeaderBar.module.css';

/**
 * Page header for the Guests workspace: event identity, lifecycle state and
 * administrator actions. Rare or destructive lifecycle actions live in the
 * overflow menu so the primary path stays uncluttered.
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
  const isClosed = event.status === 'closed';

  const overflowItems = [
    ...(typeof onCreateEvent === 'function'
      ? [{
          key: 'new-event',
          label: t(dict, 'events.createFirstEvent'),
          icon: <Icon name="calendar-plus" size="sm" />,
          onClick: onCreateEvent,
          testId: 'new-event-btn',
        }]
      : []),
    ...(!isClosed
      ? [
          { type: 'divider' },
          {
            key: 'close-event',
            label: t(dict, 'events.closeEvent'),
            icon: <Icon name="lock" size="sm" />,
            danger: true,
            onClick: () => onOpenLifecycle('closed'),
            testId: 'close-event-btn',
          },
        ]
      : []),
  ].filter((item, index, list) => !(item.type === 'divider' && index === 0 && list.length > 0));

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
              <Icon name="map-pin" size="sm" />
              <span dir="auto">{event.venue}</span>
            </span>
            <span className={styles.detailDot} aria-hidden="true" />
            <span className={styles.detailItem}>
              <Icon name="calendar-days" size="sm" />
              <bdi>{formatRiyadhDate(event.startsAt, lang)}</bdi>
            </span>
          </div>
        </div>

        {isAdmin && (
          <div className={styles.actions}>
            <Button
              variant="outline"
              onClick={onOpenSettings}
              data-testid="event-settings-btn"
              leadingIcon="settings"
            >
              {t(dict, 'events.editSettings')}
            </Button>

            {isDraft && (
              <Button
                variant="success"
                onClick={() => onOpenLifecycle('live')}
                data-testid="open-event-btn"
                leadingIcon="play"
              >
                {t(dict, 'events.openEvent')}
              </Button>
            )}

            {isClosed && (
              <Button
                variant="primary"
                onClick={() => onOpenLifecycle('live')}
                data-testid="reopen-event-btn"
                leadingIcon="rotate-ccw"
              >
                {t(dict, 'events.reopenEvent')}
              </Button>
            )}

            {overflowItems.length > 0 && (
              <Menu
                align="end"
                aria-label={t(dict, 'events.moreActions')}
                items={overflowItems}
                minWidth={220}
                trigger={
                  <IconButton
                    icon={<Icon name="more-horizontal" size="md" />}
                    label={t(dict, 'events.moreActions')}
                    variant="outline"
                    data-testid="event-actions-btn"
                  />
                }
              />
            )}
          </div>
        )}
      </div>

      {isClosed && (
        <div className={styles.closedBanner} role="alert" data-testid="event-closed-banner">
          <Icon name="lock" size="sm" aria-hidden="true" />
          <span>{t(dict, 'events.eventClosedBanner')}</span>
        </div>
      )}
    </div>
  );
}
