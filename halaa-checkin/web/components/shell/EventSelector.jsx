'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useEvent } from '../../hooks/useEvent.jsx';
import { useSession } from '../../hooks/useSession.jsx';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { Icon } from '../ui/Icon.jsx';
import { getDictionary, t, formatRiyadhDate } from '../../lib/locale.js';
import styles from './EventSelector.module.css';

/**
 * EventSelector allows administrators and receptionists to choose their active event.
 * Features clamp width, full event name in listbox, optional search when > 8 events,
 * bidi-safe content with dir="auto" and bdi, and mobile sheet mode.
 */
export function EventSelector() {
  const params = useParams();
  const lang = params?.lang === 'en' ? 'en' : 'ar';
  const dict = getDictionary(lang);
  const { role } = useSession();
  const { events, selectedEvent, selectedEventId, selectEvent, isLoadingEvents } = useEvent();
  const [isOpen, setIsOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setFocusIndex(-1);
        setSearchQuery('');
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      (ev) =>
        ev.name?.toLowerCase().includes(q) ||
        ev.venue?.toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

  // Keyboard: Escape closes + returns focus; arrows move between options
  const handleButtonKeyDown = (e) => {
    if (e.key === 'Escape' && isOpen) {
      e.stopPropagation();
      setIsOpen(false);
      setFocusIndex(-1);
      setSearchQuery('');
    }
    if ((e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
      setFocusIndex(0);
    }
  };

  const handleListKeyDown = (e) => {
    const count = filteredEvents.length;
    if (e.key === 'Escape') {
      e.stopPropagation();
      setIsOpen(false);
      setFocusIndex(-1);
      setSearchQuery('');
      buttonRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIndex((i) => Math.min(count - 1, (i < 0 ? -1 : i) + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIndex((i) => Math.max(0, (i < 0 ? 1 : i) - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFocusIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setFocusIndex(count - 1);
    }
  };

  useEffect(() => {
    if (isOpen && focusIndex >= 0) {
      containerRef.current?.querySelector(`[data-event-index="${focusIndex}"]`)?.focus();
    }
  }, [focusIndex, isOpen]);

  // Auto-focus search input if search is enabled
  useEffect(() => {
    if (isOpen && events && events.length > 8) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, events]);

  if (isLoadingEvents) {
    return (
      <div className={styles.container}>
        <div className={styles.selectorButton} style={{ opacity: 0.7 }}>
          <span className={styles.eventName}>{t(dict, 'common.loading')}</span>
        </div>
      </div>
    );
  }

  const hasEvents = events && events.length > 0;
  const showSearch = events && events.length > 8;

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.selectorButton}
        onClick={() => {
          setIsOpen(!isOpen);
          setFocusIndex(-1);
          setSearchQuery('');
        }}
        onKeyDown={handleButtonKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t(dict, 'events.selectorLabel')}
      >
        <span className={styles.eventIcon} aria-hidden="true">
          <Icon name="calendar" size="sm" />
        </span>

        <span className={styles.eventName} dir="auto">
          {selectedEvent ? selectedEvent.name : t(dict, 'events.selectorPlaceholder')}
        </span>

        {selectedEvent && (
          <span className={styles.badgeWrapper}>
            <StatusBadge
              status={selectedEvent.status}
              label={t(dict, `status.${selectedEvent.status}`)}
              size="sm"
            />
          </span>
        )}

        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} aria-hidden="true">
          <Icon name="chevron-down" size="xs" />
        </span>
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="listbox" onKeyDown={handleListKeyDown}>
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownTitle}>{t(dict, 'events.selectorLabel')}</span>
            {showSearch && (
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusIndex(0);
                }}
                placeholder={t(dict, 'common.search')}
                className={styles.searchInput}
                aria-label={t(dict, 'common.search')}
              />
            )}
          </div>

          {!hasEvents ? (
            <div className={styles.emptyState}>
              {role === 'admin'
                ? t(dict, 'events.noEventsAdmin')
                : t(dict, 'events.noEventsReception')}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className={styles.emptyState}>{t(dict, 'guests.noResults')}</div>
          ) : (
            filteredEvents.map((event, idx) => {
              const isSelected = event.id === selectedEventId;
              return (
                <button
                  key={event.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-event-index={idx}
                  tabIndex={focusIndex === idx ? 0 : -1}
                  className={`${styles.eventItem} ${isSelected ? styles.eventItemActive : ''}`}
                  onClick={() => {
                    selectEvent(event.id);
                    setIsOpen(false);
                    setFocusIndex(-1);
                    setSearchQuery('');
                    buttonRef.current?.focus();
                  }}
                >
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName} dir="auto">
                      {event.name}
                    </span>
                    <span className={styles.itemVenue} dir="auto">
                      {event.venue}
                      {event.startsAt && (
                        <>
                          {' • '}
                          <bdi>{formatRiyadhDate(event.startsAt, lang)}</bdi>
                        </>
                      )}
                    </span>
                  </div>
                  <StatusBadge
                    status={event.status}
                    label={t(dict, `status.${event.status}`)}
                    size="sm"
                  />
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
