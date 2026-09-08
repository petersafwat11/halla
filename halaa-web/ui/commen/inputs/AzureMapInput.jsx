"use client";
import React, { useCallback, useEffect, useRef } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { LocateFixed } from 'lucide-react';
import { useAzureLocationPicker } from '@/hooks/useAzureLocationPicker';
import { useAzureMapFrame } from '@/hooks/useAzureMapFrame';
import styles from './MapInput.module.css';

export default function AzureMapInput({ name, label, required, hintMessage }) {
  const { control, clearErrors } = useFormContext();
  const { field: { value, onChange }, fieldState: { error } } = useController({ name, control });
  const { t, i18n } = useTranslation('createEvent');
  const language = i18n.language?.startsWith('en') ? 'en' : 'ar';
  const onSelected = useCallback(() => clearErrors(name), [clearErrors, name]);
  const { query, setQuery, suggestions, searching, busy, failed: lookupFailed,
    focused, setFocused, closeSuggestions, reverse, select, manual, locate,
  } = useAzureLocationPicker({ value, onChange, onSelected, language });
  const { frame, html, failed: mapFailed, retry, revision } = useAzureMapFrame({ value, language, onPick: reverse });
  const failed = lookupFailed || mapFailed;
  const searchContainer = useRef(null);
  useEffect(() => {
    const close = event => { if (!searchContainer.current?.contains(event.target)) closeSuggestions(); };
    // Close after the target's click: removing in-flow results on mousedown
    // would move the manual-address button before its mouseup can activate it.
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [closeSuggestions]);
  return <div className={styles.input_group}>
    {label && <label htmlFor={`${name}-azure`} className={styles.label}>{label}{required && ' *'}</label>}
    <div className={styles.controls}>
      <div ref={searchContainer} className={styles.search_wrapper}>
        <div className={styles.search_form} aria-busy={searching}>
          <input id={`${name}-azure`} className={styles.search_input} maxLength={160} value={query} dir="auto" autoComplete="off"
            placeholder={t('map_picker_search_placeholder')} role="combobox" aria-expanded={suggestions.length > 0}
            aria-controls={`${name}-suggestions`} aria-activedescendant={focused >= 0 ? `${name}-option-${focused}` : undefined}
            onChange={event => setQuery(event.target.value)} onKeyDown={event => {
              if (event.key === 'ArrowDown') { event.preventDefault(); setFocused(index => Math.min(index + 1, suggestions.length - 1)); }
              if (event.key === 'ArrowUp') { event.preventDefault(); setFocused(index => Math.max(index - 1, 0)); }
              if (event.key === 'Escape') closeSuggestions();
              if (event.key === 'Enter') { event.preventDefault(); if (suggestions[focused]) select(suggestions[focused]); }
            }} />
        </div>
        {!!suggestions.length && <ul id={`${name}-suggestions`} className={`${styles.suggestions} ${styles.azure_suggestions}`} role="listbox">
          {suggestions.map((item, index) => <li key={item.placeId || index} role="option" aria-selected={focused === index} id={`${name}-option-${index}`}>
            <button type="button" className={`${styles.suggestion_item} ${focused === index ? styles.suggestion_focused : ''}`} onClick={() => select(item)}><span dir="auto">{item.description}</span></button>
          </li>)}
        </ul>}
      </div>
      <button type="button" className={styles.locate_btn} disabled={busy} onClick={locate} title={t('map_picker_use_current')} aria-label={t('map_picker_use_current')}><LocateFixed size={20} aria-hidden="true" /></button>
    </div>
    {query.trim().length >= 3 && query !== value?.address && <button type="button" onClick={manual}>{t('map_picker_use_typed', { address: query.trim() })}</button>}
    <div className={styles.map_wrapper}>
      {html && <iframe key={revision} ref={frame} title={t('map_picker_title')} srcDoc={html} sandbox="allow-scripts allow-same-origin" style={{ width: '100%', height: '100%', border: 0 }} />}
      {(busy || (!html && !mapFailed)) && <div className={styles.map_overlay}><span className={styles.spin} /></div>}
    </div>
    <p className={styles.hint}>{t('map_picker_drag_hint')}</p>
    {failed && <div role="status" className={styles.hint}>{t('map_picker_provider_error')} <button type="button" onClick={retry}>{t('map_retry')}</button></div>}
    {value?.address && <div className={styles.address_display}><span className={styles.address_text} dir="auto">{value.address}</span></div>}
    {error && <p role="alert" className={styles.error}>{error.message}</p>}
    {hintMessage && <p className={styles.hint}>{hintMessage}</p>}
  </div>;
}
