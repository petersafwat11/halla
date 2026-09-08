'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../lib/api.js';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { t } from '../../lib/locale.js';
import styles from './GuestLookup.module.css';

/**
 * Event-scoped manual guest search.
 * Bounded query 2..120 characters, 300ms debounce, up to 20 matches.
 */
export function GuestLookup({ eventId, onSelect, disabled = false, dict }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceTimerRef = useRef(null);

  const performSearch = useCallback(async (q) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await api.get(`/events/${eventId}/gate/search?q=${encodeURIComponent(trimmed)}`);
      setResults(res.data || []);
      setHasSearched(true);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setResults([]);
      setHasSearched(false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, performSearch]);

  const handleSelect = (guest) => {
    onSelect({ guestId: guest.id }, 'manual');
    setQuery('');
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className={styles.container} data-testid="guest-lookup-container">
      <h2 className={styles.title}>
        <span>🔍</span>
        <span>{t(dict, 'gate.manualSearchTitle')}</span>
      </h2>

      <div className={styles.inputWrapper}>
        <input
          type="text"
          className={styles.input}
          placeholder={t(dict, 'gate.manualSearchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          maxLength={120}
          data-testid="gate-manual-search-input"
        />
      </div>

      {isSearching && (
        <div className={styles.emptyState}>
          {t(dict, 'gate.manualSearchSearching')}
        </div>
      )}

      {!isSearching && hasSearched && results.length === 0 && (
        <div className={styles.emptyState} data-testid="no-search-results">
          {t(dict, 'gate.manualSearchNoResults')}
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className={styles.resultsList} data-testid="gate-search-results-list">
          {results.map((guest) => {
            const isAdmitted = guest.checkIn !== null;
            return (
              <button
                key={guest.id}
                type="button"
                className={styles.resultItem}
                onClick={() => handleSelect(guest)}
                disabled={disabled}
                data-testid={`gate-search-result-${guest.id}`}
              >
                <div className={styles.guestInfo}>
                  <span className={styles.guestName}>{guest.name}</span>
                  <div className={styles.guestMeta}>
                    <bdi className={styles.shortCode}>{guest.shortCode}</bdi>
                    {guest.reference && <span>{guest.reference}</span>}
                    <span>
                      {t(dict, 'guests.totalAllowed')}: {guest.totalAllowed}
                    </span>
                  </div>
                </div>
                <div className={styles.statusWrapper}>
                  <StatusBadge
                    status={isAdmitted ? 'admitted' : 'pending'}
                    label={
                      isAdmitted
                        ? t(dict, 'gate.admittedBadge')
                        : t(dict, 'gate.pendingBadge')
                    }
                    size="sm"
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
