'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Notice } from '../ui/Notice.jsx';
import { api } from '../../lib/api.js';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { Icon } from '../ui/Icon.jsx';
import { t } from '../../lib/locale.js';
import styles from './GuestLookup.module.css';

/**
 * Event-scoped manual guest search.
 * Bounded query 2..120 characters, 300ms debounce, up to 20 matches.
 */
export function GuestLookup({ eventId, onSelect, disabled = false, dict }) {
  const [query, setQuery] = useState('');
  const [searchError, setSearchError] = useState(false);
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceTimerRef = useRef(null);
  // Generation guard: only the latest query may populate results (F07).
  const searchGenRef = useRef(0);

  const performSearch = useCallback(async (q, gen) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      if (gen !== searchGenRef.current) return;
      setResults([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setSearchError(false);
    const capturedEventId = eventId;
    try {
      const res = await api.get(`/events/${capturedEventId}/gate/search?q=${encodeURIComponent(trimmed)}`);
      // Discard stale responses and wrong-event responses (F07).
      if (gen !== searchGenRef.current || capturedEventId !== eventId) return;
      setResults(res.data || []);
      setHasSearched(true);
    } catch {
      if (gen !== searchGenRef.current || capturedEventId !== eventId) return;
      setResults([]);
      setHasSearched(false);
      setSearchError(true);
    } finally {
      if (gen === searchGenRef.current && capturedEventId === eventId) {
        setIsSearching(false);
      }
    }
  }, [eventId]);

  // Clear local search state on event switch (spec §2)
  useEffect(() => {
    searchGenRef.current += 1;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setIsSearching(false);
    return () => { searchGenRef.current += 1; };
  }, [eventId]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const gen = ++searchGenRef.current;
    if (!disabled && query.trim().length >= 2) {
      const snapshot = query;
      debounceTimerRef.current = setTimeout(() => {
        performSearch(snapshot, gen);
      }, 300);
    } else {
      setResults([]);
      setHasSearched(false);
    }

    return () => {
      searchGenRef.current += 1;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, performSearch, disabled]);

  const handleSelect = (guest) => {
    onSelect({ guestId: guest.id }, 'manual');
    setQuery('');
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className={styles.container} data-testid="guest-lookup-container">
      <label htmlFor="gate-manual-search" className={styles.title}>
        {t(dict, 'gate.manualSearchTitle')}
      </label>

      <div className={styles.inputWrapper}>
        <span className={styles.inputIcon} aria-hidden="true">
          {isSearching ? <span className={styles.spinner} /> : <Icon name="search" size="sm" />}
        </span>
        <input
          id="gate-manual-search"
          type="search"
          className={styles.input}
          placeholder={t(dict, 'gate.manualSearchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          maxLength={120}
          autoComplete="off"
          data-testid="gate-manual-search-input"
        />
        {query && !disabled && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => setQuery('')}
            aria-label={t(dict, 'common.clear')}
          >
            <Icon name="x" size="sm" />
          </button>
        )}
      </div>

      {searchError && <Notice variant="warning">{t(dict, 'common.networkError')}</Notice>}

      {isSearching && results.length === 0 && (
        <div className={styles.statusText} role="status">
          {t(dict, 'gate.manualSearchSearching')}
        </div>
      )}

      {!isSearching && hasSearched && results.length === 0 && (
        <div className={styles.statusText} data-testid="no-search-results" role="status">
          <Icon name="user-x" size="sm" />
          <span>{t(dict, 'gate.manualSearchNoResults')}</span>
        </div>
      )}

      {results.length > 0 && (
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
                <span className={`${styles.resultIcon} ${isAdmitted ? styles.resultIconDone : ''}`} aria-hidden="true">
                  <Icon name={isAdmitted ? 'check' : 'user'} size="sm" />
                </span>
                <span className={styles.guestInfo}>
                  <span className={styles.guestName} dir="auto">{guest.name}</span>
                  <span className={styles.guestMeta}>
                    <bdi className={styles.shortCode}>{guest.shortCode}</bdi>
                    {guest.reference && <bdi>{guest.reference}</bdi>}
                    <span className={styles.metaParty}>
                      <Icon name="users" size="xs" />
                      {guest.totalAllowed}
                    </span>
                  </span>
                </span>
                <StatusBadge
                  status={isAdmitted ? 'admitted' : 'pending'}
                  label={isAdmitted ? t(dict, 'gate.admittedBadge') : t(dict, 'gate.pendingBadge')}
                  size="sm"
                />
                <span className={styles.chevron} aria-hidden="true">
                  <Icon name="chevron-right" size="sm" mirror />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
