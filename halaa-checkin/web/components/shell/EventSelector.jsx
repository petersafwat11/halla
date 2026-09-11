'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useEvent } from '../../hooks/useEvent.jsx';
import { useSession } from '../../hooks/useSession.jsx';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { getDictionary, t } from '../../lib/locale.js';
import styles from './EventSelector.module.css';

/**
 * EventSelector allows administrators and receptionists to choose their active event.
 */
export function EventSelector() {
  const params = useParams();
  const lang = params?.lang === 'en' ? 'en' : 'ar';
  const dict = getDictionary(lang);
  const { role } = useSession();
  const { events, selectedEvent, selectedEventId, selectEvent, isLoadingEvents } = useEvent();
  const [isOpen, setIsOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setFocusIndex(-1);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard: Escape closes + returns focus; arrows move between options
  const handleButtonKeyDown = (e) => {
    if (e.key === 'Escape' && isOpen) {
      e.stopPropagation();
      setIsOpen(false);
      setFocusIndex(-1);
    }
    if ((e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
      setFocusIndex(0);
    }
  };
  const handleListKeyDown = (e) => {
    const count = events?.length || 0;
    if (e.key === 'Escape') {
      e.stopPropagation();
      setIsOpen(false);
      setFocusIndex(-1);
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

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.selectorButton}
        onClick={() => { setIsOpen(!isOpen); setFocusIndex(-1); }}
        onKeyDown={handleButtonKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t(dict, 'events.selectorLabel')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>

        <span className={styles.eventName}>
          {selectedEvent ? selectedEvent.name : t(dict, 'events.selectorPlaceholder')}
        </span>

        {selectedEvent && (
          <StatusBadge
            status={selectedEvent.status}
            label={t(dict, `status.${selectedEvent.status}`)}
            size="sm"
          />
        )}

        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="listbox" onKeyDown={handleListKeyDown}>
          <div className={styles.dropdownHeader}>
            {t(dict, 'events.selectorLabel')}
          </div>

          {!hasEvents ? (
            <div className={styles.emptyState}>
              {role === 'admin'
                ? t(dict, 'events.noEventsAdmin')
                : t(dict, 'events.noEventsReception')}
            </div>
          ) : (
            events.map((event, idx) => {
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
                    buttonRef.current?.focus();
                  }}
                >
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{event.name}</span>
                    <span className={styles.itemVenue}>{event.venue}</span>
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
